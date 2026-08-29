import { OsRulesService } from './os-rules.service';

describe('OsRulesService', () => {
  const rules = new OsRulesService();

  it('identifica variações de manutenção em laboratório', () => {
    expect(rules.isLaboratorio('MANUTENÇÃO EM LABORATORIO')).toBe(true);

    expect(rules.isLaboratorio('7-MANUTENÇÃO EM LABORATÓRIO')).toBe(true);

    expect(rules.isLaboratorio('MANUTENÇÃO CORRETIVA')).toBe(false);
  });

  it('considera concluída como aberta aguardando tratativa', () => {
    expect(rules.estado('CONCLUIDA', 'Aberto')).toBe('AGUARDANDO_TRATATIVA');

    expect(rules.isAberta('CONCLUÍDA', 'Aberto')).toBe(true);
  });

  it('classifica encerrada e fechada como fechadas', () => {
    expect(rules.estado('ENCERRADO', 'Fechado')).toBe('FECHADA');

    expect(rules.isAberta('ENCERRADO', 'Fechado')).toBe(false);
  });

  it('separa canceladas e excluídas', () => {
    expect(rules.estado('CANCELADO', 'Fechado')).toBe('CANCELADA');

    expect(rules.estado('Excluído', 'Aberto')).toBe('CANCELADA');
  });

  it('classifica região', () => {
    expect(rules.regiao('RJ')).toBe('RJ');
    expect(rules.regiao('sp')).toBe('SP');
    expect(rules.regiao('MG')).toBe('OUTRAS_UF');
    expect(rules.regiao(null)).toBe('NAO_INFORMADA');
  });

  it('classifica SLA nos limites configurados', () => {
    const limits = {
      normalAteMinutos: 1440,
      atencaoAteMinutos: 2880,
      urgenteAteMinutos: 4320,
    };

    expect(rules.sla(1440, limits)).toBe('NORMAL');
    expect(rules.sla(1441, limits)).toBe('ATENCAO');
    expect(rules.sla(2881, limits)).toBe('URGENTE');
    expect(rules.sla(4321, limits)).toBe('CRITICO');
  });
});
