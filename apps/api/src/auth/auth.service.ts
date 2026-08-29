import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        perfis: {
          include: {
            perfil: {
              include: {
                permissoes: {
                  include: {
                    permissao: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const validPassword =
      user && (await bcrypt.compare(dto.senha, user.senhaHash));

    if (!user || !validPassword || user.status !== 'ATIVO') {
      await this.prisma.auditoria.create({
        data: {
          entidade: 'AUTENTICACAO',
          entidadeId: email,
          acao: 'LOGIN_NEGADO',
          ip,
          userAgent,
        },
      });

      throw new UnauthorizedException('Credenciais inválidas');
    }

    const profiles = user.perfis.map((item) => item.perfil.codigo);

    const permissions = [
      ...new Set(
        user.perfis.flatMap((item) =>
          item.perfil.permissoes
            .filter(
              (profilePermission) => profilePermission.efeito === 'PERMITIR',
            )
            .map((profilePermission) => {
              const permission = profilePermission.permissao;
              return `${permission.hub}.${permission.modulo}.${permission.acao}`;
            }),
        ),
      ),
    ];

    // AUTH_JWT_COMPACTO_RBAC_SERVIDOR
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      nome: user.nome,
      trocarSenha: user.trocarSenha,
    });

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: user.id },
        data: { ultimoLoginEm: new Date() },
      }),
      this.prisma.auditoria.create({
        data: {
          usuarioId: user.id,
          entidade: 'AUTENTICACAO',
          entidadeId: user.id,
          acao: 'LOGIN_REALIZADO',
          ip,
          userAgent,
        },
      }),
    ]);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        unidade: user.unidade,
        perfis: profiles,
        permissoes: permissions,
        trocarSenha: user.trocarSenha,
      },
    };
  }

  async accessHistory(usuarioId: string) {
    const records = await this.prisma.auditoria.findMany({
      where: {
        usuarioId,
        entidade: 'AUTENTICACAO',
        acao: 'LOGIN_REALIZADO',
      },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        criadoEm: true,
      },
      orderBy: {
        criadoEm: 'desc',
      },
      take: 50,
    });

    return records.map((record) => ({
      id: record.id.toString(),
      ip: record.ip,
      userAgent: record.userAgent,
      criadoEm: record.criadoEm,
    }));
  }
}
