import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { BillingAuditReviewService } from './billing-audit-review.service';
type AuthRequest = Request & { user: JwtPayload };
@Controller('propostas/auditoria-faturamento')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingAuditReviewController {
  constructor(private readonly service: BillingAuditReviewService) {}
  private actor(req: AuthRequest) {
    return { id: req.user.sub, nome: req.user.nome || req.user.email };
  }
  @Post(':numero/confirmar')
  @RequirePermissions('PROPOSTAS.AUDITORIA_FATURAMENTO.CONFIRMAR')
  confirm(
    @Param('numero') numero: string,
    @Body() body: { observacao?: string },
    @Req() req: AuthRequest,
  ) {
    return this.service.confirm(numero, this.actor(req), body?.observacao);
  }
  @Post(':numero/reabrir')
  @RequirePermissions('PROPOSTAS.AUDITORIA_FATURAMENTO.CONFIRMAR')
  reopen(
    @Param('numero') numero: string,
    @Body() body: { observacao?: string },
    @Req() req: AuthRequest,
  ) {
    return this.service.reopen(numero, this.actor(req), body?.observacao);
  }
}
