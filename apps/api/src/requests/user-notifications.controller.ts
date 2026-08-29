import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, type JwtPayload } from '../auth/guards/jwt-auth.guard';
import { UserNotificationsService } from './user-notifications.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('usuarios/me/notificacoes')
@UseGuards(JwtAuthGuard)
export class UserNotificationsController {
  constructor(private readonly service: UserNotificationsService) {}

  @Get()
  list(@Req() request: AuthRequest, @Query('limite') limite?: string) {
    const parsed = Number.parseInt(limite || '20', 10);

    return this.service.list(
      request.user.sub,
      Number.isFinite(parsed) ? parsed : 20,
    );
  }

  @Patch('marcar-todas-lidas')
  markAllRead(@Req() request: AuthRequest) {
    return this.service.markAllRead(request.user.sub);
  }

  @Patch(':id/lida')
  markRead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.service.markRead(request.user.sub, id);
  }
}
