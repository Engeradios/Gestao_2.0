import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const c = readFileSync(
  join(__dirname, 'operational-services.controller.ts'),
  'utf8',
);
const s = readFileSync(
  join(__dirname, 'operational-services.service.ts'),
  'utf8',
);
const d = readFileSync(join(__dirname, 'dto/client.dto.ts'), 'utf8');
describe('Fechamento de Clientes', () => {
  it('usa DTOs', () => {
    expect(c).toContain('@Query() q: ClientsQueryDto');
    expect(c).toContain('@Body() b: CreateClientDto');
    expect(c).toContain('@Body() b: UpdateClientDto');
    expect(d).toContain('@IsEmail()');
    expect(d).toContain('@Length(2, 2)');
  });
  it('protege vínculos', () => {
    expect(s).toContain('Cliente possui serviços vinculados');
    expect(s).toMatch(/opServico\.count\([\s\S]*?clienteId: id/);
  });
});
