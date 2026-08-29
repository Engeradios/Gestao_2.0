import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, type JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { OsSlaHolidayDto } from './dto/os-sla-holiday.dto';
import { UpdateOsSlaConfigDto } from './dto/update-os-sla-config.dto';
import { UpdateOsSlaSchedulesDto } from './dto/update-os-sla-schedules.dto';
import { OsSlaAdminService } from './os-sla-admin.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('ferramentas/sla-os')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('FERRAMENTAS.SLA_OS.GERENCIAR')
export class OsSlaAdminController {
  constructor(private readonly service: OsSlaAdminService) {}

  private actor(request: AuthRequest) {
    return {
      id: request.user.sub,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }

  @Get()
  get() {
    return this.service.get();
  }

  @Post('feriados')
  createHoliday(@Body() body: OsSlaHolidayDto, @Req() request: AuthRequest) {
    return this.service.createHoliday(body, this.actor(request));
  }

  @Patch('feriados/:id')
  updateHoliday(
    @Param('id') id: string,
    @Body() body: OsSlaHolidayDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.updateHoliday(id, body, this.actor(request));
  }

  @Delete('feriados/:id')
  deleteHoliday(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.service.deleteHoliday(id, this.actor(request));
  }

  @Patch('horarios')
  updateSchedules(
    @Body() body: UpdateOsSlaSchedulesDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.updateSchedules(body, this.actor(request));
  }

  @Patch()
  update(@Body() body: UpdateOsSlaConfigDto, @Req() request: AuthRequest) {
    return this.service.update(body, this.actor(request));
  }
}
