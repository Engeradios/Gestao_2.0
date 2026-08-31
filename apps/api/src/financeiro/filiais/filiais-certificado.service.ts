import { writeFileSync, rmSync } from 'node:fs';
import { promisify } from 'node:util';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { spawnSync, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, join } from 'node:path';
import { PrismaService } from '../../database/prisma.service';

const CERT_ROOT = '/etc/engeradios2/fiscal/nfe/certificados';
const SECRET_ROOT = '/etc/engeradios2/fiscal/secrets';
const MAX_BYTES = 5 * 1024 * 1024;
const execFileAsync = promisify(execFile);
const SVRS_STATUS_HOM =
  'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx';
const ICP_BRASIL_V10 = `-----BEGIN CERTIFICATE-----
MIIGrDCCBJSgAwIBAgIJANLVi0S/gZNCMA0GCSqGSIb3DQEBDQUAMIGYMQswCQYD
VQQGEwJCUjETMBEGA1UECgwKSUNQLUJyYXNpbDE9MDsGA1UECww0SW5zdGl0dXRv
IE5hY2lvbmFsIGRlIFRlY25vbG9naWEgZGEgSW5mb3JtYWNhbyAtIElUSTE1MDMG
A1UEAwwsQXV0b3JpZGFkZSBDZXJ0aWZpY2Fkb3JhIFJhaXogQnJhc2lsZWlyYSB2
MTAwHhcNMTkwNzAxMTkxNTU5WhcNMzIwNzAxMTIwMDU5WjCBmDELMAkGA1UEBhMC
QlIxEzARBgNVBAoMCklDUC1CcmFzaWwxPTA7BgNVBAsMNEluc3RpdHV0byBOYWNp
b25hbCBkZSBUZWNub2xvZ2lhIGRhIEluZm9ybWFjYW8gLSBJVEkxNTAzBgNVBAMM
LEF1dG9yaWRhZGUgQ2VydGlmaWNhZG9yYSBSYWl6IEJyYXNpbGVpcmEgdjEwMIIC
IjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAk3AxKl1ZtP0pNyjChqO7qNkn
+/sClZeqiV/Kd7KnnbkDbI2y3VWcUG7feCE/deIxot6GH6JXncRG794UZl+4doD0
D0/cEwBd4DvrDSZm0RT40xhmYYOTxZDJxv+coTHdmsT5aNmSkktfjzYX4HQHh/7M
em+kTOpT/3E4K6B7KVs9HkOT7nXx5yU1qYbVWqI0qpJM9mOTSFx8C9HiKcHvLCvt
1ioXKPAmFuHPkayOcXP2MXeb+VRNjWKU4E+L2t5uZPKVx1M/9i1DztlLb4K8OfYg
GaPDUSF1sxnoGk5qZHLleO6KjCpmuQepmgsBvxi2YNO7X2YUwQQx1AXNSolgtkAR
5gt+1WzxhbFUhItQqlhqxgWHefLmiT5T/Ctz/P2v+zSO4efkkIzsi1iwD+ypZvM2
lnIvB24RcSN6jzmCahLPX4CwjwIK6JsSoMVxIhpZHCguUP4LXqP8IWUZ6WgS/4zB
7B9E0EICl2rM1PRy+6ulv+ZOW256e8a0pijUB+hXM1msUq9L92476FAAX8va3sP7
+Uut94+bGHmubcTLImWUPrxNT7QyrvE3FyHicfiHioeFL2oV4cXTLZrEq2wS8R4P
KPdSzNn5Z9e2uMEGYQaSNO+OwvVycpIhOBOqrm12wJ9ZhWKtM5UOo34/o37r5ZBI
TYXAGbhqQDB9mWXwH+0CAwEAAaOB9jCB8zBOBgNVHSAERzBFMEMGBWBMAQEAMDow
OAYIKwYBBQUHAgEWLGh0dHA6Ly9hY3JhaXouaWNwYnJhc2lsLmdvdi5ici9EUENh
Y3JhaXoucGRmMEAGA1UdHwQ5MDcwNaAzoDGGL2h0dHA6Ly9hY3JhaXouaWNwYnJh
c2lsLmdvdi5ici9MQ1JhY3JhaXp2MTAuY3JsMB8GA1UdIwQYMBaAFHTzfv/8n1N6
8Xzrqz6kptoYukVjMB0GA1UdDgQWBBR0837//J9TevF866s+pKbaGLpFYzAPBgNV
HRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQ0FAAOCAgEA
eCNhBSuy/Ih/T+1VOtAJju85SrtoE3vET1qXASpmjQllDHG/ph7VFNRAkC+gha+B
CbjoA5oJ/8wwl+Qdp1KGz6nXXFTLx3osU+kjm0srmBf9nyXHPqvFyvBeB0A7sYb7
TmII9GKD20oCxsdkccR/oE/JuTaNnGq0GYZ2aDb5v62uLi21Y6P9UBiTxZqQ4ojW
ET6kXNjlK238jpXv17FR8Sg3VusCvX7Q8eJkavvHHZDeWck2fSA+ycAc2JeL2Z0B
MSxGWpH32WM9J8+6XqCJUXHiWEV0zCE8wDYiYC+047pTxQI/gB/FcU7jvylh98DJ
kQPHd/Tp6Og3ynlDA9n9uBbxYHVRZs9vsZ/7xTFaxRe+zk8dhgKgZ/3RrcMFB570
2t8LFbyuUE/kQVY6rZ0QJ9qMWQ7VPLRwRhiMeU3k8WDJb/tBbOXHBqldTbWyQ+mp
MEDWhbrzE/IED82wAuO23Tb05cYk2xC7+Izef8fSc3XdJDuPSbcDpWukzyCDtSEH
isLiGEtIbYRiPsF3czlQPsnIEVoTTCWxHCH1zYR6zScSv18Qh69qVe2J40K5jZoP
GEOhq/oKhVJQAdvAFW5Odp7mF3Tk9nivjjsctJSxY26LFiV5GRV+07SSse4ti0aO
jO5PLg5SWjfcOtBG2rz02EIvQAmLcb0kGBtfdj0lW/w=
-----END CERTIFICATE-----`;

type Meta = {
  situacao: 'NAO_CONFIGURADO' | 'VALIDO' | 'EXPIRADO' | 'INVALIDO';
  instalado: boolean;
  validoAte?: string;
  validoDesde?: string;
  emissor?: string;
  titular?: string;
  serial?: string;
  sha256?: string;
  arquivoBytes?: number;
  mensagem?: string;
};

function safeCode(value: string) {
  if (!/^[A-Z0-9_]{2,60}$/.test(value)) {
    throw new BadRequestException(
      'Código da filial inválido para armazenamento fiscal.',
    );
  }
  return value;
}
class OpenSslFailure extends Error {
  constructor(
    readonly details: string,
    readonly exitCode: number | null,
  ) {
    super('Falha ao processar certificado PKCS#12.');
  }
}

function execOpenSsl(args: string[], password = '', input?: string) {
  const result = spawnSync('openssl', args, {
    input,
    encoding: 'utf8',
    env: { ...process.env, ENGERADIOS_PFX_PASSWORD: password },
    maxBuffer: 8 * 1024 * 1024,
    timeout: 20000,
  });
  const details = `${String(result.stderr ?? '')}\n${String(result.stdout ?? '')}`;
  if (result.error || result.status !== 0) {
    throw new OpenSslFailure(details, result.status);
  }
  return String(result.stdout ?? '');
}

function isLegacyFailure(details: string) {
  return /unsupported|RC2-40-CBC|inner_evp_generic_fetch|legacy provider/i.test(
    details,
  );
}

function isPasswordFailure(details: string) {
  return /mac verify (error|failure)|invalid password|password.*incorrect|bad decrypt/i.test(
    details,
  );
}

function pkcs12(
  path: string,
  password: string,
  args: string[],
  legacy: boolean,
) {
  return execOpenSsl(
    [
      'pkcs12',
      ...(legacy ? ['-legacy'] : []),
      '-in',
      path,
      '-passin',
      'env:ENGERADIOS_PFX_PASSWORD',
      ...args,
    ],
    password,
  );
}

function isolateCertificatePem(value: string) {
  const match = value.match(
    /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/,
  );
  if (!match)
    throw new BadRequestException(
      'O arquivo não contém um certificado PEM válido.',
    );
  return `${match[0]}\n`;
}

function isValidCnpj(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calculate = (base: string, weights: number[]) => {
    const sum = base
      .split('')
      .reduce(
        (total, digit, index) => total + Number(digit) * weights[index],
        0,
      );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calculate(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const second = calculate(
    digits.slice(0, 12) + first,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return digits.endsWith(`${first}${second}`);
}

function cnpjFromSubject(text: string) {
  const subjectLine =
    text.split(/\r?\n/).find((line) => /^subject\s*=/i.test(line.trim())) ?? '';
  const normalized = subjectLine
    .replace(/\\([,+="<>#;])/g, '$1')
    .replace(/\s+/g, ' ');
  const occurrences = [...normalized.matchAll(/(?<!\d)\d{14}(?!\d)/g)]
    .map((match) => match[0])
    .filter(isValidCnpj);
  const uniqueCnpjs = [...new Set(occurrences)];
  return {
    cnpjs: uniqueCnpjs,
    occurrenceCount: occurrences.length,
    uniqueCount: uniqueCnpjs.length,
  };
}

function extractCnpjIcpBrasil(certificatePem: string) {
  const isolatedPem = isolateCertificatePem(certificatePem);
  const token = `${process.pid}-${Date.now()}`;
  const pemPath = join('/tmp', `engeradios-a1-cert-${token}.pem`);
  const derPath = join('/tmp', `engeradios-a1-cert-${token}.der`);
  try {
    writeFileSync(pemPath, isolatedPem, { mode: 0o600, flag: 'wx' });
    execOpenSsl(['x509', '-in', pemPath, '-outform', 'DER', '-out', derPath]);
    const text = execOpenSsl([
      'x509',
      '-in',
      pemPath,
      '-noout',
      '-subject',
      '-issuer',
      '-serial',
      '-dates',
      '-text',
      '-nameopt',
      'RFC2253',
    ]);
    const asn1 = execOpenSsl([
      'asn1parse',
      '-inform',
      'DER',
      '-in',
      derPath,
      '-i',
      '-dump',
    ]);
    const oid = '2.16.76.1.3.3';
    const combined = `${text}\n${asn1}`;
    const position = combined.indexOf(oid);
    if (position < 0) return { cnpj: null, oidFound: false, text };
    const window = combined.slice(position, position + 2400);
    const plain = window.match(/(?<!\d)\d{14}(?!\d)/)?.[0] ?? null;
    const hexLines = [
      ...window.matchAll(/(?:[0-9a-f]{2}[:\s-]){13}[0-9a-f]{2}/gi),
    ];
    let decoded: string | null = null;
    for (const match of hexLines) {
      const bytes = match[0].match(/[0-9a-f]{2}/gi) ?? [];
      const candidate = Buffer.from(
        bytes.map((value) => Number.parseInt(value, 16)),
      )
        .toString('latin1')
        .replace(/\D/g, '');
      if (candidate.length >= 14) {
        decoded = candidate.slice(0, 14);
        break;
      }
    }
    const decodedCnpj = plain ?? decoded;
    const oidCnpj =
      decodedCnpj && isValidCnpj(decodedCnpj) ? decodedCnpj : null;
    const subjectResult = cnpjFromSubject(text);
    const candidates = [
      ...new Set([...(oidCnpj ? [oidCnpj] : []), ...subjectResult.cnpjs]),
    ];
    return {
      cnpjs: candidates,
      oidFound: true,
      text,
      extractionSource: oidCnpj
        ? 'OID_AND_SUBJECT'
        : candidates.length
          ? 'SUBJECT_FALLBACK'
          : 'NONE',
    };
  } catch (error) {
    if (error instanceof OpenSslFailure) {
      const code = /asn1/i.test(error.details)
        ? 'ASN1_PARSE'
        : /x509/i.test(error.details)
          ? 'X509_PARSE'
          : 'CERT_PARSE';
      throw new BadRequestException(
        `Não foi possível decodificar a identidade ICP-Brasil do certificado (${code}).`,
      );
    }
    throw error;
  } finally {
    try {
      rmSync(pemPath, { force: true });
    } catch {
      // Falha ignorada intencionalmente neste fallback.
    }
    try {
      rmSync(derPath, { force: true });
    } catch {
      // Falha ignorada intencionalmente neste fallback.
    }
  }
}
function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

@Injectable()
export class FiliaisCertificadoService {
  constructor(private readonly prisma: PrismaService) {}

  private async filial(id: bigint) {
    const row = await this.prisma.fin_filiais.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Filial não encontrada.');
    if (!row.cnpj)
      throw new BadRequestException(
        'Cadastre o CNPJ da filial antes do certificado.',
      );
    return row;
  }
  private paths(code: string) {
    const safe = safeCode(code);
    const dir = join(CERT_ROOT, safe);
    return {
      dir,
      cert: join(dir, 'certificado.pfx'),
      secret: join(SECRET_ROOT, `${safe}.pass`),
    };
  }
  private inspect(buffer: Buffer, password: string, cnpj: string): Meta {
    const pfx = join('/tmp', `engeradios-a1-${process.pid}-${Date.now()}.pfx`);
    try {
      writeFileSync(pfx, buffer, { mode: 0o600, flag: 'wx' });
      let legacy = false;
      try {
        pkcs12(pfx, password, ['-noout'], false);
      } catch (error) {
        if (!(error instanceof OpenSslFailure)) throw error;
        if (isPasswordFailure(error.details)) {
          throw new BadRequestException('Senha do certificado inválida.');
        }
        if (!isLegacyFailure(error.details)) {
          throw new BadRequestException(
            'Arquivo PFX/P12 inválido, corrompido ou incompatível.',
          );
        }
        try {
          pkcs12(pfx, password, ['-noout'], true);
          legacy = true;
        } catch (legacyError) {
          if (
            legacyError instanceof OpenSslFailure &&
            isPasswordFailure(legacyError.details)
          ) {
            throw new BadRequestException('Senha do certificado inválida.');
          }
          throw new BadRequestException(
            'Certificado usa algoritmo legado não suportado neste servidor.',
          );
        }
      }

      let certPem: string;
      let keyPem: string;
      try {
        certPem = pkcs12(pfx, password, ['-clcerts', '-nokeys'], legacy);
        keyPem = pkcs12(pfx, password, ['-nocerts', '-nodes'], legacy);
      } catch (error) {
        if (
          error instanceof OpenSslFailure &&
          isPasswordFailure(error.details)
        ) {
          throw new BadRequestException('Senha do certificado inválida.');
        }
        throw new BadRequestException(
          'Não foi possível extrair o certificado e a chave privada.',
        );
      }
      if (!certPem.includes('BEGIN CERTIFICATE')) {
        throw new BadRequestException(
          'O arquivo não contém certificado digital.',
        );
      }
      if (!keyPem.includes('PRIVATE KEY')) {
        throw new BadRequestException('O arquivo não contém chave privada.');
      }

      let identity: ReturnType<typeof extractCnpjIcpBrasil>;
      try {
        identity = extractCnpjIcpBrasil(certPem);
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException(
          'Não foi possível decodificar a identidade ICP-Brasil do certificado.',
        );
      }
      if (!identity.oidFound) {
        throw new BadRequestException(
          'O certificado não possui o CNPJ no OID ICP-Brasil 2.16.76.1.3.3.',
        );
      }
      const expected = cnpj.replace(/\D/g, '');
      const validCandidates = (identity.cnpjs ?? [])
        .map((value) => value.replace(/\D/g, ''))
        .filter((value) => isValidCnpj(value));
      const matchingCandidates = [
        ...new Set(
          validCandidates.filter(
            (value) => value.slice(0, 8) === expected.slice(0, 8),
          ),
        ),
      ];
      if (matchingCandidates.length === 0) {
        throw new BadRequestException(
          'Nenhum CNPJ do certificado pertence à raiz desta filial.',
        );
      }
      if (matchingCandidates.length > 1) {
        throw new BadRequestException(
          'O certificado contém mais de um CNPJ correspondente à raiz desta filial.',
        );
      }
      const certificateCnpj = matchingCandidates[0];
      const exactMatch = certificateCnpj === expected;

      const value = (name: string) =>
        identity.text.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1]?.trim();
      const notAfter = parseDate(value('notAfter'));
      const notBefore = parseDate(value('notBefore'));
      if (!notAfter)
        throw new BadRequestException(
          'Não foi possível identificar a validade do certificado.',
        );
      return {
        situacao: notAfter.getTime() <= Date.now() ? 'EXPIRADO' : 'VALIDO',
        instalado: true,
        validoAte: notAfter.toISOString(),
        validoDesde: notBefore?.toISOString(),
        emissor: value('issuer'),
        titular: value('subject'),
        serial: value('serial'),
        sha256: createHash('sha256').update(buffer).digest('hex'),
        arquivoBytes: buffer.length,
        mensagem:
          [
            legacy
              ? 'Certificado validado em modo de compatibilidade legado.'
              : '',
            !exactMatch
              ? 'Certificado compartilhado por estabelecimento da mesma raiz de CNPJ.'
              : '',
            (identity.extractionSource ?? '').includes('SUBJECT')
              ? 'CNPJ selecionado entre ocorrências válidas do Subject/CN/OU.'
              : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined,
      };
    } finally {
      void rm(pfx, { force: true }).catch(() => undefined);
    }
  }
  private async audit(
    filialId: bigint,
    userId: string | undefined,
    action: string,
    data: unknown,
  ) {
    await this.prisma.fin_filiais_historico.create({
      data: {
        filial_id: filialId,
        usuario_id: userId || null,
        acao: action,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- retorno dinamico legado do Prisma
        depois: JSON.parse(JSON.stringify(data)),
      },
    });
  }
  async status(id: bigint): Promise<Meta> {
    const filial = await this.filial(id);
    const p = this.paths(filial.codigo);
    try {
      try {
        await Promise.all([stat(p.cert), stat(p.secret)]);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return { situacao: 'NAO_CONFIGURADO', instalado: false };
        }
        throw error;
      }
      const [buffer, password, info] = await Promise.all([
        readFile(p.cert),
        readFile(p.secret, 'utf8'),
        stat(p.cert),
      ]);
      const meta = this.inspect(buffer, password, filial.cnpj!);
      return { ...meta, arquivoBytes: info.size };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { situacao: 'NAO_CONFIGURADO', instalado: false };
      }
      if (error instanceof BadRequestException) {
        return {
          situacao: 'INVALIDO',
          instalado: true,
          mensagem: error.message,
        };
      }
      return {
        situacao: 'INVALIDO',
        instalado: true,
        mensagem: 'Certificado configurado, mas não pôde ser validado.',
      };
    }
  }
  async install(
    id: bigint,
    file: Express.Multer.File | undefined,
    password: string,
    userId?: string,
  ) {
    const filial = await this.filial(id);
    if (!file?.buffer?.length)
      throw new BadRequestException('Selecione um certificado .pfx ou .p12.');
    if (file.size > MAX_BYTES)
      throw new BadRequestException('O certificado deve ter no máximo 5 MB.');
    if (!/\.(pfx|p12)$/i.test(file.originalname))
      throw new BadRequestException('Envie um arquivo .pfx ou .p12.');
    if (!password)
      throw new BadRequestException('Informe a senha do certificado.');
    const meta = this.inspect(file.buffer, password, filial.cnpj!);
    const p = this.paths(filial.codigo);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nonce = `${process.pid}.${Date.now()}`;
    const tmpCert = join(p.dir, `.certificado.${nonce}.tmp`);
    const tmpSecret = join(SECRET_ROOT, `.${basename(p.secret)}.${nonce}.tmp`);
    try {
      await mkdir(p.dir, { recursive: true, mode: 0o770 });
      try {
        await copyFile(p.cert, join(p.dir, `certificado.${stamp}.bak`));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      await writeFile(tmpCert, file.buffer, { mode: 0o640, flag: 'wx' });
      await writeFile(tmpSecret, password, { mode: 0o640, flag: 'wx' });
      await chmod(tmpCert, 0o640);
      await chmod(tmpSecret, 0o640);
      await rename(tmpCert, p.cert);
      await rename(tmpSecret, p.secret);
      await this.audit(id, userId, 'CERT_A1_INSTALAR', {
        situacao: meta.situacao,
        validoAte: meta.validoAte,
        sha256: meta.sha256,
      });
      return meta;
    } catch (error) {
      await Promise.allSettled([
        rm(tmpCert, { force: true }),
        rm(tmpSecret, { force: true }),
      ]);
      if (error instanceof BadRequestException) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (['EACCES', 'EPERM', 'EROFS'].includes(code ?? '')) {
        throw new ServiceUnavailableException(
          'O servidor não conseguiu gravar o certificado com segurança.',
        );
      }
      throw new InternalServerErrorException(
        'Falha ao armazenar o certificado digital.',
      );
    }
  }
  async remove(id: bigint, userId?: string) {
    const filial = await this.filial(id);
    const p = this.paths(filial.codigo);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    try {
      await rename(p.cert, join(p.dir, `certificado.${stamp}.removido`));
    } catch {
      // Falha ignorada intencionalmente neste fallback.
    }
    await rm(p.secret, { force: true });
    await this.audit(id, userId, 'CERT_A1_REMOVER', {
      removidoEm: new Date().toISOString(),
    });
    return { success: true };
  }
  async sefazStatus(id: bigint) {
    const filial = await this.filial(id);
    const p = this.paths(filial.codigo);
    const work = join('/tmp', `engeradios-sefaz-${process.pid}-${Date.now()}`);
    const cert = join(work, 'cert.pem');
    const key = join(work, 'key.pem');
    const ca = join(work, 'ca.pem');
    const request = join(work, 'request.xml');
    const response = join(work, 'response.xml');
    const started = Date.now();
    try {
      await mkdir(work, { mode: 0o700 });
      const password = await readFile(p.secret, 'utf8');
      await writeFile(ca, ICP_BRASIL_V10, { mode: 0o600 });
      const env = { ...process.env, PFX_PASS: password };
      const common = [
        'pkcs12',
        '-legacy',
        '-in',
        p.cert,
        '-passin',
        'env:PFX_PASS',
      ];
      await execFileAsync(
        'openssl',
        [...common, '-clcerts', '-nokeys', '-out', cert],
        { env, timeout: 15000 },
      );
      await execFileAsync(
        'openssl',
        [...common, '-nocerts', '-nodes', '-out', key],
        { env, timeout: 15000 },
      );
      const xml = `<?xml version="1.0" encoding="UTF-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4"><consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>33</cUF><xServ>STATUS</xServ></consStatServ></nfeDadosMsg></soap12:Body></soap12:Envelope>`;
      await writeFile(request, xml, { mode: 0o600 });
      await execFileAsync(
        'curl',
        [
          '--fail-with-body',
          '--silent',
          '--show-error',
          '--connect-timeout',
          '10',
          '--max-time',
          '30',
          '--cacert',
          ca,
          '--cert',
          cert,
          '--key',
          key,
          '-H',
          'Content-Type: application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF"',
          '--data-binary',
          `@${request}`,
          '-o',
          response,
          SVRS_STATUS_HOM,
        ],
        { timeout: 35000 },
      );
      const body = await readFile(response, 'utf8');
      const pick = (name: string) =>
        body.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? null;
      const result = {
        ambiente: 'HOMOLOGACAO',
        tpAmb: pick('tpAmb'),
        cStat: pick('cStat'),
        xMotivo: pick('xMotivo'),
        cUF: pick('cUF'),
        tempoMs: Date.now() - started,
        consultadoEm: new Date().toISOString(),
      };
      if (result.cStat !== '107')
        throw new ServiceUnavailableException(
          `SEFAZ indisponível: ${result.xMotivo ?? 'resposta inválida'}`,
        );
      await this.audit(id, undefined, 'SEFAZ_STATUS_CONSULTAR', {
        cStat: result.cStat,
        tempoMs: result.tempoMs,
        ambiente: result.ambiente,
      });
      return result;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'Não foi possível consultar o status da SEFAZ em homologação.',
      );
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
}
