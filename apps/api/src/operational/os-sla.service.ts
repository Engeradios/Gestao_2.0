import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { OsRulesService, type OsSla } from './os-rules.service';

type MinutosResult = {
  minutos: bigint | number | string | null;
};

@Injectable()
export class OsSlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: OsRulesService,
  ) {}

  async configuracao() {
    const config = await this.prisma.osSlaConfiguracao.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: 'asc' },
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' },
        },
        feriados: {
          where: { ativo: true },
          orderBy: { data: 'asc' },
        },
      },
    });

    if (!config) {
      throw new NotFoundException('Configuração de SLA não encontrada');
    }

    return config;
  }

  async calcular(
    abertura: Date,
    termino: Date,
    uf?: string | null,
  ): Promise<{
    minutosUteis: number;
    horasUteis: number;
    classificacao: OsSla;
  }> {
    if (!(abertura instanceof Date) || Number.isNaN(abertura.getTime())) {
      throw new BadRequestException('Data de abertura inválida');
    }

    if (!(termino instanceof Date) || Number.isNaN(termino.getTime())) {
      throw new BadRequestException('Data de término inválida');
    }

    if (termino <= abertura) {
      return {
        minutosUteis: 0,
        horasUteis: 0,
        classificacao: 'NORMAL',
      };
    }

    const config = await this.configuracao();
    const normalizedUf =
      this.rules.regiao(uf) === 'NAO_INFORMADA'
        ? null
        : this.rules.normalize(uf);

    const rows = await this.prisma.$queryRaw<MinutosResult[]>(
      Prisma.sql`
        WITH dias AS (
          SELECT generate_series(
            ${abertura}::timestamp::date,
            ${termino}::timestamp::date,
            interval '1 day'
          )::date AS dia
        ),
        periodos AS (
          SELECT
            d.dia,
            h.inicio,
            h.fim,
            h.intervalo_inicio,
            h.intervalo_fim
          FROM dias d
          INNER JOIN os_sla_horarios h
            ON h.configuracao_id = ${config.id}::uuid
           AND h.ativo = TRUE
           AND h.dia_semana = EXTRACT(DOW FROM d.dia)::smallint
          WHERE NOT EXISTS (
            SELECT 1
            FROM op_feriados f
            WHERE f.dia = d.dia
              -- SLA_USA_OP_FERIADOS
              AND (
                NULLIF(BTRIM(f.uf), '') IS NULL
                OR ${normalizedUf}::text IS NULL
                OR UPPER(BTRIM(f.uf)) =
                  UPPER(${normalizedUf}::text)
              )
          )
        ),
        calculo AS (
          SELECT
            GREATEST(
              0,
              EXTRACT(
                EPOCH FROM (
                  LEAST(
                    ${termino}::timestamp,
                    dia + fim
                  )
                  -
                  GREATEST(
                    ${abertura}::timestamp,
                    dia + inicio
                  )
                )
              ) / 60
            )
            -
            CASE
              WHEN intervalo_inicio IS NOT NULL
               AND intervalo_fim IS NOT NULL
              THEN GREATEST(
                0,
                EXTRACT(
                  EPOCH FROM (
                    LEAST(
                      ${termino}::timestamp,
                      dia + intervalo_fim
                    )
                    -
                    GREATEST(
                      ${abertura}::timestamp,
                      dia + intervalo_inicio
                    )
                  )
                ) / 60
              )
              ELSE 0
            END AS minutos
          FROM periodos
        )
        SELECT
          COALESCE(
            FLOOR(SUM(GREATEST(minutos, 0))),
            0
          )::bigint AS minutos
        FROM calculo
      `,
    );

    const minutosUteis = Number(rows[0]?.minutos ?? 0);

    if (!Number.isSafeInteger(minutosUteis)) {
      throw new BadRequestException(
        'Resultado do SLA excedeu o limite suportado',
      );
    }

    return {
      minutosUteis,
      horasUteis: Math.round((minutosUteis / 60) * 100) / 100,
      classificacao: this.rules.sla(minutosUteis, {
        normalAteMinutos: config.normalAteMinutos,
        atencaoAteMinutos: config.atencaoAteMinutos,
        urgenteAteMinutos: config.urgenteAteMinutos,
      }),
    };
  }

  async calcularOrdem(input: {
    abertura?: Date | null;
    fechamento?: Date | null;
    situacao?: string | null;
    status?: string | null;
    uf?: string | null;
    agora?: Date;
  }) {
    const estado = this.rules.estado(input.situacao, input.status);

    if (!input.abertura) {
      return {
        estado,
        minutosUteis: null,
        horasUteis: null,
        classificacao: null,
      };
    }

    const termino =
      estado === 'FECHADA' && input.fechamento
        ? input.fechamento
        : (input.agora ?? new Date());

    return {
      estado,
      ...(await this.calcular(input.abertura, termino, input.uf)),
    };
  }
}
