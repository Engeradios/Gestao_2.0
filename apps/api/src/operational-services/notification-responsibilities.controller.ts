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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { NotificationResponsibilitiesService } from './notification-responsibilities.service';
import {
  CreateNotificationResponsibilityDto,
  UpdateNotificationResponsibilityDto,
  UpdateNotificationResponsibilityStatusDto,
} from './dto/notification-responsibility.dto';
const PERMISSION = 'OPERACIONAL.NOTIFICACOES_OBRA.GERENCIAR_RESPONSABILIDADES';
type RequestUser = { user?: { sub?: string; id?: string } };
@Controller('operacional/notificacoes-obra')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSION)
export class NotificationResponsibilitiesController {
  constructor(private readonly service: NotificationResponsibilitiesService) {}
  private actor(req: RequestUser) {
    return req.user?.sub || req.user?.id || '';
  }
  @Get('responsabilidades') list() {
    return this.service.list();
  }
  @Get('usuarios-elegiveis') users() {
    return this.service.users();
  }
  @Post('responsabilidades') create(
    @Body() body: CreateNotificationResponsibilityDto,
    @Req() req: RequestUser,
  ) {
    return this.service.create(body, this.actor(req));
  }
  @Patch('responsabilidades/:id') update(
    @Param('id') id: string,
    @Body() body: UpdateNotificationResponsibilityDto,
    @Req() req: RequestUser,
  ) {
    return this.service.update(id, body, this.actor(req));
  }
  @Patch('responsabilidades/:id/status') status(
    @Param('id') id: string,
    @Body() body: UpdateNotificationResponsibilityStatusDto,
    @Req() req: RequestUser,
  ) {
    return this.service.status(id, body.ativo, this.actor(req));
  }
}
