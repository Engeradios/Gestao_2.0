import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';

// AUTH_JWT_COMPACTO_RBAC_SERVIDOR
interface CompactJwtPayload {
  sub: string;
  email: string;
  nome: string;
  trocarSenha: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  nome: string;
  perfis: string[];
  permissoes: string[];
  trocarSenha: boolean;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const [type, token] = authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token não informado');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<CompactJwtPayload>(token);

      const user = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
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

      if (!user || user.status !== 'ATIVO') {
        throw new UnauthorizedException('Usuário inválido ou inativo');
      }

      const perfis = user.perfis.map((item) => item.perfil.codigo);

      const permissoes = [
        ...new Set(
          user.perfis.flatMap((item) =>
            item.perfil.permissoes
              .filter((item) => item.efeito === 'PERMITIR')
              .map(({ permissao }) =>
                [permissao.hub, permissao.modulo, permissao.acao].join('.'),
              ),
          ),
        ),
      ];

      const hydrated: JwtPayload = {
        sub: user.id,
        email: user.email,
        nome: user.nome,
        perfis,
        permissoes,
        trocarSenha: user.trocarSenha,
      };

      Object.assign(request, { user: hydrated });
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
