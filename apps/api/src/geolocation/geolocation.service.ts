import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TeamMemberPosition } from './dto/geolocation.dto';

/**
 * Geolocalizacao — leitura da telemetria do app de campo.
 *
 * Trilha LGPD (decisao 2a): grava UM registro consolidado por consulta, com
 * janela de 15 minutos por consultor/tipo, para que o auto-refresh do painel
 * nao gere centenas de linhas de auditoria por turno.
 *
 * Usa SQL bruto com os nomes reais de tabelas/colunas confirmados em auditoria.
 */
@Injectable()
export class GeolocationService {
  /** Janela de deduplicacao da trilha de auditoria, em minutos. */
  private static readonly JANELA_AUDITORIA_MIN = 15;

  /** Minutos sem captura para marcar um expediente ativo como "sem sinal". */
  private static readonly LIMITE_SEM_SINAL_MIN = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra o acesso na trilha LGPD respeitando a janela de deduplicacao.
   * Retorna true se gravou; false se ja havia registro recente.
   */
  private async registrarAcesso(params: {
    consultorId: string;
    alvoId: string;
    expedienteId?: bigint | null;
    tipoConsulta: string;
    periodoInicio?: Date | null;
    periodoFim?: Date | null;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<boolean> {
    const {
      consultorId,
      alvoId,
      expedienteId = null,
      tipoConsulta,
      periodoInicio = null,
      periodoFim = null,
      ip = null,
      userAgent = null,
    } = params;

    const recentes = await this.prisma.$queryRaw<Array<{ existe: boolean }>>`
      SELECT true AS existe
      FROM app_campo_acessos_localizacao
      WHERE consultor_usuario_id = ${consultorId}::uuid
        AND tipo_consulta = ${tipoConsulta}
        AND acessado_em > now()
            - (${GeolocationService.JANELA_AUDITORIA_MIN} || ' minutes')::interval
      LIMIT 1
    `;

    if (recentes.length > 0) {
      return false;
    }

    await this.prisma.$executeRaw`
      INSERT INTO app_campo_acessos_localizacao (
        consultor_usuario_id, alvo_usuario_id, expediente_id,
        finalidade, tipo_consulta, periodo_inicio, periodo_fim,
        ip, user_agent, acessado_em
      ) VALUES (
        ${consultorId}::uuid,
        ${alvoId}::uuid,
        ${expedienteId},
        'Consulta de painel operacional',
        ${tipoConsulta},
        ${periodoInicio},
        ${periodoFim},
        ${ip},
        ${userAgent},
        now()
      )
    `;

    return true;
  }

  /**
   * Ultima posicao conhecida de cada usuario com telemetria na janela.
   * Decisao 1b: inclui expedientes encerrados; o filtro visual fica no cliente.
   */
  async equipe(params: {
    consultorId: string;
    horas: number;
    somenteAtivos: boolean;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<{ itens: TeamMemberPosition[]; geradoEm: Date }> {
    const { consultorId, horas, somenteAtivos, ip, userAgent } = params;

    const linhas = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT DISTINCT ON (t.usuario_id)
        t.usuario_id::text                 AS usuario_id,
        u.nome                             AS nome,
        u.email                            AS email,
        u.unidade                          AS unidade,
        u.foto_perfil_caminho              AS foto_perfil_caminho,
        p.cargo                            AS cargo,
        pf.funcao::text                    AS funcao,
        t.expediente_id::text              AS expediente_id,
        e.status::text                     AS expediente_status,
        t.latitude::float8                 AS latitude,
        t.longitude::float8                AS longitude,
        t.precisao_metros::float8          AS precisao_metros,
        t.bateria_percentual               AS bateria_percentual,
        t.tipo_conexao::text               AS tipo_conexao,
        t.online                           AS online,
        t.capturado_em                     AS capturado_em,
        EXTRACT(EPOCH FROM (now() - t.capturado_em)) / 60.0 AS minutos_desde,
        t.endereco_logradouro              AS endereco_logradouro,
        t.endereco_numero                  AS endereco_numero,
        t.endereco_bairro                  AS endereco_bairro,
        t.endereco_cidade                  AS endereco_cidade,
        t.endereco_uf                      AS endereco_uf,
        t.endereco_completo                AS endereco_completo
      FROM app_campo_telemetria t
      JOIN usuarios u                   ON u.id = t.usuario_id
      LEFT JOIN pessoas p               ON p.id = u.pessoa_id
      LEFT JOIN pessoas_funcoes pf      ON pf.pessoa_id = u.pessoa_id
      LEFT JOIN app_campo_expedientes e ON e.id = t.expediente_id
      WHERE t.capturado_em > now() - (${horas} || ' hours')::interval
        AND t.anonimizado_em IS NULL
        AND (${somenteAtivos}::boolean = false OR e.status::text = 'ATIVO')
      ORDER BY t.usuario_id, t.capturado_em DESC
    `;

    const itens: TeamMemberPosition[] = linhas.map((l) => {
      const minutos = Number(l.minutos_desde ?? 0);
      const status = (l.expediente_status as string | null) ?? null;

      let estado = 'ENCERRADO';
      if (status === 'ATIVO') {
        estado =
          minutos <= GeolocationService.LIMITE_SEM_SINAL_MIN
            ? 'ATIVO_RECENTE'
            : 'ATIVO_SEM_SINAL';
      }

      return {
        usuarioId: String(l.usuario_id),
        nome: String(l.nome ?? ''),
        email: (l.email as string | null) ?? null,
        funcao: (l.funcao as string | null) ?? null,
        cargo: (l.cargo as string | null) ?? null,
        unidade: (l.unidade as string | null) ?? null,
        fotoPerfilCaminho: (l.foto_perfil_caminho as string | null) ?? null,
        expedienteId: (l.expediente_id as string | null) ?? null,
        expedienteStatus: status,
        latitude: Number(l.latitude),
        longitude: Number(l.longitude),
        precisaoMetros:
          l.precisao_metros === null ? null : Number(l.precisao_metros),
        bateriaPercentual:
          l.bateria_percentual === null ? null : Number(l.bateria_percentual),
        tipoConexao: (l.tipo_conexao as string | null) ?? null,
        online: (l.online as boolean | null) ?? null,
        capturadoEm: l.capturado_em as Date,
        minutosDesdeCaptura: Math.round(minutos * 10) / 10,
        estado,
        endereco: {
          logradouro: (l.endereco_logradouro as string | null) ?? null,
          numero: (l.endereco_numero as string | null) ?? null,
          bairro: (l.endereco_bairro as string | null) ?? null,
          cidade: (l.endereco_cidade as string | null) ?? null,
          uf: (l.endereco_uf as string | null) ?? null,
          completo: (l.endereco_completo as string | null) ?? null,
        },
      };
    });

    // Trilha LGPD consolidada (decisao 2a), com janela de 15 minutos.
    await this.registrarAcesso({
      consultorId,
      alvoId: consultorId,
      tipoConsulta: 'MAPA_ATUAL',
      ip,
      userAgent,
    });

    return { itens, geradoEm: new Date() };
  }

  /** Percurso completo de um expediente especifico. */
  async trilha(params: {
    consultorId: string;
    expedienteId: string;
    limite: number;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const { consultorId, expedienteId, limite, ip, userAgent } = params;

    let idNumerico: bigint;
    try {
      idNumerico = BigInt(expedienteId);
    } catch {
      throw new NotFoundException('Expediente inválido');
    }

    const cabecalho = await this.prisma.$queryRaw<
      Array<Record<string, unknown>>
    >`
      SELECT e.id::text         AS expediente_id,
             e.usuario_id::text AS usuario_id,
             u.nome             AS nome,
             e.status::text     AS status,
             e.iniciado_dispositivo_em      AS iniciado_em,
             e.finalizado_dispositivo_em     AS encerrado_em
      FROM app_campo_expedientes e
      JOIN usuarios u ON u.id = e.usuario_id
      WHERE e.id = ${idNumerico}
      LIMIT 1
    `;

    if (cabecalho.length === 0) {
      throw new NotFoundException('Expediente não encontrado');
    }

    const pontos = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT t.id::text                AS id,
             t.latitude::float8        AS latitude,
             t.longitude::float8       AS longitude,
             t.precisao_metros::float8 AS precisao_metros,
             t.bateria_percentual      AS bateria_percentual,
             t.tipo_conexao::text      AS tipo_conexao,
             t.capturado_em            AS capturado_em,
             t.endereco_completo       AS endereco_completo
      FROM app_campo_telemetria t
      WHERE t.expediente_id = ${idNumerico}
        AND t.anonimizado_em IS NULL
      ORDER BY t.capturado_em ASC
      LIMIT ${limite}
    `;

    const cab = cabecalho[0];

    await this.registrarAcesso({
      consultorId,
      alvoId: String(cab.usuario_id),
      expedienteId: idNumerico,
      tipoConsulta: 'HISTORICO',
      periodoInicio: (cab.iniciado_em as Date | null) ?? null,
      periodoFim: (cab.encerrado_em as Date | null) ?? null,
      ip,
      userAgent,
    });

    return {
      expediente: {
        id: String(cab.expediente_id),
        usuarioId: String(cab.usuario_id),
        nome: String(cab.nome ?? ''),
        status: (cab.status as string | null) ?? null,
        iniciadoEm: (cab.iniciado_em as Date | null) ?? null,
        encerradoEm: (cab.encerrado_em as Date | null) ?? null,
      },
      totalPontos: pontos.length,
      pontos: pontos.map((p) => ({
        id: String(p.id),
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        precisaoMetros:
          p.precisao_metros === null ? null : Number(p.precisao_metros),
        bateriaPercentual:
          p.bateria_percentual === null ? null : Number(p.bateria_percentual),
        tipoConexao: (p.tipo_conexao as string | null) ?? null,
        capturadoEm: p.capturado_em as Date,
        enderecoCompleto: (p.endereco_completo as string | null) ?? null,
      })),
    };
  }

  async relatorio(params: {
    consultorId: string;
    inicio?: string;
    fim?: string;
    usuarioId?: string;
    busca?: string;
    status?: string;
    pagina: number;
    limite: number;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const pagina = Math.max(1, params.pagina);
    const limite = Math.min(100, Math.max(10, params.limite));
    const offset = (pagina - 1) * limite;
    const inicio = params.inicio
      ? new Date(params.inicio)
      : new Date(Date.now() - 30 * 86400000);
    const fim = params.fim ? new Date(params.fim) : new Date();
    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fim.getTime()) ||
      inicio > fim
    ) {
      throw new NotFoundException('Período inválido');
    }
    const busca = (params.busca ?? '').trim();
    const usuarioId = params.usuarioId ?? null;
    const status = params.status ?? null;
    const base = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT e.id::text AS expediente_id, e.usuario_id::text AS usuario_id,
        u.nome, u.unidade, p.cargo, e.status, e.origem,
        e.iniciado_dispositivo_em AS iniciado_em,
        e.finalizado_dispositivo_em AS finalizado_em,
        COALESCE(EXTRACT(EPOCH FROM (COALESCE(e.finalizado_dispositivo_em, now()) - e.iniciado_dispositivo_em))/60,0)::float8 AS duracao_minutos,
        COUNT(t.id)::int AS capturas,
        MIN(t.capturado_em) AS primeira_captura, MAX(t.capturado_em) AS ultima_captura,
        MIN(t.bateria_percentual)::int AS bateria_minima,
        MAX(t.endereco_completo) FILTER (WHERE t.endereco_completo IS NOT NULL) AS ultimo_endereco
      FROM app_campo_expedientes e
      JOIN usuarios u ON u.id=e.usuario_id LEFT JOIN pessoas p ON p.id=u.pessoa_id
      LEFT JOIN app_campo_telemetria t ON t.expediente_id=e.id AND t.anonimizado_em IS NULL
      WHERE e.iniciado_dispositivo_em >= ${inicio} AND e.iniciado_dispositivo_em <= ${fim}
        AND (${usuarioId}::uuid IS NULL OR e.usuario_id=${usuarioId}::uuid)
        AND (${status}::text IS NULL OR e.status=${status})
        AND (${busca}='' OR u.nome ILIKE '%'||${busca}||'%' OR COALESCE(p.cargo,'') ILIKE '%'||${busca}||'%' OR COALESCE(u.unidade,'') ILIKE '%'||${busca}||'%')
      GROUP BY e.id,u.nome,u.unidade,p.cargo
      ORDER BY e.iniciado_dispositivo_em DESC LIMIT ${limite} OFFSET ${offset}`;
    const totalRows = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*)::bigint total FROM app_campo_expedientes e JOIN usuarios u ON u.id=e.usuario_id LEFT JOIN pessoas p ON p.id=u.pessoa_id
      WHERE e.iniciado_dispositivo_em >= ${inicio} AND e.iniciado_dispositivo_em <= ${fim}
        AND (${usuarioId}::uuid IS NULL OR e.usuario_id=${usuarioId}::uuid) AND (${status}::text IS NULL OR e.status=${status})
        AND (${busca}='' OR u.nome ILIKE '%'||${busca}||'%' OR COALESCE(p.cargo,'') ILIKE '%'||${busca}||'%' OR COALESCE(u.unidade,'') ILIKE '%'||${busca}||'%')`;
    const total = Number(totalRows[0]?.total ?? 0);
    const itens = base.map((x) => ({
      expedienteId: String(x.expediente_id),
      usuarioId: String(x.usuario_id),
      nome: String(x.nome ?? ''),
      unidade: x.unidade ?? null,
      cargo: x.cargo ?? null,
      status: String(x.status ?? ''),
      origem: String(x.origem ?? ''),
      iniciadoEm: x.iniciado_em,
      finalizadoEm: x.finalizado_em,
      duracaoMinutos: Number(x.duracao_minutos ?? 0),
      capturas: Number(x.capturas ?? 0),
      primeiraCaptura: x.primeira_captura,
      ultimaCaptura: x.ultima_captura,
      bateriaMinima:
        x.bateria_minima === null ? null : Number(x.bateria_minima),
      ultimoEndereco: x.ultimo_endereco ?? null,
    }));
    await this.registrarAcesso({
      consultorId: params.consultorId,
      alvoId: params.consultorId,
      tipoConsulta: 'RELATORIO',
      periodoInicio: inicio,
      periodoFim: fim,
      ip: params.ip,
      userAgent: params.userAgent,
    });
    return {
      itens,
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / limite)),
      },
      indicadores: {
        jornadas: total,
        capturas: itens.reduce((a, x) => a + x.capturas, 0),
        emAberto: itens.filter((x) => x.status !== 'FINALIZADO').length,
        duracaoMinutos: Math.round(
          itens.reduce((a, x) => a + x.duracaoMinutos, 0),
        ),
      },
      periodo: { inicio, fim },
      geradoEm: new Date(),
    };
  }
}
