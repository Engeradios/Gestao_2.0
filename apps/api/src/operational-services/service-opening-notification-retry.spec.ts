import { ServiceOpeningNotificationService } from './service-opening-notification.service';

describe('MAIL-OBRA-04C-B2B-V2 - falha e nova tentativa da abertura', () => {
  it('persiste falha sem chave idempotente e permite tentativa posterior bem-sucedida', async () => {
    const serviceId = 'servico-456';
    const actor = 'auditor@empresa.test';
    const key = `SERVICO_ABERTURA:${serviceId}`;

    let attemptCount = 2;
    const successfulKeys = new Set<string>();
    const logs: Array<Record<string, unknown>> = [];
    const updates: Array<Record<string, unknown>> = [];

    const fixture = {
      id: serviceId,
      proposta: 'PROP-456',
      cliente: 'Cliente Teste',
      servicoAtividade: 'Atividade Teste',
      ufExecucao: 'RJ',
      pracaResponsavel: 'Rio de Janeiro',
      areaResponsavel: 'OPERACIONAL',
      prazoFinal: new Date('2026-09-30T00:00:00.000Z'),
      anexos: [],
      responsaveis: [],
      emailAberturaTentativas: attemptCount,
    };

    const findFirst = jest.fn(
      ({ where }: { where: { chaveEvento: string; sucesso: boolean } }) =>
        where.sucesso && successfulKeys.has(where.chaveEvento)
          ? { id: 'log-sucesso' }
          : null,
    );

    const findUnique = jest.fn(
      (args: { select?: { emailAberturaTentativas?: boolean } }) => {
        if (args.select?.emailAberturaTentativas) {
          return { emailAberturaTentativas: attemptCount };
        }
        return { ...fixture, emailAberturaTentativas: attemptCount };
      },
    );

    const createLog = jest.fn((args: { data: Record<string, unknown> }) => {
      logs.push(args.data);
      if (
        args.data.sucesso === true &&
        typeof args.data.chaveEvento === 'string'
      ) {
        successfulKeys.add(args.data.chaveEvento);
      }
      return args;
    });

    const updateService = jest.fn((args: { data: Record<string, unknown> }) => {
      updates.push(args.data);
      const counter = args.data.emailAberturaTentativas as
        { increment?: number } | undefined;
      attemptCount += counter?.increment ?? 0;
      return args;
    });

    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = jest.fn(async (operations: unknown[]) =>
      Promise.all(operations),
    );
    const send = jest
      .fn()
      .mockRejectedValueOnce(new Error('SMTP indisponível para teste'))
      .mockResolvedValueOnce({ messageId: 'msg-sucesso-456' });
    const select = jest.fn().mockResolvedValue({
      estrategia: 'PRACA_EXATA',
      destinatarios: [
        {
          usuarioId: 'usuario-1',
          nome: 'Usuário Teste',
          email: 'destinatario@empresa.test',
        },
      ],
    });

    const prisma = {
      opEmailLog: { findFirst, create: createLog },
      opServico: { findUnique, update: updateService },
      notificacaoUsuario: { createMany },
      $transaction: transaction,
    };

    const mail = { send };
    const recipientSelector = { select };
    const service = new ServiceOpeningNotificationService(
      prisma as never,
      mail as never,
      recipientSelector as never,
    );

    const first = await service.send(serviceId, actor);

    expect(first).toEqual({
      sucesso: false,
      motivo: 'FALHA_ENVIO',
      detalhe: 'SMTP indisponível para teste',
    });
    expect(logs[0]).toEqual(
      expect.objectContaining({
        servicoId: serviceId,
        sucesso: false,
        tentativa: 3,
        chaveEvento: null,
        codigoErro: key,
        detalhe: 'SMTP indisponível para teste',
      }),
    );
    expect(updates[0]).toEqual(
      expect.objectContaining({
        emailAberturaStatus: 'FALHA',
        emailAberturaTentativas: { increment: 1 },
        emailAberturaErro: 'SMTP indisponível para teste',
      }),
    );
    expect(successfulKeys.has(key)).toBe(false);

    const second = await service.send(serviceId, actor);

    expect(second).toEqual({
      sucesso: true,
      destinatarios: 1,
      estrategia: 'PRACA_EXATA',
    });
    expect(findFirst).toHaveBeenNthCalledWith(2, {
      where: { chaveEvento: key, sucesso: true },
      select: { id: true },
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(logs[1]).toEqual(
      expect.objectContaining({
        servicoId: serviceId,
        sucesso: true,
        tentativa: 4,
        chaveEvento: key,
      }),
    );
    expect(updates[1]).toEqual(
      expect.objectContaining({
        emailAberturaStatus: 'ENVIADO',
        emailAberturaTentativas: { increment: 1 },
        emailAberturaErro: null,
      }),
    );
    expect(successfulKeys.has(key)).toBe(true);
  });
});
