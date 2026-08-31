import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { ConsultarNfeChaveDto } from './nfe-consulta.dto';
import { NfeConsultaService } from './nfe-consulta.service';
import { NfeImportacaoService } from './nfe-importacao.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('financeiro/notas-recebidas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NfeConsultaController {
  constructor(
    private readonly service: NfeConsultaService,
    private readonly importacao: NfeImportacaoService,
  ) {}

  @Post('consulta-chave/:filialId')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.VISUALIZAR')
  consultar(
    @Param('filialId', ParseIntPipe) filialId: number,
    @Body() body: ConsultarNfeChaveDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.consultarPorChave(
      BigInt(filialId),
      body.chave,
      request.user.sub,
    );
  }

  @Post('importar-chave/:filialId')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR')
  importar(
    @Param('filialId', ParseIntPipe) filialId: number,
    @Body() body: ConsultarNfeChaveDto,
    @Req() request: AuthRequest,
  ) {
    return this.importacao.importar(
      BigInt(filialId),
      body.chave,
      request.user.sub,
    );
  }
}
