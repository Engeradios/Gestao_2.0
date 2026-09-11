import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('MAIL-OBRA-04D-G3B-PRACA-BACKEND-V2D', () => {
  const dto = readFileSync(join(__dirname, 'dto/service.dto.ts'), 'utf8');
  const controller = readFileSync(
    join(__dirname, 'operational-services.controller.ts'),
    'utf8',
  );
  const service = readFileSync(
    join(__dirname, 'operational-services.service.ts'),
    'utf8',
  );

  it('usa DTO e rota exclusivos', () => {
    expect(dto).toContain('class UpdateServicePlanningPlaceDto');
    expect(dto).toContain('@MaxLength(160)');
    expect(controller).toContain("@Patch('servicos/:id/planejamento/praca')");
  });

  it('valida fonte, UF, aprovação e estado logístico', () => {
    expect(service).toContain('proposta.clienteMunicipio');
    expect(service).toContain('proposta.clienteUf');
    expect(service).toContain("!== 'APROVADO'");
    expect(service).toContain('emailLogisticaTentativas !== 0');
  });

  it('faz update condicional e auditoria na mesma transação', () => {
    expect(service).toContain('return this.db.$transaction(async (tx) =>');
    expect(service).toContain('tx.opServico.updateMany');
    expect(service).toContain('tx.auditoria.create');
    expect(service).toContain("acao: 'SERVICO_PRACA_CORRIGIDA'");
  });

  it('não envia e-mail', () => {
    const start = service.indexOf('async atualizarPracaPlanejamento(');
    const end = service.indexOf('async atualizarAdministrativo(', start);
    const block = service.slice(start, end);
    expect(block).not.toContain('enviarEmail');
    expect(block).not.toContain('sendMail');
  });
});
