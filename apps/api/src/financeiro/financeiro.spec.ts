import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('Financeiro backend', () => {
  const c = readFileSync(join(__dirname, 'financeiro.controller.ts'), 'utf8');
  const s = readFileSync(join(__dirname, 'financeiro.service.ts'), 'utf8');
  it('aplica JWT e RBAC', () => {
    expect(c).toContain('JwtAuthGuard');
    expect(c).toContain('FINANCEIRO.CONTAS_RECEBER.VISUALIZAR');
    expect(c).toContain('FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR');
  });
  it('usa transacoes e auditoria', () => {
    expect(s).toContain('this.db.$transaction');
    expect(s).toContain('tx.auditoria.create');
  });
  it('integra nota com pagar', () => {
    expect(s).toContain('sendNoteToPayables');
    expect(s).toContain('enviado_pagar');
  });
});
