import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { FinancialReceivedInvoicesService } from './financial-received-invoices.service';
import {
  CheckReceivedInvoiceDto,
  MoveReceivedInvoiceStockDto,
  ReceivedInvoiceListQueryDto,
  RegisterManifestationDto,
  UpdateNsuControlDto,
} from './dto/received-invoice.dto';

type RequestComUsuario = Request & {
  user?: {
    id?: string;
    nome?: string;
    name?: string;
    email?: string;
  };
};

@Controller('financial/received-invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialReceivedInvoicesController {
  constructor(
    private readonly service: FinancialReceivedInvoicesService,
  ) {}

  private usuario(req: RequestComUsuario) {
    return {
      id: req.user?.id,
      nome:
        req.user?.nome ??
        req.user?.name ??
        req.user?.email ??
        'sistema',
    };
  }

  @Get()
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.VISUALIZAR')
  listar(@Query() query: ReceivedInvoiceListQueryDto) {
    return this.service.listar(query);
  }

  @Get('nsu/controls')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.VISUALIZAR')
  listarControlesNsu() {
    return this.service.listarControlesNsu();
  }

  @Patch('nsu/control')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR')
  atualizarControleNsu(@Body() dto: UpdateNsuControlDto) {
    return this.service.atualizarControleNsu(dto);
  }

  @Get(':id')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.VISUALIZAR')
  detalhar(@Param('id') id: string) {
    return this.service.detalhar(id);
  }

  @Post(':id/check')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR')
  conferir(
    @Param('id') id: string,
    @Body() dto: CheckReceivedInvoiceDto,
    @Req() req: RequestComUsuario,
  ) {
    return this.service.conferir(id, dto, this.usuario(req));
  }

  @Post(':id/manifestation')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR')
  manifestar(
    @Param('id') id: string,
    @Body() dto: RegisterManifestationDto,
    @Req() req: RequestComUsuario,
  ) {
    return this.service.manifestar(
      id,
      dto,
      this.usuario(req),
    );
  }

  @Post(':id/stock-entry')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR')
  movimentarEstoque(
    @Param('id') id: string,
    @Body() dto: MoveReceivedInvoiceStockDto,
    @Req() req: RequestComUsuario,
  ) {
    return this.service.movimentarEstoque(
      id,
      dto,
      this.usuario(req),
    );
  }

  @Post(':id/send-to-payables')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR')
  enviarContasPagar(
    @Param('id') id: string,
    @Req() req: RequestComUsuario,
  ) {
    return this.service.enviarContasPagar(
      id,
      this.usuario(req),
    );
  }
}
