import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { OperationalServiceImportService } from './operational-service-import.service';

type AuthRequest = Request & {
  user?: Record<string, unknown>;
};

@Controller('operacional/servicos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OperationalServiceImportController {
  constructor(private readonly service: OperationalServiceImportService) {}

  @Post('importacao')
  @RequirePermissions('OPERACIONAL.OS.GERENCIAR')
  @UseInterceptors(
    FileInterceptor('pdf', {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  create(
    @UploadedFile() pdf: Express.Multer.File,
    @Body() body: Record<string, string>,
    @Req() request: AuthRequest,
  ) {
    let responsaveis: string[];

    try {
      responsaveis = JSON.parse(body.responsaveis || '[]') as string[];
    } catch {
      throw new BadRequestException('Lista de responsáveis inválida.');
    }

    const actorId = request.user?.sub;
    const actorName = request.user?.email ?? request.user?.nome ?? actorId;

    if (typeof actorId !== 'string' || typeof actorName !== 'string') {
      throw new BadRequestException('Usuário autenticado inválido.');
    }

    return this.service.create(
      {
        proposta: body.proposta || '',
        servicoAtividade: body.servicoAtividade || '',
        responsaveis,
        prioridade: body.prioridade,
        observacoes: body.observacoes,
        actorId,
        actorName,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      pdf,
    );
  }
}
