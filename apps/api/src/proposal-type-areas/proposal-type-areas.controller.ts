import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UpdateProposalTypeAreaDto } from './dto/update-proposal-type-area.dto';
import { ProposalTypeAreasService } from './proposal-type-areas.service';

type AuthenticatedRequest = Request & {
  user: JwtPayload & { nome?: string; email?: string };
};

@Controller('ferramentas/tipos-proposta')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProposalTypeAreasController {
  constructor(private readonly service: ProposalTypeAreasService) {}

  @Get()
  @RequirePermissions('FERRAMENTAS.TIPOS_PROPOSTA.VISUALIZAR')
  list() {
    return this.service.list();
  }

  @Patch(':tipo')
  @RequirePermissions('FERRAMENTAS.TIPOS_PROPOSTA.EDITAR')
  update(
    @Param('tipo') tipo: string,
    @Body() dto: UpdateProposalTypeAreaDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.update(tipo, dto, {
      actorId: request.user.sub,
      actorName: request.user.nome ?? request.user.email ?? request.user.sub,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
