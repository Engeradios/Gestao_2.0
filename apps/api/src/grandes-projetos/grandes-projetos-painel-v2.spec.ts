import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Grandes Projetos - Painel Executivo V2', () => {
  const base = __dirname;

  const controller = readFileSync(
    join(base, 'grandes-projetos.controller.ts'),
    'utf8',
  );

  const service = readFileSync(
    join(base, 'grandes-projetos.service.ts'),
    'utf8',
  );

  it('publica os dois endpoints V2', () => {
    expect(controller).toContain("@Get('painel-executivo-v2')");
    expect(controller).toContain("@Get('painel-resumo-v2')");
    expect(controller).toContain('this.service.painelExecutivoV2()');
    expect(controller).toContain('this.service.painelResumoV2()');
  });

  it('protege os endpoints com a permissao de visualizacao', () => {
    const permission = 'GRANDES_PROJETOS.PROJETOS.VISUALIZAR';

    expect(controller).toContain(permission);
    expect(controller).toContain('@UseGuards(JwtAuthGuard, PermissionsGuard)');
  });

  it('consulta as duas views V2 por SQL fixo', () => {
    expect(service).toContain('async painelExecutivoV2()');
    expect(service).toContain('async painelResumoV2()');
    expect(service).toContain('Prisma.sql');
    expect(service).toContain('public.vw_gp_painel_executivo_v2');
    expect(service).toContain('public.vw_gp_painel_resumo_v2');
  });

  it('preserva o dashboard existente', () => {
    expect(controller).toContain("@Get('dashboard')");
    expect(controller).toContain('return this.service.dashboard()');
    expect(service).toContain('async dashboard()');
  });

  it('mantem as consultas V2 somente leitura', () => {
    const v2Start = service.indexOf('async painelExecutivoV2()');
    const oneStart = service.indexOf('async one(id: number)');

    expect(v2Start).toBeGreaterThanOrEqual(0);
    expect(oneStart).toBeGreaterThan(v2Start);

    const v2Block = service.slice(v2Start, oneStart);

    expect(v2Block).toContain('SELECT');
    expect(v2Block).not.toMatch(/\bINSERT\b/i);
    expect(v2Block).not.toMatch(/\bUPDATE\b/i);
    expect(v2Block).not.toMatch(/\bDELETE\b/i);
    expect(v2Block).not.toMatch(/\bALTER\b/i);
    expect(v2Block).not.toMatch(/\bDROP\b/i);
    expect(v2Block).not.toMatch(/\bTRUNCATE\b/i);
  });

  it('ordena o painel executivo de forma deterministica', () => {
    expect(service).toContain('quantidade_alertas DESC');
    expect(service).toContain('projeto_id ASC');
  });

  it('retorna um unico objeto no resumo', () => {
    expect(service).toContain('return rows[0] ?? null');
  });
});
