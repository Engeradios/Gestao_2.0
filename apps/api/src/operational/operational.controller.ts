import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { OrderQueryDto } from './dto/order-query.dto';
import { OperationalService } from './operational.service';

@Controller('operacional/os')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('OPERACIONAL.OS.VISUALIZAR')
export class OperationalController {
  constructor(private readonly service: OperationalService) {}
  @Get() list(@Query() query: OrderQueryDto) {
    return this.service.list(query);
  }
  @Get('indicadores') indicators() {
    return this.service.indicators();
  }
  @Get('filtros') filters() {
    return this.service.filters();
  }
  @Get('sincronizacoes/status') synchronizationStatus() {
    return this.service.synchronizationStatus();
  }
  @Get('sincronizacoes') synchronizationHistory(
    @Query('limite', new DefaultValuePipe(10), ParseIntPipe) limite: number,
  ) {
    return this.service.synchronizationHistory(limite);
  }
  @Get('dashboard')
  @RequirePermissions('ORDENS_SERVICO.DASHBOARD.VISUALIZAR')
  dashboard() {
    return this.service.dashboard();
  }

  @Get('painel')
  @RequirePermissions('ORDENS_SERVICO.PAINEL.VISUALIZAR')
  painel(@Query() query: OrderQueryDto) {
    return this.service.painelOperacional(query);
  }

  @Get('laboratorio')
  @RequirePermissions('ORDENS_SERVICO.LABORATORIO.VISUALIZAR')
  laboratorio(@Query() query: OrderQueryDto) {
    return this.service.painelLaboratorio(query);
  }

  @Get(':id') findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }
}
