import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DASHBOARD_TV_CATALOG } from './dashboard-tv.catalog';
import type {
  CenaInput,
  DashboardTvInput,
  WidgetInput,
  DashboardTvHeartbeatInput,
} from './dashboard-tv.types';

@Injectable()
export class DashboardTvService {
  constructor(private readonly db: PrismaService) {}
  catalogo() {
    return DASHBOARD_TV_CATALOG;
  }
  private slug(value: string) {
    const slug = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120);
    if (!slug) throw new BadRequestException('Slug inválido');
    return slug;
  }
  private int(value: unknown, fallback: number, min: number, max: number) {
    const n = Number(value);
    return Number.isInteger(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  // DASHBOARD_TV_FASE4A_CONFIG_VALIDATION
  private objectConfig(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private sceneConfig(
    value: unknown,
    previous: unknown = {},
  ): Prisma.InputJsonValue {
    const input = this.objectConfig(value);
    const current = this.objectConfig(previous);
    const allowed = ['AUTO', 'GRADE', 'DESTAQUE'] as const;
    const layout = input.layout;

    if (
      layout !== undefined &&
      !allowed.includes(layout as (typeof allowed)[number])
    ) {
      throw new BadRequestException('Layout de cena inválido');
    }

    return {
      ...current,
      ...(layout !== undefined ? { layout } : {}),
    };
  }

  // DASHBOARD_TV_FASE5A_WIDGET_CONFIG
  private widgetConfig(
    value: unknown,
    previous: unknown = {},
  ): Prisma.InputJsonValue {
    const input = this.objectConfig(value);
    const current = this.objectConfig(previous);

    const sizes = ['PEQUENO', 'MEDIO', 'GRANDE', 'TOTAL'] as const;
    const colors = [
      'VERMELHO',
      'LARANJA',
      'VERDE',
      'AZUL',
      'ROXO',
      'ROSA',
      'CIANO',
    ] as const;

    const tamanho = input.tamanho;
    const cor = input.cor;
    const limite = input.limite;

    if (
      tamanho !== undefined &&
      !sizes.includes(tamanho as (typeof sizes)[number])
    ) {
      throw new BadRequestException('Tamanho de widget inválido');
    }

    if (cor !== undefined && !colors.includes(cor as (typeof colors)[number])) {
      throw new BadRequestException('Cor de widget inválida');
    }

    if (
      limite !== undefined &&
      (!Number.isInteger(Number(limite)) ||
        Number(limite) < 1 ||
        Number(limite) > 20)
    ) {
      throw new BadRequestException(
        'Limite de registros deve estar entre 1 e 20',
      );
    }

    return {
      ...current,
      ...(tamanho !== undefined ? { tamanho } : {}),
      ...(cor !== undefined ? { cor } : {}),
      ...(limite !== undefined ? { limite: Number(limite) } : {}),
    };
  }

  listar() {
    return this.db.dashboardTv.findMany({
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
      include: { _count: { select: { cenas: true } } },
    });
  }
  async obter(id: string) {
    const item = await this.db.dashboardTv.findUnique({
      where: { id },
      include: {
        cenas: {
          orderBy: { ordem: 'asc' },
          include: { widgets: { orderBy: { ordem: 'asc' } } },
        },
      },
    });
    if (!item) throw new NotFoundException('Dashboard TV não encontrado');
    return item;
  }
  criar(input: DashboardTvInput, usuario: string) {
    if (!input.nome?.trim())
      throw new BadRequestException('Nome é obrigatório');
    return this.db.dashboardTv.create({
      data: {
        nome: input.nome.trim(),
        slug: this.slug(input.slug || input.nome),
        descricao: input.descricao?.trim() || null,
        tema: input.tema || 'ESCURO',
        atualizacaoMinutos: this.int(input.atualizacaoMinutos, 5, 1, 60),
        cenaSegundos: this.int(input.cenaSegundos, 12, 5, 300),
        mostrarClima: input.mostrarClima ?? true,
        mostrarRelogio: input.mostrarRelogio ?? true,
        mostrarPaginacao: input.mostrarPaginacao ?? true,
        permitirFinanceiro: input.permitirFinanceiro ?? false,
        ativo: input.ativo ?? true,
        criadoPor: usuario,
      },
    });
  }
  async atualizar(id: string, input: Partial<DashboardTvInput>) {
    await this.obter(id);
    const data: Prisma.DashboardTvUpdateInput = {};
    if (input.nome !== undefined) data.nome = input.nome.trim();
    if (input.slug !== undefined) data.slug = this.slug(input.slug);
    if (input.descricao !== undefined)
      data.descricao = input.descricao?.trim() || null;
    if (input.tema !== undefined) data.tema = input.tema;
    if (input.atualizacaoMinutos !== undefined)
      data.atualizacaoMinutos = this.int(input.atualizacaoMinutos, 5, 1, 60);
    if (input.cenaSegundos !== undefined)
      data.cenaSegundos = this.int(input.cenaSegundos, 12, 5, 300);
    for (const key of [
      'mostrarClima',
      'mostrarRelogio',
      'mostrarPaginacao',
      'permitirFinanceiro',
      'ativo',
    ] as const)
      if (input[key] !== undefined) data[key] = input[key];
    return this.db.dashboardTv.update({ where: { id }, data });
  }

  // DASHBOARD_TV_FASE6B_HEARTBEAT
  private optionalText(
    value: unknown,
    field: string,
    maxLength: number,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} deve ser um texto`);
    }

    const text = value.trim();

    if (!text) return null;

    if (text.length > maxLength) {
      throw new BadRequestException(`${field} excede ${maxLength} caracteres`);
    }

    return text;
  }

  async heartbeat(dashboardId: string, input: DashboardTvHeartbeatInput) {
    const identificador = String(input.identificador || '').trim();

    if (!/^[A-Za-z0-9_-]{16,80}$/.test(identificador)) {
      throw new BadRequestException('Identificador do dispositivo inválido');
    }

    const dashboard = await this.db.dashboardTv.findUnique({
      where: { id: dashboardId },
      select: {
        id: true,
        ativo: true,
        publicado: true,
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard TV não encontrado');
    }

    if (!dashboard.ativo || !dashboard.publicado) {
      throw new BadRequestException('Dashboard TV não está disponível');
    }

    const resolucao = this.optionalText(input.resolucao, 'Resolução', 30);

    if (resolucao && !/^\d{2,5}x\d{2,5}$/.test(resolucao)) {
      throw new BadRequestException('Resolução do dispositivo inválida');
    }

    const now = new Date();

    return this.db.dashboardTvDispositivo.upsert({
      where: {
        dashboardId_identificador: {
          dashboardId,
          identificador,
        },
      },
      create: {
        dashboardId,
        identificador,
        apelido: this.optionalText(input.apelido, 'Apelido', 120),
        resolucao,
        navegador: this.optionalText(input.navegador, 'Navegador', 120),
        versaoApp: this.optionalText(
          input.versaoApp,
          'Versão da aplicação',
          30,
        ),
        ultimoContatoEm: now,
        atualizadoEm: now,
      },
      update: {
        ...(input.apelido !== undefined
          ? {
              apelido: this.optionalText(input.apelido, 'Apelido', 120),
            }
          : {}),
        ...(input.resolucao !== undefined ? { resolucao } : {}),
        ...(input.navegador !== undefined
          ? {
              navegador: this.optionalText(input.navegador, 'Navegador', 120),
            }
          : {}),
        ...(input.versaoApp !== undefined
          ? {
              versaoApp: this.optionalText(
                input.versaoApp,
                'Versão da aplicação',
                30,
              ),
            }
          : {}),
        ultimoContatoEm: now,
        atualizadoEm: now,
      },
      select: {
        id: true,
        identificador: true,
        ultimoContatoEm: true,
      },
    });
  }

  async dispositivos(dashboardId: string) {
    await this.obter(dashboardId);

    const limiteOnline = new Date(Date.now() - 2 * 60 * 1000);

    const dispositivos = await this.db.dashboardTvDispositivo.findMany({
      where: { dashboardId },
      orderBy: { ultimoContatoEm: 'desc' },
      select: {
        id: true,
        identificador: true,
        apelido: true,
        resolucao: true,
        navegador: true,
        versaoApp: true,
        ultimoContatoEm: true,
        criadoEm: true,
      },
    });

    return dispositivos.map((item) => ({
      ...item,
      online: item.ultimoContatoEm >= limiteOnline,
    }));
  }

  // DASHBOARD_TV_FASE6D_DEVICE_ADMIN
  async atualizarDispositivo(id: string, input: { apelido?: unknown }) {
    const atual = await this.db.dashboardTvDispositivo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!atual) {
      throw new NotFoundException('Dispositivo de Dashboard TV não encontrado');
    }

    if (input.apelido === undefined) {
      throw new BadRequestException('Apelido deve ser informado');
    }

    const apelido = this.optionalText(input.apelido, 'Apelido', 120);

    return this.db.dashboardTvDispositivo.update({
      where: { id },
      data: {
        apelido,
        atualizadoEm: new Date(),
      },
      select: {
        id: true,
        identificador: true,
        apelido: true,
        resolucao: true,
        navegador: true,
        versaoApp: true,
        ultimoContatoEm: true,
        atualizadoEm: true,
      },
    });
  }

  async publicar(id: string, publicado: boolean) {
    await this.obter(id);
    return this.db.dashboardTv.update({ where: { id }, data: { publicado } });
  }
  async criarCena(dashboardId: string, input: CenaInput) {
    await this.obter(dashboardId);
    if (!input.nome?.trim())
      throw new BadRequestException('Nome da cena é obrigatório');
    return this.db.dashboardTvCena.create({
      data: {
        dashboardId,
        nome: input.nome.trim(),
        ordem: this.int(input.ordem, 0, 0, 999),
        ativa: input.ativa ?? true,
        duracaoSegundos:
          input.duracaoSegundos == null
            ? null
            : this.int(input.duracaoSegundos, 12, 5, 300),
        configuracao: this.sceneConfig(input.configuracao),
      },
    });
  }
  async atualizarCena(id: string, input: Partial<CenaInput>) {
    const atual = await this.db.dashboardTvCena.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Cena não encontrada');
    return this.db.dashboardTvCena.update({
      where: { id },
      data: {
        ...(input.nome !== undefined ? { nome: input.nome.trim() } : {}),
        ...(input.ordem !== undefined
          ? { ordem: this.int(input.ordem, 0, 0, 999) }
          : {}),
        ...(input.ativa !== undefined ? { ativa: input.ativa } : {}),
        ...(input.duracaoSegundos !== undefined
          ? {
              duracaoSegundos:
                input.duracaoSegundos == null
                  ? null
                  : this.int(input.duracaoSegundos, 12, 5, 300),
            }
          : {}),
        ...(input.configuracao !== undefined
          ? {
              configuracao: this.sceneConfig(
                input.configuracao,
                atual.configuracao,
              ),
            }
          : {}),
      },
    });
  }
  async removerCena(id: string) {
    await this.atualizarCena(id, {});
    return this.db.dashboardTvCena.delete({ where: { id } });
  }
  async criarWidget(cenaId: string, input: WidgetInput) {
    const cena = await this.db.dashboardTvCena.findUnique({
      where: { id: cenaId },
      include: { dashboard: true },
    });
    if (!cena) throw new NotFoundException('Cena não encontrada');
    const catalogo = DASHBOARD_TV_CATALOG.find((x) => x.tipo === input.tipo);
    if (!catalogo) throw new BadRequestException('Tipo de widget inválido');
    if (catalogo.financeiro && !cena.dashboard.permitirFinanceiro)
      throw new BadRequestException(
        'Indicadores financeiros estão bloqueados neste painel',
      );
    return this.db.dashboardTvWidget.create({
      data: {
        cenaId,
        tipo: input.tipo,
        titulo: input.titulo?.trim() || catalogo.titulo,
        ordem: this.int(input.ordem, 0, 0, 999),
        ativo: input.ativo ?? true,
        configuracao: this.widgetConfig(input.configuracao),
      },
    });
  }
  async atualizarWidget(id: string, input: Partial<WidgetInput>) {
    const atual = await this.db.dashboardTvWidget.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Widget não encontrado');
    return this.db.dashboardTvWidget.update({
      where: { id },
      data: {
        ...(input.titulo !== undefined
          ? {
              titulo: (() => {
                const titulo = input.titulo.trim();
                if (!titulo || titulo.length > 80) {
                  throw new BadRequestException(
                    'Título deve possuir entre 1 e 80 caracteres',
                  );
                }
                return titulo;
              })(),
            }
          : {}),
        ...(input.ordem !== undefined
          ? { ordem: this.int(input.ordem, 0, 0, 999) }
          : {}),
        ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
        ...(input.configuracao !== undefined
          ? {
              configuracao: this.widgetConfig(
                input.configuracao,
                atual.configuracao,
              ),
            }
          : {}),
      },
    });
  }
  async removerWidget(id: string) {
    await this.atualizarWidget(id, {});
    return this.db.dashboardTvWidget.delete({ where: { id } });
  }
  async dados(id: string) {
    const painel = await this.obter(id);
    const tipos = new Set(
      painel.cenas.flatMap((c) =>
        c.widgets.filter((w) => w.ativo).map((w) => w.tipo),
      ),
    );
    const dados: Record<string, unknown> = {};
    if (tipos.has('operacional-resumo'))
      dados['operacional-resumo'] = (
        await this.db.$queryRaw<Array<Record<string, unknown>>>(
          Prisma.sql`SELECT count(*) FILTER (WHERE upper(status) NOT IN ('CONCLUÍDO','CONCLUIDO','CANCELADO'))::int andamento, count(*) FILTER (WHERE prazo_final < current_date AND upper(status) NOT IN ('CONCLUÍDO','CONCLUIDO','CANCELADO'))::int atrasados, count(*) FILTER (WHERE date_trunc('month',conclusao_real)=date_trunc('month',current_date))::int concluidos_mes, round(coalesce(avg(percentual) FILTER (WHERE upper(status) NOT IN ('CONCLUÍDO','CONCLUIDO','CANCELADO')),0)*100)::int progresso FROM op_servicos`,
        )
      )[0];
    if (tipos.has('operacional-alertas'))
      dados['operacional-alertas'] = await this.db.$queryRaw<
        Array<Record<string, unknown>>
      >(
        Prisma.sql`SELECT cliente, servico_atividade servico, responsavel, status, prazo_final, (prazo_final-current_date)::int dias FROM op_servicos WHERE prazo_final IS NOT NULL AND upper(status) NOT IN ('CONCLUÍDO','CONCLUIDO','CANCELADO') ORDER BY prazo_final ASC LIMIT 8`,
      );
    if (tipos.has('os-backlog'))
      dados['os-backlog'] = (
        await this.db.$queryRaw<Array<Record<string, unknown>>>(
          Prisma.sql`SELECT count(*)::int total, count(*) FILTER (WHERE upper(coalesce(situacao,''))<>'ENCERRADO' AND upper(coalesce(status,''))<>'EXCLUIDO')::int abertas, count(*) FILTER (WHERE upper(coalesce(situacao,''))='ENCERRADO')::int encerradas, count(*) FILTER (WHERE upper(coalesce(tipo,'')) LIKE '%LABORAT%' AND upper(coalesce(situacao,''))<>'ENCERRADO')::int laboratorio_aguardando FROM ordens_servico`,
        )
      )[0];
    if (tipos.has('os-distribuicao'))
      dados['os-distribuicao'] = {
        porUf: await this.db.$queryRaw<Array<Record<string, unknown>>>(
          Prisma.sql`SELECT coalesce(uf,'—') nome,count(*)::int quantidade FROM ordens_servico WHERE upper(coalesce(situacao,''))<>'ENCERRADO' AND upper(coalesce(status,''))<>'EXCLUIDO' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        ),
        porTipo: await this.db.$queryRaw<Array<Record<string, unknown>>>(
          Prisma.sql`SELECT coalesce(tipo,'—') nome,count(*)::int quantidade FROM ordens_servico WHERE upper(coalesce(situacao,''))<>'ENCERRADO' AND upper(coalesce(status,''))<>'EXCLUIDO' GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
        ),
      };
    if (tipos.has('propostas-resumo'))
      dados['propostas-resumo'] = (
        await this.db.$queryRaw<Array<Record<string, unknown>>>(
          Prisma.sql`SELECT count(*)::int total,count(*) FILTER (WHERE upper(status)='APROVADO')::int aprovadas,count(*) FILTER (WHERE upper(status)='AGUARDANDO APROVAÇÃO')::int aguardando,round(100.0*count(*) FILTER (WHERE upper(status)='APROVADO')/nullif(count(*),0))::int taxa FROM op_propostas`,
        )
      )[0];
    if (tipos.has('propostas-top-clientes'))
      dados['propostas-top-clientes'] = await this.db.$queryRaw<
        Array<Record<string, unknown>>
      >(
        Prisma.sql`SELECT coalesce(nullif(cliente_nome,''),'—') nome,count(*)::int quantidade FROM op_propostas WHERE upper(status)='APROVADO' GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      );
    if (tipos.has('grandes-projetos-resumo'))
      dados['grandes-projetos-resumo'] = (
        await this.db.$queryRaw<Array<Record<string, unknown>>>(
          Prisma.sql`SELECT count(*)::int total,count(*) FILTER (WHERE status='Em execução')::int execucao,count(*) FILTER (WHERE status='Concluído')::int concluidos,count(*) FILTER (WHERE status='Planejamento')::int planejamento FROM gp_projeto`,
        )
      )[0];
    if (tipos.has('grandes-projetos-execucao'))
      dados['grandes-projetos-execucao'] = await this.db.$queryRaw<
        Array<Record<string, unknown>>
      >(
        Prisma.sql`SELECT p.id,p.nome,p.status,round(100*coalesce(sum(c.valor_realizado),0)/nullif(coalesce(sum(c.valor_orcado),0),0))::int execucao FROM gp_projeto p LEFT JOIN gp_custo c ON c.projeto_id=p.id WHERE p.status='Em execução' GROUP BY p.id,p.nome,p.status ORDER BY p.nome LIMIT 8`,
      );
    if (tipos.has('financeiro-inadimplencia') && painel.permitirFinanceiro)
      dados['financeiro-inadimplencia'] = (
        await this.db.$queryRaw<Array<Record<string, unknown>>>(
          Prisma.sql`SELECT count(*) FILTER (WHERE situacao='Vencido')::int vencidos,count(*) FILTER (WHERE situacao IN ('Vencido','A vencer'))::int abertos,round(100.0*count(*) FILTER (WHERE situacao='Vencido')/nullif(count(*) FILTER (WHERE situacao IN ('Vencido','A vencer')),0),1)::numeric percentual_titulos FROM fin_contas_receber`,
        )
      )[0];
    return { painel, dados, geradoEm: new Date().toISOString() };
  }
}
