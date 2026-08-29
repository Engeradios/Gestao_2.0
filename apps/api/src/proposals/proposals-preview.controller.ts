import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'node:path';
import { ProposalsPreviewService } from './proposals-preview.service';

@Controller('propostas/importar')
export class ProposalsPreviewController {
  constructor(private readonly preview: ProposalsPreviewService) {}

  @Post('previa')
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
  executar(@UploadedFile() arquivo: Express.Multer.File) {
    if (!arquivo?.buffer?.length)
      throw new BadRequestException('Arquivo XLSX não informado.');
    return this.preview.previa(arquivo);
  }
}
