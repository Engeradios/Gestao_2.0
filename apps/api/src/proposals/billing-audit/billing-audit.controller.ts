import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import type { BillingAuditQuery } from './billing-audit.dto';
import { BillingAuditService } from './billing-audit.service';

@Controller('propostas/auditoria-faturamento')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('PROPOSTAS.AUDITORIA_FATURAMENTO.VISUALIZAR')
export class BillingAuditController {
  constructor(private readonly service: BillingAuditService) {}
  @Get() list(@Query() query: BillingAuditQuery) {
    return this.service.list(query);
  }
  @Get('resumo') summary(@Query() query: BillingAuditQuery) {
    return this.service.summary(query);
  }
  @Get('filtros') filters() {
    return this.service.filters();
  }
  @Get(':numero') detail(@Param('numero') numero: string) {
    return this.service.detail(numero);
  }
}
