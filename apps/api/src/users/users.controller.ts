import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('ferramentas/usuarios')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('FERRAMENTAS.USUARIOS.VISUALIZAR')
  list(@Query('search') search?: string) {
    return this.usersService.list(search);
  }

  @Get('perfis')
  @RequirePermissions('FERRAMENTAS.PERFIS.VISUALIZAR')
  listProfiles() {
    return this.usersService.listProfiles();
  }

  @Get('pessoas-disponiveis')
  @RequirePermissions('FERRAMENTAS.USUARIOS.VISUALIZAR')
  listAvailablePeople(@Query('usuarioId') userId?: string) {
    return this.usersService.listAvailablePeople(userId);
  }

  @Get(':id')
  @RequirePermissions('FERRAMENTAS.USUARIOS.VISUALIZAR')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('FERRAMENTAS.USUARIOS.CRIAR')
  create(@Body() dto: CreateUserDto, @Req() request: AuthenticatedRequest) {
    return this.usersService.create(dto, {
      actorId: request.user.sub,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Patch(':id/status')
  @RequirePermissions('FERRAMENTAS.USUARIOS.ALTERAR_STATUS')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.updateStatus(id, dto, {
      actorId: request.user.sub,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Post(':id/redefinir-senha')
  @RequirePermissions('FERRAMENTAS.USUARIOS.REDEFINIR_SENHA')
  resetPassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.resetPassword(id, {
      actorId: request.user.sub,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Get(':id/auditoria')
  @RequirePermissions('FERRAMENTAS.AUDITORIA.VISUALIZAR')
  history(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.history(id);
  }

  @Patch(':id')
  @RequirePermissions('FERRAMENTAS.USUARIOS.EDITAR')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.update(id, dto, {
      actorId: request.user.sub,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
