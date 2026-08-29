import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as XLSX from 'xlsx';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

type Row = Record<string, unknown>;

type ParsedOrder = {
  linha: number;
  fingerprint: string;
  data: Prisma.fin_pedidos_vendaCreateManyInput;
};

type DatabaseClient = PrismaService | Prisma.TransactionClient;

const REQUIRED_HEADERS = [
  'Local',
  'Local Estoque',
  'Pedido',
  'Data Pedido',
  'Data Prev.Fat.',
  'Seu Pedido',
  'Area Entrega',
  'Fase Negociação',
  'Situação Pedido',
  'Cliente',
  'Endereço de Entrega',
  'Bairro de Entrega',
  'Cidade de Entrega',
  'Representante',
  'Cond.Pagamento',
  'Natureza',
  'Transportadora',
  'Tipo Frete',
  'Status',
  'Espécie',
  'Motivo',
  'Produto',
  'Descrição',
  'Grupo',
  'Quantidade',
  'Valor Unitário',
  '% Desconto',
  'Val.Desconto',
  'Valor Produtos',
  'Valor ST',
  'Valor FCP ST',
  'Valor IPI',
  'Frete',
  'Val.Pedido',
  'Valor Enc.Financ',
  'Valor ICMS',
  '% ICMS',
  'Valor ICMS Dif',
  'Valor ICMS Z.Franca',
  '% IPI',
  'Valor Partilha',
  'Valor Pobreza',
  'Texto',
] as const;

const FINGERPRINT_FIELDS = [
  'local',
  'local_estoque',
  'pedido',
  'pedido_normalizado',
  'data_pedido',
  'data_prev_fat',
  'seu_pedido',
  'area_entrega',
  'fase_negociacao',
  'situacao_pedido',
  'cliente',
  'endereco_entrega',
  'bairro_entrega',
  'cidade_entrega',
  'representante',
  'cond_pagamento',
  'natureza',
  'transportadora',
  'tipo_frete',
  'status',
  'especie',
  'motivo',
  'produto',
  'descricao',
  'grupo',
  'quantidade',
  'valor_unitario',
  'pct_desconto',
  'val_desconto',
  'valor_produtos',
  'valor_st',
  'valor_fcp_st',
  'valor_ipi',
  'frete',
  'val_pedido',
  'valor_enc_financ',
  'valor_icms',
  'pct_icms',
  'valor_icms_dif',
  'valor_icms_z_franca',
  'pct_ipi',
  'valor_partilha',
  'valor_pobreza',
  'texto',
] as const;

@Injectable()
export class SalesOrdersImportService {
  private readonly logger = new Logger(SalesOrdersImportService.name);

  constructor(private readonly db: PrismaService) {}

  private text(value: unknown, maximum = 5000): string | null {
    if (value === null || value === undefined) return null;

    let result: string;

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint' ||
      typeof value === 'boolean'
    ) {
      result = String(value).trim();
    } else if (value instanceof Date) {
      result = value.toISOString();
    } else if (Prisma.Decimal.isDecimal(value)) {
      result = value.toFixed();
    } else {
      return null;
    }

    return result ? result.slice(0, maximum) : null;
  }

  private normalizePedido(value: unknown): string | null {
    const pedido = this.text(value, 80)?.replace(/\s+/g, ' ').trim();

    if (!pedido) return null;

    return pedido.replace(/\s+0$/, '').trim();
  }

  private decimal(value: unknown): Prisma.Decimal | null {
    const raw = this.text(value);

    if (!raw) return null;

    const normalized = raw
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    if (!Number.isFinite(Number(normalized))) return null;

    return new Prisma.Decimal(normalized);
  }

  private date(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date && !Number.isNaN(value.valueOf())) {
      return new Date(
        Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
      );
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const millisecondsPerDay = 86_400_000;

      return new Date(excelEpoch + Math.floor(value) * millisecondsPerDay);
    }

    if (typeof value !== 'string') return null;

    const text = value.trim();
    const brazilian = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (brazilian) {
      return new Date(
        Date.UTC(
          Number(brazilian[3]),
          Number(brazilian[2]) - 1,
          Number(brazilian[1]),
        ),
      );
    }

    const parsed = new Date(text);

    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }

  private normalizedScalar(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (Prisma.Decimal.isDecimal(value)) {
      return value.toFixed();
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint' ||
      typeof value === 'boolean'
    ) {
      const normalized = String(value).trim();
      return normalized || null;
    }

    return null;
  }

  private fingerprint(record: Record<string, unknown>): string {
    const normalized = FINGERPRINT_FIELDS.map((field) => {
      if (field === 'pedido_normalizado') {
        return this.normalizePedido(record.pedido_normalizado ?? record.pedido);
      }

      return this.normalizedScalar(record[field]);
    });

    return createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
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

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('A planilha não possui abas.');
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Row>(sheet, {
      defval: null,
      raw: true,
    });

    if (!rows.length) {
      throw new BadRequestException('A planilha não possui registros.');
    }

    const headers = Object.keys(rows[0]);
    const missing = REQUIRED_HEADERS.filter(
      (header) => !headers.includes(header),
    );

    if (missing.length) {
      throw new BadRequestException(`Colunas ausentes: ${missing.join(', ')}`);
    }

    return rows;
  }

  private mapRow(row: Row): Prisma.fin_pedidos_vendaCreateManyInput {
    const pedido = this.text(row['Pedido'], 80);

    return {
      local: this.text(row['Local'], 80),
      local_estoque: this.text(row['Local Estoque'], 80),
      pedido,
      pedido_normalizado: this.normalizePedido(pedido),
      data_pedido: this.date(row['Data Pedido']),
      data_prev_fat: this.date(row['Data Prev.Fat.']),
      seu_pedido: this.text(row['Seu Pedido'], 100),
      area_entrega: this.text(row['Area Entrega'], 120),
      fase_negociacao: this.text(row['Fase Negociação'], 120),
      situacao_pedido: this.text(row['Situação Pedido'], 120),
      cliente: this.text(row['Cliente'], 255),
      endereco_entrega: this.text(row['Endereço de Entrega']),
      bairro_entrega: this.text(row['Bairro de Entrega'], 160),
      cidade_entrega: this.text(row['Cidade de Entrega'], 180),
      representante: this.text(row['Representante'], 180),
      cond_pagamento: this.text(row['Cond.Pagamento'], 120),
      natureza: this.text(row['Natureza'], 120),
      transportadora: this.text(row['Transportadora'], 180),
      tipo_frete: this.text(row['Tipo Frete'], 80),
      status: this.text(row['Status'], 180),
      especie: this.text(row['Espécie'], 80),
      motivo: this.text(row['Motivo'], 255),
      produto: this.text(row['Produto'], 120),
      descricao: this.text(row['Descrição'], 500),
      grupo: this.text(row['Grupo'], 120),
      quantidade: this.decimal(row['Quantidade']),
      valor_unitario: this.decimal(row['Valor Unitário']),
      pct_desconto: this.decimal(row['% Desconto']),
      val_desconto: this.decimal(row['Val.Desconto']),
      valor_produtos: this.decimal(row['Valor Produtos']),
      valor_st: this.decimal(row['Valor ST']),
      valor_fcp_st: this.decimal(row['Valor FCP ST']),
      valor_ipi: this.decimal(row['Valor IPI']),
      frete: this.decimal(row['Frete']),
      val_pedido: this.decimal(row['Val.Pedido']),
      valor_enc_financ: this.decimal(row['Valor Enc.Financ']),
      valor_icms: this.decimal(row['Valor ICMS']),
      pct_icms: this.decimal(row['% ICMS']),
      valor_icms_dif: this.decimal(row['Valor ICMS Dif']),
      valor_icms_z_franca: this.decimal(row['Valor ICMS Z.Franca']),
      pct_ipi: this.decimal(row['% IPI']),
      valor_partilha: this.decimal(row['Valor Partilha']),
      valor_pobreza: this.decimal(row['Valor Pobreza']),
      texto: this.text(row['Texto']),
      importado_em: new Date(),
    };
  }

  private parse(file: Express.Multer.File) {
    const valid = new Map<string, ParsedOrder>();
    const rejected: Array<{ linha: number; motivo: string }> = [];
    let duplicates = 0;

    this.rows(file).forEach((row, index) => {
      const linha = index + 2;

      if (!Object.values(row).some((value) => this.text(value) !== null)) {
        return;
      }

      const data = this.mapRow(row);

      if (!data.pedido_normalizado) {
        rejected.push({
          linha,
          motivo: 'Pedido ausente ou inválido.',
        });
        return;
      }

      if (!data.produto) {
        rejected.push({
          linha,
          motivo: 'Produto ausente.',
        });
        return;
      }

      const fingerprint = this.fingerprint(data);

      if (valid.has(fingerprint)) {
        duplicates += 1;
        return;
      }

      valid.set(fingerprint, {
        linha,
        fingerprint,
        data,
      });
    });

    if (!valid.size) {
      throw new BadRequestException('Nenhuma linha válida encontrada.');
    }

    return {
      valid: [...valid.values()],
      rejected,
      duplicates,
    };
  }

  private async existingFingerprints(
    client: DatabaseClient,
    parsed: ParsedOrder[],
  ): Promise<Set<string>> {
    const normalizedOrders = [
      ...new Set(
        parsed
          .map((row) => row.data.pedido_normalizado)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const rawOrders = [
      ...new Set(
        parsed
          .map((row) => row.data.pedido)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const existing = new Set<string>();
    const chunkSize = 500;

    for (let index = 0; index < normalizedOrders.length; index += chunkSize) {
      const normalizedChunk = normalizedOrders.slice(index, index + chunkSize);

      const rawChunk = rawOrders.slice(index, index + chunkSize);

      const records = await client.fin_pedidos_venda.findMany({
        where: {
          OR: [
            {
              pedido_normalizado: {
                in: normalizedChunk,
              },
            },
            {
              pedido: {
                in: rawChunk,
              },
            },
          ],
        },
      });

      for (const record of records) {
        existing.add(this.fingerprint(record));
      }
    }

    return existing;
  }

  async previa(file: Express.Multer.File) {
    const parsed = this.parse(file);
    const existing = await this.existingFingerprints(this.db, parsed.valid);

    const news = parsed.valid.filter((row) => !existing.has(row.fingerprint));

    return {
      arquivo: file.originalname,
      tamanho: file.size,
      linhasValidas: parsed.valid.length,
      novas: news.length,
      jaExistentes: parsed.valid.length - news.length,
      duplicadasNaPlanilha: parsed.duplicates,
      rejeitadas: parsed.rejected.length,
      amostra: news.slice(0, 20).map((row) => ({
        linha: row.linha,
        pedido: row.data.pedido_normalizado,
        cliente: row.data.cliente,
        produto: row.data.produto,
        descricao: row.data.descricao,
        quantidade: this.normalizedScalar(row.data.quantidade),
        status: row.data.status,
      })),
      erros: parsed.rejected.slice(0, 50),
    };
  }

  async importar(file: Express.Multer.File, actor: string) {
    const parsed = this.parse(file);

    const result = await this.db.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`
          SELECT pg_advisory_xact_lock(739210604)
        `;

        const existing = await this.existingFingerprints(
          transaction,
          parsed.valid,
        );

        const pending = parsed.valid.filter(
          (row) => !existing.has(row.fingerprint),
        );

        let inserted = 0;
        const chunkSize = 400;

        for (let index = 0; index < pending.length; index += chunkSize) {
          const chunk = pending
            .slice(index, index + chunkSize)
            .map((row) => row.data);

          const created = await transaction.fin_pedidos_venda.createMany({
            data: chunk,
          });

          inserted += created.count;
        }

        return {
          inseridas: inserted,
          existentes: parsed.valid.length - pending.length,
        };
      },
      {
        maxWait: 10_000,
        timeout: 120_000,
      },
    );

    this.logger.log(
      JSON.stringify({
        evento: 'IMPORTACAO_PEDIDOS_VENDA',
        usuario: actor,
        arquivo: file.originalname,
        inseridas: result.inseridas,
        existentes: result.existentes,
        duplicadas: parsed.duplicates,
        rejeitadas: parsed.rejected.length,
      }),
    );

    return {
      sucesso: true,
      arquivo: file.originalname,
      usuario: actor,
      inseridas: result.inseridas,
      jaExistentes: result.existentes,
      duplicadasNaPlanilha: parsed.duplicates,
      rejeitadas: parsed.rejected.length,
      erros: parsed.rejected.slice(0, 50),
    };
  }
}
