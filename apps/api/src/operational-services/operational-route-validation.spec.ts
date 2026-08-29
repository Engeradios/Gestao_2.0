import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Fechamento do Roteiro Técnico', () => {
  const base = join(__dirname);
  const controller = readFileSync(
    join(base, 'operational-route.controller.ts'),
    'utf8',
  );
  const dto = readFileSync(join(base, 'dto/route.dto.ts'), 'utf8');
  it('protege leitura e gestão com permissões próprias', () => {
    expect(controller).toContain('OPERACIONAL.ROTEIRO.VISUALIZAR');
    expect(controller).toContain('OPERACIONAL.ROTEIRO.GERENCIAR');
    expect(controller).toContain('JwtAuthGuard');
    expect(controller).toContain('PermissionsGuard');
  });
  it('mantém escopo operacional e reconhece perfil administrador', () => {
    const service = readFileSync(
      join(base, 'operational-route.service.ts'),
      'utf8',
    );

    expect(service).toContain(
      "areaResponsavel: { in: ['OPERACIONAL', 'AMBAS'] }",
    );
    expect(service).toContain('Array.isArray(user?.perfis)');
    expect(service).toContain("value === 'administrador'");
  });

  it('usa DTOs nas consultas e mutações', () => {
    expect(controller).toContain('RouteDispatchQueryDto');
    expect(controller).toContain('CreateRouteVisitDto');
    expect(controller).toContain('UpdateRouteStatusDto');
    expect(dto).toContain("IsIn(['RJ', 'SP'])");
    expect(dto).toContain("'AFASTADO'");
  });
});
