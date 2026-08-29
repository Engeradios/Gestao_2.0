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
import { SalesOrdersImportService } from './sales-orders-import.service';

type AuthRequest = {
  user?: {
    nome?: string;
    email?: string;
    sub?: string;
  };
};

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (
    _request: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, accept: boolean) => void,
  ) => {
    if (extname(file.originalname).toLowerCase() !== '.xlsx') {
      callback(
        new BadRequestException('Envie uma planilha no formato XLSX.'),
        false,
      );
      return;
    }

    callback(null, true);
  },
};

@Controller('estoque-logistica/importacao-pedidos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesOrdersImportController {
  constructor(private readonly importer: SalesOrdersImportService) {}

  private actor(request: AuthRequest): string {
    return (
      request.user?.nome ||
      request.user?.email ||
      request.user?.sub ||
      'sistema'
    );
  }

  @Post('previa')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR')
  @UseInterceptors(FileInterceptor('arquivo', uploadOptions))
  previa(@UploadedFile() arquivo: Express.Multer.File) {
    if (!arquivo) {
      throw new BadRequestException('Arquivo XLSX não informado.');
    }

    return this.importer.previa(arquivo);
  }

  @Post('executar')
  @RequirePermissions('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR')
  @UseInterceptors(FileInterceptor('arquivo', uploadOptions))
  executar(
    @UploadedFile() arquivo: Express.Multer.File,
    @Req() request: AuthRequest,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Arquivo XLSX não informado.');
    }

    return this.importer.importar(arquivo, this.actor(request));
  }
}
