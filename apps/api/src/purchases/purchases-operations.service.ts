import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreatePurchasesSupplierDto,
  UpdatePurchasesSupplierDto,
} from './dto/purchases-operations.dto';
import * as XLSX from 'xlsx';
import { PendingProductsQueryDto } from './dto/purchases-pending-products.dto';

@Injectable()
export class PurchasesOperationsService {
  constructor(private readonly db: PrismaService) {}

  async panel(search?: string, status?: string) {
    const where: Prisma.ComprasPropostaWhereInput = {
      ...(status ? { statusCompra: status } : {}),
      ...(search?.trim()
        ? {
            OR: [
              {
                propostaNumero: {
                  contains: search.trim(),
                  mode: 'insensitive',
                },
              },
              { clienteNome: { contains: search.trim(), mode: 'insensitive' } },
              { local: { contains: search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const proposals = await this.db.comprasProposta.findMany({
      where,
      orderBy: [{ atualizadoEm: 'desc' }, { propostaNumero: 'asc' }],
      include: {
        itens: { where: { ativo: true }, orderBy: { produtoDescricao: 'asc' } },
      },
      take: 500,
    });
    return proposals.map((proposal) => ({
      ...proposal,
      totais: proposal.itens.reduce(
        (acc, item) => ({
          itens: acc.itens + 1,
          necessario: acc.necessario.plus(item.quantidadeNecessaria),
          comprado: acc.comprado.plus(item.quantidadeComprada),
          recebido: acc.recebido.plus(item.quantidadeRecebida),
        }),
        {
          itens: 0,
          necessario: new Prisma.Decimal(0),
          comprado: new Prisma.Decimal(0),
          recebido: new Prisma.Decimal(0),
        },
      ),
    }));
  }

  async dashboard() {
    const [proposalGroups, itemGroups, orders, receipts, delayed] =
      await this.db.$transaction([
        this.db.comprasProposta.groupBy({
          by: ['statusCompra'],
          orderBy: { statusCompra: 'asc' },
          _count: { _all: true },
        }),
        this.db.comprasPropostaItem.groupBy({
          by: ['statusItem'],
          orderBy: { statusItem: 'asc' },
          where: { ativo: true },
          _count: { _all: true },
          _sum: {
            quantidadeNecessaria: true,
            quantidadeComprada: true,
            quantidadeRecebida: true,
          },
        }),
        this.db.comprasPedido.groupBy({
          by: ['status'],
          orderBy: { status: 'asc' },
          _count: { _all: true },
          _sum: { valorTotal: true },
        }),
        this.db.comprasRecebimento.groupBy({
          by: ['status'],
          orderBy: { status: 'asc' },
          _count: { _all: true },
        }),
        this.db.comprasPedido.count({
          where: {
            previsaoEntrega: { lt: new Date() },
            status: { in: ['CONFIRMADO', 'ENVIADO', 'PARCIALMENTE_RECEBIDO'] },
          },
        }),
      ]);
    return {
      propostas: proposalGroups,
      itens: itemGroups,
      pedidos: orders,
      recebimentos: receipts,
      pedidosAtrasados: delayed,
      atualizadoEm: new Date().toISOString(),
    };
  }

  suppliers(search?: string, active?: string) {
    return this.db.comprasFornecedor.findMany({
      where: {
        ...(active === 'true'
          ? { ativo: true }
          : active === 'false'
            ? { ativo: false }
            : {}),
        ...(search?.trim()
          ? {
              OR: [
                {
                  razaoSocial: { contains: search.trim(), mode: 'insensitive' },
                },
                {
                  nomeFantasia: {
                    contains: search.trim(),
                    mode: 'insensitive',
                  },
                },
                { documento: { contains: search.trim() } },
              ],
            }
          : {}),
      },
      orderBy: [{ ativo: 'desc' }, { razaoSocial: 'asc' }],
      take: 500,
    });
  }

  async createSupplier(dto: CreatePurchasesSupplierDto) {
    const document = dto.documento?.replace(/\D/g, '') || null;
    if (document && ![11, 14].includes(document.length))
      throw new BadRequestException('Documento deve possuir 11 ou 14 dígitos.');
    try {
      return await this.db.comprasFornecedor.create({
        data: { ...dto, documento: document },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new BadRequestException(
          'Fornecedor já cadastrado com este documento.',
        );
      throw error;
    }
  }

  async updateSupplier(id: string, dto: UpdatePurchasesSupplierDto) {
    if (
      !(await this.db.comprasFornecedor.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Fornecedor não localizado.');
    const document =
      dto.documento === undefined
        ? undefined
        : dto.documento.replace(/\D/g, '') || null;
    if (document && ![11, 14].includes(document.length))
      throw new BadRequestException('Documento deve possuir 11 ou 14 dígitos.');
    try {
      return await this.db.comprasFornecedor.update({
        where: { id },
        data: { ...dto, documento: document },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new BadRequestException(
          'Fornecedor já cadastrado com este documento.',
        );
      throw error;
    }
  }
  private async pendingProductRows(query: PendingProductsQueryDto) {
    const rows = await this.db.comprasPropostaItem.findMany({
      where: {
        ativo: true,
        statusItem: {
          in: query.status ? [query.status] : ['PENDENTE', 'COMPRA_PARCIAL'],
        },
        ...(query.busca?.trim()
          ? {
              OR: [
                {
                  produtoCodigo: {
                    contains: query.busca.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  produtoDescricao: {
                    contains: query.busca.trim(),
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
        proposta: {
          ...(query.proposta?.trim()
            ? {
                propostaNumero: {
                  contains: query.proposta.trim(),
                  mode: 'insensitive',
                },
              }
            : {}),
          ...(query.cliente?.trim()
            ? {
                clienteNome: {
                  contains: query.cliente.trim(),
                  mode: 'insensitive',
                },
              }
            : {}),
        },
      },
      include: {
        proposta: {
          select: {
            id: true,
            propostaNumero: true,
            clienteNome: true,
            local: true,
          },
        },
      },
      orderBy: [{ produtoDescricao: 'asc' }, { produtoCodigo: 'asc' }],
      take: 10000,
    });
    return rows.filter((item) =>
      item.quantidadeNecessaria.minus(item.quantidadeComprada).greaterThan(0),
    );
  }

  private consolidatePendingProducts(
    rows: Awaited<ReturnType<PurchasesOperationsService['pendingProductRows']>>,
  ) {
    const grouped = new Map<
      string,
      {
        codigo: string;
        descricao: string;
        necessario: Prisma.Decimal;
        comprado: Prisma.Decimal;
        recebido: Prisma.Decimal;
        saldo: Prisma.Decimal;
        propostas: Array<{
          numero: string;
          cliente: string | null;
          local: string | null;
          necessario: string;
          comprado: string;
          saldo: string;
        }>;
      }
    >();
    for (const item of rows) {
      const key = `${item.produtoCodigo.trim().toUpperCase()}|${item.produtoDescricao.trim().toUpperCase()}`;
      const saldo = item.quantidadeNecessaria.minus(item.quantidadeComprada);
      const current = grouped.get(key) ?? {
        codigo: item.produtoCodigo,
        descricao: item.produtoDescricao,
        necessario: new Prisma.Decimal(0),
        comprado: new Prisma.Decimal(0),
        recebido: new Prisma.Decimal(0),
        saldo: new Prisma.Decimal(0),
        propostas: [],
      };
      current.necessario = current.necessario.plus(item.quantidadeNecessaria);
      current.comprado = current.comprado.plus(item.quantidadeComprada);
      current.recebido = current.recebido.plus(item.quantidadeRecebida);
      current.saldo = current.saldo.plus(saldo);
      current.propostas.push({
        numero: item.proposta.propostaNumero,
        cliente: item.proposta.clienteNome,
        local: item.proposta.local,
        necessario: item.quantidadeNecessaria.toString(),
        comprado: item.quantidadeComprada.toString(),
        saldo: saldo.toString(),
      });
      grouped.set(key, current);
    }
    return [...grouped.values()].map((item) => ({
      ...item,
      necessario: item.necessario.toString(),
      comprado: item.comprado.toString(),
      recebido: item.recebido.toString(),
      saldo: item.saldo.toString(),
      quantidadePropostas: new Set(item.propostas.map((p) => p.numero)).size,
    }));
  }

  async pendingProducts(query: PendingProductsQueryDto) {
    const rows = await this.pendingProductRows(query);
    const direction = query.direcao === 'desc' ? -1 : 1;
    const consolidated = this.consolidatePendingProducts(rows).sort((a, b) => {
      if (query.ordenar === 'codigo')
        return a.codigo.localeCompare(b.codigo, 'pt-BR') * direction;
      if (query.ordenar === 'saldo')
        return (Number(a.saldo) - Number(b.saldo)) * direction;
      if (query.ordenar === 'propostas')
        return (a.quantidadePropostas - b.quantidadePropostas) * direction;
      return a.descricao.localeCompare(b.descricao, 'pt-BR') * direction;
    });
    const total = consolidated.length;
    const start = (query.pagina - 1) * query.limite;
    return {
      dados: consolidated.slice(start, start + query.limite),
      paginacao: {
        pagina: query.pagina,
        limite: query.limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / query.limite)),
      },
      totais: {
        produtos: total,
        propostas: new Set(rows.map((r) => r.proposta.propostaNumero)).size,
        quantidadeNecessaria: rows
          .reduce(
            (a, r) => a.plus(r.quantidadeNecessaria),
            new Prisma.Decimal(0),
          )
          .toString(),
        quantidadeComprada: rows
          .reduce((a, r) => a.plus(r.quantidadeComprada), new Prisma.Decimal(0))
          .toString(),
        saldoPendente: rows
          .reduce(
            (a, r) =>
              a.plus(r.quantidadeNecessaria.minus(r.quantidadeComprada)),
            new Prisma.Decimal(0),
          )
          .toString(),
      },
    };
  }

  private safeSpreadsheetText(value: unknown) {
    const text =
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
        ? String(value)
        : '';
    return /^[=+\-@\t\r\n]/.test(text) ? `\t${text}` : text;
  }

  async exportPendingProductsXlsx(query: PendingProductsQueryDto) {
    const rows = await this.pendingProductRows({
      ...query,
      pagina: 1,
      limite: 500,
    });
    const consolidated = this.consolidatePendingProducts(rows);
    const summary = consolidated.map((x) => ({
      Código: this.safeSpreadsheetText(x.codigo),
      Produto: this.safeSpreadsheetText(x.descricao),
      Propostas: x.quantidadePropostas,
      Necessário: Number(x.necessario),
      Comprado: Number(x.comprado),
      Recebido: Number(x.recebido),
      'Saldo para comprar': Number(x.saldo),
    }));
    const detail = rows.map((x) => ({
      Código: this.safeSpreadsheetText(x.produtoCodigo),
      Produto: this.safeSpreadsheetText(x.produtoDescricao),
      Proposta: this.safeSpreadsheetText(x.proposta.propostaNumero),
      Cliente: this.safeSpreadsheetText(x.proposta.clienteNome),
      Local: this.safeSpreadsheetText(x.proposta.local),
      Necessário: Number(x.quantidadeNecessaria),
      Comprado: Number(x.quantidadeComprada),
      Recebido: Number(x.quantidadeRecebida),
      Saldo: Number(x.quantidadeNecessaria.minus(x.quantidadeComprada)),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summary),
      'Consolidado',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detail),
      'Por proposta',
    );
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
    }) as Buffer;
    return {
      buffer,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      name: `produtos-pendentes-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }

  private basicPdf(lines: string[]) {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '?')
        .replace(/([\\()])/g, '\\$1');
    const pages: string[][] = [];
    for (let index = 0; index < lines.length; index += 48)
      pages.push(lines.slice(index, index + 48));
    const objects: string[] = [''];
    const add = (body: string) => {
      objects.push(body);
      return objects.length - 1;
    };
    const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const pageIds: number[] = [];
    const contentIds: number[] = [];
    for (const page of pages) {
      const content = `BT /F1 9 Tf 32 560 Td 12 TL ${page.map((line, i) => `${i ? 'T* ' : ''}(${normalize(line)}) Tj`).join(' ')} ET`;
      contentIds.push(
        add(
          `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
        ),
      );
      pageIds.push(add('PENDING_PAGE'));
    }
    const pagesId = add('PENDING_PAGES');
    const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    pageIds.forEach((id, i) => {
      objects[id] =
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
    });
    objects[pagesId] =
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = Buffer.byteLength(pdf);
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++)
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer << /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, 'ascii');
  }

  async exportPendingProductsPdf(query: PendingProductsQueryDto) {
    const rows = await this.pendingProductRows({
      ...query,
      pagina: 1,
      limite: 500,
    });
    const consolidated = this.consolidatePendingProducts(rows);
    const lines = [
      'ENGERADIOS - PRODUTOS PENDENTES PARA COMPRA',
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      `Filtros: busca=${query.busca ?? '-'} proposta=${query.proposta ?? '-'} cliente=${query.cliente ?? '-'}`,
      '',
      'CODIGO | PRODUTO | PROPOSTAS | NECESSARIO | COMPRADO | SALDO',
      ...consolidated.map(
        (x) =>
          `${x.codigo} | ${x.descricao.slice(0, 55)} | ${x.quantidadePropostas} | ${x.necessario} | ${x.comprado} | ${x.saldo}`,
      ),
    ];
    return {
      buffer: this.basicPdf(lines),
      type: 'application/pdf',
      name: `produtos-pendentes-${new Date().toISOString().slice(0, 10)}.pdf`,
    };
  }
}
