import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import * as XLSX from 'xlsx';

const MAP: Record<string, string> = {
  Status: 'status',
  'Fase Negociação': 'fase_negociacao',
  'Val. Proposta': 'val_proposta',
  'Data Cadastro': 'data_cadastro',
  'Nome do Cliente': 'cliente_nome',
};
function norm(v: unknown) {
  return v === null || v === undefined ? '' : String(v).trim();
}
function value(v: unknown) {
  if (typeof v === 'number') return v;
  const s = norm(v).replace(/\s/g, '');
  const n = Number(
    s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s,
  );
  return Number.isFinite(n) ? n : 0;
}
function dateValue(v: unknown): string | null {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') {
    const p = XLSX.SSF.parse_date_code(v);
    return p
      ? `${String(p.y).padStart(4, '0')}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
      : null;
  }
  const s = norm(v);
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

@Injectable()
export class ProposalsPreviewService {
  constructor(private readonly db: PrismaService) {}

  async previa(file: Express.Multer.File) {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(file.buffer, { type: 'buffer', raw: true });
    } catch {
      throw new BadRequestException('Não foi possível abrir a planilha XLSX.');
    }
    const name = wb.SheetNames[0];
    if (!name) throw new BadRequestException('Planilha não encontrada.');
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    });
    if (rows.length < 2) throw new BadRequestException('Planilha vazia.');
    const headers = (rows[0] || []).map(norm);
    const idx = new Map(headers.map((h, i) => [h, i]));
    if (!idx.has('Proposta'))
      throw new BadRequestException('Coluna "Proposta" não encontrada.');

    const parsed = new Map<string, Record<string, unknown>>();
    const duplicadas = new Set<string>();
    const invalidas: Array<{ linha: number; motivo: string }> = [];
    rows.slice(1).forEach((row, offset) => {
      const raw = row[idx.get('Proposta')!];
      const numero =
        typeof raw === 'number' ? String(Math.trunc(raw)) : norm(raw);
      if (!numero) {
        invalidas.push({ linha: offset + 2, motivo: 'Proposta vazia' });
        return;
      }
      if (parsed.has(numero)) duplicadas.add(numero);
      const d: Record<string, unknown> = { numero };
      for (const [header, field] of Object.entries(MAP)) {
        const pos = idx.get(header);
        const v = pos === undefined ? '' : row[pos];
        d[field] =
          field === 'val_proposta'
            ? value(v)
            : field === 'data_cadastro'
              ? dateValue(v)
              : norm(v) || null;
      }
      parsed.set(numero, d);
    });

    const numeros = [...parsed.keys()];
    const existentes = new Map<string, any>();
    for (let i = 0; i < numeros.length; i += 500) {
      const lote = numeros.slice(i, i + 500);
      const found = await this.db.$queryRaw<any[]>(Prisma.sql`
        SELECT numero,status,fase_negociacao,val_proposta,data_cadastro,cliente_nome
        FROM op_propostas WHERE numero IN (${Prisma.join(lote)})
      `);
      found.forEach((r) => existentes.set(r.numero, r));
    }

    let novas = 0,
      atualizadas = 0,
      semMudancas = 0;
    const mudancas: any[] = [];
    for (const d of parsed.values()) {
      const old = existentes.get(d.numero as string);
      if (!old) {
        novas++;
        continue;
      }
      const changes: any[] = [];
      const compare = (campo: string, a: unknown, b: unknown) => {
        const av = campo === 'valor' ? Number(a || 0) : norm(a);
        const bv = campo === 'valor' ? Number(b || 0) : norm(b);
        if (av !== bv)
          changes.push({ campo, valorAntigo: a ?? null, valorNovo: b ?? null });
      };
      compare('status', old.status, d.status);
      compare('fase', old.fase_negociacao, d.fase_negociacao);
      compare('valor', old.val_proposta, d.val_proposta);
      if (changes.length) {
        atualizadas++;
        mudancas.push({ numero: d.numero, alteracoes: changes });
      } else semMudancas++;
    }

    const cfg = await this.db.$queryRaw<Array<{ valor: string }>>(Prisma.sql`
      SELECT valor FROM op_proposta_configuracoes WHERE chave='prop_dias_cancela' LIMIT 1
    `);
    const dias = Math.max(1, Number(cfg[0]?.valor || 90) || 90);
    const cancelaveis = await this.db.$queryRaw<
      Array<{ numero: string; status: string | null }>
    >(Prisma.sql`
      SELECT numero,status FROM op_propostas
      WHERE UPPER(COALESCE(status,'')) NOT IN ('APROVADO','CANCELADA','PERDIDA')
        AND COALESCE(data_cadastro,criado_em::date) IS NOT NULL
        AND COALESCE(data_cadastro,criado_em::date) < CURRENT_DATE - (${dias} || ' days')::interval
      ORDER BY numero LIMIT 500
    `);

    return {
      modo: 'PREVIA_SEM_GRAVACAO',
      totalLinhas: rows.length - 1,
      propostasValidas: parsed.size,
      novas,
      atualizadas,
      semMudancas,
      linhasInvalidas: invalidas,
      numerosDuplicados: [...duplicadas].sort(),
      mudancas: mudancas.slice(0, 500),
      mudancasTotal: mudancas.length,
      cancelamento: {
        dias,
        quantidade: cancelaveis.length,
        propostas: cancelaveis,
      },
      avisoLimite:
        mudancas.length > 500
          ? 'A resposta exibe as primeiras 500 propostas alteradas.'
          : null,
    };
  }
}
