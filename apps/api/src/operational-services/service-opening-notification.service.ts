import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationRecipientSelectorService } from './notification-recipient-selector.service';

@Injectable()
export class ServiceOpeningNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly recipientSelector: NotificationRecipientSelectorService,
  ) {}

  async send(serviceId: string, actor: string) {
    const key = `SERVICO_ABERTURA:${serviceId}`;

    const previous = await this.prisma.opEmailLog.findFirst({
      where: {
        chaveEvento: key,
        sucesso: true,
      },
      select: { id: true },
    });

    if (previous) {
      return { sucesso: true, duplicado: true };
    }

    const service = await this.prisma.opServico.findUnique({
      where: { id: serviceId },
      include: {
        responsaveis: {
          where: { ativo: true },
          include: {
            pessoa: {
              include: {
                usuario: {
                  include: {
                    preferenciaNotificacao: true,
                  },
                },
              },
            },
          },
        },
        anexos: {
          where: { ativo: true },
          orderBy: { criadoEm: 'asc' },
        },
      },
    });

    if (!service) {
      return { sucesso: false, motivo: 'SERVICO_NAO_ENCONTRADO' };
    }

    const selection = await this.recipientSelector.select({
      uf: service.ufExecucao,
      praca: service.pracaResponsavel ?? '',
      area: service.areaResponsavel ?? '',
      evento: 'ABERTURA',
    });

    const users = selection.destinatarios.map((recipient) => ({
      id: recipient.usuarioId,
      nome: recipient.nome,
      email: recipient.email,
    }));

    await this.prisma.notificacaoUsuario.createMany({
      data: users.map((user) => ({
        usuarioId: user.id,
        tipo: 'SERVICO_ABERTURA',
        titulo: `Novo serviço · Proposta ${service.proposta ?? '-'}`,
        mensagem: `${service.cliente} · ` + `${service.servicoAtividade}`,
        link: `/operacional/servicos/${service.id}`,
        referenciaId: service.id,
        chaveEvento: `SERVICO_ABERTURA:${service.id}`,
        dados: {
          proposta: service.proposta,
          cliente: service.cliente,
          area: service.areaResponsavel,
          prazoFinal: service.prazoFinal?.toISOString() ?? null,
        },
      })),
      skipDuplicates: true,
    });

    const recipients = [
      ...new Set(
        users.map((user) => user.email.trim().toLowerCase()).filter(Boolean),
      ),
    ];

    if (!recipients.length) {
      const detail = `SEM_COBERTURA | ROTEAMENTO:${selection.estrategia}`;

      await this.registerFailure(serviceId, key, actor, detail, []);

      return {
        sucesso: false,
        motivo: 'SEM_COBERTURA',
        estrategia: selection.estrategia,
      };
    }

    const logoPath = '/opt/engeradios2/apps/web/public/brand/logo_escuro.png';
    const subject = this.subject('Abertura de Serviço', service);

    try {
      const result = await this.mail.send({
        to: recipients,
        subject,
        contexto: 'SERVICO_ABERTURA',
        referenciaId: serviceId,
        text: this.text(service),
        html: this.html(service),
        attachments: [
          {
            filename: 'logo-engeradios.png',
            path: logoPath,
            cid: 'logo.engeradios@gestao2',
            contentDisposition: 'inline',
          },
          ...service.anexos.map((attachment) => ({
            filename: attachment.nomeOriginal,
            path: attachment.caminho,
            contentDisposition: 'attachment' as const,
          })),
        ],
      });

      await this.prisma.$transaction([
        this.prisma.opEmailLog.create({
          data: {
            servicoId: serviceId,
            tipo: 'abertura',
            assunto: subject,
            destinatarios: recipients.join('; '),
            qtdDest: recipients.length,
            sucesso: true,
            detalhe: `${result.messageId || 'Enviado'} | ROTEAMENTO:${selection.estrategia}`,
            comAnexo: service.anexos.length > 0,
            usuario: actor,
            tentativa: service.emailAberturaTentativas + 1,
            chaveEvento: key,
          },
        }),
        this.prisma.opServico.update({
          where: { id: serviceId },
          data: {
            emailAberturaStatus: 'ENVIADO',
            emailAberturaTentativas: {
              increment: 1,
            },
            emailAberturaErro: null,
            abertoEm: new Date(),
          },
        }),
      ]);

      return {
        sucesso: true,
        destinatarios: recipients.length,
        estrategia: selection.estrategia,
      };
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Falha não identificada';

      await this.registerFailure(serviceId, key, actor, detail, recipients);

      return {
        sucesso: false,
        motivo: 'FALHA_ENVIO',
        detalhe: detail,
      };
    }
  }

  private async registerFailure(
    serviceId: string,
    key: string,
    actor: string,
    detail: string,
    recipients: string[],
  ) {
    const service = await this.prisma.opServico.findUnique({
      where: { id: serviceId },
      select: { emailAberturaTentativas: true },
    });

    /*
     * Falhas não usam chaveEvento, permitindo novas tentativas.
     * A chave única é gravada somente no envio bem-sucedido.
     */
    await this.prisma.$transaction([
      this.prisma.opEmailLog.create({
        data: {
          servicoId: serviceId,
          tipo: 'abertura',
          assunto: `Abertura de serviço`,
          destinatarios: recipients.join('; '),
          qtdDest: recipients.length,
          sucesso: false,
          detalhe: detail,
          comAnexo: true,
          usuario: actor,
          tentativa: (service?.emailAberturaTentativas ?? 0) + 1,
          chaveEvento: null,
          codigoErro: key.slice(0, 100),
        },
      }),
      this.prisma.opServico.update({
        where: { id: serviceId },
        data: {
          emailAberturaStatus: 'FALHA',
          emailAberturaTentativas: {
            increment: 1,
          },
          emailAberturaErro: detail,
        },
      }),
    ]);
  }

  private formatDate(value: Date | null) {
    return value
      ? new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'UTC',
        }).format(value)
      : '-';
  }

  private subject(
    prefix: string,
    service: {
      proposta: string | null;
      cliente: string;
      contrato: string | null;
    },
  ) {
    return `${prefix} | Proposta ${service.proposta ?? 'sem número'} | ${service.cliente} | Contrato ${service.contrato ?? 'não informado'}`.slice(
      0,
      255,
    );
  }

  private escape(value: unknown) {
    const normalized =
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
        ? String(value)
        : value instanceof Date
          ? value.toISOString()
          : '-';
    return normalized
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private text(service: {
    proposta: string | null;
    cliente: string;
    contrato: string | null;
    clienteLocal: string | null;
    areaResponsavel: string | null;
    servicoAtividade: string;
    inicioPlanejado: Date | null;
    prazoFinal: Date | null;
    responsavel: string | null;
    prioridade: string | null;
    observacoes: string | null;
  }) {
    return [
      'ENGERÁDIOS | ABERTURA DE SERVIÇO',
      'COMUNICADO INTERNO | NÃO REQUER RESPOSTA',
      '',
      `Proposta: ${service.proposta ?? '-'}`,
      `Cliente: ${service.cliente}`,
      `Contrato: ${service.contrato ?? '-'}`,
      `Serviço: ${service.servicoAtividade}`,
      `Local: ${service.clienteLocal ?? '-'}`,
      `Área: ${service.areaResponsavel ?? '-'}`,
      `Responsável: ${service.responsavel ?? '-'}`,
      `Prioridade: ${service.prioridade ?? '-'}`,
      `Início planejado: ${this.formatDate(service.inicioPlanejado)}`,
      `Prazo final: ${this.formatDate(service.prazoFinal)}`,
      `Observações: ${service.observacoes ?? '-'}`,
      '',
      'Esta mensagem é exclusivamente informativa. Não é necessário responder.',
    ].join('\n');
  }

  private html(service: {
    proposta: string | null;
    cliente: string;
    contrato: string | null;
    clienteLocal: string | null;
    areaResponsavel: string | null;
    servicoAtividade: string;
    inicioPlanejado: Date | null;
    prazoFinal: Date | null;
    responsavel: string | null;
    prioridade: string | null;
    observacoes: string | null;
  }) {
    const row = (label: string, value: unknown) =>
      `<tr><td style="padding:9px 12px;color:#64748b;width:180px;border-bottom:1px solid #e2e8f0">${this.escape(label)}</td><td style="padding:9px 12px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0">${this.escape(value)}</td></tr>`;
    return `<div style="background:#f1f5f9;padding:24px;font-family:Arial,sans-serif"><div style="max-width:760px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><div style="padding:22px 28px;border-top:6px solid #b91c1c"><img src="cid:logo.engeradios@gestao2" alt="Engerádios" style="max-width:190px;height:auto"><h1 style="font-size:22px;color:#0f172a;margin:18px 0 5px">Abertura de Serviço</h1><div style="display:inline-block;background:#fef2f2;color:#991b1b;padding:7px 11px;border-radius:6px;font-weight:bold;font-size:12px">COMUNICADO INTERNO | NÃO REQUER RESPOSTA</div></div><table role="presentation" style="width:100%;border-collapse:collapse">${row('Proposta', service.proposta)}${row('Cliente', service.cliente)}${row('Contrato', service.contrato)}${row('Serviço', service.servicoAtividade)}${row('Local', service.clienteLocal)}${row('Área', service.areaResponsavel)}${row('Responsável', service.responsavel)}${row('Prioridade', service.prioridade)}${row('Início planejado', this.formatDate(service.inicioPlanejado))}${row('Prazo final', this.formatDate(service.prazoFinal))}${row('Observações', service.observacoes)}</table><div style="padding:20px 28px;color:#475569;font-size:13px">Os documentos vinculados ao serviço seguem anexados. Esta mensagem é exclusivamente informativa. Não é necessário responder.</div><div style="padding:14px 28px;background:#0f172a;color:#fff;font-size:12px">Engerádios | Controle de Serviços | Gestão 2.0</div></div></div>`;
  }
}
