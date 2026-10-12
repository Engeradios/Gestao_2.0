import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { MailService } from '../mail/mail.service';
import { NotificationRecipientSelectorService } from './notification-recipient-selector.service';
@Injectable()
export class OperationalFunctionalService {
  private readonly dir =
    process.env.OP_PDF_DIR || '/opt/engeradios2/storage/propostas';
  constructor(
    private readonly db: PrismaService,
    private readonly mail: MailService,
    private readonly recipientSelector: NotificationRecipientSelectorService,
  ) {}
  async proposta(numero: string) {
    const p = await this.db.opProposta.findFirst({
      where: { numero: { equals: numero.trim(), mode: 'insensitive' } },
    });
    if (!p) throw new NotFoundException('Proposta não encontrada');
    const existente = await this.db.opServico.findFirst({
      where: { proposta: { equals: p.numero, mode: 'insensitive' } },
      select: { id: true },
    });
    return {
      ...p,
      aprovada: p.status.trim().toUpperCase() === 'APROVADO',
      servicoExistente: existente?.id || null,
    };
  }
  async validarCriacao(numero: string) {
    const p = await this.proposta(numero);
    if (!p.aprovada)
      throw new BadRequestException(
        'Somente propostas APROVADO podem abrir serviço',
      );
    if (p.servicoExistente)
      throw new ConflictException('Já existe serviço para esta proposta');
    return p;
  }
  async salvarPdf(id: string, file: Express.Multer.File) {
    if (
      file.mimetype !== 'application/pdf' ||
      !file.originalname.toLowerCase().endsWith('.pdf')
    )
      throw new BadRequestException('Somente PDF é permitido');
    const head = file.buffer.subarray(0, 5).toString();
    if (head !== '%PDF-') throw new BadRequestException('Arquivo PDF inválido');
    await fs.mkdir(this.dir, { recursive: true });
    const old = await this.db.opServico.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Serviço não encontrado');
    const name = `${id}-${randomUUID()}.pdf`,
      path = join(this.dir, name);
    await fs.writeFile(path, file.buffer, { mode: 0o640 });
    if (old.propostaPdf)
      await fs.unlink(join(this.dir, old.propostaPdf)).catch(() => undefined);
    return this.db.opServico.update({
      where: { id },
      data: {
        propostaPdf: name,
        propostaPdfNome: file.originalname,
        propostaPdfEm: new Date(),
      },
    });
  }
  async obterPdf(id: string) {
    const s = await this.db.opServico.findUnique({ where: { id } });

    if (!s?.propostaPdf) {
      throw new NotFoundException('PDF não encontrado');
    }

    const path = join(this.dir, s.propostaPdf);

    try {
      await fs.access(path);
    } catch {
      throw new NotFoundException(
        'O arquivo PDF não está disponível no servidor. ' +
          'Reenvie a proposta em PDF.',
      );
    }

    return {
      path,
      name: s.propostaPdfNome || 'proposta.pdf',
    };
  }
  async excluirPdf(id: string) {
    const x = await this.obterPdf(id);
    await fs.unlink(x.path).catch(() => undefined);
    return this.db.opServico.update({
      where: { id },
      data: { propostaPdf: null, propostaPdfNome: null, propostaPdfEm: null },
    });
  }
  async enviarEmail(
    id: string,
    tipo: string,
    usuario: string,
    reenvio = false,
  ) {
    if (!['abertura', 'conclusao', 'logistica'].includes(tipo))
      throw new BadRequestException('Tipo de e-mail inválido');
    const s = await this.db.opServico.findUnique({
      where: { id },
      include: {
        andamentos: { orderBy: { registradoEm: 'desc' }, take: 10 },
        anexos: { where: { ativo: true }, orderBy: { criadoEm: 'asc' } },
      },
    });
    if (!s) throw new NotFoundException('Serviço não encontrado');
    const campo =
      tipo === 'abertura'
        ? 'recAbertura'
        : tipo === 'conclusao'
          ? 'recFaturamento'
          : 'recLogistica';
    // MAIL_OBRA_03E_V2_LOGISTICA
    const routingEvent =
      tipo === 'conclusao'
        ? 'CONCLUSAO'
        : tipo === 'logistica'
          ? 'LOGISTICA'
          : null;
    const routingSelection = routingEvent
      ? await this.recipientSelector.select({
          uf: s.ufExecucao,
          praca: s.pracaResponsavel ?? '',
          area: s.areaResponsavel ?? '',
          evento: routingEvent,
        })
      : null;
    const dest = routingSelection
      ? []
      : await this.db.opNotificacaoEmail.findMany({
          where: { ativo: true, [campo]: true },
          select: { email: true },
        });
    const emails = routingSelection
      ? routingSelection.destinatarios.map((item) => item.email)
      : dest.map((item) => item.email).filter(Boolean);
    if (!emails.length)
      throw new BadRequestException('Nenhum destinatário ativo configurado');
    const titulo =
      tipo === 'conclusao'
        ? 'Finalização de Serviço'
        : tipo === 'abertura'
          ? 'Abertura de Serviço'
          : 'Informativo de Logística';
    const assunto =
      `${titulo} | Proposta ${s.proposta ?? 'sem número'} | ${s.cliente} | Contrato ${s.contrato ?? 'não informado'}`.slice(
        0,
        255,
      );
    const formatDate = (value: Date | null) =>
      value
        ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(value)
        : '-';
    const clean = (value: unknown) => {
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
    };
    const detalhes = [
      ['Proposta', s.proposta],
      ['Cliente', s.cliente],
      ['Contrato', s.contrato],
      ['Pedido', s.pedido],
      ['Serviço', s.servicoAtividade],
      ['Categoria', s.categoria],
      ['Local', s.clienteLocal ?? s.enderecoInstalacao],
      ['Responsável', s.responsavel],
      ['Prioridade', s.prioridade],
      ['Status', s.status],
      ['Início planejado', formatDate(s.inicioPlanejado)],
      ['Prazo final', formatDate(s.prazoFinal)],
      ['Início realizado', formatDate(s.inicioReal)],
      ['Conclusão realizada', formatDate(s.conclusaoReal)],
      ['Próxima ação', s.proximaAcao],
      ['Última situação', s.ultimaSituacao],
      ['Observações', s.observacoes],
    ] as const;
    const text = [
      'ENGERÁDIOS | ' + titulo.toUpperCase(),
      'COMUNICADO INTERNO | NÃO REQUER RESPOSTA',
      '',
      ...detalhes.map(([k, v]) => `${k}: ${clean(v).replace(/&[^;]+;/g, '-')}`),
      '',
      'Esta mensagem é exclusivamente informativa. Não é necessário responder.',
    ].join('\n');
    const rows = detalhes
      .map(
        ([k, v]) =>
          `<tr><td style="padding:9px 12px;color:#64748b;width:180px;border-bottom:1px solid #e2e8f0">${clean(k)}</td><td style="padding:9px 12px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0">${clean(v)}</td></tr>`,
      )
      .join('');
    const html = `<div style="background:#f1f5f9;padding:24px;font-family:Arial,sans-serif"><div style="max-width:760px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><div style="padding:22px 28px;border-top:6px solid #b91c1c"><img src="cid:logo.engeradios@gestao2" alt="Engerádios" style="max-width:190px;height:auto"><h1 style="font-size:22px;color:#0f172a;margin:18px 0 5px">${clean(titulo)}</h1><div style="display:inline-block;background:#fef2f2;color:#991b1b;padding:7px 11px;border-radius:6px;font-weight:bold;font-size:12px">COMUNICADO INTERNO | NÃO REQUER RESPOSTA</div></div><table role="presentation" style="width:100%;border-collapse:collapse">${rows}</table><div style="padding:20px 28px;color:#475569;font-size:13px">Os documentos vinculados ao serviço seguem anexados. Esta mensagem é exclusivamente informativa. Não é necessário responder.</div><div style="padding:14px 28px;background:#0f172a;color:#fff;font-size:12px">Engerádios | Controle de Serviços | Gestão 2.0</div></div></div>`;
    const tentativa =
      (tipo === 'conclusao'
        ? s.emailConclusaoTentativas
        : tipo === 'logistica'
          ? s.emailLogisticaTentativas
          : s.emailAberturaTentativas) + 1;
    try {
      const propostaPdf = s.propostaPdf;
      type MailAttachment =
        | {
            filename: string;
            path: string;
            content?: never;
            cid?: string;
            contentDisposition: 'inline' | 'attachment';
          }
        | {
            filename: string;
            path?: never;
            content: Buffer;
            cid?: string;
            contentDisposition: 'inline' | 'attachment';
          };

      const candidatos: MailAttachment[] = [
        {
          filename: 'logo-engeradios.png',
          content: Buffer.from('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', 'base64'), // fallback oficial incorporado
          cid: 'logo.engeradios@gestao2',
          contentDisposition: 'inline' as const,
        },
        ...s.anexos.map((item) => ({
          filename: item.nomeOriginal,
          path: item.caminho,
          contentDisposition: 'attachment' as const,
        })),
        ...(propostaPdf &&
        !s.anexos.some((item) => item.caminho === join(this.dir, propostaPdf))
          ? [
              {
                filename: s.propostaPdfNome ?? 'proposta.pdf',
                path: join(this.dir, propostaPdf),
                contentDisposition: 'attachment' as const,
              },
            ]
          : []),
      ];
      const verificados = await Promise.all(
        candidatos.map(async (item) => {
          if ('content' in item && item.content) {
            return { item, disponivel: true };
          }
          try {
            await fs.access(item.path);
            return { item, disponivel: true };
          } catch {
            return { item, disponivel: false };
          }
        }),
      );
      const attachments = verificados
        .filter((entry) => entry.disponivel)
        .map((entry) => entry.item);
      if (
        !attachments.some(
          (item) => 'cid' in item && item.cid === 'logo.engeradios@gestao2',
        )
      ) {
        throw new BadRequestException(
          'Logo oficial indisponível para o e-mail',
        );
      }
      await this.mail.send({
        to: emails,
        subject: assunto,
        text,
        html,
        attachments,
        contexto: `SERVICO_${tipo.toUpperCase()}`,
        referenciaId: id,
      });
      await this.db.opEmailLog.create({
        data: {
          servicoId: id,
          tipo,
          assunto,
          destinatarios: emails.join('; '),
          qtdDest: emails.length,
          sucesso: true,
          detalhe: routingSelection
            ? `${reenvio ? 'Reenvio manual' : 'Envio'} | ROTEAMENTO:${routingSelection.estrategia}`
            : reenvio
              ? 'Reenvio manual'
              : 'Envio',
          comAnexo: attachments.length > 0,
          usuario,
          tentativa,
          reenvio,
        },
      });
      await this.db.opServico.update({
        where: { id },
        data:
          tipo === 'conclusao'
            ? {
                emailConclusaoStatus: 'ENVIADO',
                emailConclusaoTentativas: tentativa,
                emailConclusaoErro: null,
                notificadoEm: new Date(),
              }
            : tipo === 'logistica'
              ? {
                  emailLogisticaStatus: 'ENVIADO',
                  emailLogisticaTentativas: tentativa,
                  emailLogisticaErro: null,
                }
              : {
                  emailAberturaStatus: 'ENVIADO',
                  emailAberturaTentativas: tentativa,
                  emailAberturaErro: null,
                  abertoEm: new Date(),
                },
      });
      return { sucesso: true, destinatarios: emails.length };
    } catch (error: unknown) {
      const detalhe =
        error instanceof Error
          ? error.message.slice(0, 240)
          : 'Falha não identificada';
      const codigoErro =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string'
          ? error.code.slice(0, 100)
          : 'SMTP';
      await this.db.opEmailLog.create({
        data: {
          servicoId: id,
          tipo,
          assunto,
          destinatarios: emails.join('; '),
          qtdDest: emails.length,
          sucesso: false,
          detalhe,
          comAnexo: !!s.propostaPdf,
          usuario,
          tentativa,
          reenvio,
          codigoErro,
        },
      });
      await this.db.opServico.update({
        where: { id },
        data:
          tipo === 'conclusao'
            ? {
                emailConclusaoStatus: 'FALHA',
                emailConclusaoTentativas: tentativa,
                emailConclusaoErro: detalhe,
              }
            : tipo === 'logistica'
              ? {
                  emailLogisticaStatus: 'FALHA',
                  emailLogisticaTentativas: tentativa,
                  emailLogisticaErro: detalhe,
                }
              : {
                  emailAberturaStatus: 'FALHA',
                  emailAberturaTentativas: tentativa,
                  emailAberturaErro: detalhe,
                },
      });
      throw new BadRequestException(`Falha no envio: ${detalhe}`);
    }
  }
  atualizarLista(id: bigint, b: Record<string, unknown>) {
    const data = { ...b };
    delete data.id;
    return this.db.opLista.update({ where: { id }, data: data as never });
  }
  atualizarNotificacao(id: bigint, b: Record<string, unknown>) {
    const data = { ...b };
    delete data.id;
    return this.db.opNotificacaoEmail.update({
      where: { id },
      data: data as never,
    });
  }
  excluirNotificacao(id: bigint) {
    return this.db.opNotificacaoEmail.delete({ where: { id } });
  }
}
