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
import { memoryStorage } from 'multer';
import { extname } from 'node:path';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { OsImportService } from './os-import.service';

type AuthRequest = { user?: { nome?: string; email?: string; sub?: string } };

@Controller('operacional/os/importacao')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OsImportController {
  constructor(private readonly importer: OsImportService) {}

  private actor(req: AuthRequest) {
    return {
      id: req.user?.sub || null,
      nome: req.user?.nome || req.user?.email || req.user?.sub || 'sistema',
    };
  }

  @Post('previa')
  @RequirePermissions('OPERACIONAL.OS.VISUALIZAR')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        extname(file.originalname).toLowerCase() === '.xlsx'
          ? cb(null, true)
          : cb(new BadRequestException('Envie uma planilha .xlsx.'), false),
    }),
  )
  previa(@UploadedFile() arquivo: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Arquivo XLSX não informado.');
    return this.importer.previa(arquivo);
  }

  @Post('executar')
  @RequirePermissions('OPERACIONAL.OS.GERENCIAR')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        extname(file.originalname).toLowerCase() === '.xlsx'
          ? cb(null, true)
          : cb(new BadRequestException('Envie uma planilha .xlsx.'), false),
    }),
  )
  executar(
    @UploadedFile() arquivo: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    if (!arquivo) throw new BadRequestException('Arquivo XLSX não informado.');
    return this.importer.importar(arquivo, this.actor(req));
  }
}
