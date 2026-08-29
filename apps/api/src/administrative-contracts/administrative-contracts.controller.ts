import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  ContractQueryDto,
  CreateContractDto,
  CreateContractProgressDto,
  UpdateContractDto,
} from './dto/administrative-contracts.dto';
import { AdministrativeContractsService } from './administrative-contracts.service';
import { BrasilApiService } from './brasil-api.service';
import { ContractDocumentsService } from './contract-documents.service';
import {
  DeleteContractDocumentDto,
  UploadContractDocumentDto,
} from './dto/contract-document.dto';

type AuthRequest = Request & { user?: JwtPayload };
const actor = (request: AuthRequest) => ({
  id: request.user?.sub ?? '',
  ip: request.ip,
  userAgent: request.headers['user-agent'],
});

@Controller('administrativo/contratos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdministrativeContractsController {
  constructor(
    private readonly service: AdministrativeContractsService,
    private readonly brasilApi: BrasilApiService,
    private readonly documents: ContractDocumentsService,
  ) {}

  @Get('opcoes/clientes')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.VISUALIZAR')
  clientOptions(
    @Query('busca') busca?: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.service.clientOptions(
      busca ?? '',
      Number(pagina) || 1,
      Number(limite) || 20,
    );
  }

  @Get('opcoes/propostas')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.VISUALIZAR')
  proposalOptions(
    @Query('clienteId', ParseUUIDPipe) clienteId: string,
    @Query('busca') busca?: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.service.proposalOptions(
      clienteId,
      busca ?? '',
      Number(pagina) || 1,
      Number(limite) || 20,
    );
  }

  @Get()
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.VISUALIZAR')
  list(@Query() query: ContractQueryDto) {
    return this.service.list(query);
  }

  @Get('indicadores')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.VISUALIZAR')
  indicators() {
    return this.service.indicators();
  }

  @Get(':id')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.VISUALIZAR')
  one(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.one(id);
  }

  @Post()
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.GERENCIAR')
  create(@Body() body: CreateContractDto, @Req() request: AuthRequest) {
    return this.service.create(body, actor(request));
  }

  @Patch(':id')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.GERENCIAR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateContractDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.update(id, body, actor(request));
  }

  @Delete(':id')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.GERENCIAR')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthRequest) {
    return this.service.remove(id, actor(request));
  }

  @Post(':id/consultar-cnpj')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.GERENCIAR')
  consultCnpj(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.brasilApi.consult(id, actor(request));
  }

  @Post(':id/documentos')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.DOCUMENTOS')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UploadContractDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: AuthRequest,
  ) {
    return this.documents.upload(id, body, file, actor(request));
  }

  @Get(':id/documentos/:documentId/download')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.VISUALIZAR')
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.documents.download(
      id,
      documentId,
      actor(request),
    );
    response.setHeader('Content-Type', result.doc.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(result.doc.nomeOriginal)}`,
    );
    response.setHeader('Content-Length', result.doc.tamanhoBytes.toString());
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(result.stream);
  }

  @Delete(':id/documentos/:documentId')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.DOCUMENTOS')
  removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: DeleteContractDocumentDto,
    @Req() request: AuthRequest,
  ) {
    return this.documents.remove(id, documentId, body.motivo, actor(request));
  }

  @Post(':id/andamentos')
  @RequirePermissions('ADMINISTRATIVO.CONTRATOS.GERENCIAR')
  progress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateContractProgressDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.progress(id, body, actor(request));
  }
}
