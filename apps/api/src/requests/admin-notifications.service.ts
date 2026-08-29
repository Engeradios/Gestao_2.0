import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AdminNotificationPreferencesDto } from './dto/admin-notification-preferences.dto';

interface AuditContext {
  actorId: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.usuario.findMany({
      orderBy: [{ status: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        email: true,
        status: true,
        unidade: true,
        preferenciaNotificacao: {
          select: {
            receberSolicitacoes: true,
            receberAberturaServico: true,
            receberConclusaoFaturamento: true,
            receberLogistica: true,
            areaServicos: true,
            receberNotificacoesSistema: true,
            ativo: true,
            atualizadoEm: true,
          },
        },
      },
    });
  }

  async update(
    usuarioId: string,
    body: AdminNotificationPreferencesDto,
    audit: AuditContext,
  ) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        preferenciaNotificacao: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.preferenciaNotificacaoUsuario.upsert({
        where: { usuarioId },
        update: {
          areaServicos: body.areaServicos,
          receberSolicitacoes: body.receberSolicitacoes,
          receberAberturaServico: body.receberAberturaServico,
          receberConclusaoFaturamento: body.receberConclusaoFaturamento,
          receberLogistica: body.receberLogistica,
          receberNotificacoesSistema: body.receberNotificacoesSistema,
          ativo: body.ativo,
          atualizadoEm: new Date(),
        },
        create: {
          usuarioId,
          areaServicos: body.areaServicos,
          receberSolicitacoes: body.receberSolicitacoes,
          receberAberturaServico: body.receberAberturaServico,
          receberConclusaoFaturamento: body.receberConclusaoFaturamento,
          receberLogistica: body.receberLogistica,
          receberNotificacoesSistema: body.receberNotificacoesSistema,
          ativo: body.ativo,
        },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: audit.actorId,
          entidade: 'PREFERENCIA_NOTIFICACAO_USUARIO',
          entidadeId: usuarioId,
          acao: user.preferenciaNotificacao ? 'ATUALIZAR_ADMIN' : 'CRIAR_ADMIN',
          dadosAntes: user.preferenciaNotificacao
            ? this.auditData(user.preferenciaNotificacao)
            : undefined,
          dadosDepois: {
            usuario: {
              id: user.id,
              nome: user.nome,
              email: user.email,
            },
            preferencias: this.auditData(updated),
          },
          ip: audit.ip,
          userAgent: audit.userAgent,
        },
      });

      return updated;
    });
  }

  private auditData(value: {
    areaServicos: string;
    receberSolicitacoes: boolean;
    receberAberturaServico: boolean;
    receberConclusaoFaturamento: boolean;
    receberLogistica: boolean;
    receberNotificacoesSistema: boolean;
    ativo: boolean;
  }) {
    return {
      areaServicos: value.areaServicos,
      receberSolicitacoes: value.receberSolicitacoes,
      receberAberturaServico: value.receberAberturaServico,
      receberConclusaoFaturamento: value.receberConclusaoFaturamento,
      receberLogistica: value.receberLogistica,
      receberNotificacoesSistema: value.receberNotificacoesSistema,
      ativo: value.ativo,
    };
  }
}
