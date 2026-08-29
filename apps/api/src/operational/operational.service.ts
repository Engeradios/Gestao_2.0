import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { OsRulesService } from './os-rules.service';
import { OsSlaService } from './os-sla.service';

@Injectable()
export class OperationalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: OsRulesService,
    private readonly sla: OsSlaService,
  ) {}

  private where(query: OrderQueryDto): Prisma.OrdemServicoWhereInput {
    const inicio = query.inicio ? new Date(query.inicio) : undefined;
    const fim = query.fim ? new Date(query.fim) : undefined;
    if (inicio && fim && inicio > fim)
      throw new BadRequestException('Período inválido');
    const busca = query.busca?.trim();
    return {
      ...(query.status
        ? { status: { equals: query.status, mode: 'insensitive' } }
        : {}),
      ...(query.situacao
        ? { situacao: { equals: query.situacao, mode: 'insensitive' } }
        : {}),
      ...(query.tipo
        ? { tipo: { equals: query.tipo, mode: 'insensitive' } }
        : {}),
      ...(query.uf ? { uf: query.uf.trim().toUpperCase() } : {}),
      ...(inicio || fim
        ? {
            abertura: {
              ...(inicio ? { gte: inicio } : {}),
              ...(fim ? { lte: fim } : {}),
            },
          }
        : {}),
      ...(busca
        ? {
            OR: [
              { numero: { contains: busca, mode: 'insensitive' } },
              { clienteNome: { contains: busca, mode: 'insensitive' } },
              { clienteCodigo: { contains: busca, mode: 'insensitive' } },
              { contrato: { contains: busca, mode: 'insensitive' } },
              { tecnico: { contains: busca, mode: 'insensitive' } },
              { equipamento: { contains: busca, mode: 'insensitive' } },
              { produto: { contains: busca, mode: 'insensitive' } },
              { chamado: { contains: busca, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async list(query: OrderQueryDto) {
    const where = this.where(query);
    const skip = (query.pagina - 1) * query.limite;
    const orderBy = {
      [query.ordenarPor]: query.direcao,
    } as Prisma.OrdemServicoOrderByWithRelationInput;
    const [total, dados] = await this.prisma.$transaction([
      this.prisma.ordemServico.count({ where }),
      this.prisma.ordemServico.findMany({
        where,
        skip,
        take: query.limite,
        orderBy: [orderBy, { id: 'desc' }],
        select: {
          id: true,
          numero: true,
          clienteCodigo: true,
          clienteNome: true,
          local: true,
          uf: true,
          tipo: true,
          situacao: true,
          status: true,
          contrato: true,
          tecnico: true,
          abertura: true,
          fechamento: true,
          equipamento: true,
          produto: true,
          sincronizadoEm: true,
        },
      }),
    ]);
    return {
      dados,
      paginacao: {
        pagina: query.pagina,
        limite: query.limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / query.limite)),
      },
    };
  }

  // OS_PAINEL_LABORATORIO_SLA
  private painelWhere(
    query: OrderQueryDto,
    laboratorio: boolean,
  ): Prisma.OrdemServicoWhereInput {
    const aberturaInicio = query.aberturaInicio
      ? new Date(query.aberturaInicio)
      : undefined;

    const aberturaFim = query.aberturaFim
      ? new Date(query.aberturaFim)
      : undefined;

    const fechamentoInicio = query.fechamentoInicio
      ? new Date(query.fechamentoInicio)
      : undefined;

    const fechamentoFim = query.fechamentoFim
      ? new Date(query.fechamentoFim)
      : undefined;

    if (aberturaInicio && aberturaFim && aberturaInicio > aberturaFim) {
      throw new BadRequestException('Período de abertura inválido');
    }

    if (fechamentoInicio && fechamentoFim && fechamentoInicio > fechamentoFim) {
      throw new BadRequestException('Período de fechamento inválido');
    }

    return {
      AND: [
        this.where(query),
        laboratorio
          ? {
              tipo: {
                contains: 'LABORAT',
                mode: 'insensitive',
              },
            }
          : {
              NOT: {
                tipo: {
                  contains: 'LABORAT',
                  mode: 'insensitive',
                },
              },
            },
        ...(aberturaInicio || aberturaFim
          ? [
              {
                abertura: {
                  ...(aberturaInicio ? { gte: aberturaInicio } : {}),
                  ...(aberturaFim ? { lte: aberturaFim } : {}),
                },
              },
            ]
          : []),
        ...(fechamentoInicio || fechamentoFim
          ? [
              {
                fechamento: {
                  ...(fechamentoInicio ? { gte: fechamentoInicio } : {}),
                  ...(fechamentoFim ? { lte: fechamentoFim } : {}),
                },
              },
            ]
          : []),
      ],
    };
  }

  private async painel(query: OrderQueryDto, laboratorio: boolean) {
    const where = this.painelWhere(query, laboratorio);

    const skip = (query.pagina - 1) * query.limite;

    const orderBy = {
      [query.ordenarPor]: query.direcao,
    } as Prisma.OrdemServicoOrderByWithRelationInput;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.ordemServico.count({ where }),
      this.prisma.ordemServico.findMany({
        where,
        skip,
        take: query.limite,
        orderBy: [orderBy, { id: 'desc' }],
        select: {
          id: true,
          numero: true,
          clienteCodigo: true,
          clienteNome: true,
          uf: true,
          tipo: true,
          situacao: true,
          status: true,
          tecnico: true,
          abertura: true,
          fechamento: true,
          duracao: true,
          contrato: true,
          equipamento: true,
          produto: true,
          sincronizadoEm: true,
        },
      }),
    ]);

    const enriched = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        laboratorio: this.rules.isLaboratorio(row.tipo),
        regiao: this.rules.regiao(row.uf),
        ...(await this.sla.calcularOrdem({
          abertura: row.abertura,
          fechamento: row.fechamento,
          situacao: row.situacao,
          status: row.status,
          uf: row.uf,
        })),
      })),
    );

    const dados = query.estado
      ? enriched.filter((row) => row.estado === query.estado)
      : enriched;

    return {
      dados,
      paginacao: {
        pagina: query.pagina,
        limite: query.limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / query.limite)),
      },
      escopo: laboratorio ? 'LABORATORIO' : 'OPERACIONAL',
    };
  }

  painelOperacional(query: OrderQueryDto) {
    return this.painel(query, false);
  }

  painelLaboratorio(query: OrderQueryDto) {
    return this.painel(query, true);
  }

  // OS_DASHBOARD_AGREGADO_SLA
  async dashboard() {
    type Row = {
      escopo: string;
      estado: string;
      classificacao_sla: string | null;
      quantidade: bigint | number | string;
    };

    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH configuracao AS (
        SELECT
          id,
          normal_ate_minutos,
          atencao_ate_minutos,
          urgente_ate_minutos
        FROM os_sla_configuracoes
        WHERE ativo = TRUE
        ORDER BY criado_em
        LIMIT 1
      ),
      base AS (
        SELECT
          os.*,
          TRANSLATE(
            UPPER(COALESCE(os.situacao, '') || ' ' ||
                  COALESCE(os.status, '')),
            'ÁÀÃÂÉÊÍÓÔÕÚÇ',
            'AAAAEEIOOOUC'
          ) AS estado_normalizado,
          CASE
            WHEN UPPER(COALESCE(os.tipo, ''))
              LIKE '%LABORAT%'
              THEN 'LABORATORIO'
            WHEN UPPER(COALESCE(os.uf, '')) = 'RJ'
              THEN 'RJ'
            WHEN UPPER(COALESCE(os.uf, '')) = 'SP'
              THEN 'SP'
            WHEN LENGTH(TRIM(COALESCE(os.uf, ''))) = 2
              THEN 'OUTRAS_UF'
            ELSE 'NAO_INFORMADA'
          END AS escopo
        FROM ordens_servico os
      ),
      estados AS (
        SELECT
          base.*,
          CASE
            WHEN estado_normalizado LIKE '%CANCELAD%'
              OR estado_normalizado LIKE '%EXCLUID%'
              THEN 'CANCELADA'
            WHEN estado_normalizado LIKE '%ENCERRAD%'
              OR estado_normalizado LIKE '%FECHAD%'
              THEN 'FECHADA'
            WHEN estado_normalizado LIKE '%CONCLUID%'
              THEN 'AGUARDANDO_TRATATIVA'
            ELSE 'ABERTA'
          END AS estado
        FROM base
      ),
      minutos AS (
        SELECT
          e.id,
          e.escopo,
          e.estado,
          CASE
            WHEN e.abertura IS NULL THEN NULL
            ELSE COALESCE(calc.minutos, 0)
          END AS minutos_uteis
        FROM estados e
        CROSS JOIN configuracao c
        LEFT JOIN LATERAL (
          SELECT
            FLOOR(
              SUM(
                GREATEST(
                  0,
                  EXTRACT(
                    EPOCH FROM (
                      LEAST(
                        CASE
                          WHEN e.estado = 'FECHADA'
                            AND e.fechamento IS NOT NULL
                          THEN e.fechamento
                          ELSE CURRENT_TIMESTAMP
                        END,
                        dias.dia + h.fim
                      )
                      -
                      GREATEST(
                        e.abertura,
                        dias.dia + h.inicio
                      )
                    )
                  ) / 60
                )
                -
                CASE
                  WHEN h.intervalo_inicio IS NOT NULL
                   AND h.intervalo_fim IS NOT NULL
                  THEN GREATEST(
                    0,
                    EXTRACT(
                      EPOCH FROM (
                        LEAST(
                          CASE
                            WHEN e.estado = 'FECHADA'
                              AND e.fechamento IS NOT NULL
                            THEN e.fechamento
                            ELSE CURRENT_TIMESTAMP
                          END,
                          dias.dia + h.intervalo_fim
                        )
                        -
                        GREATEST(
                          e.abertura,
                          dias.dia + h.intervalo_inicio
                        )
                      )
                    ) / 60
                  )
                  ELSE 0
                END
              )
            )::bigint AS minutos
          FROM generate_series(
            e.abertura::date,
            (
              CASE
                WHEN e.estado = 'FECHADA'
                  AND e.fechamento IS NOT NULL
                THEN e.fechamento
                ELSE CURRENT_TIMESTAMP
              END
            )::date,
            interval '1 day'
          ) AS dias(dia)
          INNER JOIN os_sla_horarios h
            ON h.configuracao_id = c.id
           AND h.ativo = TRUE
           AND h.dia_semana =
             EXTRACT(DOW FROM dias.dia)::smallint
          WHERE e.abertura IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM op_feriados f
              WHERE f.dia = dias.dia::date
                -- SLA_USA_OP_FERIADOS
                AND (
                  NULLIF(BTRIM(f.uf), '') IS NULL
                  OR e.uf IS NULL
                  OR UPPER(BTRIM(f.uf)) =
                    UPPER(BTRIM(e.uf))
                )
            )
        ) calc ON TRUE
      ),
      classificados AS (
        SELECT
          m.escopo,
          m.estado,
          CASE
            WHEN m.minutos_uteis IS NULL THEN NULL
            WHEN m.minutos_uteis <= c.normal_ate_minutos
              THEN 'NORMAL'
            WHEN m.minutos_uteis <= c.atencao_ate_minutos
              THEN 'ATENCAO'
            WHEN m.minutos_uteis <= c.urgente_ate_minutos
              THEN 'URGENTE'
            ELSE 'CRITICO'
          END AS classificacao_sla
        FROM minutos m
        CROSS JOIN configuracao c
      )
      SELECT
        escopo,
        estado,
        classificacao_sla,
        COUNT(*)::bigint AS quantidade
      FROM classificados
      GROUP BY escopo, estado, classificacao_sla
      ORDER BY escopo, estado, classificacao_sla
    `;

    const scopes = ['RJ', 'SP', 'OUTRAS_UF', 'LABORATORIO', 'NAO_INFORMADA'];

    const createScope = () => ({
      total: 0,
      estados: {
        ABERTA: 0,
        AGUARDANDO_TRATATIVA: 0,
        FECHADA: 0,
        CANCELADA: 0,
      },
      sla: {
        NORMAL: 0,
        ATENCAO: 0,
        URGENTE: 0,
        CRITICO: 0,
        SEM_CALCULO: 0,
      },
    });

    const grupos = Object.fromEntries(
      scopes.map((scope) => [scope, createScope()]),
    );

    for (const row of rows) {
      const group = grupos[row.escopo] ?? createScope();
      const quantidade = Number(row.quantidade);

      group.total += quantidade;

      if (row.estado in group.estados) {
        group.estados[row.estado as keyof typeof group.estados] += quantidade;
      }

      const sla = row.classificacao_sla ?? 'SEM_CALCULO';

      if (sla in group.sla) {
        group.sla[sla as keyof typeof group.sla] += quantidade;
      }

      grupos[row.escopo] = group;
    }

    return {
      geradoEm: new Date(),
      total: Object.values(grupos).reduce((sum, group) => sum + group.total, 0),
      grupos,
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: true,
        equipamentos: {
          orderBy: [
            { tipo: 'asc' },
            { descricao: 'asc' },
            { numeroInterno: 'asc' },
          ],
        },
      },
    });
    if (!item) throw new NotFoundException('Ordem de serviço não encontrada');
    return item;
  }

  async synchronizationHistory(limit = 10) {
    const take = Math.min(Math.max(limit, 1), 50);
    return this.prisma.sincronizacaoOperacional.findMany({
      take,
      orderBy: [{ iniciadoEm: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        tipo: true,
        status: true,
        iniciadoEm: true,
        finalizadoEm: true,
        marcoAnterior: true,
        marcoNovo: true,
        clientesLidos: true,
        osLidas: true,
        equipamentosProcessados: true,
        mensagem: true,
      },
    });
  }

  async synchronizationStatus() {
    const [ultima, emExecucao, equipamentos] = await this.prisma.$transaction([
      this.prisma.sincronizacaoOperacional.findFirst({
        orderBy: [{ iniciadoEm: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.sincronizacaoOperacional.count({
        where: { status: 'EM_EXECUCAO' },
      }),
      this.prisma.ordemServicoEquipamento.count(),
    ]);
    return { ultima, emExecucao, equipamentos };
  }

  async filters() {
    const [status, situacoes, tipos, ufs] = await this.prisma.$transaction([
      this.prisma.ordemServico.findMany({
        distinct: ['status'],
        where: { status: { not: null } },
        select: { status: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.ordemServico.findMany({
        distinct: ['situacao'],
        where: { situacao: { not: null } },
        select: { situacao: true },
        orderBy: { situacao: 'asc' },
      }),
      this.prisma.ordemServico.findMany({
        distinct: ['tipo'],
        where: { tipo: { not: null } },
        select: { tipo: true },
        orderBy: { tipo: 'asc' },
      }),
      this.prisma.ordemServico.findMany({
        distinct: ['uf'],
        where: { uf: { not: null } },
        select: { uf: true },
        orderBy: { uf: 'asc' },
      }),
    ]);
    return {
      status: status.map((x) => x.status),
      situacoes: situacoes.map((x) => x.situacao),
      tipos: tipos.map((x) => x.tipo),
      ufs: ufs.map((x) => x.uf),
    };
  }

  async indicators() {
    const [total, abertas, fechadas, canceladas, clientes, ultima] =
      await this.prisma.$transaction([
        this.prisma.ordemServico.count(),
        this.prisma.ordemServico.count({
          where: { status: { equals: 'Aberto', mode: 'insensitive' } },
        }),
        this.prisma.ordemServico.count({
          where: { status: { equals: 'Fechado', mode: 'insensitive' } },
        }),
        this.prisma.ordemServico.count({
          where: { situacao: { equals: 'CANCELADO', mode: 'insensitive' } },
        }),
        this.prisma.clienteOperacional.count(),
        this.prisma.ordemServico.aggregate({ _max: { sincronizadoEm: true } }),
      ]);
    return {
      total,
      abertas,
      fechadas,
      canceladas,
      clientes,
      ultimaSincronizacao: ultima._max.sincronizadoEm,
    };
  }
}
