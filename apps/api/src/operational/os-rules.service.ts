import { Injectable } from '@nestjs/common';

export type OsEstadoOperacional =
  'ABERTA' | 'AGUARDANDO_TRATATIVA' | 'FECHADA' | 'CANCELADA';

export type OsRegiao = 'RJ' | 'SP' | 'OUTRAS_UF' | 'NAO_INFORMADA';

export type OsSla = 'NORMAL' | 'ATENCAO' | 'URGENTE' | 'CRITICO';

export type OsSlaLimites = {
  normalAteMinutos: number;
  atencaoAteMinutos: number;
  urgenteAteMinutos: number;
};

@Injectable()
export class OsRulesService {
  normalize(value: unknown): string {
    if (typeof value !== 'string') return '';

    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  isLaboratorio(tipo: unknown): boolean {
    const normalized = this.normalize(tipo)
      .replace(/^\d+\s*[-.:]\s*/, '')
      .replace(/\bLABORATORIO\b/g, 'LABORATORIO');

    return (
      normalized.includes('MANUTENCAO EM LABORATORIO') ||
      normalized.includes('MANUTENCAO DE LABORATORIO')
    );
  }

  estado(situacao: unknown, status: unknown): OsEstadoOperacional {
    const values = [this.normalize(situacao), this.normalize(status)].filter(
      Boolean,
    );

    if (
      values.some((value) =>
        ['CANCELADO', 'CANCELADA', 'EXCLUIDO', 'EXCLUIDA'].some((item) =>
          value.includes(item),
        ),
      )
    ) {
      return 'CANCELADA';
    }

    if (
      values.some(
        (value) =>
          value.includes('ENCERRADO') ||
          value.includes('ENCERRADA') ||
          value === 'FECHADO' ||
          value === 'FECHADA',
      )
    ) {
      return 'FECHADA';
    }

    if (
      values.some(
        (value) => value.includes('CONCLUIDO') || value.includes('CONCLUIDA'),
      )
    ) {
      return 'AGUARDANDO_TRATATIVA';
    }

    return 'ABERTA';
  }

  isAberta(situacao: unknown, status: unknown): boolean {
    return ['ABERTA', 'AGUARDANDO_TRATATIVA'].includes(
      this.estado(situacao, status),
    );
  }

  regiao(uf: unknown): OsRegiao {
    const normalized = this.normalize(uf);

    if (normalized === 'RJ') return 'RJ';
    if (normalized === 'SP') return 'SP';
    if (/^[A-Z]{2}$/.test(normalized)) return 'OUTRAS_UF';

    return 'NAO_INFORMADA';
  }

  sla(minutosUteis: number, limites: OsSlaLimites): OsSla {
    const minutos = Math.max(0, Math.floor(minutosUteis));

    if (minutos <= limites.normalAteMinutos) {
      return 'NORMAL';
    }

    if (minutos <= limites.atencaoAteMinutos) {
      return 'ATENCAO';
    }

    if (minutos <= limites.urgenteAteMinutos) {
      return 'URGENTE';
    }

    return 'CRITICO';
  }
}
