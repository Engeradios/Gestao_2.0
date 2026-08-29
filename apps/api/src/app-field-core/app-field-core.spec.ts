import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('AppCampo core contract', () => {
  const controller = readFileSync(
    join(__dirname, 'app-field-core.controller.ts'),
    'utf8',
  );
  const service = readFileSync(
    join(__dirname, 'app-field-core.service.ts'),
    'utf8',
  );
  it('expõe dispositivo e ciclo do expediente', () => {
    for (const route of [
      'dispositivos/registrar',
      'expedientes/atual',
      'expedientes/iniciar',
      'expedientes/:id/pausar',
      'expedientes/:id/retomar',
      'expedientes/:id/finalizar',
    ])
      expect(controller).toContain(route);
  });
  it('restringe operações ao usuário autenticado', () => {
    expect(controller).toContain('req.user.sub');
    expect(service).toContain('usuarioId');
  });
  it('usa transação em pausa, retomada e finalização', () => {
    expect(service.match(/\$transaction/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
