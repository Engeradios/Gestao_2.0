import { OperationalFunctionalController } from './operational-functional.controller';

describe('MAIL-OBRA-04C-B3-V3 - endpoint de reenvio manual', () => {
  it('encaminha id, tipo, ator autenticado e reenvio=true ao serviço', async () => {
    const enviarEmail = jest.fn().mockResolvedValue({ sucesso: true });
    const service = { enviarEmail };
    const controller = new OperationalFunctionalController(service as never);
    const req = {
      user: {
        email: 'auditor@empresa.test',
        nome: 'Auditor de Teste',
        sub: 'usuario-789',
      },
    } as never;

    const result = await controller.email('servico-789', 'conclusao', req);

    expect(enviarEmail).toHaveBeenCalledTimes(1);
    expect(enviarEmail).toHaveBeenCalledWith(
      'servico-789',
      'conclusao',
      'auditor@empresa.test',
      true,
    );
    expect(result).toEqual({ sucesso: true });
  });
});
