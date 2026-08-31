import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const execFileAsync = promisify(execFile);
const CERT_ROOT = '/etc/engeradios2/fiscal/nfe/certificados';
const SECRET_ROOT = '/etc/engeradios2/fiscal/secrets';
const ENDPOINT =
  'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';
const ACTION =
  'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse';

function escapeXml(value: string) {
  return value.replace(
    /[<>&'"]/g,
    (char) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      })[char]!,
  );
}

function tag(xml: string, name: string) {
  const match = xml.match(
    new RegExp(
      `<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`,
      'i',
    ),
  );
  return match?.[1]?.trim() ?? null;
}

function validateAccessKey(key: string) {
  if (!/^\d{44}$/.test(key)) return false;
  const body = key.slice(0, 43);
  let weight = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const digit = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
  return digit === Number(key[43]);
}

function safeCode(value: string) {
  if (!/^[A-Z0-9_]{2,60}$/.test(value)) {
    throw new BadRequestException(
      'Código da filial inválido para consulta fiscal.',
    );
  }
  return value;
}

@Injectable()
export class NfeConsultaService {
  private readonly cooldown = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  async consultarPorChave(
    filialId: bigint,
    chave: string,
    usuarioId: string,
    incluirXmlInterno = false,
  ) {
    const normalizedKey = chave.replace(/\D/g, '');
    if (!validateAccessKey(normalizedKey)) {
      throw new BadRequestException(
        'A chave informada é inválida. Confira os 44 dígitos e o dígito verificador.',
      );
    }

    const filial = await this.prisma.fin_filiais.findUnique({
      where: { id: filialId },
    });
    if (!filial) throw new NotFoundException('Filial não encontrada.');
    if (!filial.cnpj)
      throw new BadRequestException('A filial não possui CNPJ cadastrado.');

    const existing = await this.prisma.fin_notas_recebidas.findFirst({
      where: { chave: normalizedKey },
      select: { id: true, numero: true, filial_id: true },
    });
    if (existing) {
      return {
        ambiente: 'PRODUCAO',
        jaImportada: true,
        notaExistente: {
          id: existing.id.toString(),
          numero: existing.numero,
          filialId: existing.filial_id?.toString() ?? null,
        },
        chaveFinal: normalizedKey.slice(-8),
      };
    }

    const keyHash = createHash('sha256').update(normalizedKey).digest('hex');
    const cooldownKey = `${filial.id}:${keyHash}`;
    const last = this.cooldown.get(cooldownKey) ?? 0;
    if (!incluirXmlInterno && Date.now() - last < 60_000) {
      throw new HttpException(
        'Aguarde um minuto antes de repetir a consulta desta chave.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!incluirXmlInterno) this.cooldown.set(cooldownKey, Date.now());

    const code = safeCode(filial.codigo);
    const pfx = join(CERT_ROOT, code, 'certificado.pfx');
    const secretCandidates = [
      join(SECRET_ROOT, `${code}.pass`),
      join(SECRET_ROOT, `${code}.env`),
    ];
    const work = await mkdtemp(join(tmpdir(), 'engeradios-nfe-'));
    const cert = join(work, 'client.pem');
    const key = join(work, 'client.key');
    const request = join(work, 'request.xml');
    const response = join(work, 'response.xml');

    try {
      let password: string | null = null;
      for (const candidate of secretCandidates) {
        try {
          const raw = await readFile(candidate, 'utf8');
          password = raw.includes('=')
            ? (raw
                .split(/\r?\n/)
                .find((line) => line.includes('='))
                ?.split('=')
                .slice(1)
                .join('=')
                .replace(/^['"]|['"]$/g, '')
                .trim() ?? null)
            : raw.trim();
          if (password) break;
        } catch {
          // Tenta o próximo formato de segredo.
        }
      }
      if (!password)
        throw new BadRequestException(
          'Senha protegida do certificado não encontrada.',
        );

      const env = { ...process.env, ENGERADIOS_PFX_PASSWORD: password };
      const extract = async (args: string[]) =>
        execFileAsync(
          'openssl',
          [
            'pkcs12',
            '-legacy',
            '-in',
            pfx,
            '-passin',
            'env:ENGERADIOS_PFX_PASSWORD',
            ...args,
          ],
          {
            env,
            timeout: 20_000,
            maxBuffer: 8 * 1024 * 1024,
          },
        );
      await extract(['-clcerts', '-nokeys', '-out', cert]);
      await extract(['-nocerts', '-nodes', '-out', key]);

      const xml = `<?xml version="1.0" encoding="UTF-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>1</tpAmb><cUFAutor>91</cUFAutor><CNPJ>${escapeXml(filial.cnpj)}</CNPJ><consChNFe><chNFe>${escapeXml(normalizedKey)}</chNFe></consChNFe></distDFeInt></nfeDadosMsg></soap12:Body></soap12:Envelope>`;
      await writeFile(request, xml, { mode: 0o600 });

      const { stdout } = await execFileAsync(
        'curl',
        [
          '--silent',
          '--show-error',
          '--fail-with-body',
          '--max-time',
          '30',
          '--cert',
          cert,
          '--key',
          key,
          '--header',
          `Content-Type: application/soap+xml; charset=utf-8; action="${ACTION}"`,
          '--data-binary',
          `@${request}`,
          '--output',
          response,
          '--write-out',
          '%{http_code}',
          ENDPOINT,
        ],
        { timeout: 40_000, maxBuffer: 2 * 1024 * 1024 },
      );
      if (stdout.trim() !== '200')
        throw new BadGatewayException(
          'O Ambiente Nacional não respondeu corretamente.',
        );

      const soap = await readFile(response, 'utf8');
      const cStat = tag(soap, 'cStat');
      const xMotivo = tag(soap, 'xMotivo');
      if (cStat === '656')
        throw new HttpException(
          xMotivo ?? 'Consumo indevido. Aguarde o prazo informado pela SEFAZ.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      if (!cStat)
        throw new BadGatewayException(
          'Resposta fiscal sem código de situação.',
        );

      const docMatch = soap.match(
        /<(?:\w+:)?docZip\b([^>]*)>([A-Za-z0-9+/=\s]+)<\/(?:\w+:)?docZip>/i,
      );
      let fiscalXml: string | null = null;
      let schema: string | null = null;
      if (docMatch) {
        schema = docMatch[1]?.match(/schema=["']([^"']+)/i)?.[1] ?? null;
        fiscalXml = gunzipSync(
          Buffer.from(docMatch[2].replace(/\s/g, ''), 'base64'),
        ).toString('utf8');
      }

      const source = fiscalXml ?? soap;
      const preview = {
        chave: normalizedKey,
        chaveFinal: normalizedKey.slice(-8),
        schema,
        numero: tag(source, 'nNF'),
        serie: tag(source, 'serie'),
        emissao: tag(source, 'dhEmi') ?? tag(source, 'dEmi'),
        emitenteCnpj: tag(source, 'CNPJ'),
        emitenteNome: tag(source, 'xNome'),
        valorTotal: tag(source, 'vNF'),
        protocolo: tag(source, 'nProt'),
        situacao: tag(source, 'cSitNFe'),
      };

      await this.prisma.fin_filiais_historico.create({
        data: {
          filial_id: filial.id,
          usuario_id: usuarioId,
          acao: 'CONSULTA_NFE',
          depois: {
            chaveHash: keyHash,
            cStat,
            schema,
            documentoDisponivel: Boolean(fiscalXml),
            consultadoEm: new Date().toISOString(),
          },
        },
      });

      return {
        ambiente: 'PRODUCAO',
        jaImportada: false,
        cStat,
        xMotivo,
        documentoDisponivel: Boolean(fiscalXml),
        previa: preview,
        xmlInterno: incluirXmlInterno ? fiscalXml : undefined,
        aviso: 'Consulta prévia. Nenhum XML ou lançamento foi gravado.',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof HttpException ||
        error instanceof BadGatewayException
      )
        throw error;
      throw new BadGatewayException(
        'Não foi possível consultar a NF-e no Ambiente Nacional.',
      );
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
}
