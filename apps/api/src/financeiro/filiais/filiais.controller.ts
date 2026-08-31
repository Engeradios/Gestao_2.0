import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { FilialDto } from './filiais.dto';
import { FiliaisService } from './filiais.service';
import { FiliaisBrasilApiService } from './filiais-brasil-api.service';
type AR = Request & { user: JwtPayload };
@Controller('financeiro/filiais')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FiliaisController {
  constructor(
    private readonly s: FiliaisService,
    private readonly brasilApi: FiliaisBrasilApiService,
  ) {}
  @Get() @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR') list() {
    return this.s.list();
  }
  @Get('consulta/cnpj/:cnpj')
  @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR')
  cnpj(@Param('cnpj') cnpj: string) {
    return this.brasilApi.cnpj(cnpj);
  }
  @Get('consulta/cep/:cep')
  @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR')
  cep(@Param('cep') cep: string) {
    return this.brasilApi.cep(cep);
  }
  @Get(':id/historico')
  @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR')
  hist(@Param('id') id: string) {
    return this.s.history(BigInt(id));
  }
  @Post() @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR') create(
    @Body() d: FilialDto,
    @Req() r: AR,
  ) {
    return this.s.create(d, r.user.sub);
  }
  @Patch(':id')
  @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR')
  update(@Param('id') id: string, @Body() d: FilialDto, @Req() r: AR) {
    return this.s.update(BigInt(id), d, r.user.sub);
  }
}
