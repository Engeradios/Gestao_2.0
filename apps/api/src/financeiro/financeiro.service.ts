import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  BalanceDto,
  DreDto,
  FinanceQueryDto,
  NoteDto,
  PayableDto,
  ReceivableDto,
  SettlementDto,
} from './dto/financeiro.dto';
type Actor = { id: string; nome: string };
@Injectable()
export class FinanceiroService {
  constructor(private readonly db: PrismaService) {}
  private date(v?: string) {
    return v ? new Date(`${v.slice(0, 10)}T00:00:00.000Z`) : null;
  }
  private dec(v?: number) {
    return new Prisma.Decimal(v ?? 0);
  }
  private json<T>(v: T): T {
    return JSON.parse(
      JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x)),
    );
  }
  private async audit(
    tx: any,
    a: Actor,
    e: string,
    id: bigint | number,
    acao: string,
    antes: unknown,
    depois: unknown,
  ) {
    await tx.auditoria.create({
      data: {
        usuarioId: a.id,
        entidade: e,
        entidadeId: String(id),
        acao,
        dadosAntes: antes as any,
        dadosDepois: depois as any,
      },
    });
  }
  private period(q: FinanceQueryDto, field: string) {
    if (!q.inicio && !q.fim) return {};
    return {
      [field]: {
        ...(q.inicio ? { gte: this.date(q.inicio)! } : {}),
        ...(q.fim ? { lte: this.date(q.fim)! } : {}),
      },
    };
  }
  private page(q: FinanceQueryDto) {
    return { skip: (q.pagina - 1) * q.limite, take: q.limite };
  }
  async dashboard(q: FinanceQueryDto) {
    const [receber, pagar, notas] = await this.db.$transaction([
      this.db.fin_contas_receber.aggregate({
        _count: true,
        _sum: { valor_devido: true, valor_recebido: true },
        where: { ...this.period(q, 'data_vencto') },
      }),
      this.db.fin_contas_pagar.aggregate({
        _count: true,
        _sum: { valor: true, valor_pago: true },
        where: { ...this.period(q, 'data_vencimento') },
      }),
      this.db.fin_notas_recebidas.aggregate({
        _count: true,
        _sum: { valor_total: true },
        where: { ...this.period(q, 'data_emissao') },
      }),
    ]);
    return this.json({ receber, pagar, notas });
  }
  async receivables(q: FinanceQueryDto) {
    const where: any = {
      ...(q.situacao ? { situacao: q.situacao } : {}),
      ...(q.filial ? { filial: q.filial } : {}),
      ...this.period(q, 'data_vencto'),
      ...(q.busca
        ? {
            OR: ['cliente', 'documento', 'chave_titulo', 'num_titulo'].map(
              (k) => ({ [k]: { contains: q.busca, mode: 'insensitive' } }),
            ),
          }
        : {}),
    };
    const [total, itens] = await this.db.$transaction([
      this.db.fin_contas_receber.count({ where }),
      this.db.fin_contas_receber.findMany({
        where,
        ...this.page(q),
        orderBy: [{ data_vencto: 'asc' }, { id: 'desc' }],
      }),
    ]);
    return this.json({
      itens,
      paginacao: { pagina: q.pagina, limite: q.limite, total },
    });
  }
  async saveReceivable(id: number | null, b: ReceivableDto, a: Actor) {
    const data: any = {
      chave_titulo: b.chaveTitulo,
      filial: b.filial,
      documento: b.documento,
      cliente: b.cliente,
      uf: b.uf?.toUpperCase(),
      data_emissao: this.date(b.dataEmissao),
      data_vencto: this.date(b.dataVencto),
      data_recebimento: this.date(b.dataRecebimento),
      valor_emissao: this.dec(b.valorEmissao),
      valor_devido: this.dec(b.valorDevido),
      valor_recebido: this.dec(b.valorRecebido),
      situacao: b.situacao,
      atualizado_em: new Date(),
    };
    return this.db.$transaction(async (tx) => {
      const before = id
        ? await tx.fin_contas_receber.findUnique({ where: { id: BigInt(id) } })
        : null;
      const x = id
        ? await tx.fin_contas_receber.update({
            where: { id: BigInt(id) },
            data,
          })
        : await tx.fin_contas_receber.create({ data });
      await this.audit(
        tx,
        a,
        'fin_contas_receber',
        x.id,
        id ? 'ATUALIZAR' : 'CRIAR',
        before,
        x,
      );
      return this.json(x);
    });
  }
  async payables(q: FinanceQueryDto) {
    const where: any = {
      ...(q.situacao ? { situacao: q.situacao } : {}),
      ...(q.filial ? { filial: q.filial } : {}),
      ...this.period(q, 'data_vencimento'),
      ...(q.busca
        ? {
            OR: ['descricao', 'fornecedor', 'documento'].map((k) => ({
              [k]: { contains: q.busca, mode: 'insensitive' },
            })),
          }
        : {}),
    };
    const [total, itens] = await this.db.$transaction([
      this.db.fin_contas_pagar.count({ where }),
      this.db.fin_contas_pagar.findMany({
        where,
        ...this.page(q),
        include: { fin_dre_contas: true },
        orderBy: [{ data_vencimento: 'asc' }, { id: 'desc' }],
      }),
    ]);
    return this.json({
      itens,
      paginacao: { pagina: q.pagina, limite: q.limite, total },
    });
  }
  async savePayable(id: number | null, b: PayableDto, a: Actor) {
    const data: any = {
      descricao: b.descricao,
      fornecedor: b.fornecedor,
      documento: b.documento,
      filial: b.filial,
      forma_pgto: b.formaPgto,
      data_emissao: this.date(b.dataEmissao),
      data_vencimento: this.date(b.dataVencimento),
      data_pagamento: this.date(b.dataPagamento),
      valor: this.dec(b.valor),
      valor_pago: this.dec(b.valorPago),
      juros_multa: this.dec(b.jurosMulta),
      desconto: this.dec(b.desconto),
      dre_conta_id: b.dreContaId,
      recorrente: b.recorrente ?? false,
      observacoes: b.observacoes,
      situacao: b.dataPagamento ? 'Pago' : 'A vencer',
      criado_por: a.nome,
      atualizado_em: new Date(),
    };
    return this.db.$transaction(async (tx) => {
      const before = id
        ? await tx.fin_contas_pagar.findUnique({ where: { id: BigInt(id) } })
        : null;
      const x = id
        ? await tx.fin_contas_pagar.update({ where: { id: BigInt(id) }, data })
        : await tx.fin_contas_pagar.create({ data });
      await this.audit(
        tx,
        a,
        'fin_contas_pagar',
        x.id,
        id ? 'ATUALIZAR' : 'CRIAR',
        before,
        x,
      );
      return this.json(x);
    });
  }
  async settlePayable(id: number, b: SettlementDto, a: Actor) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.fin_contas_pagar.findUnique({
        where: { id: BigInt(id) },
      });
      if (!before) throw new NotFoundException('Conta a pagar não encontrada');
      const x = await tx.fin_contas_pagar.update({
        where: { id: BigInt(id) },
        data: {
          data_pagamento: this.date(b.dataPagamento),
          valor_pago: this.dec(b.valorPago),
          juros_multa: this.dec(b.jurosMulta),
          desconto: this.dec(b.desconto),
          situacao: 'Pago',
          atualizado_em: new Date(),
        },
      });
      await this.audit(tx, a, 'fin_contas_pagar', x.id, 'BAIXAR', before, x);
      return this.json(x);
    });
  }
  async dreAccounts() {
    return this.json(
      await this.db.fin_dre_contas.findMany({
        orderBy: [{ ordem: 'asc' }, { codigo: 'asc' }],
      }),
    );
  }
  async saveDre(id: number | null, b: DreDto, a: Actor) {
    const data: any = {
      codigo: b.codigo,
      nome: b.nome,
      natureza: b.natureza ?? 'D',
      grupo_dre: b.grupoDre,
      setor: b.setor,
      ordem: b.ordem ?? 0,
      is_grupo: b.isGrupo ?? false,
      ativo: b.ativo ?? true,
      atualizado_em: new Date(),
    };
    return this.db.$transaction(async (tx) => {
      const before = id
        ? await tx.fin_dre_contas.findUnique({ where: { id: BigInt(id) } })
        : null;
      const x = id
        ? await tx.fin_dre_contas.update({ where: { id: BigInt(id) }, data })
        : await tx.fin_dre_contas.create({ data });
      await this.audit(
        tx,
        a,
        'fin_dre_contas',
        x.id,
        id ? 'ATUALIZAR' : 'CRIAR',
        before,
        x,
      );
      return this.json(x);
    });
  }
  async dre(q: FinanceQueryDto) {
    const contas = await this.db.fin_contas_pagar.findMany({
      where: { ...this.period(q, 'data_pagamento'), situacao: 'Pago' },
      include: { fin_dre_contas: true },
    });
    const grupos: Record<string, number> = {};
    for (const x of contas) {
      const k = x.fin_dre_contas?.grupo_dre ?? 'Sem classificação';
      grupos[k] =
        (grupos[k] ?? 0) +
        Number(x.valor_pago ?? 0) +
        Number(x.juros_multa ?? 0) -
        Number(x.desconto ?? 0);
    }
    return { grupos, total: Object.values(grupos).reduce((a, b) => a + b, 0) };
  }
  async cashFlow(q: FinanceQueryDto) {
    const [saldos, receber, pagar] = await this.db.$transaction([
      this.db.fin_fluxos_saldo.findMany({
        where: {
          ...(q.filial ? { filial: q.filial } : {}),
          ...this.period(q, 'data_ref'),
        },
        orderBy: { data_ref: 'asc' },
      }),
      this.db.fin_contas_receber.findMany({
        where: {
          ...(q.filial ? { filial: q.filial } : {}),
          ...this.period(q, 'data_vencto'),
        },
        select: { data_vencto: true, valor_devido: true, valor_recebido: true },
      }),
      this.db.fin_contas_pagar.findMany({
        where: {
          ...(q.filial ? { filial: q.filial } : {}),
          ...this.period(q, 'data_vencimento'),
        },
        select: { data_vencimento: true, valor: true, valor_pago: true },
      }),
    ]);
    return this.json({ saldos, receber, pagar });
  }
  async saveBalance(b: BalanceDto, a: Actor) {
    return this.db.$transaction(async (tx) => {
      const x = await tx.fin_fluxos_saldo.create({
        data: {
          filial: b.filial,
          data_ref: this.date(b.dataRef)!,
          valor: this.dec(b.valor),
          descricao: b.descricao,
        },
      });
      await this.audit(tx, a, 'fin_fluxos_saldo', x.id, 'CRIAR', null, x);
      return this.json(x);
    });
  }
  async notes(q: FinanceQueryDto) {
    const where: any = {
      ...(q.situacao ? { situacao: q.situacao } : {}),
      ...this.period(q, 'data_emissao'),
      ...(q.busca
        ? {
            OR: ['numero', 'chave', 'emit_nome', 'emit_cnpj'].map((k) => ({
              [k]: { contains: q.busca, mode: 'insensitive' },
            })),
          }
        : {}),
    };
    const [total, itens] = await this.db.$transaction([
      this.db.fin_notas_recebidas.count({ where }),
      this.db.fin_notas_recebidas.findMany({
        where,
        ...this.page(q),
        orderBy: [{ data_emissao: 'desc' }, { id: 'desc' }],
      }),
    ]);
    return this.json({
      itens,
      paginacao: { pagina: q.pagina, limite: q.limite, total },
    });
  }
  async note(id: number) {
    const x = await this.db.fin_notas_recebidas.findUnique({
      where: { id: BigInt(id) },
      include: {
        fin_notas_recebidas_itens: true,
        fin_notas_recebidas_parcelas: true,
        fin_contas_pagar: true,
      },
    });
    if (!x) throw new NotFoundException('Nota recebida não encontrada');
    return this.json(x);
  }
  async saveNote(id: number | null, b: NoteDto, a: Actor) {
    return this.db.$transaction(async (tx) => {
      const before = id
        ? await tx.fin_notas_recebidas.findUnique({ where: { id: BigInt(id) } })
        : null;
      const data: any = {
        chave: b.chave,
        numero: b.numero,
        emit_nome: b.emitNome,
        emit_cnpj: b.emitCnpj,
        data_emissao: this.date(b.dataEmissao),
        data_entrada: this.date(b.dataEntrada),
        valor_total: this.dec(b.valorTotal),
        situacao: b.situacao ?? 'Recebida',
        observacoes: b.observacoes,
        criado_por: a.nome,
        atualizado_em: new Date(),
      };
      const x = id
        ? await tx.fin_notas_recebidas.update({
            where: { id: BigInt(id) },
            data,
          })
        : await tx.fin_notas_recebidas.create({ data });
      await this.audit(
        tx,
        a,
        'fin_notas_recebidas',
        x.id,
        id ? 'ATUALIZAR' : 'CRIAR',
        before,
        x,
      );
      return this.json(x);
    });
  }
  async sendNoteToPayables(id: number, a: Actor) {
    return this.db.$transaction(async (tx) => {
      const n = await tx.fin_notas_recebidas.findUnique({
        where: { id: BigInt(id) },
        include: { fin_notas_recebidas_parcelas: true },
      });
      if (!n) throw new NotFoundException('Nota recebida não encontrada');
      if (n.enviado_pagar)
        throw new BadRequestException('Nota já enviada para Contas a Pagar');
      let created = 0;
      for (const p of n.fin_notas_recebidas_parcelas) {
        await tx.fin_contas_pagar.create({
          data: {
            descricao: `NF ${n.numero ?? ''} - ${n.emit_nome ?? ''}`.trim(),
            fornecedor: n.emit_nome,
            documento: n.numero,
            data_emissao: n.data_emissao,
            data_vencimento: p.vencimento,
            valor: p.valor,
            valor_pago: this.dec(0),
            situacao: p.pago ? 'Pago' : 'A vencer',
            origem_nf_id: n.id,
            origem_nf_parcela_legado_id: p.legado_id,
            criado_por: a.nome,
          },
        });
        created++;
      }
      const up = await tx.fin_notas_recebidas.update({
        where: { id: n.id },
        data: {
          enviado_pagar: true,
          enviado_pagar_em: new Date(),
          atualizado_em: new Date(),
        },
      });
      await this.audit(tx, a, 'fin_notas_recebidas', n.id, 'ENVIAR_PAGAR', n, {
        ...up,
        titulos: created,
      });
      return { notaId: String(n.id), titulos: created };
    });
  }
  async imports(q: FinanceQueryDto) {
    const [total, itens] = await this.db.$transaction([
      this.db.fin_importacoes.count(),
      this.db.fin_importacoes.findMany({
        ...this.page(q),
        orderBy: { importado_em: 'desc' },
      }),
    ]);
    return this.json({
      itens,
      paginacao: { pagina: q.pagina, limite: q.limite, total },
    });
  }
  async remove(kind: string, id: number, a: Actor) {
    const map: any = {
      pagar: 'fin_contas_pagar',
      receber: 'fin_contas_receber',
      dre: 'fin_dre_contas',
      saldo: 'fin_fluxos_saldo',
      nota: 'fin_notas_recebidas',
    };
    if (!map[kind]) throw new BadRequestException('Tipo inválido');
    return this.db.$transaction(async (tx) => {
      const m = (tx as any)[map[kind]];
      const before = await m.findUnique({ where: { id: BigInt(id) } });
      if (!before) throw new NotFoundException('Registro não encontrado');
      await m.delete({ where: { id: BigInt(id) } });
      await this.audit(tx, a, map[kind], BigInt(id), 'EXCLUIR', before, null);
      return { excluido: true, id };
    });
  }
}
