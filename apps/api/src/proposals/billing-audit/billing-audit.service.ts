import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { BillingAuditQuery } from './billing-audit.dto';

type Row = Record<string, unknown>;

@Injectable()
export class BillingAuditService {
  constructor(private readonly db: PrismaService) {}

  private int(value: unknown, fallback: number, min: number, max: number) {
    const n = Number(value);
    return Number.isInteger(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  private text(value: unknown) {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return undefined;
    }
    const text = String(value).trim();
    return text || undefined;
  }

  private conditions(q: BillingAuditQuery) {
    const where: Prisma.Sql[] = [];
    const busca = this.text(q.busca);
    const classificacao = this.text(q.classificacao);
    const tipo = this.text(q.tipo);
    const uf = this.text(q.uf);
    const representante = this.text(q.representante);
    if (busca)
      where.push(
        Prisma.sql`(numero ILIKE ${`%${busca}%`} OR cliente ILIKE ${`%${busca}%`} OR contrato ILIKE ${`%${busca}%`})`,
      );
    if (classificacao) where.push(Prisma.sql`classificacao = ${classificacao}`);
    if (tipo) where.push(Prisma.sql`tipo = ${tipo}`);
    if (uf) where.push(Prisma.sql`uf = upper(${uf})`);
    if (representante) where.push(Prisma.sql`representante = ${representante}`);
    if (q.inicio)
      where.push(
        Prisma.sql`data_cadastro >= ${new Date(`${q.inicio}T00:00:00Z`)}`,
      );
    if (q.fim)
      where.push(
        Prisma.sql`data_cadastro <= ${new Date(`${q.fim}T23:59:59Z`)}`,
      );
    if (q.somentePendencias === 'true')
      where.push(Prisma.sql`classificacao <> 'COM_COBRANCA'`);
    return where.length
      ? Prisma.sql`WHERE ${Prisma.join(where, ' AND ')}`
      : Prisma.empty;
  }

  private base() {
    return Prisma.sql`
      WITH propostas AS (
        SELECT p.id,p.numero,p.cliente_nome cliente,p.contrato,p.tipo,p.cliente_uf uf,
          p.representante_nome representante,p.data_cadastro,s.id IS NOT NULL possui_servico,
          s.data_aprovacao,s.conclusao_real data_conclusao,
          coalesce(r.status,'AGUARDANDO') revisao_status,r.observacao revisao_observacao,
          r.confirmado_por_nome,r.confirmado_em,r.reaberto_por_nome,r.reaberto_em,
          CASE WHEN s.id IS NULL THEN true
            WHEN s.conclusao_real IS NULL THEN false
            WHEN s.conclusao_real > CURRENT_DATE THEN false ELSE true END pode_confirmar,
          CASE WHEN s.id IS NULL THEN NULL
            WHEN s.conclusao_real IS NULL THEN 'Aguardando conclusão do serviço'
            WHEN s.conclusao_real > CURRENT_DATE THEN 'Conclusão do serviço programada para data futura'
            ELSE NULL END motivo_bloqueio,
          p.val_produtos,p.val_servicos,p.val_tarifadores,p.val_frete,p.val_desconto,p.val_proposta,
          nullif(regexp_replace(upper(btrim(p.numero)),'[^A-Z0-9]','','g'),'') proposta_chave
        FROM op_propostas p
        LEFT JOIN op_servicos s ON s.proposta_id=p.id
        LEFT JOIN op_propostas_auditoria_faturamento_revisoes r ON r.proposta_id=p.id
        WHERE upper(btrim(coalesce(p.status,'')))='APROVADO'
      ), pedidos_linhas AS (
        SELECT nullif(regexp_replace(upper(btrim(seu_pedido)),'[^A-Z0-9]','','g'),'') proposta_chave,
          nullif(regexp_replace(upper(btrim(pedido)),'[^A-Z0-9]','','g'),'') pedido_chave,
          max(pedido) pedido_exibicao,sum(coalesce(val_pedido,0)) valor_pedido,
          sum(coalesce(valor_produtos,0)) valor_produtos_pedido
        FROM fin_pedidos_venda
        WHERE nullif(regexp_replace(upper(btrim(coalesce(seu_pedido,''))),'[^A-Z0-9]','','g'),'') IS NOT NULL
          AND nullif(regexp_replace(upper(btrim(coalesce(pedido,''))),'[^A-Z0-9]','','g'),'') IS NOT NULL
        GROUP BY 1,2
      ), cobrancas AS (
        SELECT nullif(regexp_replace(upper(btrim(pedido)),'[^A-Z0-9]','','g'),'') pedido_chave,
          count(*) FILTER(WHERE data_cancelado IS NULL)::int titulos,
          coalesce(sum(valor_emissao) FILTER(WHERE data_cancelado IS NULL),0)::numeric valor_emitido,
          coalesce(sum(valor_recebido) FILTER(WHERE data_cancelado IS NULL),0)::numeric valor_recebido,
          coalesce(sum(valor_devido) FILTER(WHERE data_cancelado IS NULL),0)::numeric valor_devido,
          bool_or(data_cancelado IS NULL AND situacao='Vencido') vencido,
          bool_or(data_cancelado IS NULL AND situacao='A vencer') a_vencer,
          count(DISTINCT cliente_codigo) FILTER(WHERE data_cancelado IS NULL)::int clientes,
          count(DISTINCT contrato) FILTER(WHERE data_cancelado IS NULL)::int contratos
        FROM fin_contas_receber
        WHERE nullif(regexp_replace(upper(btrim(coalesce(pedido,''))),'[^A-Z0-9]','','g'),'') IS NOT NULL GROUP BY 1
      ), consolidado AS (
        SELECT p.*,count(DISTINCT pl.pedido_chave)::int quantidade_pedidos,
          coalesce(array_agg(DISTINCT pl.pedido_exibicao) FILTER(WHERE pl.pedido_exibicao IS NOT NULL),'{}') pedidos,
          coalesce(sum(DISTINCT pl.valor_pedido),0)::numeric valor_pedidos,
          coalesce(sum(DISTINCT pl.valor_produtos_pedido),0)::numeric valor_produtos_pedidos,
          coalesce(sum(c.titulos),0)::int quantidade_titulos,
          coalesce(sum(c.valor_emitido),0)::numeric valor_emitido,
          coalesce(sum(c.valor_recebido),0)::numeric valor_recebido,
          coalesce(sum(c.valor_devido),0)::numeric valor_devido,
          coalesce(bool_or(c.vencido),false) possui_vencido,
          coalesce(bool_or(c.a_vencer),false) possui_a_vencer,
          coalesce(bool_or(length(pl.pedido_chave)<=2 AND (c.clientes>1 OR c.contratos>1)),false) referencia_generica
        FROM propostas p LEFT JOIN pedidos_linhas pl ON pl.proposta_chave=p.proposta_chave
        LEFT JOIN cobrancas c ON c.pedido_chave=pl.pedido_chave GROUP BY p.id,p.numero,p.cliente,p.contrato,p.tipo,p.uf,p.representante,p.data_cadastro,p.possui_servico,p.data_aprovacao,p.data_conclusao,p.revisao_status,p.revisao_observacao,p.confirmado_por_nome,p.confirmado_em,p.reaberto_por_nome,p.reaberto_em,p.pode_confirmar,p.motivo_bloqueio,p.val_produtos,p.val_servicos,p.val_tarifadores,p.val_frete,p.val_desconto,p.val_proposta,p.proposta_chave
      )
      SELECT *,CASE WHEN quantidade_pedidos=0 THEN 'SEM_PEDIDO'
        WHEN referencia_generica THEN 'REFERENCIA_FINANCEIRA_GENERICA'
        WHEN quantidade_titulos=0 THEN 'SEM_COBRANCA'
        WHEN quantidade_pedidos>1 THEN 'MULTIPLOS_PEDIDOS'
        ELSE 'COM_COBRANCA' END classificacao,
        (valor_emitido-val_proposta)::numeric diferenca
      FROM consolidado`;
  }

  async list(q: BillingAuditQuery) {
    const pagina = this.int(q.pagina, 1, 1, 1000000),
      limite = this.int(q.limite, 25, 1, 200),
      offset = (pagina - 1) * limite;
    const filtered = Prisma.sql`WITH audit AS (${this.base()}) SELECT * FROM audit ${this.conditions(q)}`;
    const [count, items] = await this.db.$transaction([
      this.db.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT count(*)::bigint total FROM (${filtered}) x`,
      ),
      this.db.$queryRaw<Row[]>(
        Prisma.sql`SELECT * FROM (${filtered}) x ORDER BY CASE WHEN classificacao='COM_COBRANCA' THEN 1 ELSE 0 END, numero LIMIT ${limite} OFFSET ${offset}`,
      ),
    ]);
    const total = Number(count[0]?.total ?? 0);
    return {
      itens: items,
      paginacao: {
        pagina,
        limite,
        total,
        paginas: Math.max(1, Math.ceil(total / limite)),
      },
    };
  }

  async summary(q: BillingAuditQuery) {
    const rows = await this.db.$queryRaw<Row[]>(
      Prisma.sql`WITH audit AS (${this.base()}) SELECT classificacao,count(*)::int quantidade,coalesce(sum(val_proposta),0)::numeric valor_propostas,coalesce(sum(valor_emitido),0)::numeric valor_emitido FROM audit ${this.conditions(q)} GROUP BY classificacao ORDER BY quantidade DESC`,
    );
    return { itens: rows, atualizadoEm: new Date().toISOString() };
  }

  async filters() {
    const [tipos, ufs, representantes] = await this.db.$transaction([
      this.db.opProposta.findMany({
        where: { status: 'APROVADO', tipo: { not: null } },
        distinct: ['tipo'],
        select: { tipo: true },
        orderBy: { tipo: 'asc' },
      }),
      this.db.opProposta.findMany({
        where: { status: 'APROVADO', clienteUf: { not: null } },
        distinct: ['clienteUf'],
        select: { clienteUf: true },
        orderBy: { clienteUf: 'asc' },
      }),
      this.db.opProposta.findMany({
        where: { status: 'APROVADO', representanteNome: { not: null } },
        distinct: ['representanteNome'],
        select: { representanteNome: true },
        orderBy: { representanteNome: 'asc' },
      }),
    ]);
    return {
      classificacoes: [
        'COM_COBRANCA',
        'SEM_PEDIDO',
        'SEM_COBRANCA',
        'MULTIPLOS_PEDIDOS',
        'REFERENCIA_FINANCEIRA_GENERICA',
      ],
      tipos: tipos.map((x) => x.tipo),
      ufs: ufs.map((x) => x.clienteUf),
      representantes: representantes.map((x) => x.representanteNome),
    };
  }

  async detail(numero: string) {
    const rows = await this.db.$queryRaw<Row[]>(
      Prisma.sql`WITH audit AS (${this.base()}) SELECT * FROM audit WHERE numero=${numero.trim()} LIMIT 1`,
    );
    if (!rows[0])
      throw new NotFoundException(
        'Proposta não encontrada na auditoria de faturamento',
      );
    return rows[0];
  }
}
