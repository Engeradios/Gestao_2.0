import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { PrismaService } from '../database/prisma.service';

const STORAGE_ROOT =
  process.env.ORCAMENTO_EVIDENCIA_DIR ??
  '/opt/engeradios2/storage/orcamento/evidencias';

const ALLOWED = new Map<string, string[]>([
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.png', ['image/png']],
  ['.webp', ['image/webp']],
  ['.pdf', ['application/pdf']],
]);

const EDITABLE_STATUS = new Set([
  'RASCUNHO',
  'EM_PREENCHIMENTO',
  'DEVOLVIDO_CORRECAO',
]);

@Injectable()
export class OrcamentoEvidenciaService {
  constructor(private readonly prisma: PrismaService) {}

  private coordinate(
    value: string | undefined,
    minimum: number,
    maximum: number,
    label: string,
  ): number | null {
    if (!value?.trim()) {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
      throw new BadRequestException(`${label} inválida.`);
    }

    return parsed;
  }

  private signature(file: Express.Multer.File, extension: string): boolean {
    const buffer = file.buffer;

    if (extension === '.jpg' || extension === '.jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }

    if (extension === '.png') {
      return (
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    }

    if (extension === '.webp') {
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString() === 'RIFF' &&
        buffer.subarray(8, 12).toString() === 'WEBP'
      );
    }

    if (extension === '.pdf') {
      return buffer.length >= 5 && buffer.subarray(0, 5).toString() === '%PDF-';
    }

    return false;
  }

  private validateFile(file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Arquivo obrigatório.');
    }

    if (file.size > 15 * 1024 * 1024) {
      throw new BadRequestException('O arquivo excede o limite de 15 MB.');
    }

    const extension = extname(file.originalname).toLowerCase();

    const mimeTypes = ALLOWED.get(extension);

    if (
      !mimeTypes?.includes(file.mimetype) ||
      !this.signature(file, extension)
    ) {
      throw new BadRequestException(
        'Formato, extensão ou assinatura inválida.',
      );
    }

    return extension;
  }

  private safePath(orcamentoId: string, storedName: string): string {
    const root = resolve(STORAGE_ROOT);
    const directory = resolve(root, orcamentoId);
    const destination = resolve(directory, storedName);

    if (
      !directory.startsWith(`${root}/`) ||
      !destination.startsWith(`${directory}/`)
    ) {
      throw new BadRequestException('Caminho de armazenamento inválido.');
    }

    return destination;
  }

  private async budget(id: string, edit = false) {
    const budget = await this.prisma.orcOrcamento.findUnique({
      where: { id },
      select: {
        id: true,
        numero: true,
        status: true,
      },
    });

    if (!budget) {
      throw new NotFoundException('Orçamento não encontrado.');
    }

    if (edit && !EDITABLE_STATUS.has(String(budget.status))) {
      throw new ConflictException(
        'Evidências não podem ser alteradas no status atual.',
      );
    }

    return budget;
  }

  list(id: string) {
    return this.budget(id).then(() =>
      this.prisma.orcOrcamentoEvidencia.findMany({
        where: {
          orcamentoId: id,
        },
        orderBy: {
          criadoEm: 'desc',
        },
      }),
    );
  }

  async upload(
    id: string,
    body: Record<string, string | undefined>,
    file: Express.Multer.File | undefined,
    usuarioId: string,
  ) {
    const budget = await this.budget(id, true);
    const extension = this.validateFile(file);
    const arquivo = file!;

    const tipo = (body.tipo ?? 'ANEXO').trim().toUpperCase();

    if (!/^[A-Z0-9_]{2,40}$/.test(tipo)) {
      throw new BadRequestException('Tipo de evidência inválido.');
    }

    const latitude = this.coordinate(body.latitude, -90, 90, 'Latitude');

    const longitude = this.coordinate(body.longitude, -180, 180, 'Longitude');

    const directory = resolve(STORAGE_ROOT, id);
    await mkdir(directory, {
      recursive: true,
      mode: 0o750,
    });

    const storedName = `${randomUUID()}${extension}`;
    const destination = this.safePath(id, storedName);
    const temporary = `${destination}.tmp`;

    await writeFile(temporary, arquivo.buffer, {
      mode: 0o640,
      flag: 'wx',
    });

    await rename(temporary, destination);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const evidence = await tx.orcOrcamentoEvidencia.create({
          data: {
            orcamentoId: id,
            tipo,
            caminho: destination,
            nomeOriginal: basename(arquivo.originalname).slice(0, 255),
            mime: arquivo.mimetype,
            latitude,
            longitude,
          },
        });

        await tx.orcOrcamentoHistorico.create({
          data: {
            orcamentoId: id,
            usuarioId,
            acao: 'EVIDENCIA_ADICIONADA',
            statusAnterior: budget.status,
            statusNovo: budget.status,
            observacao: 'Evidência adicionada ao orçamento.',
            dados: {
              evidenciaId: evidence.id,
              tipo,
              nomeOriginal: evidence.nomeOriginal,
              mime: evidence.mime,
              latitude: evidence.latitude?.toString() ?? null,
              longitude: evidence.longitude?.toString() ?? null,
            },
          },
        });

        return evidence;
      });
    } catch (error) {
      await unlink(destination).catch(() => undefined);
      throw error;
    }
  }

  async download(id: string, evidenceId: string) {
    await this.budget(id);

    const evidence = await this.prisma.orcOrcamentoEvidencia.findFirst({
      where: {
        id: evidenceId,
        orcamentoId: id,
      },
    });

    if (!evidence) {
      throw new NotFoundException('Evidência não encontrada.');
    }

    const storedName = basename(evidence.caminho);
    const fullPath = this.safePath(id, storedName);

    if (fullPath !== resolve(evidence.caminho)) {
      throw new BadRequestException('Caminho da evidência inválido.');
    }

    const fileStat = await stat(fullPath).catch(() => null);

    if (!fileStat?.isFile()) {
      throw new NotFoundException('Arquivo da evidência não encontrado.');
    }

    return {
      stream: createReadStream(fullPath),
      mime: evidence.mime ?? 'application/octet-stream',
      name: evidence.nomeOriginal ?? storedName,
      size: fileStat.size,
    };
  }

  async remove(id: string, evidenceId: string, usuarioId: string) {
    const budget = await this.budget(id, true);

    const evidence = await this.prisma.orcOrcamentoEvidencia.findFirst({
      where: {
        id: evidenceId,
        orcamentoId: id,
      },
    });

    if (!evidence) {
      throw new NotFoundException('Evidência não encontrada.');
    }

    const storedName = basename(evidence.caminho);
    const fullPath = this.safePath(id, storedName);

    if (fullPath !== resolve(evidence.caminho)) {
      throw new BadRequestException('Caminho da evidência inválido.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orcOrcamentoEvidencia.delete({
        where: {
          id: evidence.id,
        },
      });

      await tx.orcOrcamentoHistorico.create({
        data: {
          orcamentoId: id,
          usuarioId,
          acao: 'EVIDENCIA_REMOVIDA',
          statusAnterior: budget.status,
          statusNovo: budget.status,
          observacao: 'Evidência removida do orçamento.',
          dados: {
            evidenciaId: evidence.id,
            tipo: evidence.tipo,
            nomeOriginal: evidence.nomeOriginal,
            mime: evidence.mime,
          },
        },
      });
    });

    await unlink(fullPath).catch(() => undefined);

    return {
      ok: true,
      id: evidence.id,
    };
  }
}
