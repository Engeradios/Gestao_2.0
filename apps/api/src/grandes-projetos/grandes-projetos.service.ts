import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ProjectQueryDto } from './dto/grandes-projetos.dto';
type Actor = { id?: string; nome: string };
type Kind = 'cost' | 'material' | 'order' | 'milestone' | 'report';
@Injectable()
export class GrandesProjetosService {
  constructor(private readonly db: PrismaService) {}
  private str(v: unknown) {
    const x = String(v ?? '').trim();
    return x || null;
  }
  private date(v: unknown) {
    return v ? new Date(`${String(v).slice(0, 10)}T00:00:00.000Z`) : null;
  }
  private dec(v: unknown) {
    return new Prisma.Decimal(Number(v || 0));
  }
  private async exists(id: number) {
    const p = await this.db.gp_projeto.findFirst({
      where: { id, excluido_em: null },
    });
    if (!p) throw new NotFoundException('Projeto não encontrado');
    return p;
  }
  private finance(p: any, costs: any[]) {
    const revenue = ['LOCACAO_MENSAL', 'LOCACAO_VENDA_FUTURA'].includes(
      p.tipo_escopo || '',
    )
      ? Number(p.meses_contrato || 0) * Number(p.valor_mensal || 0) +
        Number(p.valor_residual || 0)
      : Number(p.valor_contrato || 0);
    const contract = revenue > 0 ? revenue : Number(p.valor_contrato || 0);
    const budget = costs.reduce((s, c) => s + Number(c.valor_orcado || 0), 0);
    const actual = costs.reduce(
      (s, c) => s + Number(c.valor_realizado || 0),
      0,
    );
    const taxes =
      contract *
      (Number(p.aliq_simples || 0) +
        Number(p.aliq_iss || 0) +
        Number(p.aliq_outros || 0));
    const gross = contract - actual,
      net = gross - taxes;
    return {
      contrato: contract,
      orcado: budget,
      realizado: actual,
      impostos: taxes,
      lucroBruto: gross,
      lucroLiquido: net,
      margemLiquida: contract ? (net / contract) * 100 : 0,
      execucaoOrcamento: budget ? (actual / budget) * 100 : 0,
      desvio: actual - budget,
    };
  }
  private async audit(
    tx: any,
    a: Actor,
    e: string,
    id: number,
    action: string,
    before: unknown,
    after: unknown,
  ) {
    await tx.auditoria.create({
      data: {
        usuarioId: a.id || null,
        entidade: e,
        entidadeId: String(id),
        acao: action,
        dadosAntes: before as any,
        dadosDepois: after as any,
      },
    });
  }
  async list(q: ProjectQueryDto) {
    const where: any = { excluido_em: null };
    if (q.status) where.status = q.status;
    if (q.busca)
      where.OR = [
        'nome',
        'cliente',
        'codigo',
        'numero_contrato',
        'numero_pedido',
      ].map((k) => ({ [k]: { contains: q.busca, mode: 'insensitive' } }));
    const [total, items] = await this.db.$transaction([
      this.db.gp_projeto.count({ where }),
      this.db.gp_projeto.findMany({
        where,
        include: {
          gp_custo: { where: { excluido_em: null } },
          _count: {
            select: {
              gp_os: { where: { excluido_em: null } },
              gp_material: { where: { excluido_em: null } },
              gp_relatorio: { where: { excluido_em: null } },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { data_inicio: 'desc' }, { id: 'desc' }],
        skip: (q.pagina - 1) * q.limite,
        take: q.limite,
      }),
    ]);
    return {
      itens: items.map((p) => ({
        ...p,
        financeiro: this.finance(p, p.gp_custo),
      })),
      paginacao: {
        pagina: q.pagina,
        limite: q.limite,
        total,
        paginas: Math.max(1, Math.ceil(total / q.limite)),
      },
    };
  }
  async dashboard() {
    const ps = await this.db.gp_projeto.findMany({
      where: { excluido_em: null },
      include: {
        gp_custo: { where: { excluido_em: null } },
      },
    });
    const rows = ps.map((p) => this.finance(p, p.gp_custo));
    return {
      projetos: ps.length,
      emExecucao: ps.filter((p) => p.status === 'Em execução').length,
      carteira: rows.reduce((s, x) => s + x.contrato, 0),
      lucroLiquido: rows.reduce((s, x) => s + x.lucroLiquido, 0),
      porStatus: ps.reduce((a: any, p) => {
        a[p.status || 'Sem status'] = (a[p.status || 'Sem status'] || 0) + 1;
        return a;
      }, {}),
    };
  }
  async one(id: number) {
    const p = await this.db.gp_projeto.findFirst({
      where: { id, excluido_em: null },
      include: {
        gp_custo: {
          where: { excluido_em: null },
          orderBy: [{ categoria: 'asc' }, { id: 'asc' }],
        },
        gp_material: {
          where: { excluido_em: null },
          orderBy: { produto: 'asc' },
        },
        gp_os: {
          where: { excluido_em: null },
          orderBy: { data_abertura: 'desc' },
        },
        gp_marco: {
          where: { excluido_em: null },
          orderBy: [{ data_marco: 'desc' }, { id: 'desc' }],
        },
        gp_relatorio: {
          where: { excluido_em: null },
          include: {
            gp_relatorio_foto: {
              where: { excluido_em: null },
            },
          },
          orderBy: [{ tipo: 'asc' }, { criado_em: 'desc' }],
        },
      },
    });
    if (!p) throw new NotFoundException('Projeto não encontrado');
    return { ...p, financeiro: this.finance(p, p.gp_custo) };
  }
  async proposal(n: string) {
    const p = await this.db.opProposta.findUnique({ where: { numero: n } });
    const s = await this.db.opServico.findFirst({ where: { proposta: n } });
    if (!p && !s) throw new NotFoundException('Proposta não encontrada');
    return {
      encontrado: true,
      proposta: n,
      cliente: p?.clienteNome || s?.cliente,
      local: p?.local || s?.clienteLocal,
      uf: p?.clienteUf || s?.ufExecucao,
      servico: p?.titulo || s?.servicoAtividade,
      inicio: s?.inicioPlanejado,
      fim: s?.prazoFinal,
      valor: p?.valProposta,
    };
  }
  async save(id: number | null, b: any, a: Actor) {
    const data: any = {
      proposta: this.str(b.proposta || b.numeroPedido),
      codigo: this.str(b.codigo),
      nome: String(b.nome).trim(),
      cliente: this.str(b.cliente),
      cliente_local: this.str(b.clienteLocal),
      uf: this.str(b.uf)?.toUpperCase(),
      gerente: this.str(b.gerente),
      valor_contrato: this.dec(b.valorContrato),
      data_inicio: this.date(b.dataInicio),
      data_fim_prev: this.date(b.dataFimPrev),
      data_fim_real: this.date(b.dataFimReal),
      status: b.status || 'Planejamento',
      aliq_simples: this.dec(Number(b.aliqSimples ?? 10.5) / 100),
      aliq_iss: this.dec(Number(b.aliqIss ?? 5) / 100),
      aliq_outros: this.dec(Number(b.aliqOutros ?? 0) / 100),
      observacoes: this.str(b.observacoes),
      tipo_escopo: b.tipoEscopo || 'INSTALACAO_ART',
      numero_contrato: this.str(b.numeroContrato),
      numero_pedido: this.str(b.numeroPedido),
      meses_contrato: b.mesesContrato ?? null,
      valor_mensal: b.valorMensal == null ? null : this.dec(b.valorMensal),
      valor_residual:
        b.valorResidual == null ? null : this.dec(b.valorResidual),
      transfere_final: Boolean(b.transfereFinal),
      atualizado_em: new Date(),
      atualizado_por_id: a.id || null,
    };
    return this.db.$transaction(async (tx) => {
      const before = id
        ? await tx.gp_projeto.findFirst({
            where: { id, excluido_em: null },
          })
        : null;

      if (id && !before) {
        throw new NotFoundException('Projeto não encontrado');
      }
      const p = id
        ? await tx.gp_projeto.update({
            where: { id },
            data: { ...data, versao: { increment: 1 } },
          })
        : await tx.gp_projeto.create({
            data: {
              ...data,
              criado_por: a.nome,
              atualizado_por_id: a.id || null,
            },
          });
      await this.audit(
        tx,
        a,
        'gp_projeto',
        p.id,
        id ? 'ATUALIZAR' : 'CRIAR',
        before,
        p,
      );
      return p;
    });
  }
  async remove(
    _k: string,
    id: number,
    a: Actor,
    motivo = 'Exclusão solicitada pelo usuário',
  ) {
    await this.exists(id);

    return this.db.$transaction(async (tx) => {
      const before = await tx.gp_projeto.findFirst({
        where: { id, excluido_em: null },
      });

      if (!before) {
        throw new NotFoundException('Projeto não encontrado');
      }

      const after = await tx.gp_projeto.update({
        where: { id },
        data: {
          excluido_em: new Date(),
          excluido_por_id: a.id || null,
          motivo_exclusao: motivo.trim(),
          atualizado_por_id: a.id || null,
          atualizado_em: new Date(),
          versao: { increment: 1 },
        },
      });

      await this.audit(
        tx,
        a,
        'gp_projeto',
        id,
        'EXCLUIR_LOGICO',
        before,
        after,
      );

      return { excluido: true, id };
    });
  }

  async restore(id: number, a: Actor) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.gp_projeto.findFirst({
        where: { id, excluido_em: { not: null } },
      });

      if (!before) {
        throw new NotFoundException('Projeto excluído não encontrado');
      }

      const after = await tx.gp_projeto.update({
        where: { id },
        data: {
          excluido_em: null,
          excluido_por_id: null,
          motivo_exclusao: null,
          atualizado_por_id: a.id || null,
          atualizado_em: new Date(),
          versao: { increment: 1 },
        },
      });

      await this.audit(tx, a, 'gp_projeto', id, 'RESTAURAR', before, after);

      return after;
    });
  }
  async child(k: Kind, id: number, b: any, a: Actor) {
    await this.exists(id);
    return this.db.$transaction(async (tx) => {
      let x: any;
      if (k === 'cost')
        x = await tx.gp_custo.create({
          data: {
            projeto_id: id,
            categoria: b.categoria || 'DESPESA_EXTRA',
            tipo: b.tipo || 'direto',
            descricao: b.descricao,
            fornecedor: this.str(b.fornecedor),
            documento: this.str(b.documento),
            valor_orcado: this.dec(b.valorOrcado),
            valor_realizado: this.dec(b.valorRealizado),
            data_custo: this.date(b.dataCusto),
            situacao:
              Number(b.valorRealizado || 0) > 0 ? 'Realizado' : 'Previsto',
            origem: 'manual',
          },
        });
      if (k === 'material')
        x = await tx.gp_material.create({
          data: {
            projeto_id: id,
            produto: b.produto,
            unidade: b.unidade || 'un',
            qtd_prevista: this.dec(b.qtdPrevista),
            qtd_entregue: this.dec(b.qtdEntregue),
            valor_unit: this.dec(b.valorUnit),
            data_entrega: this.date(b.dataEntrega),
            nf: this.str(b.nf),
            observacoes: this.str(b.observacoes),
          },
        });
      if (k === 'order')
        x = await tx.gp_os.upsert({
          where: {
            projeto_id_numero_os: { projeto_id: id, numero_os: b.numeroOs },
          },
          update: {
            tipo: this.str(b.tipo),
            situacao: this.str(b.situacao),
            tecnico: this.str(b.tecnico),
            descricao: this.str(b.descricao),
            valor: this.dec(b.valor),
            data_abertura: b.dataAbertura ? new Date(b.dataAbertura) : null,
            data_fechamento: b.dataFechamento
              ? new Date(b.dataFechamento)
              : null,
          },
          create: {
            projeto_id: id,
            numero_os: b.numeroOs,
            tipo: this.str(b.tipo),
            situacao: this.str(b.situacao),
            tecnico: this.str(b.tecnico),
            descricao: this.str(b.descricao),
            valor: this.dec(b.valor),
            data_abertura: b.dataAbertura ? new Date(b.dataAbertura) : null,
            data_fechamento: b.dataFechamento
              ? new Date(b.dataFechamento)
              : null,
          },
        });
      if (k === 'milestone')
        x = await tx.gp_marco.create({
          data: {
            projeto_id: id,
            tipo: b.tipo || 'ANDAMENTO',
            titulo: b.titulo,
            descricao: this.str(b.descricao),
            percentual: b.percentual == null ? null : this.dec(b.percentual),
            data_marco: this.date(b.dataMarco),
            usuario: a.nome,
          },
        });
      if (k === 'report')
        x = await tx.gp_relatorio.create({
          data: {
            projeto_id: id,
            tipo: b.tipo,
            token: randomBytes(24).toString('base64url'),
            status: b.status || 'Rascunho',
            responsavel: this.str(b.responsavel),
            data_relatorio: this.date(b.dataRelatorio) || new Date(),
            dados: b.dados || {},
            assinatura_tec: this.str(b.assinaturaTec),
            assinatura_cli: this.str(b.assinaturaCli),
            criado_por: a.nome,
          },
        });
      await this.audit(tx, a, `gp_${k}`, x.id, 'CRIAR', null, x);
      return x;
    });
  }
  async removeChild(k: Kind, pid: number, id: number, a: Actor) {
    await this.exists(pid);
    const map: any = {
      cost: 'gp_custo',
      material: 'gp_material',
      order: 'gp_os',
      milestone: 'gp_marco',
      report: 'gp_relatorio',
    };
    return this.db.$transaction(async (tx) => {
      const model = (tx as any)[map[k]];
      const before = await model.findFirst({
        where: { id, projeto_id: pid, excluido_em: null },
      });
      if (!before)
        throw new NotFoundException('Registro não encontrado no projeto');
      const after = await model.update({
        where: { id },
        data: {
          excluido_em: new Date(),
          excluido_por_id: a.id || null,
          motivo_exclusao: 'Exclusão solicitada pelo usuário',
          atualizado_por_id: a.id || null,
          versao: { increment: 1 },
        },
      });

      await this.audit(tx, a, map[k], id, 'EXCLUIR_LOGICO', before, after);
      return { excluido: true, id };
    });
  }
  async updateReport(pid: number, id: number, b: any, a: Actor) {
    await this.exists(pid);
    return this.db.$transaction(async (tx) => {
      const before = await tx.gp_relatorio.findFirst({
        where: { id, projeto_id: pid, excluido_em: null },
      });
      if (!before) throw new NotFoundException('Relatório não encontrado');
      const x = await tx.gp_relatorio.update({
        where: { id },
        data: {
          tipo: b.tipo,
          status: b.status,
          responsavel: this.str(b.responsavel),
          data_relatorio: this.date(b.dataRelatorio),
          dados: b.dados,
          assinatura_tec: this.str(b.assinaturaTec),
          assinatura_cli: this.str(b.assinaturaCli),
          preenchido_em:
            b.status === 'Concluído' ? new Date() : before.preenchido_em,
          atualizado_em: new Date(),
        },
      });
      await this.audit(tx, a, 'gp_relatorio', id, 'ATUALIZAR', before, x);
      return x;
    });
  }
  async importOrders(id: number, a: Actor) {
    const p = await this.exists(id);
    if (!p.numero_contrato)
      throw new BadRequestException('Projeto sem número de contrato');
    const orders = await this.db.ordemServico.findMany({
      where: { contrato: { equals: p.numero_contrato, mode: 'insensitive' } },
    });
    return this.db.$transaction(async (tx) => {
      let novas = 0,
        atualizadas = 0;
      for (const o of orders) {
        const found = await tx.gp_os.findUnique({
          where: {
            projeto_id_numero_os: { projeto_id: id, numero_os: o.numero },
          },
        });
        await tx.gp_os.upsert({
          where: {
            projeto_id_numero_os: { projeto_id: id, numero_os: o.numero },
          },
          update: {
            tipo: o.tipo,
            situacao: o.situacao,
            tecnico: o.tecnico,
            descricao: o.titulo || o.solicitacao,
            valor: o.valor,
            data_abertura: o.abertura,
            data_fechamento: o.fechamento,
            importado_em: new Date(),
          },
          create: {
            projeto_id: id,
            numero_os: o.numero,
            tipo: o.tipo,
            situacao: o.situacao,
            tecnico: o.tecnico,
            descricao: o.titulo || o.solicitacao,
            valor: o.valor,
            data_abertura: o.abertura,
            data_fechamento: o.fechamento,
          },
        });
        found ? atualizadas++ : novas++;
      }
      await this.audit(tx, a, 'gp_os', id, 'IMPORTAR_CONTRATO', null, {
        contrato: p.numero_contrato,
        novas,
        atualizadas,
      });
      return {
        contrato: p.numero_contrato,
        total: orders.length,
        novas,
        atualizadas,
      };
    });
  }
}
