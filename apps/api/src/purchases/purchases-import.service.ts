import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as XLSX from 'xlsx';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

type Row = Record<string, unknown>;
type Actor = { id: string | null; name: string };
type Valid = {
  line: number;
  proposalNumber: string;
  proposalId: number | null;
  status: string;
  phase: string | null;
  clientCode: string | null;
  clientName: string | null;
  local: string | null;
  contract: string | null;
  type: string | null;
  productCode: string;
  productDescription: string;
  group: string | null;
  group2: string | null;
  quantity: Prisma.Decimal;
  unitValue: Prisma.Decimal | null;
  discount: Prisma.Decimal | null;
  discountValue: Prisma.Decimal | null;
  totalValue: Prisma.Decimal | null;
  fingerprint: string;
};
type Rejected = {
  line: number;
  proposalNumber: string | null;
  productCode: string | null;
  status: string | null;
  reason: string;
  data: Prisma.InputJsonValue;
};

const REQUIRED = [
  'Local',
  'Cód. Produto',
  'Proposta',
  'Status',
  'Fase Negociação',
  'Cliente',
  'Nome do Cliente',
  'Produto',
  'Qtd. Produto',
  'Valor Unit. Produto',
  'Desconto Produto',
  'Valor Desc. Produto',
  'Valor Total Produto',
];

@Injectable()
export class PurchasesImportService {
  constructor(private readonly db: PrismaService) {}

  private text(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value).trim()
      : '';
  }
  private decimal(value: unknown): Prisma.Decimal | null {
    const raw = this.text(value).replace(',', '.');
    if (!raw) return null;
    try {
      return new Prisma.Decimal(raw);
    } catch {
      return null;
    }
  }

  private jsonScalar(value: unknown): Prisma.InputJsonValue | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : String(value);
    }
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.jsonScalar(item));
    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          this.jsonScalar(item),
        ]),
      );
    }
    return null;
  }

  private json(row: Row): Prisma.InputJsonObject {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, this.jsonScalar(value)]),
    );
  }

  private validateFile(file: Express.Multer.File) {
    if (
      !/\.xlsx$/i.test(file.originalname) ||
      file.mimetype !==
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
      throw new BadRequestException('Envie um arquivo XLSX válido.');
    if (!file.buffer?.length) throw new BadRequestException('Arquivo vazio.');
  }
  private rows(file: Express.Multer.File): Row[] {
    this.validateFile(file);
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: true,
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet)
      throw new BadRequestException('A planilha não possui uma aba válida.');
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, {
      defval: null,
      raw: true,
    });
    const headers = new Set(Object.keys(rows[0] ?? {}));
    const missing = REQUIRED.filter((item) => !headers.has(item));
    if (missing.length)
      throw new BadRequestException(
        `Cabeçalhos ausentes: ${missing.join(', ')}`,
      );
    return rows;
  }
  private async parse(file: Express.Multer.File) {
    const rows = this.rows(file);
    const numbers = [
      ...new Set(rows.map((r) => this.text(r.Proposta)).filter(Boolean)),
    ];
    const proposals = await this.db.opProposta.findMany({
      where: { numero: { in: numbers } },
      select: { id: true, numero: true },
    });
    const map = new Map(proposals.map((p) => [p.numero, p.id]));
    // PROPOSTA_JA_IMPORTADA_REJEICAO
    const importedProposals = await this.db.comprasProposta.findMany({
      where: { propostaNumero: { in: numbers } },
      select: { propostaNumero: true },
    });
    const importedNumbers = new Set(
      importedProposals.map((item) => item.propostaNumero),
    );
    const valid: Valid[] = [];
    const rejected: Rejected[] = [];
    rows.forEach((row, index) => {
      const line = index + 2,
        proposalNumber = this.text(row.Proposta),
        productCode = this.text(row['Cód. Produto']);
      const productDescription = this.text(row.Produto),
        status = this.text(row.Status).toUpperCase(),
        quantity = this.decimal(row['Qtd. Produto']);
      const reasons: string[] = [];
      if (status !== 'APROVADO') reasons.push('Status diferente de APROVADO');
      if (!proposalNumber) reasons.push('Proposta ausente');
      if (!productCode) reasons.push('Código do produto ausente');
      if (!productDescription) reasons.push('Descrição do produto ausente');
      if (!quantity || quantity.lte(0)) reasons.push('Quantidade inválida');
      if (!map.has(proposalNumber))
        reasons.push('Proposta não localizada no cadastro de Propostas');
      if (importedNumbers.has(proposalNumber))
        reasons.push('Proposta já importada anteriormente');
      if (reasons.length) {
        rejected.push({
          line,
          proposalNumber: proposalNumber || null,
          productCode: productCode || null,
          status: status || null,
          reason: reasons.join('; '),
          data: this.json(row),
        });
        return;
      }
      const fingerprint = createHash('sha256')
        .update(
          [
            proposalNumber,
            productCode,
            productDescription,
            quantity!.toString(),
            this.text(row.Local),
          ].join('|'),
        )
        .digest('hex');
      valid.push({
        line,
        proposalNumber,
        proposalId: map.get(proposalNumber) ?? null,
        status,
        phase: this.text(row['Fase Negociação']) || null,
        clientCode: this.text(row.Cliente) || null,
        clientName: this.text(row['Nome do Cliente']) || null,
        local: this.text(row.Local) || null,
        contract: this.text(row.Contrato) || null,
        type: this.text(row.Tipo) || null,
        productCode,
        productDescription,
        group: this.text(row['Grupo Produto']) || null,
        group2: this.text(row['Grupo 2 Produto']) || null,
        quantity: quantity!,
        unitValue: this.decimal(row['Valor Unit. Produto']),
        discount: this.decimal(row['Desconto Produto']),
        discountValue: this.decimal(row['Valor Desc. Produto']),
        totalValue: this.decimal(row['Valor Total Produto']),
        fingerprint,
      });
    });
    return { rows, valid, rejected };
  }
  async preview(file: Express.Multer.File) {
    const parsed = await this.parse(file);
    const proposals = new Set(parsed.valid.map((v) => v.proposalNumber));
    return {
      arquivo: file.originalname,
      totalLinhas: parsed.rows.length,
      linhasAprovadas: parsed.valid.length,
      linhasRejeitadas: parsed.rejected.length,
      propostas: proposals.size,
      amostra: parsed.valid.slice(0, 30),
      rejeicoes: parsed.rejected.slice(0, 100),
    };
  }
  async execute(file: Express.Multer.File, actor: Actor) {
    const parsed = await this.parse(file);
    if (!parsed.valid.length)
      throw new BadRequestException(
        'Nenhuma linha aprovada válida encontrada.',
      );
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    if (
      await this.db.comprasImportacao.findUnique({
        where: { hashSha256: hash },
        select: { id: true },
      })
    )
      throw new ConflictException('Este arquivo já foi importado.');
    return this.db.$transaction(
      async (tx) => {
        const imported = await tx.comprasImportacao.create({
          data: {
            arquivo: file.originalname,
            hashSha256: hash,
            status: 'PROCESSANDO',
            totalLinhas: parsed.rows.length,
            linhasAprovadas: parsed.valid.length,
            linhasRejeitadas: parsed.rejected.length,
            propostas: new Set(parsed.valid.map((v) => v.proposalNumber)).size,
            usuarioId: actor.id,
            usuarioNome: actor.name,
          },
        });
        if (parsed.rejected.length)
          await tx.comprasImportacaoErro.createMany({
            data: parsed.rejected.map((r) => ({
              importacaoId: imported.id,
              linha: r.line,
              propostaNumero: r.proposalNumber,
              produtoCodigo: r.productCode,
              statusOrigem: r.status,
              motivo: r.reason,
              dados: r.data,
            })),
          });
        let newItems = 0,
          updatedItems = 0;
        for (const number of new Set(
          parsed.valid.map((v) => v.proposalNumber),
        )) {
          const first = parsed.valid.find((v) => v.proposalNumber === number)!;
          const proposal = await tx.comprasProposta.create({
            data: {
              propostaId: first.proposalId,
              propostaNumero: number,
              statusAprovacao: 'APROVADO',
              faseNegociacao: first.phase,
              clienteCodigo: first.clientCode,
              clienteNome: first.clientName,
              local: first.local,
              contrato: first.contract,
              tipo: first.type,
              importacaoId: imported.id,
            },
          });
          for (const row of parsed.valid.filter(
            (v) => v.proposalNumber === number,
          )) {
            const existing = await tx.comprasPropostaItem.findUnique({
              where: {
                comprasPropostaId_fingerprint: {
                  comprasPropostaId: proposal.id,
                  fingerprint: row.fingerprint,
                },
              },
              select: {
                id: true,
                quantidadeComprada: true,
                quantidadeRecebida: true,
              },
            });
            if (existing) {
              await tx.comprasPropostaItem.update({
                where: { id: existing.id },
                data: {
                  linhaOrigem: row.line,
                  produtoDescricao: row.productDescription,
                  grupoProduto: row.group,
                  grupo2Produto: row.group2,
                  quantidadeNecessaria: row.quantity,
                  valorUnitarioVenda: row.unitValue,
                  descontoProduto: row.discount,
                  valorDesconto: row.discountValue,
                  valorTotalVenda: row.totalValue,
                  ativo: true,
                },
              });
              updatedItems++;
            } else {
              await tx.comprasPropostaItem.create({
                data: {
                  comprasPropostaId: proposal.id,
                  linhaOrigem: row.line,
                  produtoCodigo: row.productCode,
                  produtoDescricao: row.productDescription,
                  grupoProduto: row.group,
                  grupo2Produto: row.group2,
                  quantidadeNecessaria: row.quantity,
                  valorUnitarioVenda: row.unitValue,
                  descontoProduto: row.discount,
                  valorDesconto: row.discountValue,
                  valorTotalVenda: row.totalValue,
                  fingerprint: row.fingerprint,
                },
              });
              newItems++;
            }
          }
        }
        const status = parsed.rejected.length
          ? 'CONCLUIDA_COM_REJEICOES'
          : 'CONCLUIDA';
        const result = await tx.comprasImportacao.update({
          where: { id: imported.id },
          data: {
            status,
            itensNovos: newItems,
            itensAtualizados: updatedItems,
          },
        });
        await tx.comprasHistorico.create({
          data: {
            importacaoId: imported.id,
            entidade: 'COMPRAS_IMPORTACAO',
            entidadeId: imported.id,
            acao: 'IMPORTAR',
            dadosDepois: {
              arquivo: file.originalname,
              hash,
              totalLinhas: parsed.rows.length,
              linhasAprovadas: parsed.valid.length,
              linhasRejeitadas: parsed.rejected.length,
              itensNovos: newItems,
              itensAtualizados: updatedItems,
            },
            usuarioId: actor.id,
            usuarioNome: actor.name,
          },
        });
        return {
          id: result.id,
          status,
          arquivo: file.originalname,
          totalLinhas: parsed.rows.length,
          linhasAprovadas: parsed.valid.length,
          linhasRejeitadas: parsed.rejected.length,
          itensNovos: newItems,
          itensAtualizados: updatedItems,
        };
      },
      { timeout: 120000 },
    );
  }
}
