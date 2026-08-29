import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getApi(): object {
    return this.appService.getApi();
  }

  @Get('health')
  getHealth(): {
    status: string;
    application: string;
    timestamp: string;
  } {
    return {
      status: 'ok',
      application: 'Gestão Engerádios 2.0 API',
      timestamp: new Date().toISOString(),
    };
  }
}
