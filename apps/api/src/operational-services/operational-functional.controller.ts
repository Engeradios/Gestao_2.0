import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { OperationalFunctionalService } from './operational-functional.service';
type AuthRequest = Request & { user?: Record<string, unknown> };
const actorValue = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const actor = (req: AuthRequest) =>
  actorValue(req.user?.email) ??
  actorValue(req.user?.nome) ??
  actorValue(req.user?.sub) ??
  'sistema';
@Controller('operacional')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OperationalFunctionalController {
  constructor(private readonly service: OperationalFunctionalService) {}
  @RequirePermissions('OPERACIONAL.OS.VISUALIZAR')
  @Get('propostas/:numero')
  proposta(@Param('numero') numero: string) {
    return this.service.proposta(numero);
  }
  @RequirePermissions('OPERACIONAL.OS.GERENCIAR')
  @Post('servicos/:id/pdf')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  pdf(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Selecione um PDF');
    return this.service.salvarPdf(id, file);
  }
  @RequirePermissions('OPERACIONAL.OS.VISUALIZAR')
  @Get('servicos/:id/pdf')
  async baixar(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const x = await this.service.obterPdf(id);
    res.download(x.path, x.name);
  }
  @RequirePermissions('OPERACIONAL.OS.GERENCIAR')
  @Delete('servicos/:id/pdf')
  excluirPdf(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.excluirPdf(id);
  }
  @RequirePermissions('OPERACIONAL.OS.GERENCIAR')
  @Post('servicos/:id/emails/:tipo')
  email(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tipo') tipo: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.enviarEmail(id, tipo, actor(req), true);
  }
  @RequirePermissions('OPERACIONAL.OS.GERENCIAR')
  @Patch('listas/:id')
  lista(@Param('id') id: string, @Body() b: Record<string, unknown>) {
    return this.service.atualizarLista(BigInt(id), b);
  }
  @RequirePermissions('OPERACIONAL.OS.GERENCIAR')
  @Patch('notificacoes/:id')
  notificacao(@Param('id') id: string, @Body() b: Record<string, unknown>) {
    return this.service.atualizarNotificacao(BigInt(id), b);
  }
  @RequirePermissions('OPERACIONAL.OS.GERENCIAR')
  @Delete('notificacoes/:id')
  excluirNotificacao(@Param('id') id: string) {
    return this.service.excluirNotificacao(BigInt(id));
  }
}
