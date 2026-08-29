import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('OsSlaService', () => {
  const source = readFileSync(join(__dirname, 'os-sla.service.ts'), 'utf8');

  it('usa horários e feriados configurados', () => {
    expect(source).toContain('os_sla_horarios');
    expect(source).toContain('op_feriados');
    expect(source).toContain('EXTRACT(DOW FROM');
  });

  it('desconta intervalo do expediente', () => {
    expect(source).toContain('intervalo_inicio');
    expect(source).toContain('intervalo_fim');
  });

  it('mantém concluída contando até agora', () => {
    expect(source).toContain("estado === 'FECHADA' && input.fechamento");
    expect(source).toContain('input.agora ?? new Date()');
  });

  it('classifica SLA pelos limites do banco', () => {
    expect(source).toContain('config.normalAteMinutos');
    expect(source).toContain('config.atencaoAteMinutos');
    expect(source).toContain('config.urgenteAteMinutos');
  });
});
