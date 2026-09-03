import { NotificationResponsibilitiesService } from './notification-responsibilities.service';
describe('NotificationResponsibilitiesService', () => {
  const db = {
    usuario: { findFirst: jest.fn(), findMany: jest.fn() },
    opNotificacaoResponsabilidade: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditoria: { create: jest.fn() },
  };
  const service = new NotificationResponsibilitiesService(db as never);
  beforeEach(() => jest.clearAllMocks());
  it('rejeita UF inválida', async () => {
    await expect(
      service.create(
        {
          usuarioId: '00000000-0000-0000-0000-000000000001',
          uf: 'XX',
          areaResponsavel: 'OPERACIONAL',
          recAbertura: true,
          recConclusao: false,
          recLogistica: false,
        },
        '',
      ),
    ).rejects.toThrow('UF inválida');
  });
  it('rejeita cadastro sem evento', async () => {
    await expect(
      service.create(
        {
          usuarioId: '00000000-0000-0000-0000-000000000001',
          uf: 'RJ',
          areaResponsavel: 'OPERACIONAL',
          recAbertura: false,
          recConclusao: false,
          recLogistica: false,
        },
        '',
      ),
    ).rejects.toThrow('Selecione ao menos');
  });
});
