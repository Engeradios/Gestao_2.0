import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
@Injectable()
export class UserSelfProfileService {
  private readonly root =
    process.env.PROFILE_STORAGE_ROOT || '/var/lib/engeradios2/perfis';
  constructor(private readonly db: PrismaService) {}
  async profile(id: string) {
    const u = await this.db.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        unidade: true,
        pessoaId: true,
        fotoPerfilCaminho: true,
        fotoPerfilMime: true,
        fotoPerfilNomeOriginal: true,
        fotoPerfilTamanho: true,
      },
    });
    if (!u) throw new NotFoundException('Usuário não encontrado');
    return { ...u, fotoDisponivel: Boolean(u.fotoPerfilCaminho) };
  }
  async update(id: string, body: { nome?: string; email?: string }) {
    const nome = body.nome?.trim();
    const email = body.email?.trim().toLowerCase();
    if (!nome && !email)
      throw new BadRequestException('Informe nome ou e-mail');
    if (email) {
      const c = await this.db.usuario.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, NOT: { id } },
        select: { id: true },
      });
      if (c) throw new ConflictException('E-mail já cadastrado');
    }
    return this.db.$transaction(async (tx) => {
      const u = await tx.usuario.update({
        where: { id },
        data: { ...(nome ? { nome } : {}), ...(email ? { email } : {}) },
        select: { id: true, nome: true, email: true, pessoaId: true },
      });
      if (u.pessoaId)
        await tx.pessoa.update({
          where: { id: u.pessoaId },
          data: { ...(nome ? { nome } : {}), ...(email ? { email } : {}) },
        });
      return u;
    });
  }
  async savePhoto(id: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Foto não enviada');
    const allowed = new Map([
      ['image/jpeg', '.jpg'],
      ['image/png', '.png'],
      ['image/webp', '.webp'],
    ]);
    const ext = allowed.get(file.mimetype);
    if (!ext) throw new BadRequestException('Formato inválido');
    if (file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Foto excede 5 MB');
    await mkdir(this.root, { recursive: true });
    const old = await this.db.usuario.findUnique({
      where: { id },
      select: { fotoPerfilCaminho: true },
    });
    if (!old) throw new NotFoundException('Usuário não encontrado');
    const tmp = join(this.root, `.${id}-${randomUUID()}.tmp`);
    const dest = join(this.root, `${id}-${randomUUID()}${ext}`);
    await writeFile(tmp, file.buffer, { mode: 0o640 });
    await rename(tmp, dest);
    try {
      const result = await this.db.usuario.update({
        where: { id },
        data: {
          fotoPerfilCaminho: dest,
          fotoPerfilMime: file.mimetype,
          fotoPerfilNomeOriginal: basename(file.originalname),
          fotoPerfilTamanho: file.size,
        },
        select: {
          id: true,
          fotoPerfilMime: true,
          fotoPerfilNomeOriginal: true,
          fotoPerfilTamanho: true,
        },
      });
      if (old.fotoPerfilCaminho)
        await unlink(old.fotoPerfilCaminho).catch(() => undefined);
      return result;
    } catch (e) {
      await unlink(dest).catch(() => undefined);
      throw e;
    }
  }
  async photo(id: string) {
    const u = await this.db.usuario.findUnique({
      where: { id },
      select: {
        fotoPerfilCaminho: true,
        fotoPerfilMime: true,
        fotoPerfilNomeOriginal: true,
      },
    });
    if (!u?.fotoPerfilCaminho || !u.fotoPerfilMime)
      throw new NotFoundException('Foto não encontrada');
    return {
      stream: createReadStream(u.fotoPerfilCaminho),
      type: u.fotoPerfilMime,
      name: u.fotoPerfilNomeOriginal || `perfil${extname(u.fotoPerfilCaminho)}`,
    };
  }
  async removePhoto(id: string) {
    const u = await this.db.usuario.findUnique({
      where: { id },
      select: { fotoPerfilCaminho: true },
    });
    if (!u) throw new NotFoundException('Usuário não encontrado');
    await this.db.usuario.update({
      where: { id },
      data: {
        fotoPerfilCaminho: null,
        fotoPerfilMime: null,
        fotoPerfilNomeOriginal: null,
        fotoPerfilTamanho: null,
      },
    });
    if (u.fotoPerfilCaminho)
      await unlink(u.fotoPerfilCaminho).catch(() => undefined);
    return { removida: true };
  }
}
