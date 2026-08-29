import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as XLSX from 'xlsx';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

// OS_IMPORT_XLSX_SAFE_TYPES
type XlsxDateParts = {
  y: number;
  m: number;
  d: number;
  H: number;
  M: number;
  S: number;
};

type XlsxSsf = {
  parse_date_code(value: number): XlsxDateParts | null;
};

type Row = Record<string, unknown>;
type Parsed = { numero: string; data: Prisma.OrdemServicoUncheckedCreateInput };

const MAP: Record<string, keyof Prisma.OrdemServicoUncheckedCreateInput> = {
  Local: 'local',
  'Código Cliente': 'clienteCodigo',
  'Nome Fantasia Cliente': 'clienteNome',
  Telefone: 'telefone',
  CEP: 'cep',
  OS: 'numero',
  Tipo: 'tipo',
  Origem: 'origem',
  Situação: 'situacao',
  'Fase de Negociação': 'faseNegociacao',
  Status: 'status',
  '1o Equipamento': 'equipamento',
  Produto: 'produto',
  Chamado: 'chamado',
  Contrato: 'contrato',
  'Tipo Contrato': 'tipoContrato',
  Título: 'titulo',
  'Situação do Contrato': 'situacaoContrato',
  'End. Obra/ Instalação': 'enderecoObra',
  Fatura: 'fatura',
  Pedido: 'pedido',
  Representante: 'representante',
  Valor: 'valor',
  Abertura: 'abertura',
  Fechamento: 'fechamento',
  Duração: 'duracao',
  'Cadastro Ordem de Serviço': 'cadastro',
  'Cep Entrega': 'cepEntrega',
  Classificação: 'classificacao',
  Técnico: 'tecnico',
  Atendente: 'atendente',
  Solicitante: 'solicitante',
  Terceiros: 'terceiros',
  'Tipo Conclusão': 'tipoConclusao',
  'Zona de Atuação': 'zonaAtuacao',
};

@Injectable()
export class OsImportService {
  constructor(private readonly db: PrismaService) {}

  private safeString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return `${value}`;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    try {
      return JSON.stringify(value) || '';
    } catch {
      return '';
    }
  }

  private text(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const v = this.safeString(value).trim();
    return v === '' ? null : v;
  }

  private number(value: unknown): Prisma.Decimal {
    if (typeof value === 'number') return new Prisma.Decimal(value);
    const raw = this.text(value)?.replace(/\./g, '').replace(',', '.') || '0';
    return new Prisma.Decimal(Number.isFinite(Number(raw)) ? raw : '0');
  }

  private date(value: unknown, dateOnly = false): Date | null {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
    if (typeof value === 'number') {
      const ssf: unknown = XLSX.SSF;
      const parts = (ssf as XlsxSsf).parse_date_code(value);
      if (!parts) return null;
      return new Date(
        Date.UTC(
          parts.y,
          parts.m - 1,
          parts.d,
          dateOnly ? 0 : parts.H,
          dateOnly ? 0 : parts.M,
          dateOnly ? 0 : Math.floor(parts.S),
        ),
      );
    }
    const s = this.safeString(value).trim();
    const br = s.match(
      /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    );
    if (br)
      return new Date(
        Number(br[3]),
        Number(br[2]) - 1,
        Number(br[1]),
        dateOnly ? 0 : Number(br[4] || 0),
        dateOnly ? 0 : Number(br[5] || 0),
        dateOnly ? 0 : Number(br[6] || 0),
      );
    const d = new Date(s);
    return Number.isNaN(d.valueOf()) ? null : d;
  }

  private ufFromCep(value: unknown): string | null {
    const d = this.safeString(value).replace(/\D/g, '');
    if (d.length < 5) return null;
    const n = Number(d.slice(0, 5));
    const ranges: Array<[number, number, string]> = [
      [1000, 19999, 'SP'],
      [20000, 28999, 'RJ'],
      [29000, 29999, 'ES'],
      [30000, 39999, 'MG'],
      [40000, 48999, 'BA'],
      [49000, 49999, 'SE'],
      [50000, 56999, 'PE'],
      [57000, 57999, 'AL'],
      [58000, 58999, 'PB'],
      [59000, 59999, 'RN'],
      [60000, 63999, 'CE'],
      [64000, 64999, 'PI'],
      [65000, 65999, 'MA'],
      [66000, 68899, 'PA'],
      [68900, 68999, 'AP'],
      [69000, 69299, 'AM'],
      [69300, 69399, 'RR'],
      [69400, 69899, 'AM'],
      [69900, 69999, 'AC'],
      [70000, 72799, 'DF'],
      [72800, 72999, 'GO'],
      [73000, 73699, 'DF'],
      [73700, 76799, 'GO'],
      [76800, 76999, 'RO'],
      [77000, 77999, 'TO'],
      [78000, 78899, 'MT'],
      [78900, 78999, 'RO'],
      [79000, 79999, 'MS'],
      [80000, 87999, 'PR'],
      [88000, 89999, 'SC'],
      [90000, 99999, 'RS'],
    ];
    return ranges.find(([a, b]) => n >= a && n <= b)?.[2] || null;
  }

  private stableId(key: string): number {
    const hash = createHash('sha256').update(key).digest();
    return -1 * ((hash.readUInt32BE(0) % 2_000_000_000) + 1);
  }

  private rows(file: Express.Multer.File): Row[] {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, {
        type: 'buffer',
        raw: true,
        cellDates: true,
      });
    } catch {
      throw new BadRequestException('Não foi possível abrir a planilha XLSX.');
    }
    const first = workbook.SheetNames[0];
    if (!first) throw new BadRequestException('A planilha não possui abas.');
    const grid = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[first], {
      header: 1,
      defval: null,
      raw: true,
    });
    const headerIndex = grid.findIndex(
      (r) =>
        Array.isArray(r) && r.some((v) => this.safeString(v).trim() === 'OS'),
    );
    if (headerIndex < 0)
      throw new BadRequestException('Coluna "OS" não encontrada no cabeçalho.');
    const headers = grid[headerIndex].map((v) => this.safeString(v).trim());
    return grid.slice(headerIndex + 1).map((raw) => {
      const row: Row = {};
      headers.forEach((h, i) => {
        if (h) row[h] = raw[i];
      });
      return row;
    });
  }

  private parse(file: Express.Multer.File): {
    valid: Parsed[];
    rejected: Array<{ linha: number; motivo: string }>;
  } {
    const valid: Parsed[] = [];
    const rejected: Array<{ linha: number; motivo: string }> = [];
    this.rows(file).forEach((row, index) => {
      const rawNumber = this.text(row.OS);
      const numero =
        rawNumber && /^\d/.test(rawNumber)
          ? rawNumber.replace(/\.0$/, '')
          : null;
      if (!numero) {
        if (Object.values(row).some((v) => this.text(v)))
          rejected.push({ linha: index + 2, motivo: 'OS inválida ou ausente' });
        return;
      }
      const data: Prisma.OrdemServicoUncheckedCreateInput = {
        origem: 'xlsx',
        origemId: this.stableId(`os:${numero}`),
        numero,
        sincronizadoEm: new Date(),
        atualizadoEm: new Date(),
      };
      for (const [header, field] of Object.entries(MAP)) {
        if (field === 'numero' || field === 'origem') continue;
        const value = row[header];
        if (field === 'valor') data.valor = this.number(value);
        else if (field === 'abertura' || field === 'fechamento')
          data[field] = this.date(value);
        else if (field === 'cadastro') data.cadastro = this.date(value, true);
        else
          (data as unknown as Record<string, unknown>)[field] =
            this.text(value);
      }
      if (!data.tipo && this.text(row.Origem))
        data.tipo = this.text(row.Origem);
      data.uf = this.ufFromCep(data.cepEntrega) || this.ufFromCep(data.cep);
      data.ultimaOrigem = file.originalname
        .replace(/\.xlsx$/i, '')
        .slice(0, 120);
      valid.push({ numero, data });
    });
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    valid.forEach(({ numero }) =>
      seen.has(numero) ? duplicates.add(numero) : seen.add(numero),
    );
    if (duplicates.size)
      throw new BadRequestException(
        `A planilha contém OS duplicadas: ${Array.from(duplicates).slice(0, 10).join(', ')}`,
      );
    if (!valid.length)
      throw new BadRequestException('Nenhuma OS válida encontrada.');
    return { valid, rejected };
  }

  // OS_IMPORTACAO_AUDITORIA_DETALHADA
  private auditValue(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Prisma.Decimal.isDecimal(value)) {
      return value.toString();
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private comparable(value: unknown): string {
    const normalized = this.auditValue(value);

    if (normalized === Prisma.JsonNull) {
      return 'null';
    }

    return JSON.stringify(normalized);
  }

  private importedFields(
    data: Prisma.OrdemServicoUncheckedCreateInput,
  ): string[] {
    const ignored = new Set([
      'id',
      'origem',
      'origemId',
      'numero',
      'clienteId',
      'sincronizadoEm',
      'criadoEm',
      'atualizadoEm',
    ]);

    return Object.keys(data).filter((field) => !ignored.has(field));
  }

  previa(file: Express.Multer.File) {
    const parsed = this.parse(file);
    return {
      arquivo: file.originalname,
      validas: parsed.valid.length,
      rejeitadas: parsed.rejected.length,
      amostra: parsed.valid.slice(0, 20).map(({ numero, data }) => ({
        numero,
        cliente: data.clienteNome,
        tipo: data.tipo,
        situacao: data.situacao,
        status: data.status,
      })),
      erros: parsed.rejected.slice(0, 50),
    };
  }

  async importar(
    file: Express.Multer.File,
    actor: {
      id: string | null;
      nome: string;
    },
  ) {
    const parsed = this.parse(file);
    const started = new Date();
    const startedMs = Date.now();

    const hashSha256 = createHash('sha256').update(file.buffer).digest('hex');

    let incluidos = 0;
    let alterados = 0;
    let ignorados = 0;

    try {
      const result = await this.db.$transaction(
        async (tx) => {
          const importacao = await tx.osImportacaoAuditoria.create({
            data: {
              usuarioId: actor.id,
              usuarioNome: actor.nome,
              arquivo: file.originalname,
              hashSha256,
              status: 'EM_EXECUCAO',
              totalLido: parsed.valid.length,
              rejeitados: parsed.rejected.length,
            },
            select: {
              id: true,
            },
          });

          for (const row of parsed.valid) {
            const existing = await tx.ordemServico.findFirst({
              where: {
                numero: row.numero,
              },
            });

            const clientCode = row.data.clienteCodigo
              ? String(row.data.clienteCodigo)
              : null;

            let clienteId: string | null = null;

            if (clientCode && row.data.clienteNome) {
              const client = await tx.clienteOperacional.findFirst({
                where: {
                  codigo: clientCode,
                },
                select: {
                  id: true,
                },
              });

              if (client) {
                clienteId = client.id;
              } else {
                const created = await tx.clienteOperacional.create({
                  data: {
                    origem: 'xlsx',
                    origemId: this.stableId(`cliente:${clientCode}`),
                    codigo: clientCode,
                    razaoSocial: String(row.data.clienteNome),
                    nomeFantasia: String(row.data.clienteNome),
                    sincronizadoEm: new Date(),
                  },
                  select: {
                    id: true,
                  },
                });

                clienteId = created.id;
              }
            }

            row.data.clienteId = clienteId;

            if (!existing) {
              const created = await tx.ordemServico.create({
                data: row.data,
              });

              await tx.osHistoricoAlteracao.create({
                data: {
                  ordemServicoId: created.id,
                  numeroOs: row.numero,
                  importacaoId: importacao.id,
                  usuarioId: actor.id,
                  usuarioNome: actor.nome,
                  campo: '__CRIACAO__',
                  valorAnterior: Prisma.JsonNull,
                  valorNovo: {
                    numero: created.numero,
                    clienteCodigo: created.clienteCodigo,
                    clienteNome: created.clienteNome,
                    tipo: created.tipo,
                    situacao: created.situacao,
                    status: created.status,
                    tecnico: created.tecnico,
                    abertura: created.abertura?.toISOString() ?? null,
                    fechamento: created.fechamento?.toISOString() ?? null,
                  },
                },
              });

              incluidos++;
              continue;
            }

            const fields = this.importedFields(row.data);

            const changes = fields.flatMap((field) => {
              const newValue = (row.data as unknown as Record<string, unknown>)[
                field
              ];

              const oldValue = (existing as unknown as Record<string, unknown>)[
                field
              ];

              if (this.comparable(oldValue) === this.comparable(newValue)) {
                return [];
              }

              return [
                {
                  campo: field,
                  valorAnterior: this.auditValue(oldValue),
                  valorNovo: this.auditValue(newValue),
                },
              ];
            });

            const clienteAlterado =
              this.comparable(existing.clienteId) !==
              this.comparable(clienteId);

            if (!changes.length && !clienteAlterado) {
              ignorados++;
              continue;
            }

            await tx.ordemServico.update({
              where: {
                id: existing.id,
              },
              data: row.data,
            });

            if (clienteAlterado) {
              changes.push({
                campo: 'clienteId',
                valorAnterior: this.auditValue(existing.clienteId),
                valorNovo: this.auditValue(clienteId),
              });
            }

            await tx.osHistoricoAlteracao.createMany({
              data: changes.map((change) => ({
                ordemServicoId: existing.id,
                numeroOs: row.numero,
                importacaoId: importacao.id,
                usuarioId: actor.id,
                usuarioNome: actor.nome,
                campo: change.campo,
                valorAnterior: change.valorAnterior,
                valorNovo: change.valorNovo,
              })),
            });

            alterados++;
          }

          const durationMs = Date.now() - startedMs;

          await tx.osImportacaoAuditoria.update({
            where: {
              id: importacao.id,
            },
            data: {
              status: 'CONCLUIDA',
              incluidos,
              alterados,
              ignorados,
              rejeitados: parsed.rejected.length,
              duracaoMs: durationMs,
            },
          });

          const synchronization = await tx.sincronizacaoOperacional.create({
            data: {
              tipo: 'IMPORTACAO_XLSX',
              status: 'CONCLUIDA',
              iniciadoEm: started,
              finalizadoEm: new Date(),
              clientesLidos: 0,
              osLidas: parsed.valid.length,
              equipamentosProcessados: 0,
              mensagem: `Importação concluída por ${actor.nome}`,
              detalhes: {
                arquivo: file.originalname,
                hashSha256,
                importacaoAuditoriaId: importacao.id,
                incluidos,
                alterados,
                ignorados,
                rejeitados: parsed.rejected.length,
                usuarioId: actor.id,
                usuarioNome: actor.nome,
                duracaoMs: durationMs,
              },
            },
            select: {
              id: true,
            },
          });

          return {
            importacaoId: importacao.id,
            sincronizacaoId: synchronization.id,
            duracaoMs: durationMs,
          };
        },
        {
          timeout: 120_000,
          maxWait: 10_000,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return {
        status: 'concluida',
        importacaoId: result.importacaoId,
        sincronizacaoId: result.sincronizacaoId,
        total: parsed.valid.length,
        incluidos,
        alterados,
        ignorados,
        rejeitados: parsed.rejected.length,
        duracaoMs: result.duracaoMs,
        hashSha256,
        erros: parsed.rejected.slice(0, 50),
      };
    } catch (error) {
      const durationMs = Date.now() - startedMs;

      const message =
        error instanceof Error
          ? error.message.slice(0, 2000)
          : 'Falha na importação';

      await this.db.osImportacaoAuditoria
        .create({
          data: {
            usuarioId: actor.id,
            usuarioNome: actor.nome,
            arquivo: file.originalname,
            hashSha256,
            status: 'ERRO',
            totalLido: parsed.valid.length,
            incluidos: 0,
            alterados: 0,
            ignorados: 0,
            rejeitados: parsed.rejected.length,
            duracaoMs: durationMs,
            erro: message,
          },
        })
        .catch(() => undefined);

      await this.db.sincronizacaoOperacional
        .create({
          data: {
            tipo: 'IMPORTACAO_XLSX',
            status: 'ERRO',
            iniciadoEm: started,
            finalizadoEm: new Date(),
            clientesLidos: 0,
            osLidas: 0,
            equipamentosProcessados: 0,
            mensagem: message.slice(0, 500),
            detalhes: {
              arquivo: file.originalname,
              hashSha256,
              usuarioId: actor.id,
              usuarioNome: actor.nome,
              duracaoMs: durationMs,
            },
          },
        })
        .catch(() => undefined);

      throw error;
    }
  }
}
