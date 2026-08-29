import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

const STORAGE_DIR =
  process.env.APP_CAMPO_EVIDENCIA_DIR ||
  '/opt/engeradios2/storage/app-campo/evidencias';
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

@Injectable()
export class AppFieldEvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureOrderExists(id: string) {
    const order = await this.prisma.ordemServico.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('OS não encontrada');
  }

  private coordinate(value: string | undefined) {
    if (!value) return null;
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new BadRequestException('Coordenada inválida');
    }
    return number;
  }

  private evidenceId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('Identificador de evidência inválido');
    }
  }

  async upload(
    id: string,
    body: Record<string, string | undefined>,
    file: Express.Multer.File | undefined,
    user: JwtPayload,
  ) {
    await this.ensureOrderExists(id);
    if (!file) throw new BadRequestException('arquivo obrigatório');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Formato não permitido');
    }
    if (!user.sub) throw new BadRequestException('Usuário inválido');
    const capturedAt = body.capturadoEm
      ? new Date(body.capturadoEm)
      : new Date();
    if (Number.isNaN(capturedAt.getTime())) {
      throw new BadRequestException('Data de captura inválida');
    }
    const directory = resolve(STORAGE_DIR, id);
    await mkdir(directory, { recursive: true });
    const storedName = randomUUID() + extname(file.originalname).toLowerCase();
    const finalPath = join(directory, storedName);
    const temporaryPath = `${finalPath}.tmp`;
    await writeFile(temporaryPath, file.buffer, { mode: 0o640 });
    await rename(temporaryPath, finalPath);
    try {
      return await this.prisma.appCampoEvidencia.create({
        data: {
          eventoId: randomUUID(),
          usuarioId: user.sub,
          entidadeTipo: 'ORDEM_SERVICO',
          entidadeId: id,
          tipo: (body.tipo || 'FOTO').slice(0, 40),
          nomeOriginal: file.originalname,
          nomeArmazenado: storedName,
          caminho: finalPath,
          mimeType: file.mimetype,
          tamanhoBytes: BigInt(file.size),
          hashSha256: createHash('sha256').update(file.buffer).digest('hex'),
          latitude: this.coordinate(body.latitude),
          longitude: this.coordinate(body.longitude),
          capturadoEm: capturedAt,
        },
      });
    } catch (error) {
      await rm(finalPath, { force: true });
      throw error;
    }
  }

  async list(id: string) {
    await this.ensureOrderExists(id);
    const evidence = await this.prisma.appCampoEvidencia.findMany({
      where: { entidadeTipo: 'ORDEM_SERVICO', entidadeId: id },
      orderBy: { recebidoEm: 'desc' },
    });
    return evidence.map((item) => ({
      ...item,
      id: item.id.toString(),
      tamanhoBytes: item.tamanhoBytes?.toString() ?? null,
    }));
  }

  async download(id: string, evidenceId: string) {
    await this.ensureOrderExists(id);
    const item = await this.prisma.appCampoEvidencia.findFirst({
      where: {
        id: this.evidenceId(evidenceId),
        entidadeTipo: 'ORDEM_SERVICO',
        entidadeId: id,
      },
    });
    if (!item) throw new NotFoundException('Evidência não encontrada');
    if (!item.caminho || !item.mimeType || !item.nomeOriginal) {
      throw new NotFoundException('Arquivo da evidência indisponível');
    }
    return {
      stream: createReadStream(item.caminho),
      mimeType: item.mimeType,
      name: item.nomeOriginal.replace(/[\r\n"]/g, '_'),
      size: item.tamanhoBytes ? Number(item.tamanhoBytes) : undefined,
    };
  }

  async remove(id: string, evidenceId: string, user: JwtPayload) {
    await this.ensureOrderExists(id);
    const item = await this.prisma.appCampoEvidencia.findFirst({
      where: {
        id: this.evidenceId(evidenceId),
        entidadeTipo: 'ORDEM_SERVICO',
        entidadeId: id,
      },
    });
    if (!item) throw new NotFoundException('Evidência não encontrada');
    await this.prisma.appCampoEvidencia.delete({ where: { id: item.id } });
    if (item.caminho) await rm(item.caminho, { force: true });
    return { ok: true, id: evidenceId, usuarioId: user.sub };
  }
}
