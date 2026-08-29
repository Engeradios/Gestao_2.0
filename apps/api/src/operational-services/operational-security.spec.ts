import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Operational backend security source', () => {
  const files = [
    'operational-services.controller.ts',
    'operational-functional.controller.ts',
  ];

  it.each(files)('%s possui guards e permissões em todas as rotas', (file) => {
    const source = readFileSync(join(__dirname, file), 'utf8');
    expect(source).toContain('@UseGuards(JwtAuthGuard, PermissionsGuard)');

    const routeCount = (source.match(/@(Get|Post|Patch|Put|Delete)\(/g) ?? [])
      .length;
    const permissionCount = (source.match(/@RequirePermissions\(/g) ?? [])
      .length;

    expect(routeCount).toBeGreaterThan(0);
    expect(permissionCount).toBe(routeCount);
  });
});
