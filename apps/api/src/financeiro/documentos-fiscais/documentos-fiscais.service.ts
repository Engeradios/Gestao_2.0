import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DocumentosFiscaisQueryDto } from './documentos-fiscais.dto';

@Injectable()
export class DocumentosFiscaisService {
  constructor(private readonly prisma: PrismaService) {}

  private serializar<T>(valor: T): T {
    if (typeof valor === 'bigint') {
      return valor.toString() as T;
    }

    if (valor instanceof Prisma.Decimal) {
      return valor.toNumber() as T;
    }

    if (Array.isArray(valor)) {
      return valor.map((item) => this.serializar(item)) as T;
    }

    if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
      return Object.fromEntries(
        Object.entries(valor as Record<string, unknown>).map(
          ([chave, item]) => [chave, this.serializar(item)],
        ),
      ) as T;
    }

    return valor;
  }

  private montarWhere(query: DocumentosFiscaisQueryDto) {
    const partes: Prisma.Sql[] = [Prisma.sql`TRUE`];

    if (query.direcao) {
      partes.push(Prisma.sql`df.direcao = ${query.direcao}`);
    }

    if (query.tipo) {
      partes.push(Prisma.sql`df.tipo = ${query.tipo}`);
    }

    if (query.modelo) {
      partes.push(Prisma.sql`df.modelo = ${query.modelo}`);
    }

    if (query.filialId) {
      partes.push(Prisma.sql`df.filial_id = ${BigInt(query.filialId)}`);
    }

    if (query.statusFiscal) {
      partes.push(Prisma.sql`df.status_fiscal = ${query.statusFiscal}`);
    }

    if (query.statusProcessamento) {
      partes.push(
        Prisma.sql`df.status_processamento = ${query.statusProcessamento}`,
      );
    }

    if (query.statusConferencia) {
      partes.push(
        Prisma.sql`df.status_conferencia = ${query.statusConferencia}`,
      );
    }

    if (query.emitenteDocumento) {
      partes.push(
        Prisma.sql`df.emitente_documento = ${query.emitenteDocumento}`,
      );
    }

    if (query.destinatarioDocumento) {
      partes.push(
        Prisma.sql`df.destinatario_documento = ${query.destinatarioDocumento}`,
      );
    }

    if (query.chave) {
      partes.push(Prisma.sql`df.chave = ${query.chave}`);
    }

    if (query.numero) {
      partes.push(Prisma.sql`df.numero = ${query.numero}`);
    }

    if (query.serie) {
      partes.push(Prisma.sql`df.serie = ${query.serie}`);
    }

    if (query.dataInicial) {
      partes.push(
        Prisma.sql`df.data_emissao >= ${new Date(query.dataInicial)}::date`,
      );
    }

    if (query.dataFinal) {
      partes.push(
        Prisma.sql`df.data_emissao <= ${new Date(query.dataFinal)}::date`,
      );
    }

    if (query.termo) {
      const termo = `%${query.termo}%`;

      partes.push(
        Prisma.sql`(
          df.chave ILIKE ${termo}
          OR df.numero ILIKE ${termo}
          OR df.emitente_nome ILIKE ${termo}
          OR df.destinatario_nome ILIKE ${termo}
          OR df.emitente_documento ILIKE ${termo}
          OR df.destinatario_documento ILIKE ${termo}
        )`,
      );
    }

    if (query.comXml === true) {
      partes.push(
        Prisma.sql`EXISTS (
          SELECT 1
          FROM fin_documentos_fiscais_arquivos a
          WHERE a.documento_id = df.id
            AND a.tipo = 'XML'
        )`,
      );
    }

    if (query.comXml === false) {
      partes.push(
        Prisma.sql`NOT EXISTS (
          SELECT 1
          FROM fin_documentos_fiscais_arquivos a
          WHERE a.documento_id = df.id
            AND a.tipo = 'XML'
        )`,
      );
    }

    if (query.comVinculoFinanceiro === true) {
      partes.push(
        Prisma.sql`EXISTS (
          SELECT 1
          FROM fin_documentos_fiscais_vinculos v
          WHERE v.documento_id = df.id
            AND v.entidade_tipo IN (
              'CONTA_PAGAR',
              'CONTA_RECEBER'
            )
        )`,
      );
    }

    if (query.comVinculoFinanceiro === false) {
      partes.push(
        Prisma.sql`NOT EXISTS (
          SELECT 1
          FROM fin_documentos_fiscais_vinculos v
          WHERE v.documento_id = df.id
            AND v.entidade_tipo IN (
              'CONTA_PAGAR',
              'CONTA_RECEBER'
            )
        )`,
      );
    }

    return Prisma.join(partes, ' AND ');
  }

  async resumo() {
    const totais = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        count(*)::bigint AS total,
        count(*) FILTER (
          WHERE direcao = 'RECEBIDO'
        )::bigint AS recebidos,
        count(*) FILTER (
          WHERE direcao = 'EMITIDO'
        )::bigint AS emitidos,
        count(*) FILTER (
          WHERE status_processamento NOT IN (
            'INTEGRADO',
            'CONCLUIDO'
          )
        )::bigint AS pendentes,
        count(*) FILTER (
          WHERE status_processamento = 'INTEGRADO'
        )::bigint AS integrados,
        count(*) FILTER (
          WHERE status_conferencia = 'DIVERGENTE'
        )::bigint AS divergencias,
        count(*) FILTER (
          WHERE upper(coalesce(status_fiscal, '')) LIKE '%CANCEL%'
        )::bigint AS cancelados,
        count(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1
            FROM fin_documentos_fiscais_arquivos a
            WHERE a.documento_id = fin_documentos_fiscais.id
              AND a.tipo = 'XML'
          )
        )::bigint AS "semXml",
        count(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1
            FROM fin_documentos_fiscais_vinculos v
            WHERE v.documento_id = fin_documentos_fiscais.id
              AND v.entidade_tipo IN (
                'CONTA_PAGAR',
                'CONTA_RECEBER'
              )
          )
        )::bigint AS "semVinculoFinanceiro"
      FROM fin_documentos_fiscais
    `;

    const porTipo = await this.prisma.$queryRaw<
      Array<Record<string, unknown>>
    >`
      SELECT
        tipo,
        count(*)::bigint AS quantidade
      FROM fin_documentos_fiscais
      GROUP BY tipo
      ORDER BY quantidade DESC, tipo
    `;

    const porFilial = await this.prisma.$queryRaw<
      Array<Record<string, unknown>>
    >`
      SELECT
        df.filial_id AS "filialId",
        coalesce(f.nome, 'SEM FILIAL') AS filial,
        count(*)::bigint AS quantidade
      FROM fin_documentos_fiscais df
      LEFT JOIN fin_filiais f
        ON f.id = df.filial_id
      GROUP BY df.filial_id, f.nome
      ORDER BY quantidade DESC, filial
    `;

    const porStatus = await this.prisma.$queryRaw<
      Array<Record<string, unknown>>
    >`
      SELECT
        status_processamento AS status,
        count(*)::bigint AS quantidade
      FROM fin_documentos_fiscais
      GROUP BY status_processamento
      ORDER BY quantidade DESC, status
    `;

    return this.serializar({
      ...(totais[0] ?? {}),
      porTipo,
      porFilial,
      porStatus,
    });
  }

  async listar(query: DocumentosFiscaisQueryDto) {
    const where = this.montarWhere(query);
    const page = query.page || 1;
    const pageSize = query.pageSize || 25;
    const offset = (page - 1) * pageSize;

    const colunas: Record<string, Prisma.Sql> = {
      dataEmissao: Prisma.sql`df.data_emissao`,
      criadoEm: Prisma.sql`df.criado_em`,
      atualizadoEm: Prisma.sql`df.atualizado_em`,
      numero: Prisma.sql`df.numero`,
      valorTotal: Prisma.sql`df.valor_total`,
    };

    const coluna =
      colunas[query.orderBy] ??
      colunas.dataEmissao;

    const direcao =
      query.orderDirection === 'asc'
        ? Prisma.sql`ASC`
        : Prisma.sql`DESC`;

    const totalRows = await this.prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`
        SELECT count(*)::bigint AS total
        FROM fin_documentos_fiscais df
        WHERE ${where}
      `,
    );

    const itens = await this.prisma.$queryRaw<
      Array<Record<string, unknown>>
    >(
      Prisma.sql`
        SELECT
          df.id,
          df.direcao,
          df.tipo,
          df.modelo,
          df.chave,
          df.numero,
          df.serie,
          df.filial_id AS "filialId",
          f.codigo AS "filialCodigo",
          f.nome AS "filialNome",
          df.natureza,
          df.data_emissao AS "dataEmissao",
          df.data_entrada_saida AS "dataEntradaSaida",
          df.emitente_documento AS "emitenteDocumento",
          df.emitente_nome AS "emitenteNome",
          df.destinatario_documento AS "destinatarioDocumento",
          df.destinatario_nome AS "destinatarioNome",
          df.valor_produtos AS "valorProdutos",
          df.valor_frete AS "valorFrete",
          df.valor_desconto AS "valorDesconto",
          df.valor_total AS "valorTotal",
          df.status_fiscal AS "statusFiscal",
          df.status_processamento AS "statusProcessamento",
          df.status_conferencia AS "statusConferencia",
          df.origem,
          df.protocolo,
          df.nsu,
          df.schema_xml AS "schemaXml",
          df.capturado_em AS "capturadoEm",
          df.criado_em AS "criadoEm",
          df.atualizado_em AS "atualizadoEm",
          EXISTS (
            SELECT 1
            FROM fin_documentos_fiscais_arquivos a
            WHERE a.documento_id = df.id
              AND a.tipo = 'XML'
          ) AS "possuiXml",
          EXISTS (
            SELECT 1
            FROM fin_documentos_fiscais_vinculos v
            WHERE v.documento_id = df.id
          ) AS "possuiVinculo"
        FROM fin_documentos_fiscais df
        LEFT JOIN fin_filiais f
          ON f.id = df.filial_id
        WHERE ${where}
        ORDER BY ${coluna} ${direcao} NULLS LAST, df.id DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `,
    );

    const total = Number(totalRows[0]?.total ?? 0n);

    return this.serializar({
      items: itens,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }

  private async cabecalho(id: bigint) {
    const rows = await this.prisma.$queryRaw<
      Array<Record<string, unknown>>
    >`
      SELECT
        df.*,
        f.codigo AS filial_codigo,
        f.nome AS filial_nome,
        f.cnpj AS filial_cnpj
      FROM fin_documentos_fiscais df
      LEFT JOIN fin_filiais f
        ON f.id = df.filial_id
      WHERE df.id = ${id}
      LIMIT 1
    `;

    if (!rows[0]) {
      throw new NotFoundException(
        `Documento fiscal ${id.toString()} não localizado`,
      );
    }

    return rows[0];
  }

  private async colecao(
    tabela:
      | 'fin_documentos_fiscais_arquivos'
      | 'fin_documentos_fiscais_eventos'
      | 'fin_documentos_fiscais_historico'
      | 'fin_documentos_fiscais_vinculos',
    id: bigint,
  ) {
    await this.cabecalho(id);

    const tabelas = {
      fin_documentos_fiscais_arquivos:
        Prisma.sql`fin_documentos_fiscais_arquivos`,
      fin_documentos_fiscais_eventos:
        Prisma.sql`fin_documentos_fiscais_eventos`,
      fin_documentos_fiscais_historico:
        Prisma.sql`fin_documentos_fiscais_historico`,
      fin_documentos_fiscais_vinculos:
        Prisma.sql`fin_documentos_fiscais_vinculos`,
    };

    const rows = await this.prisma.$queryRaw<
      Array<Record<string, unknown>>
    >(
      Prisma.sql`
        SELECT *
        FROM ${tabelas[tabela]}
        WHERE documento_id = ${id}
        ORDER BY id DESC
      `,
    );

    return this.serializar(rows);
  }

  async detalhe(idTexto: string) {
    if (!/^\d+$/.test(idTexto)) {
      throw new NotFoundException('Identificador inválido');
    }

    const id = BigInt(idTexto);
    const cabecalho = await this.cabecalho(id);

    const [
      participantes,
      itens,
      parcelas,
      arquivos,
      eventos,
      vinculos,
      historico,
    ] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT *
        FROM fin_documentos_fiscais_participantes
        WHERE documento_id = ${id}
        ORDER BY papel, id
      `,
      this.prisma.$queryRaw`
        SELECT *
        FROM fin_documentos_fiscais_itens
        WHERE documento_id = ${id}
        ORDER BY numero_item NULLS LAST, id
      `,
      this.prisma.$queryRaw`
        SELECT *
        FROM fin_documentos_fiscais_parcelas
        WHERE documento_id = ${id}
        ORDER BY vencimento NULLS LAST, id
      `,
      this.prisma.$queryRaw`
        SELECT *
        FROM fin_documentos_fiscais_arquivos
        WHERE documento_id = ${id}
        ORDER BY principal DESC, id
      `,
      this.prisma.$queryRaw`
        SELECT *
        FROM fin_documentos_fiscais_eventos
        WHERE documento_id = ${id}
        ORDER BY ocorrido_em DESC, id DESC
      `,
      this.prisma.$queryRaw`
        SELECT *
        FROM fin_documentos_fiscais_vinculos
        WHERE documento_id = ${id}
        ORDER BY id DESC
      `,
      this.prisma.$queryRaw`
        SELECT *
        FROM fin_documentos_fiscais_historico
        WHERE documento_id = ${id}
        ORDER BY criado_em DESC, id DESC
      `,
    ]);

    return this.serializar({
      cabecalho,
      participantes,
      itens,
      parcelas,
      arquivos,
      eventos,
      vinculos,
      historico,
    });
  }

  async arquivos(id: string) {
    return this.colecao(
      'fin_documentos_fiscais_arquivos',
      this.converterId(id),
    );
  }

  async eventos(id: string) {
    return this.colecao(
      'fin_documentos_fiscais_eventos',
      this.converterId(id),
    );
  }

  async historico(id: string) {
    return this.colecao(
      'fin_documentos_fiscais_historico',
      this.converterId(id),
    );
  }

  async vinculos(id: string) {
    return this.colecao(
      'fin_documentos_fiscais_vinculos',
      this.converterId(id),
    );
  }

  private converterId(id: string) {
    if (!/^\d+$/.test(id)) {
      throw new NotFoundException('Identificador inválido');
    }

    return BigInt(id);
  }
}
