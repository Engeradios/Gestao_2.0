import { AdministrativeContractsService } from './administrative-contracts.service';

describe('AdministrativeContractsService', () => {
  it('não consulta responsável quando ele não é informado', async () => {
    const prisma = {
      $transaction: jest.fn(async (queries: Array<Promise<unknown>>) =>
        Promise.all(queries),
      ),
      clienteOperacional: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cliente-1' }),
      },
      usuario: { findUnique: jest.fn() },
      opProposta: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AdministrativeContractsService(prisma as never);
    await (
      service as unknown as {
        validateReferences: (
          clienteId: string,
          responsavelId?: string,
          propostaIds?: number[],
        ) => Promise<void>;
      }
    ).validateReferences('cliente-1', undefined, []);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it('é instanciável com o PrismaService', () => {
    const service = new AdministrativeContractsService({} as never);
    expect(service).toBeDefined();
  });
});
