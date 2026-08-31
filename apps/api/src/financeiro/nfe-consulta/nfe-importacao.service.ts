import { createHash } from 'node:crypto';
import { rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NfeConsultaService } from './nfe-consulta.service';

const XML_ROOT = '/etc/engeradios2/fiscal/nfe/xml/recebidos';

type FiscalResult = {
  jaImportada?: boolean;
  notaExistente?: { id: string };
  documentoDisponivel?: boolean;
  previa?: { schema?: string | null };
  xmlInterno?: string | null;
};

function decode(value: string | null) {
  return (
    value
      ?.replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .trim() ?? null
  );
}
function tag(xml: string, name: string) {
  const found = xml.match(
    new RegExp(
      `<(?:(?:\\w+):)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:(?:\\w+):)?${name}>`,
      'i',
    ),
  );
  return decode(found?.[1] ?? null);
}
function section(xml: string, name: string) {
  return (
    xml.match(
      new RegExp(
        `<(?:(?:\\w+):)?${name}(?:\\s[^>]*)?>[\\s\\S]*?<\\/(?:(?:\\w+):)?${name}>`,
        'i',
      ),
    )?.[0] ?? ''
  );
}
function sections(xml: string, name: string) {
  return Array.from(
    xml.matchAll(
      new RegExp(
        `<(?:(?:\\w+):)?${name}(?:\\s[^>]*)?>[\\s\\S]*?<\\/(?:(?:\\w+):)?${name}>`,
        'gi',
      ),
    ),
    (match) => match[0],
  );
}
function numeric(value: string | null) {
  const parsed = Number(value ?? 0);
  return new Prisma.Decimal(Number.isFinite(parsed) ? parsed : 0);
}
function date(value: string | null) {
  if (!value) return null;
  const parsed = new Date(
    value.length === 10 ? `${value}T00:00:00.000Z` : value,
  );
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}
function safeCode(value: string) {
  if (!/^[A-Z0-9_]{2,60}$/.test(value)) {
    throw new BadRequestException(
      'Código da filial inválido para armazenamento fiscal.',
    );
  }
  return value;
}
function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value
      .map((item) => jsonValue(item))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined);
  }
  if (typeof value === 'object') return jsonSafe(value);
  return undefined;
}
function jsonSafe(value: object): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      const normalized = jsonValue(item);
      return normalized === undefined ? [] : [[key, normalized]];
    }),
  );
}

@Injectable()
export class NfeImportacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consulta: NfeConsultaService,
  ) {}

  async importar(filialId: bigint, chave: string, usuarioId: string) {
    const normalizedKey = chave.replace(/\D/g, '');
    const existing = await this.prisma.fin_notas_recebidas.findFirst({
      where: { chave: normalizedKey },
      select: { id: true, numero: true },
    });
    if (existing) {
      throw new ConflictException(
        `Esta NF-e já foi importada${existing.numero ? ` como nota ${existing.numero}` : ''}.`,
      );
    }

    const filial = await this.prisma.fin_filiais.findUnique({
      where: { id: filialId },
      select: { id: true, codigo: true, cnpj: true },
    });
    if (!filial) throw new NotFoundException('Filial não encontrada.');
    if (!filial.cnpj)
      throw new BadRequestException('A filial não possui CNPJ cadastrado.');

    const fiscal = (await this.consulta.consultarPorChave(
      filialId,
      normalizedKey,
      usuarioId,
      true,
    )) as FiscalResult;
    if (fiscal.jaImportada)
      throw new ConflictException('Esta NF-e já foi importada.');
    const xml = fiscal.xmlInterno;
    if (!xml || !fiscal.documentoDisponivel) {
      throw new BadRequestException(
        'O XML completo não está disponível. Não é possível importar apenas o resumo.',
      );
    }
    if (!/<(?:\w+:)?(?:nfeProc|NFe)\b/i.test(xml)) {
      throw new BadRequestException(
        'O documento retornado não contém uma NF-e completa.',
      );
    }

    const infMatch = xml.match(
      /<(?:\w+:)?infNFe\b[^>]*\bId=["']NFe(\d{44})["']/i,
    );
    if (infMatch?.[1] !== normalizedKey) {
      throw new BadRequestException(
        'A chave interna do XML não corresponde à chave consultada.',
      );
    }
    const dest = section(xml, 'dest');
    const destCnpj = tag(dest, 'CNPJ')?.replace(/\D/g, '') ?? '';
    if (destCnpj !== filial.cnpj.replace(/\D/g, '')) {
      throw new BadRequestException(
        'O destinatário do XML não corresponde à filial selecionada.',
      );
    }
    const protocolo = tag(section(xml, 'protNFe'), 'nProt');
    const status = tag(section(xml, 'protNFe'), 'cStat');
    if (!protocolo || status !== '100') {
      throw new BadRequestException(
        'A NF-e não possui protocolo válido de autorização.',
      );
    }

    const ide = section(xml, 'ide');
    const emit = section(xml, 'emit');
    const total = section(xml, 'ICMSTot');
    const cobr = section(xml, 'cobr');
    const schema = fiscal.previa?.schema ?? null;
    const hash = createHash('sha256').update(xml, 'utf8').digest('hex');
    const code = safeCode(filial.codigo);
    const finalPath = join(XML_ROOT, code, `${normalizedKey}.xml`);
    const tempPath = join(
      dirname(finalPath),
      `.${normalizedKey}.${process.pid}.${Date.now()}.tmp`,
    );
    let finalCreated = false;

    const itemData = sections(xml, 'det').map((det, index) => {
      const prod = section(det, 'prod');
      return {
        n_item: Number(det.match(/\bnItem=["'](\d+)["']/i)?.[1] ?? index + 1),
        cod_produto: tag(prod, 'cProd'),
        descricao: tag(prod, 'xProd'),
        ncm: tag(prod, 'NCM'),
        cfop: tag(prod, 'CFOP'),
        unidade: tag(prod, 'uCom'),
        quantidade: numeric(tag(prod, 'qCom')),
        valor_unit: numeric(tag(prod, 'vUnCom')),
        valor_produto: numeric(tag(prod, 'vProd')),
        valor_total: numeric(tag(prod, 'vProd')),
        pedido: tag(prod, 'xPed'),
      };
    });
    const parcelaData = sections(cobr, 'dup').map((dup) => ({
      numero: tag(dup, 'nDup'),
      vencimento: date(tag(dup, 'dVenc')),
      valor: numeric(tag(dup, 'vDup')),
      pago: false,
    }));

    await writeFile(tempPath, xml, { mode: 0o600, flag: 'wx' });
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.fin_notas_recebidas.findFirst({
          where: { chave: normalizedKey },
          select: { id: true },
        });
        if (duplicate)
          throw new ConflictException('Esta NF-e já foi importada.');

        const note = await tx.fin_notas_recebidas.create({
          data: {
            chave: normalizedKey,
            numero: tag(ide, 'nNF'),
            serie: tag(ide, 'serie'),
            modelo: tag(ide, 'mod') ?? '55',
            natureza: tag(ide, 'natOp'),
            data_emissao: date(tag(ide, 'dhEmi') ?? tag(ide, 'dEmi')),
            data_entrada: new Date(),
            emit_cnpj: tag(emit, 'CNPJ'),
            emit_nome: tag(emit, 'xNome'),
            emit_fantasia: tag(emit, 'xFant'),
            emit_uf: tag(section(emit, 'enderEmit'), 'UF'),
            emit_ie: tag(emit, 'IE'),
            valor_produtos: numeric(tag(total, 'vProd')),
            valor_frete: numeric(tag(total, 'vFrete')),
            valor_seguro: numeric(tag(total, 'vSeg')),
            valor_desconto: numeric(tag(total, 'vDesc')),
            valor_outros: numeric(tag(total, 'vOutro')),
            valor_icms: numeric(tag(total, 'vICMS')),
            valor_icms_st: numeric(tag(total, 'vST')),
            valor_ipi: numeric(tag(total, 'vIPI')),
            valor_pis: numeric(tag(total, 'vPIS')),
            valor_cofins: numeric(tag(total, 'vCOFINS')),
            valor_total: numeric(tag(total, 'vNF')),
            numero_pedido: itemData.find((item) => item.pedido)?.pedido,
            protocolo,
            status_sefaz: status,
            origem: 'SEFAZ_CONSCHNFE',
            situacao: 'PENDENTE_CONFERENCIA',
            xml_arquivo: finalPath,
            xml_sha256: hash,
            schema_xml: schema,
            capturado_em: new Date(),
            criado_por: usuarioId,
            atualizado_em: new Date(),
            filial_id: filial.id,
            ...(itemData.length
              ? { fin_notas_recebidas_itens: { create: itemData } }
              : {}),
            ...(parcelaData.length
              ? { fin_notas_recebidas_parcelas: { create: parcelaData } }
              : {}),
          },
          include: {
            fin_notas_recebidas_itens: true,
            fin_notas_recebidas_parcelas: true,
          },
        });
        await rename(tempPath, finalPath);
        finalCreated = true;
        await tx.auditoria.create({
          data: {
            usuarioId,
            entidade: 'fin_notas_recebidas',
            entidadeId: note.id.toString(),
            acao: 'IMPORTAR_XML_SEFAZ',
            dadosAntes: Prisma.JsonNull,
            dadosDepois: jsonSafe({
              notaId: note.id,
              filialId: filial.id,
              chaveHash: createHash('sha256')
                .update(normalizedKey)
                .digest('hex'),
              xmlSha256: hash,
              itens: note.fin_notas_recebidas_itens.length,
              parcelas: note.fin_notas_recebidas_parcelas.length,
              situacao: note.situacao,
            }),
          },
        });
        return note;
      });
      return {
        sucesso: true,
        notaId: result.id.toString(),
        numero: result.numero,
        situacao: result.situacao,
        itens: result.fin_notas_recebidas_itens.length,
        parcelas: result.fin_notas_recebidas_parcelas.length,
        mensagem: 'NF-e importada para o repositório e aguardando conferência.',
      };
    } catch (error) {
      if (finalCreated)
        await rm(finalPath, { force: true }).catch(() => undefined);
      throw error;
    } finally {
      await rm(tempPath, { force: true }).catch(() => undefined);
    }
  }
}
