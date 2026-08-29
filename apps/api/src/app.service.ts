import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApi(): object {
    return {
      application: 'Gestão Engerádios 2.0',
      service: 'API',
      version: '0.1.0',
      status: 'inicialização',
    };
  }
}
