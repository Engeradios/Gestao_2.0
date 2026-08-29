import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, type JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PurchasesImportService } from './purchases-import.service';

type AuthRequest = Request & { user: JwtPayload };
const upload = {
  storage: memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
};

@Controller('compras/importacao')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesImportController {
  constructor(private readonly service: PurchasesImportService) {}

  @Post('previa')
  @RequirePermissions('COMPRAS.IMPORTACAO.VISUALIZAR')
  @UseInterceptors(FileInterceptor('arquivo', upload))
  preview(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Planilha obrigatória.');
    return this.service.preview(file);
  }

  @Post('executar')
  @RequirePermissions('COMPRAS.IMPORTACAO.EXECUTAR')
  @UseInterceptors(FileInterceptor('arquivo', upload))
  execute(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: AuthRequest,
  ) {
    if (!file) throw new BadRequestException('Planilha obrigatória.');
    return this.service.execute(file, {
      id: request.user.sub,
      name: request.user.nome || request.user.email || request.user.sub,
    });
  }
}
