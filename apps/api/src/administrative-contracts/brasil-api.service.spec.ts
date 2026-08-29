import { BrasilApiService } from './brasil-api.service';
describe('BrasilApiService', () => {
  it('normaliza a dependência Prisma', () => {
    expect(new BrasilApiService({} as never)).toBeDefined();
  });
});
