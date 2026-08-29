import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { PrismaService } from '../database/prisma.service';
import { UploadContractDocumentDto } from './dto/contract-document.dto';

type Actor = { id: string; ip?: string; userAgent?: string };
const TYPES: Record<string, string> = {
  MINUTA: 'minutas',
  ASSINADO: 'assinados',
  ADITIVO: 'aditivos',
  ANEXO: 'anexos',
  CERTIFICADO: 'certificados',
};
const ALLOWED: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
};

@Injectable()
export class ContractDocumentsService {
  constructor(private readonly prisma: PrismaService) {}
  private root() {
    return resolve(
      process.env.CONTRACT_STORAGE_ROOT || '/var/lib/engeradios2/contratos',
    );
  }
  private safe(relative: string) {
    const full = resolve(this.root(), relative);
    if (full !== this.root() && !full.startsWith(this.root() + sep))
      throw new BadRequestException('Caminho de documento inválido');
    return full;
  }
  private signature(file: Express.Multer.File, ext: string) {
    const b = file.buffer;
    if (ext === '.pdf') return b.subarray(0, 5).toString() === '%PDF-';
    if (ext === '.png')
      return b
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (ext === '.jpg' || ext === '.jpeg')
      return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    if (ext === '.docx' || ext === '.xlsx')
      return b.length > 4 && b[0] === 0x50 && b[1] === 0x4b;
    return false;
  }
  private validate(file?: Express.Multer.File) {
    if (!file?.buffer?.length)
      throw new BadRequestException('Arquivo não informado');
    if (file.size > 15 * 1024 * 1024)
      throw new BadRequestException('Arquivo excede o limite de 15 MB');
    const ext = extname(file.originalname).toLowerCase();
    const mimes = ALLOWED[ext];
    if (!mimes?.includes(file.mimetype) || !this.signature(file, ext))
      throw new BadRequestException(
        'Tipo, extensão ou assinatura do arquivo não permitidos',
      );
    return ext;
  }
  async upload(
    contractId: string,
    dto: UploadContractDocumentDto,
    file: Express.Multer.File | undefined,
    actor: Actor,
  ) {
    const ext = this.validate(file);
    const contract = await this.prisma.contratoAdministrativo.findFirst({
      where: { id: contractId, excluidoEm: null },
      select: { id: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    if (dto.andamentoId) {
      const progress = await this.prisma.contratoAndamento.findFirst({
        where: { id: dto.andamentoId, contratoId: contractId },
        select: { id: true },
      });
      if (!progress) throw new BadRequestException('Andamento inválido');
    }
    const folder = TYPES[dto.tipo];
    if (!folder) throw new BadRequestException('Tipo documental inválido');
    const last = await this.prisma.contratoDocumento.aggregate({
      where: { contratoId: contractId, tipo: dto.tipo },
      _max: { versao: true },
    });
    const version = (last._max.versao ?? 0) + 1;
    const stored = `${randomUUID()}${ext}`;
    const relative = `${contractId}/${folder}/${stored}`;
    const destination = this.safe(relative);
    const temporary = `${destination}.tmp-${randomUUID()}`;
    await mkdir(resolve(destination, '..'), { recursive: true, mode: 0o750 });
    await writeFile(temporary, file!.buffer, { mode: 0o640 });
    await rename(temporary, destination);
    const sha256 = createHash('sha256').update(file!.buffer).digest('hex');
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.documentoPrincipal)
          await tx.contratoDocumento.updateMany({
            where: {
              contratoId: contractId,
              documentoPrincipal: true,
              excluidoEm: null,
            },
            data: { documentoPrincipal: false },
          });
        const doc = await tx.contratoDocumento.create({
          data: {
            contratoId: contractId,
            andamentoId: dto.andamentoId,
            tipo: dto.tipo,
            versao: version,
            nomeOriginal: file!.originalname.slice(0, 255),
            nomeArmazenado: stored,
            caminhoRelativo: relative,
            mimeType: file!.mimetype,
            extensao: ext,
            tamanhoBytes: BigInt(file!.size),
            sha256,
            documentoPrincipal: dto.documentoPrincipal ?? false,
            enviadoPorId: actor.id,
          },
        });
        await tx.auditoria.create({
          data: {
            usuarioId: actor.id,
            entidade: 'CONTRATO_DOCUMENTO',
            entidadeId: doc.id,
            acao: 'ENVIADO',
            dadosDepois: {
              contratoId: contractId,
              tipo: dto.tipo,
              versao: version,
              nomeOriginal: doc.nomeOriginal,
              tamanhoBytes: file!.size,
              sha256,
            },
            ip: actor.ip,
            userAgent: actor.userAgent,
          },
        });
        return doc;
      });
    } catch (error) {
      await unlink(destination).catch(() => undefined);
      throw error;
    }
  }
  async download(contractId: string, documentId: string, actor: Actor) {
    const doc = await this.prisma.contratoDocumento.findFirst({
      where: { id: documentId, contratoId: contractId, excluidoEm: null },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    const full = this.safe(doc.caminhoRelativo);
    const info = await stat(full).catch(() => null);
    if (!info?.isFile())
      throw new NotFoundException('Arquivo físico não encontrado');
    await this.prisma.auditoria.create({
      data: {
        usuarioId: actor.id,
        entidade: 'CONTRATO_DOCUMENTO',
        entidadeId: doc.id,
        acao: 'DOWNLOAD',
        dadosDepois: { contratoId: contractId, nomeOriginal: doc.nomeOriginal },
        ip: actor.ip,
        userAgent: actor.userAgent,
      },
    });
    return { doc, stream: createReadStream(full) };
  }
  async remove(
    contractId: string,
    documentId: string,
    motivo: string | undefined,
    actor: Actor,
  ) {
    const doc = await this.prisma.contratoDocumento.findFirst({
      where: { id: documentId, contratoId: contractId, excluidoEm: null },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.contratoDocumento.update({
        where: { id: documentId },
        data: {
          status: 'EXCLUIDO',
          excluidoEm: new Date(),
          excluidoPorId: actor.id,
          documentoPrincipal: false,
        },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'CONTRATO_DOCUMENTO',
          entidadeId: documentId,
          acao: 'EXCLUIDO_LOGICAMENTE',
          dadosAntes: { status: doc.status },
          dadosDepois: { status: row.status, motivo: motivo || null },
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
      });
      return row;
    });
    return { success: true, id: updated.id };
  }
}
