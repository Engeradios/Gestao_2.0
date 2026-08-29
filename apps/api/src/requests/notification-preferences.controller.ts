import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { NotificationPreferencesService } from './notification-preferences.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('usuarios/me/preferencias-notificacao')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @Get()
  get(@Req() request: AuthRequest) {
    return this.service.get(request.user.sub);
  }
}
