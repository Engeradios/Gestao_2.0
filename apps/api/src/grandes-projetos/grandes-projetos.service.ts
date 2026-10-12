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
  async painelExecutivoV2() {
    return this.db.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        projeto_id,
        codigo,
        nome,
        cliente,
        cliente_local,
        uf,
        gerente,
        status,
        aprovacao_status,
        tipo_escopo,
        numero_contrato,
        numero_pedido,
        valor_contrato::double precision AS valor_contrato,
        data_inicio,
        data_fim_prev,
        data_fim_real,
        total_custos,
        valor_orcado::double precision AS valor_orcado,
        valor_realizado::double precision AS valor_realizado,
        saldo_orcamento::double precision AS saldo_orcamento,
        percentual_orcamento_consumido::double precision
          AS percentual_orcamento_consumido,
        total_marcos,
        progresso_medio::double precision AS progresso_medio,
        menor_percentual_marco::double precision
          AS menor_percentual_marco,
        maior_percentual_marco::double precision
          AS maior_percentual_marco,
        total_materiais,
        quantidade_prevista::double precision AS quantidade_prevista,
        quantidade_entregue::double precision AS quantidade_entregue,
        valor_previsto_material::double precision
          AS valor_previsto_material,
        percentual_material_entregue::double precision
          AS percentual_material_entregue,
        total_os,
        os_encerradas,
        os_abertas,
        os_encerradas_sem_data,
        os_abertas_com_data,
        percentual_os_encerradas::double precision
          AS percentual_os_encerradas,
        total_relatorios,
        relatorios_inicio,
        relatorios_fim,
        relatorios_rascunho,
        indicador_financeiro,
        indicador_progresso,
        indicador_material,
        indicador_os,
        indicador_prazo,
        alerta_sem_gerente,
        alerta_realizado_sem_orcamento,
        alerta_sem_marcos,
        alerta_sem_materiais,
        alerta_divergencia_os,
        alertas,
        quantidade_alertas
      FROM public.vw_gp_painel_executivo_v2
      ORDER BY
        quantidade_alertas DESC,
        projeto_id ASC
    `);
  }

  async painelResumoV2() {
    const rows = await this.db.$queryRaw<
      Array<Record<string, unknown>>
    >(Prisma.sql`
      SELECT
        total_projetos,
        projetos_em_execucao,
        projetos_atrasados,
        projetos_vencendo_hoje,
        projetos_vencendo_30_dias,
        projetos_sem_gerente,
        projetos_sem_marcos,
        projetos_sem_materiais,
        projetos_realizado_sem_orcamento,
        projetos_com_divergencia_os,
        valor_total_contratos::double precision
          AS valor_total_contratos,
        valor_total_orcado::double precision
          AS valor_total_orcado,
        valor_total_realizado::double precision
          AS valor_total_realizado,
        saldo_total_orcamento::double precision
          AS saldo_total_orcamento,
        total_os,
        total_os_encerradas,
        total_os_abertas,
        total_os_encerradas_sem_data,
        total_relatorios,
        total_relatorios_rascunho
      FROM public.vw_gp_painel_resumo_v2
    `);

    return rows[0] ?? null;
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
  async updateTaxes(id: number, body: any, actor: Actor) {
    const aliqSimples = Number(body.aliqSimples);
    const aliqIss = Number(body.aliqIss);
    const aliqOutros = Number(body.aliqOutros);
    const total = aliqSimples + aliqIss + aliqOutros;

    if (
      !Number.isFinite(aliqSimples) ||
      !Number.isFinite(aliqIss) ||
      !Number.isFinite(aliqOutros)
    ) {
      throw new BadRequestException(
        'As alíquotas devem ser números válidos.',
      );
    }

    if (total > 100) {
      throw new BadRequestException(
        'A soma das alíquotas não pode ultrapassar 100%.',
      );
    }

    return this.db.$transaction(async (tx) => {
      const before = await tx.gp_projeto.findFirst({
        where: {
          id,
          excluido_em: null,
        },
      });

      if (!before) {
        throw new NotFoundException(
          'Projeto não encontrado',
        );
      }

      const result = await tx.gp_projeto.updateMany({
        where: {
          id,
          versao: Number(body.versao),
          excluido_em: null,
        },
        data: {
          aliq_simples: this.dec(aliqSimples / 100),
          aliq_iss: this.dec(aliqIss / 100),
          aliq_outros: this.dec(aliqOutros / 100),
          atualizado_por_id: actor.id || null,
          atualizado_em: new Date(),
          versao: { increment: 1 },
        },
      });

      if (result.count !== 1) {
        throw new BadRequestException(
          'O projeto foi alterado por outro usuário. Atualize a tela e tente novamente.',
        );
      }

      const after = await tx.gp_projeto.findUniqueOrThrow({
        where: { id },
      });

      await this.audit(
        tx,
        actor,
        'gp_projeto',
        id,
        'ATUALIZAR_IMPOSTOS',
        {
          aliq_simples: before.aliq_simples,
          aliq_iss: before.aliq_iss,
          aliq_outros: before.aliq_outros,
          versao: before.versao,
        },
        {
          aliq_simples: after.aliq_simples,
          aliq_iss: after.aliq_iss,
          aliq_outros: after.aliq_outros,
          versao: after.versao,
        },
      );

      return {
        id: after.id,
        aliqSimples:
          Number(after.aliq_simples || 0) * 100,
        aliqIss:
          Number(after.aliq_iss || 0) * 100,
        aliqOutros:
          Number(after.aliq_outros || 0) * 100,
        total:
          (
            Number(after.aliq_simples || 0) +
            Number(after.aliq_iss || 0) +
            Number(after.aliq_outros || 0)
          ) * 100,
        versao: after.versao,
      };
    });
  }

  async transitionApproval(
    id: number,
    target: 'PENDENTE' | 'APROVADO' | 'REJEITADO',
    version: number,
    actor: Actor,
    rejectionReason?: string,
  ) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.gp_projeto.findFirst({
        where: { id, excluido_em: null },
      });
      if (!before) throw new NotFoundException('Projeto não encontrado');

      const allowed =
        target === 'PENDENTE'
          ? ['NAO_SUBMETIDO', 'REJEITADO'].includes(before.aprovacao_status)
          : before.aprovacao_status === 'PENDENTE';
      if (!allowed) {
        throw new BadRequestException(
          `Transição de aprovação inválida: ${before.aprovacao_status} -> ${target}`,
        );
      }
      const reason = rejectionReason?.trim();
      if (target === 'REJEITADO' && !reason) {
        throw new BadRequestException('Informe o motivo da rejeição');
      }

      const result = await tx.gp_projeto.updateMany({
        where: {
          id,
          versao: version,
          aprovacao_status: before.aprovacao_status,
          excluido_em: null,
        },
        data: {
          aprovacao_status: target,
          aprovado_em: target === 'APROVADO' ? new Date() : null,
          aprovado_por_id: target === 'APROVADO' ? actor.id || null : null,
          atualizado_por_id: actor.id || null,
          atualizado_em: new Date(),
          versao: { increment: 1 },
        },
      });
      if (result.count !== 1) {
        throw new BadRequestException(
          'O projeto foi alterado por outro usuário. Atualize a tela e tente novamente.',
        );
      }
      const after = await tx.gp_projeto.findUniqueOrThrow({ where: { id } });
      await this.audit(
        tx,
        actor,
        'gp_projeto',
        id,
        target === 'PENDENTE'
          ? 'SUBMETER_APROVACAO'
          : target === 'APROVADO'
            ? 'APROVAR'
            : 'REJEITAR',
        before,
        target === 'REJEITADO' ? { ...after, motivo_rejeicao: reason } : after,
      );
      return after;
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
  async updateOrderFinance(
    projectId: number,
    orderId: number,
    body: any,
    actor: Actor,
  ) {
    await this.exists(projectId);

    const allowed = [
      'NAO_CLASSIFICADO',
      'VALOR_VENDA',
      'CUSTO',
    ];

    const naturezaValor = String(
      body.naturezaValor || '',
    ).trim();

    const valorVenda = Number(
      body.valorVenda || 0,
    );

    const custoApropriavel = Number(
      body.custoApropriavel || 0,
    );

    if (!allowed.includes(naturezaValor)) {
      throw new BadRequestException(
        'Natureza financeira inválida.',
      );
    }

    if (
      !Number.isFinite(valorVenda) ||
      valorVenda < 0 ||
      !Number.isFinite(custoApropriavel) ||
      custoApropriavel < 0
    ) {
      throw new BadRequestException(
        'Os valores financeiros devem ser válidos e não negativos.',
      );
    }

    if (
      naturezaValor === 'CUSTO' &&
      custoApropriavel <= 0
    ) {
      throw new BadRequestException(
        'Informe um custo apropriável maior que zero.',
      );
    }

    if (
      naturezaValor !== 'CUSTO' &&
      custoApropriavel > 0
    ) {
      throw new BadRequestException(
        'Custo apropriável somente pode ser informado para natureza CUSTO.',
      );
    }

    return this.db.$transaction(async (tx) => {
      const before = await tx.gp_os.findFirst({
        where: {
          id: orderId,
          projeto_id: projectId,
          excluido_em: null,
        },
      });

      if (!before) {
        throw new NotFoundException(
          'OS não encontrada no projeto.',
        );
      }

      if (before.versao !== Number(body.versao)) {
        throw new BadRequestException(
          'A OS foi alterada por outro usuário. Atualize a tela e tente novamente.',
        );
      }

      const legacyCost =
        await tx.gp_custo.findFirst({
          where: {
            projeto_id: projectId,
            origem: 'os',
            os_id: null,
            excluido_em: null,
          },
        });

      if (
        naturezaValor === 'CUSTO' &&
        legacyCost
      ) {
        throw new BadRequestException(
          'Existe custo agregado legado de OS neste projeto. Revise o custo legado antes de apropriar custos individualmente.',
        );
      }

      const linkedCosts =
        await tx.gp_custo.findMany({
          where: {
            projeto_id: projectId,
            os_id: orderId,
            excluido_em: null,
          },
          orderBy: {
            id: 'asc',
          },
        });

      if (linkedCosts.length > 1) {
        throw new BadRequestException(
          'Existem custos ativos duplicados vinculados a esta OS.',
        );
      }

      const order = await tx.gp_os.update({
        where: {
          id: orderId,
        },
        data: {
          natureza_valor: naturezaValor,
          valor_venda:
            naturezaValor === 'VALOR_VENDA'
              ? this.dec(valorVenda)
              : this.dec(0),
          custo_apropriavel:
            naturezaValor === 'CUSTO'
              ? this.dec(custoApropriavel)
              : this.dec(0),
          atualizado_por_id: actor.id || null,
          versao: {
            increment: 1,
          },
        },
      });

      let cost: any = linkedCosts[0] || null;

      if (naturezaValor === 'CUSTO') {
        if (cost) {
          cost = await tx.gp_custo.update({
            where: {
              id: cost.id,
            },
            data: {
              categoria: 'CUSTO_OS',
              tipo: 'direto',
              descricao:
                `Custo apropriado da OS ${before.numero_os || orderId}`,
              origem: 'os',
              valor_realizado:
                this.dec(custoApropriavel),
              valor_unitario:
                this.dec(custoApropriavel),
              quantidade: this.dec(1),
              situacao: 'Realizado',
              data_custo: new Date(),
              atualizado_por_id:
                actor.id || null,
              versao: {
                increment: 1,
              },
            },
          });
        } else {
          cost = await tx.gp_custo.create({
            data: {
              projeto_id: projectId,
              categoria: 'CUSTO_OS',
              tipo: 'direto',
              descricao:
                `Custo apropriado da OS ${before.numero_os || orderId}`,
              origem: 'os',
              valor_orcado: this.dec(0),
              valor_realizado:
                this.dec(custoApropriavel),
              valor_unitario:
                this.dec(custoApropriavel),
              quantidade: this.dec(1),
              data_custo: new Date(),
              competencia: new Date(),
              situacao: 'Realizado',
              os_id: orderId,
              atualizado_por_id:
                actor.id || null,
            },
          });
        }
      } else if (cost) {
        cost = await tx.gp_custo.update({
          where: {
            id: cost.id,
          },
          data: {
            excluido_em: new Date(),
            excluido_por_id:
              actor.id || null,
            motivo_exclusao:
              'OS reclassificada sem apropriação de custo',
            atualizado_por_id:
              actor.id || null,
            versao: {
              increment: 1,
            },
          },
        });
      }

      await this.audit(
        tx,
        actor,
        'gp_os',
        orderId,
        'ATUALIZAR_FINANCEIRO_OS',
        {
          natureza_valor:
            before.natureza_valor,
          valor_venda:
            before.valor_venda,
          custo_apropriavel:
            before.custo_apropriavel,
          versao: before.versao,
        },
        {
          natureza_valor:
            order.natureza_valor,
          valor_venda:
            order.valor_venda,
          custo_apropriavel:
            order.custo_apropriavel,
          versao: order.versao,
          gp_custo_id:
            cost?.id || null,
        },
      );

      return {
        ordemServico: order,
        custo: cost,
        bloqueioLegado: false,
      };
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
  async syncOrdersForProject(id: number, a: Actor) {
    const p = await this.exists(id);
    const proposta = this.str(p.proposta);
    const contrato = this.str(p.numero_contrato);

    const base = {
      projetoId: id,
      proposta,
      contrato,
      localizadas: 0,
      existentes: 0,
      atualizadas: 0,
      incluidas: 0,
      ignoradas: 0,
      ambiguidades: 0,
      sincronizadoEm: new Date().toISOString(),
    };

    if (!proposta || !contrato) {
      return {
        ...base,
        ignoradas: 1,
        motivo: 'PROJETO_SEM_PROPOSTA_OU_CONTRATO',
      };
    }

    const [
      servicosProposta,
      servicosContrato,
    ] = await Promise.all([
      this.db.opServico.count({
        where: {
          proposta: {
            equals: proposta,
            mode: 'insensitive',
          },
          ativo: true,
        },
      }),

      this.db.opServico.count({
        where: {
          contrato: {
            equals: contrato,
            mode: 'insensitive',
          },
          ativo: true,
        },
      }),
    ]);

    if (
      servicosProposta !== 1
      || servicosContrato !== 1
    ) {
      return {
        ...base,
        ambiguidades: 1,
        motivo: 'SERVICO_NAO_UNICO',
        servicosProposta,
        servicosContrato,
      };
    }

    const orders = await this.db.ordemServico.findMany({
      where: {
        contrato: {
          equals: contrato,
          mode: 'insensitive',
        },
      },
      orderBy: {
        numero: 'asc',
      },
    });

    return this.db.$transaction(async (tx) => {
      let existentes = 0;
      let atualizadas = 0;
      let incluidas = 0;

      for (const order of orders) {
        const found = await tx.gp_os.findUnique({
          where: {
            projeto_id_numero_os: {
              projeto_id: id,
              numero_os: order.numero,
            },
          },
        });

        if (found) {
          await tx.gp_os.update({
            where: { id: found.id },
            data: {
              tipo: order.tipo,
              situacao: order.status || order.situacao,
              tecnico: order.tecnico,
              descricao:
                order.titulo ||
                order.solicitacao ||
                `OS ${order.numero}`,
              valor: order.valor,
              data_abertura: order.abertura,
              data_fechamento: order.fechamento,
              importado_em: new Date(),
              versao: { increment: 1 },
            },
          });

          existentes += 1;
          atualizadas += 1;
          continue;
        }

        await tx.gp_os.create({
          data: {
            projeto_id: id,
            numero_os: order.numero,
            tipo: order.tipo,
            situacao:
              order.status
              || order.situacao,
            tecnico: order.tecnico,
            descricao:
              order.titulo
              || order.solicitacao
              || `OS ${order.numero}`,
            valor: order.valor,
            data_abertura: order.abertura,
            data_fechamento: order.fechamento,
            importado_em: new Date(),
          },
        });

        incluidas += 1;
      }

      const result = {
        ...base,
        localizadas: orders.length,
        existentes,
        atualizadas,
        incluidas,
        sincronizadoEm: new Date().toISOString(),
      };

      await this.audit(
        tx,
        a,
        'gp_os',
        id,
        'SINCRONIZAR_AUTOMATICO',
        null,
        result,
      );

      return result;
    });
  }

  async importOrders(id: number, a: Actor) {
    return this.syncOrdersForProject(id, a);
  }
}
