import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('roteiro operacional - pessoa ativa', () => {
  const source = readFileSync(
    join(__dirname, 'operational-route.service.ts'),
    'utf8',
  );
  it('mantém OpLista e exige pessoa ativa', () => {
    expect(source).toContain('this.db.opLista.findMany');
    expect(source).toContain('this.db.opLista.findFirst');
    expect(
      source.match(/pessoa: \{ is: \{ ativo: true \} \}/g)?.length,
    ).toBeGreaterThanOrEqual(2);
  });
  it('protege criação e redistribuição', () => {
    expect(source).toContain('private async eligibleTechnician');
    expect(source).toContain('changingTechnician');
    expect(source).toContain('profissional?.pessoaId ?? current.pessoaId');
  });
});
