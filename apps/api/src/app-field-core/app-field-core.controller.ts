import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, type JwtPayload } from '../auth/guards/jwt-auth.guard';
import { AppFieldCoreService } from './app-field-core.service';
import {
  FinishShiftDto,
  PauseShiftDto,
  RegisterDeviceDto,
  ResumeShiftDto,
  StartShiftDto,
  TelemetryDto,
} from './dto/app-field-core.dto';

type AuthRequest = Request & { user: JwtPayload };

@Controller('app-campo')
@UseGuards(JwtAuthGuard)
export class AppFieldCoreController {
  constructor(private readonly service: AppFieldCoreService) {}
  @Post('dispositivos/registrar') register(
    @Req() req: AuthRequest,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.service.registerDevice(req.user.sub, dto);
  }
  @Get('dispositivos/meus') devices(@Req() req: AuthRequest) {
    return this.service.devices(req.user.sub);
  }
  @Get('expedientes/atual') current(@Req() req: AuthRequest) {
    return this.service.current(req.user.sub);
  }
  @Post('expedientes/iniciar') start(
    @Req() req: AuthRequest,
    @Body() dto: StartShiftDto,
  ) {
    return this.service.start(req.user.sub, dto);
  }
  @Post('expedientes/:id/pausar') pause(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: PauseShiftDto,
  ) {
    return this.service.pause(req.user.sub, id, dto);
  }
  @Post('expedientes/:id/retomar') resume(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: ResumeShiftDto,
  ) {
    return this.service.resume(req.user.sub, id, dto);
  }
  @Patch('expedientes/:id/finalizar') finish(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: FinishShiftDto,
  ) {
    return this.service.finish(req.user.sub, id, dto);
  }

  @Post('expedientes/:id/telemetria')
  telemetry(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: TelemetryDto,
  ) {
    return this.service.telemetry(req.user.sub, id, dto);
  }
}
