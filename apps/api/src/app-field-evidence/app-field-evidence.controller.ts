import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  StreamableFile,
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
import { AppFieldEvidenceService } from './app-field-evidence.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('app-campo/os/:id/evidencias')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppFieldEvidenceController {
  constructor(private readonly service: AppFieldEvidenceService) {}

  @Post()
  @RequirePermissions('OPERACIONAL.OS.EDITAR')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  upload(
    @Param('id') id: string,
    @Body() body: Record<string, string | undefined>,
    @UploadedFile() arquivo: Express.Multer.File | undefined,
    @Req() request: AuthRequest,
  ) {
    return this.service.upload(id, body, arquivo, request.user);
  }

  @Get()
  @RequirePermissions('OPERACIONAL.OS.VISUALIZAR')
  list(@Param('id') id: string) {
    return this.service.list(id);
  }

  @Get(':evidenciaId/download')
  @RequirePermissions('OPERACIONAL.OS.VISUALIZAR')
  async download(
    @Param('id') id: string,
    @Param('evidenciaId') evidenciaId: string,
  ) {
    const file = await this.service.download(id, evidenciaId);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      disposition: `inline; filename="${file.name}"`,
      length: file.size,
    });
  }

  @Delete(':evidenciaId')
  @RequirePermissions('OPERACIONAL.OS.EDITAR')
  remove(
    @Param('id') id: string,
    @Param('evidenciaId') evidenciaId: string,
    @Req() request: AuthRequest,
  ) {
    return this.service.remove(id, evidenciaId, request.user);
  }
}
