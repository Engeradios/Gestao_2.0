import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';

const TOKEN_TYPE = 'REFRESH_SESSION';
const DEFAULT_DAYS = 30;

@Injectable()
export class RefreshSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private expiration() {
    const configured = Number(process.env.REFRESH_TOKEN_DAYS ?? DEFAULT_DAYS);
    const days =
      Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_DAYS;
    return new Date(Date.now() + days * 86400000);
  }

  private async accessToken(user: {
    id: string;
    email: string;
    nome: string;
    trocarSenha: boolean;
  }) {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      nome: user.nome,
      trocarSenha: user.trocarSenha,
    });
  }

  async issue(usuarioId: string, ip?: string, userAgent?: string) {
    const raw = randomBytes(48).toString('base64url');
    await this.prisma.tokenAutenticacao.create({
      data: {
        usuarioId,
        tipo: TOKEN_TYPE,
        tokenHash: this.hash(raw),
        expiraEm: this.expiration(),
        ip,
        userAgent,
      },
    });
    return raw;
  }

  async rotate(raw: string, ip?: string, userAgent?: string) {
    const tokenHash = this.hash(raw);
    const current = await this.prisma.tokenAutenticacao.findFirst({
      where: { tokenHash, tipo: TOKEN_TYPE },
    });
    if (!current || current.utilizadoEm || current.expiraEm <= new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id: current.usuarioId },
      select: {
        id: true,
        email: true,
        nome: true,
        trocarSenha: true,
        status: true,
      },
    });
    if (!user || user.status !== 'ATIVO') {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    const nextRaw = randomBytes(48).toString('base64url');
    const consumedAt = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.tokenAutenticacao.updateMany({
        where: { id: current.id, utilizadoEm: null },
        data: { utilizadoEm: consumedAt },
      });
      if (consumed.count !== 1) return false;
      await tx.tokenAutenticacao.create({
        data: {
          usuarioId: user.id,
          tipo: TOKEN_TYPE,
          tokenHash: this.hash(nextRaw),
          expiraEm: this.expiration(),
          ip,
          userAgent,
        },
      });
      return true;
    });
    if (!result) throw new UnauthorizedException('Refresh token já utilizado');

    return {
      accessToken: await this.accessToken(user),
      refreshToken: nextRaw,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    };
  }

  async revoke(raw: string) {
    await this.prisma.tokenAutenticacao.updateMany({
      where: { tokenHash: this.hash(raw), tipo: TOKEN_TYPE, utilizadoEm: null },
      data: { utilizadoEm: new Date() },
    });
    return { success: true };
  }
}
