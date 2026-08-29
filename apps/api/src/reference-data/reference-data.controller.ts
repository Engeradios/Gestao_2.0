import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreatePersonDto,
  CreateVehicleDto,
  ReferenceQueryDto,
  UpdatePersonDto,
  UpdateStatusDto,
  UpdateVehicleDto,
  VehicleQueryDto,
} from './dto/reference-data.dto';
import { ReferenceDataService } from './reference-data.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('ferramentas/cadastros')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReferenceDataController {
  constructor(private readonly service: ReferenceDataService) {}

  private context(request: AuthRequest) {
    return {
      actorId: request.user.sub,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }

  @Get('pessoas')
  @RequirePermissions('FERRAMENTAS.CADASTROS.VISUALIZAR')
  listPeople(@Query() query: ReferenceQueryDto) {
    return this.service.listPeople(query);
  }

  @Get('pessoas/:id')
  @RequirePermissions('FERRAMENTAS.CADASTROS.VISUALIZAR')
  getPerson(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPerson(id);
  }

  @Post('pessoas')
  @RequirePermissions('FERRAMENTAS.PESSOAS.GERENCIAR')
  createPerson(@Body() dto: CreatePersonDto, @Req() request: AuthRequest) {
    return this.service.createPerson(dto, this.context(request));
  }

  @Patch('pessoas/:id')
  @RequirePermissions('FERRAMENTAS.PESSOAS.GERENCIAR')
  updatePerson(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.updatePerson(id, dto, this.context(request));
  }

  @Patch('pessoas/:id/status')
  @RequirePermissions('FERRAMENTAS.PESSOAS.GERENCIAR')
  updatePersonStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.updatePerson(
      id,
      { ativo: dto.ativo },
      this.context(request),
    );
  }

  @Get('pessoas/:id/auditoria')
  @RequirePermissions('FERRAMENTAS.CADASTROS.AUDITORIA')
  personHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.history('PESSOA', id);
  }

  @Get('tecnicos')
  @RequirePermissions('FERRAMENTAS.CADASTROS.VISUALIZAR')
  technicians(@Query() query: ReferenceQueryDto) {
    query.funcao = 'TECNICO';
    return this.service.listPeople(query);
  }

  @Get('motoristas')
  @RequirePermissions('FERRAMENTAS.CADASTROS.VISUALIZAR')
  drivers(@Query() query: ReferenceQueryDto) {
    query.funcao = 'MOTORISTA';
    return this.service.listPeople(query);
  }

  @Get('veiculos')
  @RequirePermissions('FERRAMENTAS.CADASTROS.VISUALIZAR')
  listVehicles(@Query() query: VehicleQueryDto) {
    return this.service.listVehicles(query);
  }

  @Get('veiculos/:id')
  @RequirePermissions('FERRAMENTAS.CADASTROS.VISUALIZAR')
  getVehicle(@Param('id', ParseIntPipe) id: number) {
    return this.service.getVehicle(BigInt(id));
  }

  @Post('veiculos')
  @RequirePermissions('FERRAMENTAS.VEICULOS.GERENCIAR')
  createVehicle(@Body() dto: CreateVehicleDto, @Req() request: AuthRequest) {
    return this.service.createVehicle(dto, this.context(request));
  }

  @Patch('veiculos/:id')
  @RequirePermissions('FERRAMENTAS.VEICULOS.GERENCIAR')
  updateVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.updateVehicle(BigInt(id), dto, this.context(request));
  }

  @Patch('veiculos/:id/status')
  @RequirePermissions('FERRAMENTAS.VEICULOS.GERENCIAR')
  updateVehicleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.updateVehicle(
      BigInt(id),
      { ativo: dto.ativo },
      this.context(request),
    );
  }

  @Get('veiculos/:id/auditoria')
  @RequirePermissions('FERRAMENTAS.CADASTROS.AUDITORIA')
  vehicleHistory(@Param('id', ParseIntPipe) id: number) {
    return this.service.history('VEICULO', String(id));
  }
}
