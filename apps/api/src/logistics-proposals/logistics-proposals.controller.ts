import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ReceiveLogisticsProposalDto } from './dto/logistics-proposals.dto';
import { LogisticsProposalsService } from './logistics-proposals.service';

type AuthRequest = Request & {
  user?: Record<string, unknown>;
};

function actor(request: AuthRequest) {
  const value = request.user?.email ?? request.user?.nome ?? request.user?.sub;

  return typeof value === 'string' && value.trim() ? value.trim() : 'sistema';
}

@Controller('estoque-logistica/novas-propostas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LogisticsProposalsController {
  constructor(private readonly service: LogisticsProposalsService) {}

  @Get()
  @RequirePermissions('ESTOQUE_LOGISTICA.NOVAS_PROPOSTAS.VISUALIZAR')
  list(
    @Query()
    query: Record<string, string | undefined>,
  ) {
    return this.service.list(query);
  }

  @Patch(':propostaId/receber')
  @RequirePermissions('ESTOQUE_LOGISTICA.NOVAS_PROPOSTAS.GERENCIAR')
  receive(
    @Param('propostaId', ParseIntPipe)
    propostaId: number,
    @Body() body: ReceiveLogisticsProposalDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.receive(propostaId, body, actor(request));
  }
}
