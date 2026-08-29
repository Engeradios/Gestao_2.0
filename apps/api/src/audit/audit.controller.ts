import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('ferramentas/auditoria')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('FERRAMENTAS.AUDITORIA.VISUALIZAR')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: AuditQueryDto) {
    return this.auditService.list(query);
  }

  @Get('filtros')
  filters() {
    return this.auditService.filters();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
