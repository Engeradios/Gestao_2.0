import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, type JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminNotificationPreferencesDto } from './dto/admin-notification-preferences.dto';

type AuthRequest = Request & { user: JwtPayload };

@Controller('ferramentas/notificacoes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminNotificationsController {
  constructor(private readonly service: AdminNotificationsService) {}

  @Get()
  @RequirePermissions('FERRAMENTAS.NOTIFICACOES.VISUALIZAR')
  list() {
    return this.service.list();
  }

  @Patch(':usuarioId')
  @RequirePermissions('FERRAMENTAS.NOTIFICACOES.GERENCIAR')
  update(
    @Param('usuarioId', ParseUUIDPipe)
    usuarioId: string,
    @Body() body: AdminNotificationPreferencesDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.update(usuarioId, body, {
      actorId: request.user.sub,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
