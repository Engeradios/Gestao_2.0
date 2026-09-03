import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';

type Actor = { id: string; nome: string };
type Snapshot = {
  proposta_id: number;
  numero: string;
  classificacao: string;
  valor_proposta: Prisma.Decimal;
  valor_pedidos: Prisma.Decimal;
  valor_emitido: Prisma.Decimal;
  quantidade_pedidos: number;
  quantidade_titulos: number;
  data_aprovacao: Date | null;
  data_conclusao: Date | null;
  possui_servico: boolean;
};

@Injectable()
export class BillingAuditReviewService {
  constructor(private readonly db: PrismaService) {}

  private async snapshot(tx: Prisma.TransactionClient, numero: string) {
    const rows = await tx.$queryRaw<Snapshot[]>(Prisma.sql`
      WITH p AS (
        SELECT p.id proposta_id,p.numero,p.val_proposta,
          nullif(regexp_replace(upper(btrim(p.numero)),'[^A-Z0-9]','','g'),'') proposta_chave,
          s.id IS NOT NULL possui_servico,s.data_aprovacao,s.conclusao_real data_conclusao
        FROM op_propostas p LEFT JOIN op_servicos s ON s.proposta_id=p.id
        WHERE p.numero=${numero} AND upper(btrim(coalesce(p.status,'')))='APROVADO'
      ), pv AS (
        SELECT nullif(regexp_replace(upper(btrim(seu_pedido)),'[^A-Z0-9]','','g'),'') proposta_chave,
          nullif(regexp_replace(upper(btrim(pedido)),'[^A-Z0-9]','','g'),'') pedido_chave,
          sum(coalesce(val_pedido,0)) valor_pedido
        FROM fin_pedidos_venda GROUP BY 1,2
      ), cr AS (
        SELECT nullif(regexp_replace(upper(btrim(pedido)),'[^A-Z0-9]','','g'),'') pedido_chave,
          count(*) FILTER(WHERE data_cancelado IS NULL)::int quantidade_titulos,
          coalesce(sum(valor_emissao) FILTER(WHERE data_cancelado IS NULL),0)::numeric valor_emitido
        FROM fin_contas_receber GROUP BY 1
      )
      SELECT p.proposta_id,p.numero,
        CASE WHEN count(DISTINCT pv.pedido_chave)=0 THEN 'SEM_PEDIDO'
          WHEN coalesce(sum(cr.quantidade_titulos),0)=0 THEN 'SEM_COBRANCA'
          WHEN count(DISTINCT pv.pedido_chave)>1 THEN 'MULTIPLOS_PEDIDOS' ELSE 'COM_COBRANCA' END classificacao,
        p.val_proposta valor_proposta,coalesce(sum(DISTINCT pv.valor_pedido),0)::numeric valor_pedidos,
        coalesce(sum(cr.valor_emitido),0)::numeric valor_emitido,count(DISTINCT pv.pedido_chave)::int quantidade_pedidos,
        coalesce(sum(cr.quantidade_titulos),0)::int quantidade_titulos,p.data_aprovacao,p.data_conclusao,p.possui_servico
      FROM p LEFT JOIN pv ON pv.proposta_chave=p.proposta_chave LEFT JOIN cr ON cr.pedido_chave=pv.pedido_chave
      GROUP BY p.proposta_id,p.numero,p.val_proposta,p.data_aprovacao,p.data_conclusao,p.possui_servico`);
    if (!rows[0])
      throw new NotFoundException('Proposta aprovada não encontrada');
    return rows[0];
  }

  async confirm(numero: string, actor: Actor, observacao?: string) {
    return this.db.$transaction(async (tx) => {
      const s = await this.snapshot(tx, numero.trim());
      if (
        s.possui_servico &&
        (!s.data_conclusao || s.data_conclusao > new Date())
      ) {
        throw new BadRequestException(
          'A revisão deve aguardar a conclusão efetiva do serviço',
        );
      }
      const before = await tx.$queryRaw<Array<Record<string, unknown>>>(
        Prisma.sql`SELECT * FROM op_propostas_auditoria_faturamento_revisoes WHERE proposta_id=${s.proposta_id} FOR UPDATE`,
      );
      const rows = await tx.$queryRaw<
        Array<Record<string, unknown>>
      >(Prisma.sql`
        INSERT INTO op_propostas_auditoria_faturamento_revisoes
          (proposta_id,status,observacao,confirmado_por_id,confirmado_por_nome,confirmado_em,classificacao_snapshot,
           valor_proposta_snapshot,valor_pedidos_snapshot,valor_emitido_snapshot,quantidade_pedidos_snapshot,
           quantidade_titulos_snapshot,data_aprovacao_snapshot,data_conclusao_snapshot,atualizado_em)
        VALUES (${s.proposta_id},'CONFIRMADO',${observacao?.trim() || null},${actor.id}::uuid,${actor.nome},CURRENT_TIMESTAMP,
          ${s.classificacao},${s.valor_proposta},${s.valor_pedidos},${s.valor_emitido},${s.quantidade_pedidos},
          ${s.quantidade_titulos},${s.data_aprovacao},${s.data_conclusao},CURRENT_TIMESTAMP)
        ON CONFLICT (proposta_id) DO UPDATE SET status='CONFIRMADO',observacao=EXCLUDED.observacao,
          confirmado_por_id=EXCLUDED.confirmado_por_id,confirmado_por_nome=EXCLUDED.confirmado_por_nome,
          confirmado_em=CURRENT_TIMESTAMP,reaberto_por_id=NULL,reaberto_por_nome=NULL,reaberto_em=NULL,
          classificacao_snapshot=EXCLUDED.classificacao_snapshot,valor_proposta_snapshot=EXCLUDED.valor_proposta_snapshot,
          valor_pedidos_snapshot=EXCLUDED.valor_pedidos_snapshot,valor_emitido_snapshot=EXCLUDED.valor_emitido_snapshot,
          quantidade_pedidos_snapshot=EXCLUDED.quantidade_pedidos_snapshot,quantidade_titulos_snapshot=EXCLUDED.quantidade_titulos_snapshot,
          data_aprovacao_snapshot=EXCLUDED.data_aprovacao_snapshot,data_conclusao_snapshot=EXCLUDED.data_conclusao_snapshot,atualizado_em=CURRENT_TIMESTAMP
        RETURNING *`);
      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'op_propostas_auditoria_faturamento_revisoes',
          entidadeId: String(s.proposta_id),
          acao: 'CONFIRMAR',
          dadosAntes: (before[0] ?? null) as never,
          dadosDepois: rows[0] as never,
        },
      });
      return rows[0];
    });
  }

  async reopen(numero: string, actor: Actor, observacao?: string) {
    return this.db.$transaction(async (tx) => {
      const s = await this.snapshot(tx, numero.trim());
      const before = await tx.$queryRaw<Array<Record<string, unknown>>>(
        Prisma.sql`SELECT * FROM op_propostas_auditoria_faturamento_revisoes WHERE proposta_id=${s.proposta_id} FOR UPDATE`,
      );
      if (!before[0]) throw new NotFoundException('Revisão não encontrada');
      const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(
        Prisma.sql`UPDATE op_propostas_auditoria_faturamento_revisoes SET status='REABERTO',observacao=${observacao?.trim() || null},reaberto_por_id=${actor.id}::uuid,reaberto_por_nome=${actor.nome},reaberto_em=CURRENT_TIMESTAMP,atualizado_em=CURRENT_TIMESTAMP WHERE proposta_id=${s.proposta_id} RETURNING *`,
      );
      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'op_propostas_auditoria_faturamento_revisoes',
          entidadeId: String(s.proposta_id),
          acao: 'REABRIR',
          dadosAntes: before[0] as never,
          dadosDepois: rows[0] as never,
        },
      });
      return rows[0];
    });
  }
}
