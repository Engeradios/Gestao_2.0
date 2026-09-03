import { ServiceOpeningNotificationService } from './service-opening-notification.service';

describe('MAIL-OBRA-04C-B1 - idempotência comportamental da abertura', () => {
  it('bloqueia duplicidade após sucesso sem carregar serviço, selecionar destinatários ou enviar e-mail', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'log-existente' });
    const findUnique = jest.fn();
    const createLog = jest.fn();
    const updateService = jest.fn();
    const createMany = jest.fn();
    const sendMail = jest.fn();
    const selectRecipients = jest.fn();

    const prisma = {
      opEmailLog: { findFirst, create: createLog },
      opServico: { findUnique, update: updateService },
      notificacaoUsuario: { createMany },
    };
    const mail = { sendMail };
    const recipientSelector = { select: selectRecipients };

    const service = new ServiceOpeningNotificationService(
      prisma as never,
      mail as never,
      recipientSelector as never,
    );

    const result = await service.send('servico-123', 'auditor@empresa.test');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        chaveEvento: 'SERVICO_ABERTURA:servico-123',
        sucesso: true,
      },
      select: { id: true },
    });
    expect(result).toEqual({ sucesso: true, duplicado: true });
    expect(findUnique).not.toHaveBeenCalled();
    expect(selectRecipients).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
    expect(createLog).not.toHaveBeenCalled();
    expect(updateService).not.toHaveBeenCalled();
  });
});
