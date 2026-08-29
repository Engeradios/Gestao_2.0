import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';

export interface ProfileAuditContext {
  actorId: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.perfil.findMany({
      include: {
        _count: { select: { usuarios: true } },
        permissoes: {
          include: { permissao: true },
          orderBy: { permissao: { hub: 'asc' } },
        },
      },
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    });
  }

  permissions() {
    return this.prisma.permissao.findMany({
      orderBy: [{ hub: 'asc' }, { modulo: 'asc' }, { acao: 'asc' }],
    });
  }

  async findOne(id: string) {
    const profile = await this.prisma.perfil.findUnique({
      where: { id },
      include: {
        _count: { select: { usuarios: true } },
        permissoes: { include: { permissao: true } },
      },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    return profile;
  }

  async create(dto: CreateProfileDto, audit: ProfileAuditContext) {
    const codigo = dto.codigo
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');
    const existing = await this.prisma.perfil.findUnique({ where: { codigo } });
    if (existing) throw new ConflictException('Código de perfil já cadastrado');
    await this.validatePermissions(
      dto.permissoes.map((item) => item.permissaoId),
    );

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.perfil.create({
        data: {
          codigo,
          nome: dto.nome.trim(),
          descricao: dto.descricao?.trim() || null,
          permissoes: {
            create: dto.permissoes.map((item) => ({
              permissaoId: item.permissaoId,
              efeito: item.efeito,
            })),
          },
        },
        include: { permissoes: { include: { permissao: true } } },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: audit.actorId,
          entidade: 'PERFIL',
          entidadeId: profile.id,
          acao: 'PERFIL_CRIADO',
          dadosDepois: this.auditData(profile),
          ip: audit.ip,
          userAgent: audit.userAgent,
        },
      });
      return profile;
    });
  }

  async update(id: string, dto: UpdateProfileDto, audit: ProfileAuditContext) {
    const before = await this.findOne(id);
    if (before.sistema && dto.ativo === false) {
      throw new BadRequestException('Perfil de sistema não pode ser inativado');
    }
    if (dto.permissoes) {
      await this.validatePermissions(
        dto.permissoes.map((item) => item.permissaoId),
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.permissoes) {
        await tx.perfilPermissao.deleteMany({ where: { perfilId: id } });
        if (dto.permissoes.length) {
          await tx.perfilPermissao.createMany({
            data: dto.permissoes.map((item) => ({
              perfilId: id,
              permissaoId: item.permissaoId,
              efeito: item.efeito,
            })),
          });
        }
      }
      const profile = await tx.perfil.update({
        where: { id },
        data: {
          ...(dto.nome !== undefined ? { nome: dto.nome.trim() } : {}),
          ...(dto.descricao !== undefined
            ? { descricao: dto.descricao.trim() || null }
            : {}),
          ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
        },
        include: { permissoes: { include: { permissao: true } } },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: audit.actorId,
          entidade: 'PERFIL',
          entidadeId: id,
          acao: 'PERFIL_EDITADO',
          dadosAntes: this.auditData(before),
          dadosDepois: this.auditData(profile),
          ip: audit.ip,
          userAgent: audit.userAgent,
        },
      });
      return profile;
    });
  }

  private async validatePermissions(ids: string[]) {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Permissões duplicadas no perfil');
    }
    const count = await this.prisma.permissao.count({
      where: { id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new NotFoundException('Uma ou mais permissões não existem');
    }
  }

  private auditData(profile: {
    codigo: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
    sistema: boolean;
    permissoes: Array<{ permissaoId: string; efeito: string }>;
  }) {
    return {
      codigo: profile.codigo,
      nome: profile.nome,
      descricao: profile.descricao,
      ativo: profile.ativo,
      sistema: profile.sistema,
      permissoes: profile.permissoes.map((item) => ({
        permissaoId: item.permissaoId,
        efeito: item.efeito,
      })),
    };
  }
}
