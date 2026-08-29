import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService.accessHistory', () => {
  const findMany = jest.fn();

  const prisma = {
    auditoria: {
      findMany,
    },
  } as unknown as PrismaService;

  const jwtService = {} as JwtService;
  const service = new AuthService(prisma, jwtService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('consulta somente logins realizados pelo usuário autenticado', async () => {
    findMany.mockResolvedValue([]);

    await service.accessHistory('usuario-123');

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        usuarioId: 'usuario-123',
        entidade: 'AUTENTICACAO',
        acao: 'LOGIN_REALIZADO',
      },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        criadoEm: true,
      },
      orderBy: {
        criadoEm: 'desc',
      },
      take: 50,
    });
  });

  it('serializa BigInt e retorna apenas campos permitidos', async () => {
    const criadoEm = new Date('2026-08-23T18:30:00.000Z');

    findMany.mockResolvedValue([
      {
        id: 987654321n,
        ip: '192.0.2.10',
        userAgent: 'Browser de teste',
        criadoEm,
        dadosDepois: {
          segredo: 'não deve ser retornado',
        },
      },
    ]);

    const result = await service.accessHistory('usuario-123');

    expect(result).toEqual([
      {
        id: '987654321',
        ip: '192.0.2.10',
        userAgent: 'Browser de teste',
        criadoEm,
      },
    ]);

    expect(result[0]).not.toHaveProperty('dadosDepois');
  });

  it('preserva IP e agente ausentes como nulos', async () => {
    const criadoEm = new Date('2026-08-23T18:31:00.000Z');

    findMany.mockResolvedValue([
      {
        id: 1n,
        ip: null,
        userAgent: null,
        criadoEm,
      },
    ]);

    await expect(service.accessHistory('usuario-123')).resolves.toEqual([
      {
        id: '1',
        ip: null,
        userAgent: null,
        criadoEm,
      },
    ]);
  });
});
