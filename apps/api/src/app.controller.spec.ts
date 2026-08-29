import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('deve retornar as informações da API', () => {
    expect(controller.getApi()).toEqual({
      application: 'Gestão Engerádios 2.0',
      service: 'API',
      version: '0.1.0',
      status: 'inicialização',
    });
  });

  it('deve retornar o health check', () => {
    const health = controller.getHealth();

    expect(health).toMatchObject({
      status: 'ok',
      application: 'Gestão Engerádios 2.0 API',
    });

    expect(health.timestamp).toBeDefined();
  });
});
