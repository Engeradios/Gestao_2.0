import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,} from '@nestjs/common';
import { DocumentosFiscaisQueryDto } from './documentos-fiscais.dto';
import { DocumentosFiscaisService } from './documentos-fiscais.service';

import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('FINANCEIRO.DOCUMENTOS_FISCAIS.VISUALIZAR')
@Controller('financeiro/documentos-fiscais')
export class DocumentosFiscaisController {
  constructor(
    private readonly service: DocumentosFiscaisService,
  ) {}

  @Get('resumo')
  resumo() {
    return this.service.resumo();
  }

  @Get()
  listar(
    @Query() query: DocumentosFiscaisQueryDto,
  ) {
    return this.service.listar(query);
  }

  @Get(':id/arquivos')
  arquivos(@Param('id') id: string) {
    return this.service.arquivos(id);
  }

  @Get(':id/eventos')
  eventos(@Param('id') id: string) {
    return this.service.eventos(id);
  }

  @Get(':id/historico')
  historico(@Param('id') id: string) {
    return this.service.historico(id);
  }

  @Get(':id/vinculos')
  vinculos(@Param('id') id: string) {
    return this.service.vinculos(id);
  }

  @Get(':id')
  detalhe(@Param('id') id: string) {
    return this.service.detalhe(id);
  }
}
