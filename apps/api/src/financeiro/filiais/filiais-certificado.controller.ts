import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { FiliaisCertificadoService } from './filiais-certificado.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('financeiro/filiais')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FiliaisCertificadoController {
  constructor(private readonly service: FiliaisCertificadoService) {}

  @Get(':id/certificado')
  @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR')
  status(@Param('id') id: string) {
    return this.service.status(BigInt(id));
  }

  @Post(':id/certificado')
  @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  install(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('senha') senha: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.install(BigInt(id), file, senha, req.user.sub);
  }

  @Delete(':id/certificado')
  @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR')
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.remove(BigInt(id), req.user.sub);
  }
  @Get(':id/sefaz/status')
  sefazStatus(@Param('id') id: string) {
    return this.service.sefazStatus(BigInt(id));
  }
}
