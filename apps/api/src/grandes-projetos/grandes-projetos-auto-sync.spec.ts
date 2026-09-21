import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Grandes Projetos - sincronizacao automatica de OS', () => {
  const base = __dirname;

  const service = readFileSync(
    join(base, 'grandes-projetos.service.ts'),
    'utf8',
  );

  const controller = readFileSync(
    join(base, 'grandes-projetos.controller.ts'),
    'utf8',
  );

  it('publica rota protegida e preserva contingencia manual', () => {
    expect(controller).toContain(
      "@Post(':id/os/sincronizar')",
    );

    expect(controller).toContain(
      "@Post(':id/os/importar-contrato')",
    );

    expect(controller).toContain(
      'GRANDES_PROJETOS.OS.GERENCIAR',
    );
  });

  it('implementa sincronizacao aditiva e idempotente', () => {
    const start = service.indexOf(
      'async syncOrdersForProject(',
    );

    const end = service.indexOf(
      'async importOrders(',
      start,
    );

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = service.slice(
      start,
      end,
    );

    expect(block).toContain(
      'tx.gp_os.findUnique',
    );

    expect(block).toContain(
      'tx.gp_os.create',
    );

    expect(block).not.toContain(
      'gp_os.update',
    );

    expect(block).not.toContain(
      'gp_os.delete',
    );

    expect(block).not.toContain(
      'gp_os.upsert',
    );
  });

  it('exige proposta e contrato unicos', () => {
    expect(service).toContain(
      'servicosProposta !== 1',
    );

    expect(service).toContain(
      'servicosContrato !== 1',
    );

    expect(service).toContain(
      "motivo: 'SERVICO_NAO_UNICO'",
    );

    expect(service).toContain(
      "motivo: 'PROJETO_SEM_PROPOSTA_OU_CONTRATO'",
    );
  });

  it('retorna resumo estruturado', () => {
    for (const field of [
      'localizadas',
      'existentes',
      'incluidas',
      'ignoradas',
      'ambiguidades',
      'sincronizadoEm',
    ]) {
      expect(service).toContain(field);
    }
  });

  it('registra auditoria da sincronizacao', () => {
    expect(service).toContain(
      "'SINCRONIZAR_AUTOMATICO'",
    );

    expect(service).toContain(
      'await this.audit(',
    );
  });

  it('mantem endpoint manual na regra idempotente', () => {
    expect(service).toContain(
      'return this.syncOrdersForProject(id, a);',
    );
  });
});
