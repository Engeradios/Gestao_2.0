import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import * as XLSX from 'xlsx';

const MAP: Record<string, string> = {
  Local: 'local',
  Status: 'status',
  'Fase Negociação': 'fase_negociacao',
  Motivo: 'motivo',
  Cliente: 'cliente_codigo',
  'Nome do Cliente': 'cliente_nome',
  Telefone: 'cliente_telefone',
  'Município Cliente': 'cliente_municipio',
  'UF Cliente': 'cliente_uf',
  Contato: 'contato_codigo',
  'Nome do Contato': 'contato_nome',
  'Email Contato': 'contato_email',
  Celular: 'contato_celular',
  Representante: 'representante_cod',
  'Nome do Representante': 'representante_nome',
  'Data Início': 'data_inicio',
  'Data Fim': 'data_fim',
  'Data Cadastro': 'data_cadastro',
  'Previsão Fechamento': 'previsao_fechamento',
  Contrato: 'contrato',
  Tipo: 'tipo',
  'Val. Produtos': 'val_produtos',
  'Val. Serviços': 'val_servicos',
  'Val. Tarifadores': 'val_tarifadores',
  'Val. Desconto': 'val_desconto',
  'Tipo Frete': 'tipo_frete',
  'Val. Frete Ida': 'val_frete_ida',
  'Val. Frete Volta': 'val_frete_volta',
  'Val. Frete': 'val_frete',
  Transportadora: 'transportadora',
  'Val. Proposta': 'val_proposta',
  'Endereço de instalação': 'endereco_instalacao',
  'Título da Proposta': 'titulo',
};

const NUMERICOS = new Set([
  'val_produtos',
  'val_servicos',
  'val_tarifadores',
  'val_desconto',
  'val_frete_ida',
  'val_frete_volta',
  'val_frete',
  'val_proposta',
]);
const DATAS = new Set([
  'data_inicio',
  'data_fim',
  'data_cadastro',
  'previsao_fechamento',
]);

function texto(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  return String(v).trim() || null;
}

function numero(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const raw = String(v).trim().replace(/\s/g, '');
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dataSql(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime()))
    return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const parts = XLSX.SSF.parse_date_code(v);
    if (!parts) return null;
    return `${String(parts.y).padStart(4, '0')}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function rotuloArquivo(nome: string): string {
  return (
    nome
      .replace(/\.xlsx$/i, '')
      .normalize('NFKD')
      .replace(/[^\w.\- ]+/g, '')
      .trim()
      .slice(0, 255) || 'importacao'
  );
}

@Injectable()
export class ProposalsImportService {
  constructor(private readonly db: PrismaService) {}

  async importar(arquivo: Express.Multer.File, usuario: string) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(arquivo.buffer, {
        type: 'buffer',
        raw: true,
        cellDates: false,
      });
    } catch {
      throw new BadRequestException('Não foi possível abrir a planilha XLSX.');
    }
    const first = workbook.SheetNames[0];
    if (!first) throw new BadRequestException('Planilha não encontrada.');
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[first], {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    });
    if (linhas.length < 2) throw new BadRequestException('Planilha vazia.');

    const cabecalho = (linhas[0] || []).map((v) => String(v ?? '').trim());
    const indice = new Map(cabecalho.map((nome, i) => [nome, i]));
    if (!indice.has('Proposta'))
      throw new BadRequestException('Coluna "Proposta" não encontrada.');

    const origem = rotuloArquivo(arquivo.originalname);
    const registros: Array<Record<string, unknown>> = [];
    for (const row of linhas.slice(1)) {
      const bruto = row[indice.get('Proposta')!];
      if (bruto === null || bruto === undefined || bruto === '') continue;
      const proposta =
        typeof bruto === 'number'
          ? String(Math.trunc(bruto))
          : String(bruto).trim();
      if (!proposta) continue;
      const dados: Record<string, unknown> = {
        numero: proposta,
        ultima_origem: origem,
      };
      for (const [planilha, coluna] of Object.entries(MAP)) {
        const pos = indice.get(planilha);
        const valor = pos === undefined ? '' : row[pos];
        dados[coluna] = NUMERICOS.has(coluna)
          ? numero(valor)
          : DATAS.has(coluna)
            ? dataSql(valor)
            : texto(valor);
      }
      registros.push(dados);
    }

    if (!registros.length)
      throw new BadRequestException('Nenhuma proposta válida encontrada.');

    const resultado = await this.db.$transaction(
      async (tx) => {
        const importacao = await tx.opPropostaImportacao.create({
          data: {
            origem,
            totalLinhas: registros.length,
            novas: 0,
            atualizadas: 0,
            canceladas: 0,
            usuario,
          },
        });
        let novas = 0;
        let atualizadas = 0;
        for (const d of registros) {
          const anterior = await tx.$queryRaw<
            Array<{ dados: Record<string, unknown> }>
          >(Prisma.sql`
            SELECT to_jsonb(p) AS dados
            FROM op_propostas p
            WHERE numero = ${String(d.numero)}
            LIMIT 1
          `);

          if (anterior.length) {
            atualizadas++;

            const atual = anterior[0].dados;
            const evolucoes: Array<[string, string | null, string | null]> = [];

            for (const coluna of Object.values(MAP)) {
              const antigoBruto = atual[coluna];
              const novoBruto = d[coluna];

              let antigo: string | null;
              let novo: string | null;
              let diferentes = false;

              if (NUMERICOS.has(coluna)) {
                const antigoNumero = Number(antigoBruto ?? 0);
                const novoNumero = Number(novoBruto ?? 0);

                diferentes = antigoNumero !== novoNumero;
                antigo = String(antigoNumero);
                novo = String(novoNumero);
              } else if (DATAS.has(coluna)) {
                antigo =
                  antigoBruto === null || antigoBruto === undefined
                    ? null
                    : String(antigoBruto).slice(0, 10);

                novo =
                  novoBruto === null || novoBruto === undefined
                    ? null
                    : String(novoBruto).slice(0, 10);

                diferentes = (antigo || '') !== (novo || '');
              } else {
                antigo = texto(antigoBruto);
                novo = texto(novoBruto);
                diferentes = (antigo || '') !== (novo || '');
              }

              if (diferentes) {
                evolucoes.push([coluna, antigo, novo]);
              }
            }

            for (const [campo, antigo, novo] of evolucoes) {
              await tx.$executeRaw(Prisma.sql`
                INSERT INTO op_proposta_evolucoes
                  (
                    proposta_numero,
                    campo,
                    valor_antigo,
                    valor_novo,
                    origem,
                    usuario,
                    registrado_em,
                    importacao_id
                  )
                VALUES (
                  ${String(d.numero)},
                  ${campo},
                  ${antigo},
                  ${novo},
                  ${origem},
                  ${usuario},
                  NOW(),
                  ${importacao.id}
                )
              `);
            }
          } else {
            novas++;
          }

          await tx.$executeRaw(Prisma.sql`
          INSERT INTO op_propostas (
            numero, local, status, fase_negociacao, motivo, cliente_codigo, cliente_nome,
            cliente_telefone, cliente_municipio, cliente_uf, contato_codigo, contato_nome,
            contato_email, contato_celular, representante_cod, representante_nome,
            data_inicio, data_fim, data_cadastro, previsao_fechamento, contrato, tipo,
            val_produtos, val_servicos, val_tarifadores, val_desconto, tipo_frete,
            val_frete_ida, val_frete_volta, val_frete, transportadora, val_proposta,
            endereco_instalacao, titulo, ultima_origem, atualizado_em
          ) VALUES (
            ${String(d.numero)}, ${d.local as string | null}, ${d.status as string | null},
            ${d.fase_negociacao as string | null}, ${d.motivo as string | null},
            ${d.cliente_codigo as string | null}, ${d.cliente_nome as string | null},
            ${d.cliente_telefone as string | null}, ${d.cliente_municipio as string | null},
            ${d.cliente_uf as string | null}, ${d.contato_codigo as string | null},
            ${d.contato_nome as string | null}, ${d.contato_email as string | null},
            ${d.contato_celular as string | null}, ${d.representante_cod as string | null},
            ${d.representante_nome as string | null}, ${d.data_inicio as string | null}::date,
            ${d.data_fim as string | null}::date, ${d.data_cadastro as string | null}::date,
            ${d.previsao_fechamento as string | null}::date, ${d.contrato as string | null},
            ${d.tipo as string | null}, ${Number(d.val_produtos)}, ${Number(d.val_servicos)},
            ${Number(d.val_tarifadores)}, ${Number(d.val_desconto)}, ${d.tipo_frete as string | null},
            ${Number(d.val_frete_ida)}, ${Number(d.val_frete_volta)}, ${Number(d.val_frete)},
            ${d.transportadora as string | null}, ${Number(d.val_proposta)},
            ${d.endereco_instalacao as string | null}, ${d.titulo as string | null}, ${origem}, NOW()
          )
          ON CONFLICT (numero) DO UPDATE SET
            local=EXCLUDED.local, status=EXCLUDED.status, fase_negociacao=EXCLUDED.fase_negociacao,
            motivo=EXCLUDED.motivo, cliente_codigo=EXCLUDED.cliente_codigo,
            cliente_nome=EXCLUDED.cliente_nome, cliente_telefone=EXCLUDED.cliente_telefone,
            cliente_municipio=EXCLUDED.cliente_municipio, cliente_uf=EXCLUDED.cliente_uf,
            contato_codigo=EXCLUDED.contato_codigo, contato_nome=EXCLUDED.contato_nome,
            contato_email=EXCLUDED.contato_email, contato_celular=EXCLUDED.contato_celular,
            representante_cod=EXCLUDED.representante_cod, representante_nome=EXCLUDED.representante_nome,
            data_inicio=EXCLUDED.data_inicio, data_fim=EXCLUDED.data_fim,
            data_cadastro=EXCLUDED.data_cadastro, previsao_fechamento=EXCLUDED.previsao_fechamento,
            contrato=EXCLUDED.contrato, tipo=EXCLUDED.tipo, val_produtos=EXCLUDED.val_produtos,
            val_servicos=EXCLUDED.val_servicos, val_tarifadores=EXCLUDED.val_tarifadores,
            val_desconto=EXCLUDED.val_desconto, tipo_frete=EXCLUDED.tipo_frete,
            val_frete_ida=EXCLUDED.val_frete_ida, val_frete_volta=EXCLUDED.val_frete_volta,
            val_frete=EXCLUDED.val_frete, transportadora=EXCLUDED.transportadora,
            val_proposta=EXCLUDED.val_proposta, endereco_instalacao=EXCLUDED.endereco_instalacao,
            titulo=EXCLUDED.titulo, ultima_origem=EXCLUDED.ultima_origem, atualizado_em=NOW()
        `);
        }

        await tx.opPropostaImportacao.update({
          where: { id: importacao.id },
          data: { novas, atualizadas },
        });

        const configuracao = await tx.$queryRaw<
          Array<{ valor: string }>
        >(Prisma.sql`
        SELECT valor FROM op_proposta_configuracoes WHERE chave='prop_dias_cancela' LIMIT 1
      `);
        const dias = Math.max(1, Number(configuracao[0]?.valor || 90) || 90);
        const canceladas = await tx.$queryRaw<
          Array<{ numero: string; status: string | null }>
        >(Prisma.sql`
        SELECT numero, status FROM op_propostas
        WHERE UPPER(COALESCE(status,'')) NOT IN ('APROVADO','CANCELADA','PERDIDA')
          AND COALESCE(data_cadastro, criado_em::date) IS NOT NULL
          AND COALESCE(data_cadastro, criado_em::date) < (CURRENT_DATE - (${dias} || ' days')::interval)
      `);
        for (const item of canceladas) {
          await tx.$executeRaw(Prisma.sql`
          INSERT INTO op_proposta_evolucoes
            (proposta_numero,campo,valor_antigo,valor_novo,origem,usuario,registrado_em,importacao_id)
          VALUES (${item.numero},'status',${item.status},'CANCELADA',${`auto na importação (+${dias}d)`},${usuario},NOW(),${importacao.id})
        `);
        }
        if (canceladas.length) {
          await tx.$executeRaw(Prisma.sql`
          UPDATE op_propostas SET status='CANCELADA', motivo='INATIVIDADE', atualizado_em=NOW()
          WHERE numero IN (${Prisma.join(canceladas.map((x) => x.numero))})
        `);
        }
        await tx.opPropostaImportacao.update({
          where: { id: importacao.id },
          data: { canceladas: canceladas.length },
        });
        return {
          importacaoId: importacao.id,
          total: registros.length,
          novas,
          atualizadas,
          canceladas: canceladas.length,
          diasCancelamento: dias,
        };
      },
      { timeout: 120000 },
    );

    return { origem, ...resultado };
  }
}
