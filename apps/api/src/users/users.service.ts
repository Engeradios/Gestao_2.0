import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuthTokenService } from '../auth/auth-token.service';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

export interface AuditContext {
  actorId: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async list(search?: string) {
    const term = search?.trim();
    return this.prisma.usuario.findMany({
      where: term
        ? {
            OR: [
              { nome: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { unidade: { contains: term, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: this.userSelect(),
      orderBy: [{ status: 'asc' }, { nome: 'asc' }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: this.userSelect(),
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  listAvailablePeople(userId?: string) {
    return this.prisma.pessoa.findMany({
      where: {
        ativo: true,
        OR: [
          { usuario: { is: null } },
          ...(userId ? [{ usuario: { is: { id: userId } } }] : []),
        ],
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        unidade: true,
        cargo: true,
        funcoes: {
          where: { ativo: true },
          select: { funcao: true },
          orderBy: { funcao: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  listProfiles() {
    return this.prisma.perfil.findMany({
      where: { ativo: true },
      select: {
        id: true,
        codigo: true,
        nome: true,
        descricao: true,
        sistema: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  async create(dto: CreateUserDto, audit: AuditContext) {
    const email = dto.email.trim().toLowerCase();
    await this.assertEmailAvailable(email);
    await this.assertProfiles(dto.perfilIds);

    if (dto.pessoaId) {
      const person = await this.prisma.pessoa.findUnique({
        where: { id: dto.pessoaId },
        include: { usuario: { select: { id: true } } },
      });

      if (!person) {
        throw new NotFoundException('Pessoa não encontrada');
      }

      if (person.usuario) {
        throw new ConflictException('Pessoa já associada a outro usuário');
      }
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          nome: dto.nome.trim(),
          email,
          unidade: dto.unidade?.trim().toUpperCase() || null,
          senhaHash: passwordHash,
          trocarSenha: true,
          pessoaId: dto.pessoaId || null,
          perfis: {
            create: dto.perfilIds.map((perfilId) => ({ perfilId })),
          },
        },
        select: this.userSelect(),
      });

      await tx.auditoria.create({
        data: {
          usuarioId: audit.actorId,
          entidade: 'USUARIO',
          entidadeId: created.id,
          acao: 'USUARIO_CRIADO',
          dadosDepois: {
            nome: created.nome,
            email: created.email,
            unidade: created.unidade,
            status: created.status,
            pessoaId: created.pessoaId,
            perfilIds: dto.perfilIds,
          },
          ip: audit.ip,
          userAgent: audit.userAgent,
        },
      });
      return created;
    });

    try {
      await this.authTokenService.sendWelcome({
        usuarioId: user.id,
        nome: user.nome,
        email: user.email,
        ip: audit.ip,
        userAgent: audit.userAgent,
      });

      return {
        user,
        emailEnviado: true,
        message:
          'Usuário criado. As instruções de acesso foram enviadas por e-mail.',
      };
    } catch (error) {
      await this.prisma.auditoria.create({
        data: {
          usuarioId: audit.actorId,
          entidade: 'USUARIO',
          entidadeId: user.id,
          acao: 'EMAIL_BOAS_VINDAS_FALHOU',
          dadosDepois: {
            email: user.email,
            erro:
              error instanceof Error
                ? error.message.slice(0, 500)
                : 'Falha não identificada',
          },
          ip: audit.ip,
          userAgent: audit.userAgent,
        },
      });

      return {
        user,
        emailEnviado: false,
        message: 'Usuário criado, mas o e-mail de acesso não pôde ser enviado.',
      };
    }
  }

  async update(id: string, dto: UpdateUserDto, audit: AuditContext) {
    const before = await this.findForAudit(id);
    const email = dto.email?.trim().toLowerCase();
    if (email && email !== before.email) {
      await this.assertEmailAvailable(email, id);
    }
    if (dto.perfilIds) await this.assertProfiles(dto.perfilIds);

    if (dto.pessoaId) {
      const person = await this.prisma.pessoa.findUnique({
        where: { id: dto.pessoaId },
        include: { usuario: { select: { id: true } } },
      });

      if (!person) {
        throw new NotFoundException('Pessoa não encontrada');
      }

      if (person.usuario && person.usuario.id !== id) {
        throw new ConflictException('Pessoa já associada a outro usuário');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.perfilIds) {
        await tx.usuarioPerfil.deleteMany({ where: { usuarioId: id } });
        if (dto.perfilIds.length) {
          await tx.usuarioPerfil.createMany({
            data: dto.perfilIds.map((perfilId) => ({
              usuarioId: id,
              perfilId,
            })),
          });
        }
      }

      const updated = await tx.usuario.update({
        where: { id },
        data: {
          ...(dto.nome !== undefined ? { nome: dto.nome.trim() } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(dto.unidade !== undefined
            ? { unidade: dto.unidade.trim().toUpperCase() || null }
            : {}),
          ...(dto.pessoaId !== undefined
            ? { pessoaId: dto.pessoaId || null }
            : {}),
        },
        select: this.userSelect(),
      });

      await tx.auditoria.create({
        data: {
          usuarioId: audit.actorId,
          entidade: 'USUARIO',
          entidadeId: id,
          acao: 'USUARIO_EDITADO',
          dadosAntes: before,
          dadosDepois: {
            nome: updated.nome,
            email: updated.email,
            unidade: updated.unidade,
            status: updated.status,
            pessoaId: updated.pessoaId,
            perfilIds: updated.perfis.map((item) => item.perfil.id),
          },
          ip: audit.ip,
          userAgent: audit.userAgent,
        },
      });
      return updated;
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    audit: AuditContext,
  ) {
    if (id === audit.actorId && dto.status !== 'ATIVO') {
      throw new BadRequestException(
        'Não é permitido bloquear ou inativar a própria conta',
      );
    }

    const before = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!before) throw new NotFoundException('Usuário não encontrado');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.usuario.update({
        where: { id },
        data: { status: dto.status },
        select: this.userSelect(),
      });
      await tx.auditoria.create({
        data: {
          usuarioId: audit.actorId,
          entidade: 'USUARIO',
          entidadeId: id,
          acao: 'USUARIO_STATUS_ALTERADO',
          dadosAntes: { status: before.status },
          dadosDepois: { status: updated.status },
          ip: audit.ip,
          userAgent: audit.userAgent,
        },
      });
      return updated;
    });
  }

  async resetPassword(id: string, audit: AuditContext) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id },
        data: { senhaHash: passwordHash, trocarSenha: true },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: audit.actorId,
          entidade: 'USUARIO',
          entidadeId: id,
          acao: 'USUARIO_SENHA_REDEFINIDA',
          dadosDepois: { trocarSenha: true },
          ip: audit.ip,
          userAgent: audit.userAgent,
        },
      });
    });

    return { userId: id, temporaryPassword };
  }

  async history(id: string) {
    const exists = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Usuário não encontrado');

    const records = await this.prisma.auditoria.findMany({
      where: { entidade: 'USUARIO', entidadeId: id },
      select: {
        id: true,
        acao: true,
        dadosAntes: true,
        dadosDepois: true,
        ip: true,
        userAgent: true,
        criadoEm: true,
        usuario: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    });

    return records.map((record) => ({
      ...record,
      id: record.id.toString(),
    }));
  }

  private userSelect() {
    return {
      id: true,
      nome: true,
      email: true,
      status: true,
      unidade: true,
      trocarSenha: true,
      ultimoLoginEm: true,
      criadoEm: true,
      atualizadoEm: true,
      pessoaId: true,
      pessoa: {
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          unidade: true,
          cargo: true,
        },
      },
      perfis: {
        select: {
          perfil: {
            select: { id: true, codigo: true, nome: true, ativo: true },
          },
        },
      },
    } as const;
  }

  private async findForAudit(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        nome: true,
        email: true,
        unidade: true,
        status: true,
        perfis: { select: { perfilId: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return {
      nome: user.nome,
      email: user.email,
      unidade: user.unidade,
      status: user.status,
      perfilIds: user.perfis.map((item) => item.perfilId),
    };
  }

  private async assertEmailAvailable(email: string, ignoreId?: string) {
    const existing = await this.prisma.usuario.findFirst({
      where: { email, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { id: true },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado');
  }

  private async assertProfiles(ids: string[]) {
    const count = await this.prisma.perfil.count({
      where: { id: { in: ids }, ativo: true },
    });
    if (count !== ids.length) {
      throw new NotFoundException(
        'Um ou mais perfis são inválidos ou inativos',
      );
    }
  }

  private generateTemporaryPassword() {
    return `En2!${randomBytes(12).toString('base64url')}`;
  }
}
