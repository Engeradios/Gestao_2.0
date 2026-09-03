import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationRecipientSelectorService } from './notification-recipient-selector.service';

type RowInput = {
  id?: string;
  userId?: string;
  email?: string;
  nome?: string;
  status?: string;
  ativo?: boolean;
  uf?: string;
  praca?: string | null;
  area?: string;
  abertura?: boolean;
  conclusao?: boolean;
  logistica?: boolean;
};

const row = (input: RowInput = {}) => ({
  id: input.id ?? 'responsabilidade-1',
  usuarioId: input.userId ?? 'usuario-1',
  uf: input.uf ?? 'RJ',
  praca: input.praca === undefined ? null : input.praca,
  areaResponsavel: input.area ?? 'AMBAS',
  recAbertura: input.abertura ?? true,
  recConclusao: input.conclusao ?? true,
  recLogistica: input.logistica ?? true,
  ativo: input.ativo ?? true,
  usuario: {
    id: input.userId ?? 'usuario-1',
    nome: input.nome ?? 'Usuário de Teste',
    email: input.email ?? 'usuario@empresa.test',
    status: input.status ?? 'ATIVO',
  },
});

describe('NotificationRecipientSelectorService', () => {
  const findMany = jest.fn();
  const globalFindMany = jest.fn();
  const prisma = {
    opNotificacaoResponsabilidade: { findMany },
    opNotificacaoEmail: { findMany: globalFindMany },
  } as unknown as PrismaService;
  const service = new NotificationRecipientSelectorService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
  });

  it('prioriza praça exata e não combina toda a UF', async () => {
    findMany.mockResolvedValue([
      row({ userId: 'geral', email: 'geral@empresa.test', praca: null }),
      row({ userId: 'exato', email: 'exato@empresa.test', praca: 'Mauá' }),
    ]);
    const result = await service.select({
      uf: 'SP',
      praca: 'MAUÁ',
      area: 'OPERACIONAL',
      evento: 'ABERTURA',
    });
    expect(result.estrategia).toBe('PRACA_EXATA');
    expect(result.destinatarios.map((item) => item.usuarioId)).toEqual([
      'exato',
    ]);
  });

  it('usa toda a UF quando não há praça exata elegível', async () => {
    findMany.mockResolvedValue([
      row({ userId: 'geral', email: 'geral@empresa.test', praca: null }),
      row({ userId: 'outra', email: 'outra@empresa.test', praca: 'Santos' }),
    ]);
    const result = await service.select({
      uf: 'sp',
      praca: ' Mauá ',
      area: 'OPERACIONAL',
      evento: 'ABERTURA',
    });
    expect(result.estrategia).toBe('TODA_UF');
    expect(result.quantidade).toBe(1);
  });

  it('retorna sem cobertura sem consultar destinatários globais', async () => {
    const result = await service.select({
      uf: 'BA',
      praca: 'Salvador',
      area: 'OPERACIONAL',
      evento: 'ABERTURA',
    });
    expect(result).toEqual({
      estrategia: 'SEM_COBERTURA',
      destinatarios: [],
      quantidade: 0,
    });
    expect(globalFindMany).not.toHaveBeenCalled();
  });

  it('normaliza caixa e espaços repetidos da praça', async () => {
    findMany.mockResolvedValue([
      row({ praca: 'São   Bernardo do Campo', email: 'a@empresa.test' }),
    ]);
    const result = await service.select({
      uf: 'sp',
      praca: '  SÃO BERNARDO   DO CAMPO  ',
      area: 'AMBAS',
      evento: 'ABERTURA',
    });
    expect(result.estrategia).toBe('PRACA_EXATA');
  });

  it.each([
    ['ABERTURA', { abertura: true, conclusao: false, logistica: false }],
    ['CONCLUSAO', { abertura: false, conclusao: true, logistica: false }],
    ['LOGISTICA', { abertura: false, conclusao: false, logistica: true }],
  ])('filtra corretamente o evento %s', async (evento, flags) => {
    findMany.mockResolvedValue([
      row({ userId: 'sim', email: 'sim@empresa.test', ...flags }),
      row({
        userId: 'nao',
        email: 'nao@empresa.test',
        abertura: false,
        conclusao: false,
        logistica: false,
      }),
    ]);
    const result = await service.select({
      uf: 'RJ',
      praca: 'Rio de Janeiro',
      area: evento === 'LOGISTICA' ? 'LOGISTICA' : 'OPERACIONAL',
      evento,
    });
    expect(result.destinatarios.map((item) => item.usuarioId)).toEqual(['sim']);
  });

  it('aceita OPERACIONAL e AMBAS em evento operacional', async () => {
    findMany.mockResolvedValue([
      row({ userId: 'op', email: 'op@empresa.test', area: 'OPERACIONAL' }),
      row({ userId: 'ambas', email: 'ambas@empresa.test', area: 'AMBAS' }),
      row({ userId: 'log', email: 'log@empresa.test', area: 'LOGISTICA' }),
    ]);
    const result = await service.select({
      uf: 'RJ',
      praca: 'Rio',
      area: 'AMBAS',
      evento: 'ABERTURA',
    });
    expect(result.quantidade).toBe(2);
  });

  it('aceita LOGISTICA e AMBAS em evento logístico', async () => {
    findMany.mockResolvedValue([
      row({ userId: 'op', email: 'op@empresa.test', area: 'OPERACIONAL' }),
      row({ userId: 'ambas', email: 'ambas@empresa.test', area: 'AMBAS' }),
      row({ userId: 'log', email: 'log@empresa.test', area: 'LOGISTICA' }),
    ]);
    const result = await service.select({
      uf: 'RJ',
      praca: 'Rio',
      area: 'AMBAS',
      evento: 'LOGISTICA',
    });
    expect(result.quantidade).toBe(2);
  });

  it('exclui usuário inativo e sem e-mail', async () => {
    findMany.mockResolvedValue([
      row({
        userId: 'inativo',
        email: 'inativo@empresa.test',
        status: 'INATIVO',
      }),
      row({ userId: 'sem-email', email: '   ' }),
      row({ userId: 'ativo', email: 'ativo@empresa.test' }),
    ]);
    const result = await service.select({
      uf: 'RJ',
      praca: 'Rio',
      area: 'OPERACIONAL',
      evento: 'ABERTURA',
    });
    expect(result.destinatarios.map((item) => item.usuarioId)).toEqual([
      'ativo',
    ]);
  });

  it('deduplica e-mails normalizados e ordena deterministicamente', async () => {
    findMany.mockResolvedValue([
      row({ userId: 'z', email: ' Z@EMPRESA.TEST ' }),
      row({ userId: 'a2', email: ' a@empresa.test ' }),
      row({ userId: 'a1', email: 'A@EMPRESA.TEST' }),
    ]);
    const result = await service.select({
      uf: 'RJ',
      praca: 'Rio',
      area: 'OPERACIONAL',
      evento: 'ABERTURA',
    });
    expect(result.destinatarios).toEqual([
      { usuarioId: 'a1', nome: 'Usuário de Teste', email: 'a@empresa.test' },
      { usuarioId: 'z', nome: 'Usuário de Teste', email: 'z@empresa.test' },
    ]);
  });

  it.each([
    [{ uf: 'XX', praca: 'Rio', area: 'OPERACIONAL', evento: 'ABERTURA' }, 'UF'],
    [
      { uf: 'RJ', praca: '   ', area: 'OPERACIONAL', evento: 'ABERTURA' },
      'Praça',
    ],
    [{ uf: 'RJ', praca: 'Rio', area: 'INVALIDA', evento: 'ABERTURA' }, 'Área'],
    [
      { uf: 'RJ', praca: 'Rio', area: 'OPERACIONAL', evento: 'INVALIDO' },
      'Evento',
    ],
  ])('rejeita entrada inválida: %s', async (input, message) => {
    await expect(service.select(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.select(input)).rejects.toThrow(message);
  });

  it('consulta apenas a matriz ativa da UF normalizada', async () => {
    await service.select({
      uf: ' rj ',
      praca: 'Rio',
      area: 'OPERACIONAL',
      evento: 'ABERTURA',
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ativo: true, uf: 'RJ' },
      }),
    );
  });
});
