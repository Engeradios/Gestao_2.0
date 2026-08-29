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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CancelDeliveryDto,
  DeliveryReturnDto,
  DeliveryRouteQueryDto,
  DeliverySourceQueryDto,
  DeliveryStatusDto,
  ReDeliveryDto,
  ReorderDeliveryDto,
  SaveDeliveryDto,
  SaveDeliveryRouteHeaderDto,
  SaveDeliveryRouteStopsDto,
  SaveDriverDto,
  SaveVehicleDto,
} from './dto/delivery-route.dto';
import { DeliveryRouteService } from './delivery-route.service';
import { DeliveryRoutePdfService } from './delivery-route-pdf.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('estoque-logistica/roteiro-entrega')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveryRouteController {
  constructor(
    private readonly service: DeliveryRouteService,
    private readonly pdf: DeliveryRoutePdfService,
  ) {}

  private actor(request: AuthRequest) {
    return {
      id: request.user.sub,
      nome: request.user.nome,
    };
  }

  @Get()
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  dashboard(@Query() query: DeliveryRouteQueryDto) {
    return this.service.dashboard(query);
  }

  @Get('roteiros')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  routes(@Query('data') data?: string) {
    return this.service.routes(data);
  }

  @Get('roteiros/pdf')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  async allRoutesPdf(@Query('data') data: string, @Res() response: Response) {
    const file = await this.pdf.generate(data);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="roteiros-entrega-${String(data).replace(/[^0-9-]/g, '')}.pdf"`,
    );
    response.send(file);
  }

  @Get('roteiros/:id/pdf')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  async routePdf(
    @Param('id', ParseIntPipe) id: number,
    @Query('data') data: string,
    @Res() response: Response,
  ) {
    const file = await this.pdf.generate(data, BigInt(id));
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="roteiro-entrega-${id}.pdf"`,
    );
    response.send(file);
  }

  @Get('roteiros/:id')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  route(@Param('id', ParseIntPipe) id: number) {
    return this.service.route(BigInt(id));
  }

  @Post('roteiros')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  createRoute(
    @Body() body: SaveDeliveryRouteHeaderDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.saveRoute(null, body, this.actor(request));
  }

  @Patch('roteiros/:id')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  updateRoute(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveDeliveryRouteHeaderDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.saveRoute(BigInt(id), body, this.actor(request));
  }

  @Patch('roteiros/:id/paradas')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  saveRouteStops(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveDeliveryRouteStopsDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.saveRouteStops(BigInt(id), body, this.actor(request));
  }

  @Post('roteiros/:id/despachar')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  dispatchRoute(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.service.dispatchRoute(BigInt(id), this.actor(request));
  }

  @Get('sugestoes')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  suggestions(@Query('tipo') type: string, @Query('q') query: string) {
    return this.service.suggestions(type, query);
  }

  @Get('origem')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  source(@Query() query: DeliverySourceQueryDto) {
    return this.service.source(query);
  }

  @Get('entregadores')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  drivers(@Query('inativos') inactive?: string) {
    return this.service.drivers(inactive === 'true');
  }

  @Get('veiculos')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  vehicles(@Query('inativos') inactive?: string) {
    return this.service.vehicles(inactive === 'true');
  }

  @Get('entregas/:id/historico')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  history(@Param('id', ParseIntPipe) id: number) {
    return this.service.history(BigInt(id));
  }

  @Post('entregas')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  createDelivery(@Body() body: SaveDeliveryDto, @Req() request: AuthRequest) {
    return this.service.saveDelivery(null, body, this.actor(request));
  }

  @Patch('entregas/:id')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  updateDelivery(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveDeliveryDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.saveDelivery(BigInt(id), body, this.actor(request));
  }

  @Patch('entregas/:id/status')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DeliveryStatusDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.updateStatus(BigInt(id), body, this.actor(request));
  }

  @Post('entregas/:id/retorno')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  confirmReturn(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DeliveryReturnDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.confirmReturn(BigInt(id), body, this.actor(request));
  }

  @Post('entregas/:id/devolver')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  returnToBase(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CancelDeliveryDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.returnToBase(BigInt(id), body, this.actor(request));
  }

  @Post('entregas/:id/cancelar')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  cancelDelivery(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CancelDeliveryDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.cancelDelivery(BigInt(id), body, this.actor(request));
  }

  @Patch('entregas/:id/ordem')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  reorder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReorderDeliveryDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.reorder(BigInt(id), body, this.actor(request));
  }

  @Post('entregas/:id/reentrega')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  redelivery(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReDeliveryDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.redelivery(BigInt(id), body, this.actor(request));
  }

  @Post('entregadores')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  createDriver(@Body() body: SaveDriverDto, @Req() request: AuthRequest) {
    return this.service.saveDriver(null, body, this.actor(request));
  }

  @Patch('entregadores/:id')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  updateDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveDriverDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.saveDriver(BigInt(id), body, this.actor(request));
  }

  @Post('veiculos')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  createVehicle(@Body() body: SaveVehicleDto, @Req() request: AuthRequest) {
    return this.service.saveVehicle(null, body, this.actor(request));
  }

  @Patch('veiculos/:id')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  updateVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveVehicleDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.saveVehicle(BigInt(id), body, this.actor(request));
  }
}
