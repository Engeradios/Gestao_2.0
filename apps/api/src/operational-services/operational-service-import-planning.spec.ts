import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const controller = readFileSync(
  join(__dirname, 'operational-service-import.controller.ts'),
  'utf8',
);
const service = readFileSync(
  join(__dirname, 'operational-service-import.service.ts'),
  'utf8',
);

describe('Operational import - contrato de planejamento', () => {
  it.each([
    'areaResponsavel',
    'ufExecucao',
    'pracaResponsavel',
    'tempoExecucaoDias',
  ])('encaminha o campo %s no controller', (field) => {
    expect(controller).toContain(`${field}: body.${field}`);
  });

  it('injeta as regras de planejamento', () => {
    expect(service).toContain('ServicePlanningRulesService');
    expect(service).toContain(
      'private readonly planningRules: ServicePlanningRulesService',
    );
  });

  it('mantém um modo legado temporário', () => {
    expect(service).toContain("let planningVersion = 'LEGADO'");
    expect(service).toContain("calendarInfoForUfs(['RJ', 'SP'])");
  });

  it('aplica a nova regra somente quando os novos campos são enviados', () => {
    expect(service).toContain('const newPlanningRequested = Boolean(');
    expect(service).toContain("planningVersion = 'NOVA_REGRA'");
    expect(service).toContain('await this.planningRules.calculate({');
  });

  it('consulta a aprovação mais recente no histórico', () => {
    expect(service).toContain('this.db.opPropostaEvolucao.findFirst({');
    expect(service).toContain('proposta: { is: { id: proposta.id } }');
    expect(service).toContain("valorNovo: { equals: 'APROVADO'");
    expect(service).toContain('if (!approvalDate) {');
    expect(service).toContain("orderBy: { registradoEm: 'desc' }");
  });

  it('persiste os campos de planejamento', () => {
    for (const field of [
      'pracaResponsavel',
      'chegadaPrevista',
      'origemDataAprovacao',
      'diasPreparacao',
      'tempoExecucaoDias',
    ]) {
      expect(service).toContain(`${field}:`);
    }
  });

  it('preserva a notificação de abertura', () => {
    expect(service).toContain('.send(serviceResult.id, input.actorName)');
  });
});
