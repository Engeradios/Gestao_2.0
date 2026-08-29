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
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreateRequestDto,
  ManageRequestDto,
  RequestQueryDto,
} from './dto/request.dto';
import { RequestsService } from './requests.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('solicitacoes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  private actor(request: AuthRequest) {
    return {
      id: request.user.sub,
      nome: request.user.nome,
      email: request.user.email,
    };
  }

  private canManage(request: AuthRequest) {
    return request.user.permissoes.includes('SOLICITACOES.CENTRAL.GERENCIAR');
  }

  @Post()
  @RequirePermissions('SOLICITACOES.CENTRAL.CRIAR')
  create(@Body() body: CreateRequestDto, @Req() request: AuthRequest) {
    return this.requestsService.create(body, this.actor(request));
  }

  @Get()
  @RequirePermissions('SOLICITACOES.CENTRAL.VISUALIZAR')
  list(@Query() query: RequestQueryDto, @Req() request: AuthRequest) {
    return this.requestsService.list(
      query,
      request.user.sub,
      this.canManage(request),
    );
  }

  @Get(':id')
  @RequirePermissions('SOLICITACOES.CENTRAL.VISUALIZAR')
  findOne(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.requestsService.findOne(
      id,
      request.user.sub,
      this.canManage(request),
    );
  }

  @Patch(':id')
  @RequirePermissions('SOLICITACOES.CENTRAL.GERENCIAR')
  manage(
    @Param('id') id: string,
    @Body() body: ManageRequestDto,
    @Req() request: AuthRequest,
  ) {
    return this.requestsService.manage(id, body, this.actor(request));
  }
}
