import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'node:path';
import { ProposalsImportService } from './proposals-import.service';

@Controller('propostas')
export class ProposalsImportController {
  constructor(private readonly importer: ProposalsImportService) {}

  @Post('importar')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        if (extension !== '.xlsx') {
          return callback(
            new BadRequestException('Envie uma planilha no formato .xlsx.'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  importar(
    @UploadedFile() arquivo: Express.Multer.File,
    @Body('usuario') usuario?: string,
  ) {
    if (!arquivo?.buffer?.length) {
      throw new BadRequestException('Arquivo XLSX não informado.');
    }
    return this.importer.importar(arquivo, usuario?.trim() || 'sistema');
  }
}
