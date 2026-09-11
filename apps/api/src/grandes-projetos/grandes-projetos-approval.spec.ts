import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Grandes Projetos - fluxo de aprovação', () => {
  const base = __dirname;
  const controller = readFileSync(
    join(base, 'grandes-projetos.controller.ts'),
    'utf8',
  );
  const service = readFileSync(
    join(base, 'grandes-projetos.service.ts'),
    'utf8',
  );
  const dto = readFileSync(join(base, 'dto/grandes-projetos.dto.ts'), 'utf8');

  it('publica as tres rotas com RBAC correto', () => {
    expect(controller).toContain("@Post(':id/submeter')");
    expect(controller).toContain("@Post(':id/aprovar')");
    expect(controller).toContain("@Post(':id/rejeitar')");
    expect(controller).toContain('GRANDES_PROJETOS.PROJETOS.APROVAR');
  });
  it('valida versão e motivo de rejeição', () => {
    expect(dto).toContain('class ApprovalTransitionDto');
    expect(dto).toContain('class RejectProjectDto');
    expect(dto).toContain('@IsNotEmpty()');
    expect(dto).toContain('@MaxLength(500)');
  });
  it('protege transições, concorrência e auditoria', () => {
    expect(service).toContain("['NAO_SUBMETIDO', 'REJEITADO']");
    expect(service).toContain("before.aprovacao_status === 'PENDENTE'");
    expect(service).toContain('updateMany');
    expect(service).toContain('versao: version');
    expect(service).toContain("'SUBMETER_APROVACAO'");
    expect(service).toContain("'APROVAR'");
    expect(service).toContain("'REJEITAR'");
  });
});
