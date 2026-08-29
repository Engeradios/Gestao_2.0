import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UserNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(usuarioId: string, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const now = new Date();

    const where = {
      usuarioId,
      OR: [{ expiraEm: null }, { expiraEm: { gt: now } }],
    };

    const [items, naoLidas] = await this.prisma.$transaction([
      this.prisma.notificacaoUsuario.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        take,
        select: {
          id: true,
          tipo: true,
          titulo: true,
          mensagem: true,
          link: true,
          referenciaId: true,
          dados: true,
          lidaEm: true,
          criadoEm: true,
          expiraEm: true,
        },
      }),
      this.prisma.notificacaoUsuario.count({
        where: {
          ...where,
          lidaEm: null,
        },
      }),
    ]);

    return {
      naoLidas,
      items,
    };
  }

  async markRead(usuarioId: string, id: string) {
    const notification = await this.prisma.notificacaoUsuario.findFirst({
      where: {
        id,
        usuarioId,
      },
      select: {
        id: true,
        lidaEm: true,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.lidaEm) {
      return notification;
    }

    return this.prisma.notificacaoUsuario.update({
      where: { id },
      data: { lidaEm: new Date() },
      select: {
        id: true,
        lidaEm: true,
      },
    });
  }

  async markAllRead(usuarioId: string) {
    const result = await this.prisma.notificacaoUsuario.updateMany({
      where: {
        usuarioId,
        lidaEm: null,
        OR: [{ expiraEm: null }, { expiraEm: { gt: new Date() } }],
      },
      data: {
        lidaEm: new Date(),
      },
    });

    return {
      sucesso: true,
      atualizadas: result.count,
    };
  }
}
