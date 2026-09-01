import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, type JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  AceitarOrcamentoDto,
  AtualizarOrcamentoDto,
  ConsultarOrcamentosDto,
  CriarOrcamentoDto,
  DevolverOrcamentoDto,
  RecusarOrcamentoDto,
  SalvarItensOrcamentoDto,
  SalvarRespostasOrcamentoDto,
} from './dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OrcamentoEvidenciaService } from './orcamento-evidencia.service';
import { OrcamentoService } from './orcamento.service';

type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

const protectedRoute = [JwtAuthGuard, PermissionsGuard];

@Controller('orcamentos')
export class OrcamentoController {
  constructor(
    private readonly service: OrcamentoService,
    private readonly evidencias: OrcamentoEvidenciaService,
  ) {}

  @Get('health')
  health() {
    return this.service.health();
  }

  @Post()
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.CRIAR')
  criar(@Body() dto: CriarOrcamentoDto, @Req() request: AuthenticatedRequest) {
    return this.service.criar(dto, request.user.sub);
  }

  @Get()
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.VISUALIZAR')
  listar(@Query() query: ConsultarOrcamentosDto) {
    return this.service.listar(query);
  }

  @Get(':id')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.VISUALIZAR')
  buscarPorId(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.service.buscarPorId(id);
  }

  @Patch(':id')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.EDITAR')
  atualizar(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() dto: AtualizarOrcamentoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.atualizar(id, dto, request.user.sub);
  }

  @Put(':id/respostas')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.EDITAR')
  salvarRespostas(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() dto: SalvarRespostasOrcamentoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.salvarRespostas(id, dto, request.user.sub);
  }

  @Post(':id/gerar-itens')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.EDITAR')
  gerarItensAutomaticos(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.gerarItensAutomaticos(id, request.user.sub);
  }

  @Put(':id/itens')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.EDITAR')
  salvarItens(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() dto: SalvarItensOrcamentoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.salvarItens(id, dto, request.user.sub);
  }

  @Post(':id/evidencias')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.EDITAR')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 15 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  enviarEvidencia(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body()
    body: Record<string, string | undefined>,
    @UploadedFile()
    arquivo: Express.Multer.File | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.evidencias.upload(id, body, arquivo, request.user.sub);
  }

  @Get(':id/evidencias')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.VISUALIZAR')
  listarEvidencias(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.evidencias.list(id);
  }

  @Get(':id/evidencias/:evidenciaId/download')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.VISUALIZAR')
  async baixarEvidencia(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Param('evidenciaId', new ParseUUIDPipe({ version: '4' }))
    evidenciaId: string,
  ) {
    const arquivo = await this.evidencias.download(id, evidenciaId);

    const nome = arquivo.name.replace(/["\r\n]/g, '');

    return new StreamableFile(arquivo.stream, {
      type: arquivo.mime,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`,
      length: arquivo.size,
    });
  }

  @Delete(':id/evidencias/:evidenciaId')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.EDITAR')
  excluirEvidencia(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Param('evidenciaId', new ParseUUIDPipe({ version: '4' }))
    evidenciaId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.evidencias.remove(id, evidenciaId, request.user.sub);
  }

  @Post(':id/enviar-analise')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.EDITAR')
  enviarAnalise(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.enviarAnalise(id, request.user.sub);
  }

  @Post(':id/iniciar-analise')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.ANALISAR')
  iniciarAnalise(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.iniciarAnalise(id, request.user.sub);
  }

  @Post(':id/aceitar')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.ANALISAR')
  aceitar(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() dto: AceitarOrcamentoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.aceitar(id, request.user.sub, dto.observacao);
  }

  @Post(':id/devolver')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.ANALISAR')
  devolver(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() dto: DevolverOrcamentoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.devolver(id, request.user.sub, dto.observacao);
  }

  @Post(':id/recusar')
  @UseGuards(...protectedRoute)
  @RequirePermissions('ORCAMENTO.ORCAMENTOS.ANALISAR')
  recusar(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() dto: RecusarOrcamentoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.recusar(id, request.user.sub, dto.motivo);
  }
}
