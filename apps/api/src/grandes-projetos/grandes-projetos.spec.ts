import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('Grandes Projetos backend', () => {
  const c = readFileSync(
    join(__dirname, 'grandes-projetos.controller.ts'),
    'utf8',
  );
  const s = readFileSync(
    join(__dirname, 'grandes-projetos.service.ts'),
    'utf8',
  );
  it('aplica RBAC', () => {
    expect(c).toContain('GRANDES_PROJETOS.PROJETOS.VISUALIZAR');
    expect(c).toContain('GRANDES_PROJETOS.PROJETOS.EXCLUIR');
  });
  it('usa transações e auditoria', () => {
    expect(s).toContain('this.db.$transaction');
    expect(s).toContain('tx.auditoria.create');
  });
  it('implementa exclusão lógica e restauração', () => {
    expect(s).toContain('EXCLUIR_LOGICO');
    expect(s).toContain('excluido_em: null');
    expect(s).not.toContain('gp_projeto.delete');
    expect(s).not.toContain('model.delete');
    expect(c).toContain('PROJETOS.RESTAURAR');
    expect(c).toContain("Post(':id/restaurar')");
  });

  it('preserva integração por contrato', () => {
    expect(s).toContain('Projeto sem número de contrato');
    expect(s).toContain('ordemServico.findMany');
  });
});
