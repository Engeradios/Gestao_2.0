import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

const STATUS_VALIDOS = [
  'APROVADO',
  'AGUARDANDO APROVAÇÃO',
  'CANCELADA',
  'PERDIDA',
];
const ORDENACOES: Record<string, string> = {
  numero: 'numero',
  cliente: 'cliente_nome',
  titulo: 'titulo',
  tipo: 'tipo',
  status: 'status',
  fase: 'fase_negociacao',
  representante: 'representante_nome',
  uf: 'cliente_uf',
  criacao: 'data_cadastro',
  cadastro: 'data_cadastro',
  previsao: 'previsao_fechamento',
  valor: 'val_proposta',
  atualizado: 'atualizado_em',
};

@Injectable()
export class ProposalsService {
  constructor(private readonly db: PrismaService) {}

  private inteiro(value: unknown, fallback: number, min: number, max: number) {
    const n = Number(value);
    return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  private texto(value: unknown) {
    const v = String(value ?? '').trim();
    return v || undefined;
  }

  private async prazoConfigurado() {
    const cfg = await this.db.opPropostaConfiguracao.findUnique({
      where: { chave: 'prop_dias_cancela' },
    });
    return this.inteiro(cfg?.valor, 90, 1, 3650);
  }

  async filtros() {
    const [status, fases, representantes, locais, ufs, tipos] =
      await this.db.$transaction([
        this.db.opProposta.findMany({
          distinct: ['status'],
          select: { status: true },
          orderBy: { status: 'asc' },
        }),
        this.db.opProposta.findMany({
          distinct: ['faseNegociacao'],
          select: { faseNegociacao: true },
          orderBy: { faseNegociacao: 'asc' },
        }),
        this.db.opProposta.findMany({
          distinct: ['representanteNome'],
          select: { representanteNome: true },
          orderBy: { representanteNome: 'asc' },
        }),
        this.db.opProposta.findMany({
          distinct: ['local'],
          select: { local: true },
          orderBy: { local: 'asc' },
        }),
        this.db.opProposta.findMany({
          distinct: ['clienteUf'],
          select: { clienteUf: true },
          orderBy: { clienteUf: 'asc' },
        }),
        this.db.opProposta.findMany({
          distinct: ['tipo'],
          select: { tipo: true },
          orderBy: { tipo: 'asc' },
        }),
      ]);
    const values = <T>(rows: T[], key: keyof T) =>
      rows.map((x) => x[key]).filter(Boolean);
    return {
      status: values(status, 'status'),
      fases: values(fases, 'faseNegociacao'),
      representantes: values(representantes, 'representanteNome'),
      locais: values(locais, 'local'),
      ufs: values(ufs, 'clienteUf'),
      tipos: values(tipos, 'tipo'),
    };
  }

  async listar(q: Record<string, string | undefined>) {
    const pagina = this.inteiro(q.pagina, 1, 1, 1_000_000);
    const limite = this.inteiro(q.limite, 25, 1, 200);
    const busca = this.texto(q.busca);
    const where: Prisma.OpPropostaWhereInput = {};
    if (busca) {
      where.OR = [
        { numero: { contains: busca, mode: 'insensitive' } },
        { clienteNome: { contains: busca, mode: 'insensitive' } },
        { titulo: { contains: busca, mode: 'insensitive' } },
        { local: { contains: busca, mode: 'insensitive' } },
        { contatoNome: { contains: busca, mode: 'insensitive' } },
      ];
    }
    if (this.texto(q.status))
      where.status = { equals: q.status!.trim(), mode: 'insensitive' };
    if (this.texto(q.fase))
      where.faseNegociacao = { equals: q.fase!.trim(), mode: 'insensitive' };
    if (this.texto(q.representante))
      where.representanteNome = {
        equals: q.representante!.trim(),
        mode: 'insensitive',
      };
    if (this.texto(q.local))
      where.local = { equals: q.local!.trim(), mode: 'insensitive' };
    if (this.texto(q.uf))
      where.clienteUf = { equals: q.uf!.trim(), mode: 'insensitive' };
    if (this.texto(q.tipo))
      where.tipo = { equals: q.tipo!.trim(), mode: 'insensitive' };
    const data: Prisma.DateTimeFilter = {};
    if (q.dataInicio) data.gte = new Date(`${q.dataInicio}T00:00:00`);
    if (q.dataFim) data.lte = new Date(`${q.dataFim}T23:59:59.999`);
    if (data.gte || data.lte) where.dataCadastro = data;
    const sort = ORDENACOES[q.ordenar || 'atualizado'] || 'atualizado_em';
    const dir = q.direcao === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const camposOrdenacao: Record<
      string,
      keyof Prisma.OpPropostaOrderByWithRelationInput
    > = {
      atualizado_em: 'atualizadoEm',
      numero: 'numero',
      cliente_nome: 'clienteNome',
      titulo: 'titulo',
      tipo: 'tipo',
      status: 'status',
      fase_negociacao: 'faseNegociacao',
      representante_nome: 'representanteNome',
      cliente_uf: 'clienteUf',
      val_proposta: 'valProposta',
      data_cadastro: 'dataCadastro',
    };

    const campoOrdenacao = camposOrdenacao[sort] ?? 'atualizadoEm';

    const orderBy: Prisma.OpPropostaOrderByWithRelationInput = {
      [campoOrdenacao]: q.direcao === 'asc' ? 'asc' : 'desc',
    };
    let total: number;
    let itens;

    if (sort === 'numero') {
      const todos = await this.db.opProposta.findMany({ where });

      const fator = q.direcao === 'asc' ? 1 : -1;

      todos.sort((a, b) => {
        const numeroA = a.numero.trim();
        const numeroB = b.numero.trim();
        const apenasNumerosA = /^\\d+$/.test(numeroA);
        const apenasNumerosB = /^\\d+$/.test(numeroB);

        if (apenasNumerosA && apenasNumerosB) {
          const valorA = BigInt(numeroA);
          const valorB = BigInt(numeroB);

          if (valorA < valorB) return -1 * fator;
          if (valorA > valorB) return 1 * fator;
          return 0;
        }

        return (
          numeroA.localeCompare(numeroB, 'pt-BR', {
            numeric: true,
            sensitivity: 'base',
          }) * fator
        );
      });

      total = todos.length;
      itens = todos.slice((pagina - 1) * limite, pagina * limite);
    } else {
      [total, itens] = await this.db.$transaction([
        this.db.opProposta.count({ where }),
        this.db.opProposta.findMany({
          where,
          orderBy,
          skip: (pagina - 1) * limite,
          take: limite,
        }),
      ]);
    }
    return {
      itens,
      paginacao: {
        pagina,
        limite,
        total,
        paginas: Math.max(1, Math.ceil(total / limite)),
      },
      ordenacao: {
        campo: sort,
        direcao: dir.values.length ? q.direcao || 'desc' : 'desc',
      },
    };
  }

  async detalhe(numero: string) {
    const proposta = await this.db.opProposta.findFirst({
      where: { numero: { equals: numero.trim(), mode: 'insensitive' } },
      include: {
        evolucoes: { orderBy: [{ registradoEm: 'desc' }, { id: 'desc' }] },
      },
    });
    if (!proposta) throw new NotFoundException('Proposta não encontrada');
    return proposta;
  }

  async atualizar(
    id: number,
    body: {
      status?: string;
      faseNegociacao?: string | null;
      titulo?: string | null;
    },
    usuario: string,
  ) {
    const atual = await this.db.opProposta.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Proposta não encontrada');
    const data: Prisma.OpPropostaUpdateInput = {};
    const alteracoes: Array<{
      campo: string;
      antigo: string | null;
      novo: string | null;
    }> = [];
    if (body.status !== undefined) {
      const status = body.status.trim().toUpperCase();
      if (!STATUS_VALIDOS.includes(status))
        throw new BadRequestException('Status inválido');
      if (status !== atual.status) {
        data.status = status;
        alteracoes.push({
          campo: 'status',
          antigo: atual.status,
          novo: status,
        });
      }
    }
    if (body.faseNegociacao !== undefined) {
      const novo = this.texto(body.faseNegociacao) || null;
      if (novo !== atual.faseNegociacao) {
        data.faseNegociacao = novo;
        alteracoes.push({
          campo: 'fase_negociacao',
          antigo: atual.faseNegociacao,
          novo,
        });
      }
    }
    if (body.titulo !== undefined) {
      const novo = this.texto(body.titulo) || null;
      if (novo !== atual.titulo) {
        data.titulo = novo;
        alteracoes.push({ campo: 'titulo', antigo: atual.titulo, novo });
      }
    }
    if (!alteracoes.length) return atual;
    return this.db.$transaction(async (tx) => {
      const proposta = await tx.opProposta.update({
        where: { id },
        data: { ...data, atualizadoEm: new Date() },
      });
      await tx.opPropostaEvolucao.createMany({
        data: alteracoes.map((x) => ({
          propostaNumero: atual.numero,
          campo: x.campo,
          valorAntigo: x.antigo,
          valorNovo: x.novo,
          origem: 'edicao-manual',
          usuario,
        })),
      });
      return proposta;
    });
  }

  async configuracoes() {
    return this.db.opPropostaConfiguracao.findMany({
      orderBy: { chave: 'asc' },
    });
  }

  async atualizarConfiguracao(chave: string, valor: unknown) {
    if (chave !== 'prop_dias_cancela')
      throw new BadRequestException('Configuração inválida');
    const dias = this.inteiro(valor, 0, 1, 3650);
    if (!dias) throw new BadRequestException('Prazo inválido');
    return this.db.opPropostaConfiguracao.upsert({
      where: { chave },
      create: { chave, valor: String(dias) },
      update: { valor: String(dias), atualizadoEm: new Date() },
    });
  }

  async cancelarInativas(
    diasInformado: number | undefined,
    usuario: string,
    origem: string,
  ) {
    const dias =
      diasInformado === undefined
        ? await this.prazoConfigurado()
        : this.inteiro(diasInformado, 90, 1, 3650);
    const alvos = await this.db.$queryRaw<
      Array<{ id: number; numero: string; status: string }>
    >(Prisma.sql`
      SELECT id, numero, status
      FROM op_propostas
      WHERE upper(coalesce(status,'')) NOT IN ('APROVADO','CANCELADA','PERDIDA')
        AND coalesce(data_cadastro, criado_em::date) IS NOT NULL
        AND coalesce(data_cadastro, criado_em::date) < current_date - (${dias} * interval '1 day')
      ORDER BY id
    `);
    if (!alvos.length) return { quantidade: 0, numeros: [], dias };
    await this.db.$transaction(
      async (tx) => {
        for (const alvo of alvos) {
          await tx.opProposta.update({
            where: { id: alvo.id },
            data: {
              status: 'CANCELADA',
              motivo: 'INATIVIDADE',
              atualizadoEm: new Date(),
            },
          });
          await tx.opPropostaEvolucao.create({
            data: {
              propostaNumero: alvo.numero,
              campo: 'status',
              valorAntigo: alvo.status,
              valorNovo: 'CANCELADA',
              origem: `${origem} (+${dias}d)`,
              usuario,
            },
          });
        }
      },
      { timeout: 30_000 },
    );
    return {
      quantidade: alvos.length,
      numeros: alvos.map((x) => x.numero),
      dias,
    };
  }

  private lista(value: unknown, limite = 50): string[] {
    const origem = Array.isArray(value) ? value : [value];
    return [
      ...new Set(
        origem
          .flatMap((item) => String(item || '').split(','))
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ].slice(0, limite);
  }

  async dashboard(q: Record<string, string | undefined>) {
    const dias = q.dias
      ? this.inteiro(q.dias, 90, 1, 3650)
      : await this.prazoConfigurado();
    const permitidos = ['30', '45', '90', 'mes', 'ano', 'tudo', 'custom'];
    const periodo = permitidos.includes(q.periodo || '') ? q.periodo! : '45';
    const uf = this.texto(q.uf);
    const tipos = this.lista(q.tipos);
    const faixasValor = this.lista(q.faixasValor, 4);
    const faixasPermitidas = new Set([
      '0_100',
      '100_300',
      '300_500',
      '500_MAIS',
    ]);
    if (faixasValor.some((faixa) => !faixasPermitidas.has(faixa))) {
      throw new BadRequestException('Faixa de valor inválida');
    }

    const hoje = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const inicioMes = new Date(
      Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1),
    );
    let dataInicio: string | undefined;
    let dataFim: string | undefined = iso(hoje);
    let periodoLabel = 'Últimos 45 dias';
    if (periodo === '30' || periodo === '45' || periodo === '90') {
      const d = new Date(hoje);
      d.setUTCDate(d.getUTCDate() - Number(periodo));
      dataInicio = iso(d);
      periodoLabel = `Últimos ${periodo} dias`;
    } else if (periodo === 'mes') {
      dataInicio = iso(inicioMes);
      periodoLabel = 'Este mês';
    } else if (periodo === 'ano') {
      dataInicio = `${hoje.getUTCFullYear()}-01-01`;
      periodoLabel = 'Este ano';
    } else if (periodo === 'tudo') {
      dataFim = undefined;
      periodoLabel = 'Todo o período';
    } else {
      dataInicio = this.texto(q.ini);
      dataFim = this.texto(q.fim);
      if (dataInicio && dataFim && dataInicio > dataFim)
        throw new BadRequestException('Período personalizado inválido');
      periodoLabel = 'Período personalizado';
    }

    const dataCriacao = Prisma.sql`coalesce(data_cadastro, criado_em::date)`;
    const filtros: Prisma.Sql[] = [Prisma.sql`1=1`];
    if (dataInicio)
      filtros.push(Prisma.sql`${dataCriacao} >= ${dataInicio}::date`);
    if (dataFim) filtros.push(Prisma.sql`${dataCriacao} <= ${dataFim}::date`);
    if (uf) filtros.push(Prisma.sql`upper(cliente_uf)=upper(${uf})`);
    if (tipos.length) {
      filtros.push(
        Prisma.sql`upper(coalesce(tipo,'')) IN (${Prisma.join(
          tipos.map((tipo) => Prisma.sql`upper(${tipo})`),
        )})`,
      );
    }
    if (faixasValor.length) {
      const condicoes: Prisma.Sql[] = [];
      if (faixasValor.includes('0_100'))
        condicoes.push(
          Prisma.sql`coalesce(val_proposta,0) BETWEEN 0 AND 100000`,
        );
      if (faixasValor.includes('100_300'))
        condicoes.push(
          Prisma.sql`coalesce(val_proposta,0) > 100000 AND coalesce(val_proposta,0) <= 300000`,
        );
      if (faixasValor.includes('300_500'))
        condicoes.push(
          Prisma.sql`coalesce(val_proposta,0) > 300000 AND coalesce(val_proposta,0) <= 500000`,
        );
      if (faixasValor.includes('500_MAIS'))
        condicoes.push(Prisma.sql`coalesce(val_proposta,0) > 500000`);
      filtros.push(Prisma.sql`(${Prisma.join(condicoes, ' OR ')})`);
    }

    const where = Prisma.sql`WHERE ${Prisma.join(filtros, ' AND ')}`;
    const filtroUf = uf
      ? Prisma.sql`WHERE upper(cliente_uf)=upper(${uf})`
      : Prisma.empty;
    const statusEfetivo = Prisma.sql`
      CASE
        WHEN upper(coalesce(status,'')) IN ('APROVADO','CANCELADA','PERDIDA')
          THEN coalesce(nullif(status,''),'—')
        WHEN ${dataCriacao} IS NOT NULL
          AND ${dataCriacao} < current_date - (${dias} * interval '1 day')
          THEN 'Cancelada (inatividade)'
        ELSE coalesce(nullif(status,''),'—')
      END`;

    const [
      resumo,
      status,
      fases,
      serie,
      aprovacaoPorTipo,
      topValor,
      topQuantidade,
      comparativo,
    ] = await Promise.all([
      this.db.$queryRaw(Prisma.sql`
          SELECT count(*)::int total,
            count(*) FILTER (WHERE upper(efetivo)='APROVADO')::int aprovadas,
            count(*) FILTER (WHERE upper(efetivo)='AGUARDANDO APROVAÇÃO')::int aguardando,
            count(*) FILTER (WHERE efetivo='Cancelada (inatividade)')::int canceladas_inatividade,
            coalesce(sum(val_proposta) FILTER (WHERE upper(efetivo)='APROVADO'),0)::numeric valor_aprovado,
            coalesce(sum(val_proposta) FILTER (WHERE upper(efetivo)='AGUARDANDO APROVAÇÃO'),0)::numeric valor_pipeline
          FROM (SELECT val_proposta, ${statusEfetivo} efetivo FROM op_propostas ${where}) p`),
      this.db.$queryRaw(Prisma.sql`
          SELECT efetivo nome, count(*)::int quantidade, coalesce(sum(val_proposta),0)::numeric valor
          FROM (SELECT val_proposta, ${statusEfetivo} efetivo FROM op_propostas ${where}) p
          GROUP BY efetivo ORDER BY quantidade DESC, efetivo`),
      this.db.$queryRaw(Prisma.sql`
          SELECT coalesce(nullif(fase_negociacao,''),'SEM FASE') nome,
            count(*)::int quantidade, coalesce(sum(val_proposta),0)::numeric valor
          FROM op_propostas ${where} GROUP BY 1 ORDER BY quantidade DESC, nome`),
      this.db.$queryRaw(Prisma.sql`
          SELECT to_char(m.mes,'MM/YYYY') mes, count(p.*)::int quantidade,
            coalesce(sum(p.val_proposta) FILTER (WHERE upper(p.status)='APROVADO'),0)::numeric valor_aprovado
          FROM generate_series(date_trunc('month',current_date)-interval '11 months',
            date_trunc('month',current_date), interval '1 month') m(mes)
          LEFT JOIN op_propostas p
            ON date_trunc('month',coalesce(p.data_cadastro,p.criado_em::date))=m.mes
            ${uf ? Prisma.sql`AND upper(p.cliente_uf)=upper(${uf})` : Prisma.empty}
          GROUP BY m.mes ORDER BY m.mes`),
      this.db.$queryRaw(Prisma.sql`
          SELECT coalesce(nullif(tipo,''),'SEM TIPO') nome,
            count(*)::int total,
            count(*) FILTER (WHERE upper(coalesce(status,''))='APROVADO')::int aprovadas,
            round(100.0 * count(*) FILTER (WHERE upper(coalesce(status,''))='APROVADO') / nullif(count(*),0), 1)::numeric taxa_aprovacao,
            coalesce(sum(val_proposta) FILTER (WHERE upper(coalesce(status,''))='APROVADO'),0)::numeric valor_aprovado
          FROM op_propostas ${where}
          GROUP BY 1 ORDER BY aprovadas DESC, nome`),
      this.db.$queryRaw(Prisma.sql`
          SELECT coalesce(nullif(cliente_nome,''),'—') nome, count(*)::int quantidade,
            coalesce(sum(val_proposta),0)::numeric valor
          FROM op_propostas ${where} AND upper(coalesce(status,''))='APROVADO' GROUP BY 1 ORDER BY valor DESC, nome LIMIT 10`),
      this.db.$queryRaw(Prisma.sql`
          SELECT coalesce(nullif(cliente_nome,''),'—') nome, count(*)::int quantidade,
            coalesce(sum(val_proposta),0)::numeric valor
          FROM op_propostas ${where} AND upper(coalesce(status,''))='APROVADO' GROUP BY 1 ORDER BY quantidade DESC, nome LIMIT 10`),
      this.db.$queryRaw(Prisma.sql`
          WITH base AS (
            SELECT ${dataCriacao} d, val_proposta, upper(coalesce(status,'')) status
            FROM op_propostas ${filtroUf}
          ), periodos AS (
            SELECT 'atual' chave, date_trunc('month',current_date)::date ini, current_date fim
            UNION ALL SELECT 'anterior', (date_trunc('month',current_date)-interval '1 month')::date,
              (date_trunc('month',current_date)-interval '1 day')::date
            UNION ALL SELECT 'ano_anterior', (date_trunc('month',current_date)-interval '1 year')::date,
              (current_date-interval '1 year')::date
          )
          SELECT p.chave, count(b.*)::int quantidade,
            count(b.*) FILTER (WHERE b.status='APROVADO')::int aprovadas,
            coalesce(sum(b.val_proposta) FILTER (WHERE b.status='APROVADO'),0)::numeric valor_aprovado,
            p.ini, p.fim
          FROM periodos p LEFT JOIN base b ON b.d BETWEEN p.ini AND p.fim
          GROUP BY p.chave,p.ini,p.fim ORDER BY p.ini DESC`),
    ]);

    const r = (resumo as any[])[0] || {};
    const total = Number(r.total || 0);
    const aprovadas = Number(r.aprovadas || 0);
    return {
      filtros: {
        periodo,
        periodoLabel,
        dataInicio,
        dataFim,
        uf: uf || null,
        tipos,
        faixasValor,
      },
      resumo: {
        ...r,
        total,
        aprovadas,
        aguardando: Number(r.aguardando || 0),
        canceladas_inatividade: Number(r.canceladas_inatividade || 0),
        taxa_aprovacao: total ? Math.round((aprovadas / total) * 100) : 0,
      },
      status,
      fases,
      serie,
      aprovacaoPorTipo,
      topClientesValor: topValor,
      topClientesQuantidade: topQuantidade,
      comparativo,
      diasInatividade: dias,
    };
  }

  async painel(diasInformado?: number) {
    const dias =
      diasInformado === undefined
        ? await this.prazoConfigurado()
        : this.inteiro(diasInformado, 90, 1, 3650);
    const [resumo, status, fase, mensal, representantes, inativas] =
      await Promise.all([
        this.db.$queryRaw(
          Prisma.sql`SELECT count(*)::int total, count(*) FILTER (WHERE upper(status)='APROVADO')::int aprovadas, count(*) FILTER (WHERE upper(status)='PERDIDA')::int perdidas, count(*) FILTER (WHERE upper(status)='CANCELADA')::int canceladas, coalesce(sum(val_proposta),0)::numeric valor_total, coalesce(sum(val_proposta) FILTER (WHERE upper(status)='APROVADO'),0)::numeric valor_aprovado FROM op_propostas`,
        ),
        this.db.$queryRaw(
          Prisma.sql`SELECT coalesce(status,'SEM STATUS') nome, count(*)::int quantidade, coalesce(sum(val_proposta),0)::numeric valor FROM op_propostas GROUP BY 1 ORDER BY 2 DESC`,
        ),
        this.db.$queryRaw(
          Prisma.sql`SELECT coalesce(fase_negociacao,'SEM FASE') nome, count(*)::int quantidade, coalesce(sum(val_proposta),0)::numeric valor FROM op_propostas GROUP BY 1 ORDER BY 2 DESC`,
        ),
        this.db.$queryRaw(
          Prisma.sql`SELECT to_char(date_trunc('month',coalesce(data_cadastro,criado_em::date)),'YYYY-MM') mes, count(*)::int quantidade, coalesce(sum(val_proposta),0)::numeric valor FROM op_propostas WHERE coalesce(data_cadastro,criado_em::date)>=current_date-interval '12 months' GROUP BY 1 ORDER BY 1`,
        ),
        this.db.$queryRaw(
          Prisma.sql`SELECT coalesce(representante_nome,'SEM REPRESENTANTE') nome, count(*)::int quantidade, coalesce(sum(val_proposta),0)::numeric valor FROM op_propostas GROUP BY 1 ORDER BY valor DESC LIMIT 15`,
        ),
        this.db.$queryRaw(
          Prisma.sql`SELECT count(*)::int quantidade FROM op_propostas WHERE upper(coalesce(status,'')) NOT IN ('APROVADO','CANCELADA','PERDIDA') AND coalesce(data_cadastro,criado_em::date)<current_date-(${dias}*interval '1 day')`,
        ),
      ]);
    return {
      resumo: (resumo as any[])[0],
      status,
      fases: fase,
      mensal,
      representantes,
      inativas: (inativas as any[])[0],
      diasInatividade: dias,
    };
  }

  importacoes(limite: number) {
    const take = this.inteiro(limite, 20, 1, 100);
    return this.db.opPropostaImportacao.findMany({
      orderBy: { importadoEm: 'desc' },
      take,
      include: {
        evolucoes: {
          orderBy: [{ registradoEm: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            propostaNumero: true,
            campo: true,
            valorAntigo: true,
            valorNovo: true,
            origem: true,
            usuario: true,
            registradoEm: true,
          },
        },
      },
    });
  }
}
