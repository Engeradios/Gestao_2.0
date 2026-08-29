import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreatePurchasesSupplierDto,
  UpdatePurchasesSupplierDto,
} from './dto/purchases-operations.dto';
import { PurchasesOperationsService } from './purchases-operations.service';
import { StreamableFile } from '@nestjs/common';
import { PendingProductsQueryDto } from './dto/purchases-pending-products.dto';

@Controller('compras')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesOperationsController {
  constructor(private readonly service: PurchasesOperationsService) {}

  @Get('painel')
  @RequirePermissions('COMPRAS.PAINEL.VISUALIZAR')
  panel(@Query('busca') search?: string, @Query('status') status?: string) {
    return this.service.panel(search, status);
  }

  @Get('dashboard')
  @RequirePermissions('COMPRAS.DASHBOARD.VISUALIZAR')
  dashboard() {
    return this.service.dashboard();
  }

  @Get('fornecedores')
  @RequirePermissions('COMPRAS.FORNECEDORES.VISUALIZAR')
  suppliers(@Query('busca') search?: string, @Query('ativo') active?: string) {
    return this.service.suppliers(search, active);
  }

  @Post('fornecedores')
  @RequirePermissions('COMPRAS.FORNECEDORES.GERENCIAR')
  createSupplier(@Body() dto: CreatePurchasesSupplierDto) {
    return this.service.createSupplier(dto);
  }

  @Patch('fornecedores/:id')
  @RequirePermissions('COMPRAS.FORNECEDORES.GERENCIAR')
  updateSupplier(
    @Param('id') id: string,
    @Body() dto: UpdatePurchasesSupplierDto,
  ) {
    return this.service.updateSupplier(id, dto);
  }
  @Get('produtos-pendentes')
  @RequirePermissions('COMPRAS.PAINEL.VISUALIZAR')
  pendingProducts(@Query() query: PendingProductsQueryDto) {
    return this.service.pendingProducts(query);
  }

  @Get('produtos-pendentes/exportar.xlsx')
  @RequirePermissions('COMPRAS.PAINEL.VISUALIZAR')
  async exportPendingProductsXlsx(@Query() query: PendingProductsQueryDto) {
    const file = await this.service.exportPendingProductsXlsx(query);
    return new StreamableFile(file.buffer, {
      type: file.type,
      disposition: `attachment; filename="${file.name}"`,
    });
  }

  @Get('produtos-pendentes/relatorio.pdf')
  @RequirePermissions('COMPRAS.PAINEL.VISUALIZAR')
  async exportPendingProductsPdf(@Query() query: PendingProductsQueryDto) {
    const file = await this.service.exportPendingProductsPdf(query);
    return new StreamableFile(file.buffer, {
      type: file.type,
      disposition: `attachment; filename="${file.name}"`,
    });
  }
}
