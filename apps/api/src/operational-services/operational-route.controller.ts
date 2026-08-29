import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CompleteRouteDto,
  MoveRouteVisitDto,
  CreateRouteVisitDto,
  RouteAgendaQueryDto,
  RouteDispatchQueryDto,
  RouteTechniciansQueryDto,
  UpdateRouteStatusDto,
} from './dto/route.dto';
import { OperationalRoutePdfService } from './operational-route-pdf.service';
import { OperationalRouteService } from './operational-route.service';

type AuthRequest = Request & { user?: Record<string, unknown> };

@Controller('operacional/roteiro')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OperationalRouteController {
  constructor(
    private readonly service: OperationalRouteService,
    private readonly pdf: OperationalRoutePdfService,
  ) {}

  @Get('despacho')
  @RequirePermissions('OPERACIONAL.ROTEIRO.VISUALIZAR')
  dispatch(@Query() query: RouteDispatchQueryDto) {
    return this.service.dispatch({
      data: query.data,
      unidade: query.unidade,
      statusOperacional: query.statusOperacional,
    });
  }

  @Get('pdf')
  @RequirePermissions('OPERACIONAL.ROTEIRO.VISUALIZAR')
  async downloadPdf(
    @Query('data') data: string,
    @Query('unidade') unidade: string,
    @Res() response: Response,
  ) {
    const file = await this.pdf.generate(data, unidade);
    const unit = unidade?.toUpperCase() === 'SP' ? 'SP' : 'RJ';
    const safeDate = String(data || '').replace(/[^0-9-]/g, '');

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="roteiro-tecnico-${safeDate}-${unit}.pdf"`,
    );
    response.setHeader('Content-Length', String(file.length));

    response.send(file);
  }

  @Get('agenda')
  @RequirePermissions('OPERACIONAL.ROTEIRO.VISUALIZAR')
  agenda(@Query() query: RouteAgendaQueryDto) {
    return this.service.agenda({
      dataInicio: query.dataInicio,
      dataFim: query.dataFim,
      unidade: query.unidade,
      tecnico: query.tecnico,
    });
  }

  @Get('tecnicos')
  @RequirePermissions('OPERACIONAL.ROTEIRO.VISUALIZAR')
  technicians(@Query() query: RouteTechniciansQueryDto) {
    return this.service.technicians(query.unidade ?? 'RJ');
  }

  @Post('visitas')
  @RequirePermissions('OPERACIONAL.ROTEIRO.GERENCIAR')
  assign(@Body() body: CreateRouteVisitDto, @Req() req: AuthRequest) {
    return this.service.assign(body, req.user);
  }

  @Delete('visitas/:id')
  @RequirePermissions('OPERACIONAL.ROTEIRO.GERENCIAR')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.remove(BigInt(id), req.user);
  }

  @Patch('visitas/:id/mover')
  @RequirePermissions('OPERACIONAL.ROTEIRO.GERENCIAR')
  move(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MoveRouteVisitDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.move(BigInt(id), body, req.user);
  }

  @Patch('visitas/:id/status')
  @RequirePermissions('OPERACIONAL.ROTEIRO.GERENCIAR')
  status(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRouteStatusDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.updateStatus(BigInt(id), body, req.user);
  }

  @Post('concluir-todos')
  @RequirePermissions('OPERACIONAL.ROTEIRO.GERENCIAR')
  completeAll(@Body() body: CompleteRouteDto, @Req() req: AuthRequest) {
    return this.service.markAllCompleted(body, req.user);
  }
}
