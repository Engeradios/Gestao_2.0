import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('Fechamento de Serviços', () => {
  const controller = readFileSync(
    join(__dirname, 'operational-services.controller.ts'),
    'utf8',
  );
  const functional = readFileSync(
    join(__dirname, 'operational-functional.controller.ts'),
    'utf8',
  );
  const dto = readFileSync(join(__dirname, 'dto/service.dto.ts'), 'utf8');
  it('usa DTOs nas mutações', () => {
    expect(controller).toContain('@Body() b: CreateServiceDto');
    expect(controller).toContain('@Body() body: AdminUpdateServiceDto');
    expect(controller).toContain('@Body() b: CreateProgressDto');
    expect(controller).toContain('OPERACIONAL.OS.EDITAR_DADOS');
    expect(controller).toContain(
      'atualizarAdministrativo(id, body, actor(req))',
    );
    expect(dto).toMatch(
      /@Min\(0\)[\s\S]*?@Max\(1\)[\s\S]*?percentual\?: number;/,
    );
  });
  it('deriva usuário do JWT', () => {
    expect(controller).toContain('usuario: actor(req)');
    expect(functional).toContain('enviarEmail(id, tipo, actor(req), true)');
    expect(functional).not.toContain("b?.usuario || 'sistema'");
  });
});
