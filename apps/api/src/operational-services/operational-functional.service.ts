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
      const candidatos = [
        {
          filename: 'logo-engeradios.png',
          path: '/opt/engeradios2/apps/web/public/brand/logo_escuro.png',
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
