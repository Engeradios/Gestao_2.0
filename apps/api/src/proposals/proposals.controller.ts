import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ProposalsService } from './proposals.service';

type AuthRequest = Request & {
  user?: { nome?: string; email?: string; sub?: string };
};

@Controller('propostas')
export class ProposalsController {
  constructor(private readonly service: ProposalsService) {}

  @Get('dashboard')
  dashboard(@Query() query: Record<string, string | undefined>) {
    return this.service.dashboard(query);
  }

  @Get('painel')
  painel(@Query('dias') dias?: string) {
    return this.service.painel(dias ? Number(dias) : undefined);
  }

  @Get('filtros')
  filtros() {
    return this.service.filtros();
  }

  @Get()
  listar(@Query() query: Record<string, string | undefined>) {
    return this.service.listar(query);
  }

  @Get('configuracoes')
  configuracoes() {
    return this.service.configuracoes();
  }

  @Patch('configuracoes/:chave')
  atualizarConfiguracao(
    @Param('chave') chave: string,
    @Body() body: { valor?: string | number },
  ) {
    return this.service.atualizarConfiguracao(chave, body?.valor);
  }

  @Get('importacoes')
  importacoes(@Query('limite') limite?: string) {
    return this.service.importacoes(limite ? Number(limite) : 50);
  }

  @Post('processar-inativas')
  processarInativas(@Body() body: { dias?: number }, @Req() req: AuthRequest) {
    return this.service.cancelarInativas(
      body?.dias,
      req.user?.nome || req.user?.email || req.user?.sub || 'sistema',
      'auto-cancelamento',
    );
  }

  @Get(':numero')
  detalhe(@Param('numero') numero: string) {
    return this.service.detalhe(numero);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      status?: string;
      faseNegociacao?: string | null;
      titulo?: string | null;
    },
    @Req() req: AuthRequest,
  ) {
    return this.service.atualizar(
      id,
      body,
      req.user?.nome || req.user?.email || req.user?.sub || 'sistema',
    );
  }
}
