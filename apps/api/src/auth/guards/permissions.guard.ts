import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtPayload } from './jwt-auth.guard';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new ForbiddenException('Usuário autenticado não identificado');
    }

    if (request.user.trocarSenha) {
      throw new ForbiddenException(
        'A senha deve ser alterada antes de acessar este recurso',
      );
    }

    const granted = new Set(
      (request.user.permissoes ?? []).map((permission) =>
        permission.toUpperCase(),
      ),
    );

    const authorized = required.every((permission) => {
      const normalized = permission.toUpperCase();
      const parts = normalized.split('.');

      return (
        granted.has('*') ||
        granted.has(normalized) ||
        granted.has(`${parts[0]}.*`) ||
        granted.has(`${parts[0]}.${parts[1]}.*`)
      );
    });

    if (!authorized) {
      throw new ForbiddenException(
        'Usuário sem permissão para executar esta operação',
      );
    }

    return true;
  }
}
