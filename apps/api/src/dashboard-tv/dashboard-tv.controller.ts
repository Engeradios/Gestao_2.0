import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { DashboardTvService } from './dashboard-tv.service';
import type {
  CenaInput,
  DashboardTvInput,
  WidgetInput,
  DashboardTvHeartbeatInput,
} from './dashboard-tv.types';
type AuthRequest = Request & {
  user?: { nome?: string; email?: string; sub?: string };
};
@Controller('dashboard-tv')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardTvController {
  constructor(private readonly service: DashboardTvService) {}
  @Get('catalogo')
  @RequirePermissions('DASHBOARD_TV.PAINEL.VISUALIZAR')
  catalogo() {
    return this.service.catalogo();
  }
  @Get() @RequirePermissions('DASHBOARD_TV.PAINEL.VISUALIZAR') listar() {
    return this.service.listar();
  }
  @Post() @RequirePermissions('DASHBOARD_TV.PAINEL.GERENCIAR') criar(
    @Body() body: DashboardTvInput,
    @Req() req: AuthRequest,
  ) {
    return this.service.criar(
      body,
      req.user?.nome || req.user?.email || req.user?.sub || 'sistema',
    );
  }
  @Get(':id') @RequirePermissions('DASHBOARD_TV.PAINEL.VISUALIZAR') obter(
    @Param('id') id: string,
  ) {
    return this.service.obter(id);
  }
  @Patch(':id') @RequirePermissions('DASHBOARD_TV.PAINEL.GERENCIAR') atualizar(
    @Param('id') id: string,
    @Body() body: Partial<DashboardTvInput>,
  ) {
    return this.service.atualizar(id, body);
  }
  @Post(':id/publicar')
  @RequirePermissions('DASHBOARD_TV.PAINEL.PUBLICAR')
  publicar(@Param('id') id: string, @Body() body: { publicado?: boolean }) {
    return this.service.publicar(id, body.publicado ?? true);
  }
  // DASHBOARD_TV_FASE6B_HEARTBEAT
  @Post(':id/heartbeat')
  @RequirePermissions('DASHBOARD_TV.PAINEL.VISUALIZAR')
  heartbeat(@Param('id') id: string, @Body() body: DashboardTvHeartbeatInput) {
    return this.service.heartbeat(id, body);
  }

  @Get(':id/dispositivos')
  @RequirePermissions('DASHBOARD_TV.PAINEL.VISUALIZAR')
  dispositivos(@Param('id') id: string) {
    return this.service.dispositivos(id);
  }

  // DASHBOARD_TV_FASE6D_DEVICE_ADMIN
  @Patch('dispositivos/:id')
  @RequirePermissions('DASHBOARD_TV.PAINEL.GERENCIAR')
  atualizarDispositivo(
    @Param('id') id: string,
    @Body() body: { apelido?: unknown },
  ) {
    return this.service.atualizarDispositivo(id, body);
  }

  @Get(':id/dados') @RequirePermissions('DASHBOARD_TV.PAINEL.VISUALIZAR') dados(
    @Param('id') id: string,
  ) {
    return this.service.dados(id);
  }
  @Post(':id/cenas')
  @RequirePermissions('DASHBOARD_TV.PAINEL.GERENCIAR')
  criarCena(@Param('id') id: string, @Body() body: CenaInput) {
    return this.service.criarCena(id, body);
  }
  @Patch('cenas/:id')
  @RequirePermissions('DASHBOARD_TV.PAINEL.GERENCIAR')
  atualizarCena(@Param('id') id: string, @Body() body: Partial<CenaInput>) {
    return this.service.atualizarCena(id, body);
  }
  @Delete('cenas/:id')
  @RequirePermissions('DASHBOARD_TV.PAINEL.GERENCIAR')
  removerCena(@Param('id') id: string) {
    return this.service.removerCena(id);
  }
  @Post('cenas/:id/widgets')
  @RequirePermissions('DASHBOARD_TV.PAINEL.GERENCIAR')
  criarWidget(@Param('id') id: string, @Body() body: WidgetInput) {
    return this.service.criarWidget(id, body);
  }
  @Patch('widgets/:id')
  @RequirePermissions('DASHBOARD_TV.PAINEL.GERENCIAR')
  atualizarWidget(@Param('id') id: string, @Body() body: Partial<WidgetInput>) {
    return this.service.atualizarWidget(id, body);
  }
  @Delete('widgets/:id')
  @RequirePermissions('DASHBOARD_TV.PAINEL.GERENCIAR')
  removerWidget(@Param('id') id: string) {
    return this.service.removerWidget(id);
  }
}
