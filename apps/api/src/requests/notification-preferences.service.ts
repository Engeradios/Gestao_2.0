import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SaveNotificationPreferencesDto } from './dto/notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(usuarioId: string) {
    return this.prisma.preferenciaNotificacaoUsuario.upsert({
      where: { usuarioId },
      update: {},
      create: { usuarioId },
    });
  }

  async save(usuarioId: string, body: SaveNotificationPreferencesDto) {
    const before = await this.prisma.preferenciaNotificacaoUsuario.findUnique({
      where: { usuarioId },
    });

    const updated = await this.prisma.preferenciaNotificacaoUsuario.upsert({
      where: { usuarioId },
      update: {
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
        receberSolicitacoes: body.receberSolicitacoes,
        receberAberturaServico: body.receberAberturaServico,
        receberConclusaoFaturamento: body.receberConclusaoFaturamento,
        receberLogistica: body.receberLogistica,
        receberNotificacoesSistema: body.receberNotificacoesSistema,
        ativo: body.ativo,
      },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId,
        entidade: 'PREFERENCIA_NOTIFICACAO_USUARIO',
        entidadeId: usuarioId,
        acao: before ? 'ATUALIZAR' : 'CRIAR',
        dadosAntes: before
          ? {
              receberSolicitacoes: before.receberSolicitacoes,
              receberAberturaServico: before.receberAberturaServico,
              receberConclusaoFaturamento: before.receberConclusaoFaturamento,
              receberLogistica: before.receberLogistica,
              receberNotificacoesSistema: before.receberNotificacoesSistema,
              ativo: before.ativo,
            }
          : undefined,
        dadosDepois: {
          receberSolicitacoes: updated.receberSolicitacoes,
          receberAberturaServico: updated.receberAberturaServico,
          receberConclusaoFaturamento: updated.receberConclusaoFaturamento,
          receberLogistica: updated.receberLogistica,
          receberNotificacoesSistema: updated.receberNotificacoesSistema,
          ativo: updated.ativo,
        },
      },
    });

    return updated;
  }
}
