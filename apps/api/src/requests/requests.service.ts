import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  CreateRequestDto,
  ManageRequestDto,
  RequestQueryDto,
} from './dto/request.dto';

interface RequestActor {
  id: string;
  nome: string;
  email: string;
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(body: CreateRequestDto, actor: RequestActor) {
    const request = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.solicitacao.create({
        data: {
          solicitanteId: actor.id,
          tipo: body.tipo,
          titulo: body.titulo,
          descricao: body.descricao,
          paginaUrl: body.paginaUrl || null,
          prioridade: body.prioridade,
        },
      });

      const protocol = this.protocol(created.id, created.criadoEm);

      const updated = await transaction.solicitacao.update({
        where: { id: created.id },
        data: { protocolo: protocol },
        include: {
          solicitante: {
            select: { id: true, nome: true, email: true },
          },
        },
      });

      await transaction.solicitacaoHistorico.create({
        data: {
          solicitacaoId: created.id,
          usuarioId: actor.id,
          acao: 'CRIAR',
          statusNovo: 'ABERTA',
          observacao: 'Solicitação criada',
        },
      });

      await transaction.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'SOLICITACAO',
          entidadeId: created.id.toString(),
          acao: 'CRIAR',
          dadosDepois: {
            protocolo: protocol,
            tipo: body.tipo,
            titulo: body.titulo,
            prioridade: body.prioridade,
            paginaUrl: body.paginaUrl || null,
          },
        },
      });

      return updated;
    });

    await this.notifyAdministrators(request, actor);

    return this.serialize(request);
  }

  async list(query: RequestQueryDto, actorId: string, canManage: boolean) {
    const term = query.busca?.trim();

    const where = {
      ...(!canManage ? { solicitanteId: actorId } : {}),
      ...(canManage && query.solicitanteId
        ? { solicitanteId: query.solicitanteId }
        : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.prioridade ? { prioridade: query.prioridade } : {}),
      ...(term
        ? {
            OR: [
              {
                protocolo: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },
              {
                titulo: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },
              {
                descricao: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },
              ...(canManage
                ? [
                    {
                      solicitante: {
                        nome: {
                          contains: term,
                          mode: 'insensitive' as const,
                        },
                      },
                    },
                    {
                      solicitante: {
                        email: {
                          contains: term,
                          mode: 'insensitive' as const,
                        },
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };

    const skip = (query.pagina - 1) * query.limite;

    const [total, records] = await this.prisma.$transaction([
      this.prisma.solicitacao.count({ where }),
      this.prisma.solicitacao.findMany({
        where,
        skip,
        take: query.limite,
        orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
        include: {
          solicitante: {
            select: { id: true, nome: true, email: true },
          },
          responsavel: {
            select: { id: true, nome: true, email: true },
          },
        },
      }),
    ]);

    return {
      dados: records.map((record) => this.serialize(record)),
      paginacao: {
        pagina: query.pagina,
        limite: query.limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / query.limite)),
      },
    };
  }

  async findOne(id: string, actorId: string, canManage: boolean) {
    const numericId = this.parseId(id);

    const request = await this.prisma.solicitacao.findUnique({
      where: { id: numericId },
      include: {
        solicitante: {
          select: { id: true, nome: true, email: true },
        },
        responsavel: {
          select: { id: true, nome: true, email: true },
        },
        historicos: {
          orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
          include: {
            usuario: {
              select: { id: true, nome: true, email: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    if (!canManage && request.solicitanteId !== actorId) {
      throw new ForbiddenException('Acesso não autorizado à solicitação');
    }

    return this.serialize(request);
  }

  async manage(id: string, body: ManageRequestDto, actor: RequestActor) {
    const numericId = this.parseId(id);

    const before = await this.prisma.solicitacao.findUnique({
      where: { id: numericId },
    });

    if (!before) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    if (body.responsavelId) {
      const responsible = await this.prisma.usuario.findUnique({
        where: { id: body.responsavelId },
        select: { id: true, status: true },
      });

      if (!responsible || responsible.status !== 'ATIVO') {
        throw new BadRequestException('Responsável não encontrado ou inativo');
      }
    }

    const nextStatus = body.status ?? before.status;
    const completedAt =
      nextStatus === 'CONCLUIDA' ? (before.concluidaEm ?? new Date()) : null;

    const request = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.solicitacao.update({
        where: { id: numericId },
        data: {
          ...(body.status ? { status: body.status } : {}),
          ...(body.prioridade ? { prioridade: body.prioridade } : {}),
          ...(body.responsavelId !== undefined
            ? { responsavelId: body.responsavelId || null }
            : {}),
          ...(body.resposta !== undefined
            ? { resposta: body.resposta || null }
            : {}),
          concluidaEm: completedAt,
          atualizadoEm: new Date(),
        },
        include: {
          solicitante: {
            select: { id: true, nome: true, email: true },
          },
          responsavel: {
            select: { id: true, nome: true, email: true },
          },
        },
      });

      await transaction.solicitacaoHistorico.create({
        data: {
          solicitacaoId: numericId,
          usuarioId: actor.id,
          acao: 'ATUALIZAR',
          statusAnterior: before.status,
          statusNovo: updated.status,
          observacao:
            body.observacao || body.resposta || 'Solicitação atualizada',
        },
      });

      await transaction.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'SOLICITACAO',
          entidadeId: numericId.toString(),
          acao: 'ATUALIZAR',
          dadosAntes: {
            status: before.status,
            prioridade: before.prioridade,
            responsavelId: before.responsavelId,
            resposta: before.resposta,
          },
          dadosDepois: {
            status: updated.status,
            prioridade: updated.prioridade,
            responsavelId: updated.responsavelId,
            resposta: updated.resposta,
          },
        },
      });

      return updated;
    });

    return this.serialize(request);
  }

  private async notifyAdministrators(
    request: {
      id: bigint;
      protocolo: string | null;
      tipo: string;
      titulo: string;
      descricao: string;
      prioridade: string;
      paginaUrl: string | null;
    },
    actor: RequestActor,
  ) {
    const recipients = await this.prisma.preferenciaNotificacaoUsuario.findMany(
      {
        where: {
          ativo: true,
          receberSolicitacoes: true,
          usuario: {
            status: 'ATIVO',
            perfis: {
              some: {
                perfil: {
                  codigo: 'ADMINISTRADOR',
                  ativo: true,
                },
              },
            },
          },
        },
        select: {
          usuario: {
            select: { email: true },
          },
        },
      },
    );

    const emails = recipients.map((item) => item.usuario.email);

    if (!emails.length) {
      await this.prisma.solicitacao.update({
        where: { id: request.id },
        data: {
          emailStatus: 'FALHA',
          emailErro:
            'Nenhum administrador habilitado para receber solicitações',
        },
      });

      return;
    }

    try {
      await this.mail.send({
        to: emails,
        replyTo: actor.email,
        subject: `[${request.protocolo}] ${request.titulo}`,
        text: [
          `Nova solicitação: ${request.protocolo}`,
          `Tipo: ${request.tipo}`,
          `Prioridade: ${request.prioridade}`,
          `Solicitante: ${actor.nome} <${actor.email}>`,
          `Página: ${request.paginaUrl || 'Não informada'}`,
          '',
          request.descricao,
        ].join('\n'),
        html: `
          <h2>Nova solicitação ${this.escape(request.protocolo || '')}</h2>
          <p><strong>Tipo:</strong> ${this.escape(request.tipo)}</p>
          <p><strong>Prioridade:</strong> ${this.escape(request.prioridade)}</p>
          <p><strong>Solicitante:</strong> ${this.escape(actor.nome)} &lt;${this.escape(actor.email)}&gt;</p>
          <p><strong>Página:</strong> ${this.escape(request.paginaUrl || 'Não informada')}</p>
          <hr />
          <p>${this.escape(request.descricao).replace(/\n/g, '<br />')}</p>
        `,
        contexto: 'SOLICITACAO',
        referenciaId: request.id.toString(),
        usuarioId: actor.id,
      });

      await this.prisma.solicitacao.update({
        where: { id: request.id },
        data: {
          emailStatus: 'ENVIADO',
          emailErro: null,
          emailEnviadoEm: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.solicitacao.update({
        where: { id: request.id },
        data: {
          emailStatus: 'FALHA',
          emailErro: this.errorMessage(error),
        },
      });
    }
  }

  private protocol(id: bigint, createdAt: Date) {
    return `SOL-${createdAt.getUTCFullYear()}-${id
      .toString()
      .padStart(6, '0')}`;
  }

  private parseId(id: string) {
    try {
      return BigInt(id);
    } catch {
      throw new BadRequestException('Identificador de solicitação inválido');
    }
  }

  private serialize<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_key, item: unknown) =>
        typeof item === 'bigint' ? item.toString() : item,
      ),
    ) as T;
  }

  private escape(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private errorMessage(error: unknown) {
    return (error instanceof Error ? error.message : String(error)).slice(
      0,
      1000,
    );
  }
}
