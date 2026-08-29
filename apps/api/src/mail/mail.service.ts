import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { PrismaService } from '../database/prisma.service';
import { MailCryptoService } from './mail-crypto.service';

export interface SendEmailInput {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  contexto: string;
  referenciaId?: string;
  usuarioId?: string;
  attachments?: Array<{
    filename: string;
    path: string;
    cid?: string;
    contentDisposition?: 'inline' | 'attachment';
  }>;
}

@Injectable()
export class MailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: MailCryptoService,
  ) {}

  async getPublicConfiguration() {
    const config = await this.getConfiguration();

    return {
      id: config.id,
      host: config.host,
      porta: config.porta,
      seguranca: config.seguranca,
      usuario: config.usuario,
      remetenteEmail: config.remetenteEmail,
      remetenteNome: config.remetenteNome,
      responderPara: config.responderPara,
      ativo: config.ativo,
      timeoutSegundos: config.timeoutSegundos,
      testadoEm: config.testadoEm,
      testeSucesso: config.testeSucesso,
      testeDetalhe: config.testeDetalhe,
      senhaConfigurada: Boolean(config.senhaCriptografada),
      atualizadoEm: config.atualizadoEm,
    };
  }

  async saveConfiguration(
    input: {
      host?: string;
      porta: number;
      seguranca: 'SSL' | 'STARTTLS' | 'NENHUMA';
      usuario?: string;
      senha?: string;
      remetenteEmail?: string;
      remetenteNome?: string;
      responderPara?: string;
      ativo: boolean;
      timeoutSegundos: number;
    },
    usuarioId: string,
  ) {
    const current = await this.getConfiguration();

    const password = input.senha?.trim();
    const encrypted = password ? this.crypto.encrypt(password) : null;

    await this.prisma.configuracaoEmail.update({
      where: { id: 1 },
      data: {
        host: this.optional(input.host),
        porta: input.porta,
        seguranca: input.seguranca,
        usuario: this.optional(input.usuario),
        remetenteEmail: this.optional(input.remetenteEmail),
        remetenteNome: this.optional(input.remetenteNome),
        responderPara: this.optional(input.responderPara),
        ativo: input.ativo,
        timeoutSegundos: input.timeoutSegundos,
        atualizadoPorId: usuarioId,
        atualizadoEm: new Date(),
        testeSucesso: null,
        testeDetalhe: null,
        ...(encrypted
          ? {
              senhaCriptografada: new Uint8Array(encrypted.encrypted),
              senhaIv: new Uint8Array(encrypted.iv),
              senhaTag: new Uint8Array(encrypted.tag),
            }
          : {}),
      },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId,
        entidade: 'CONFIGURACAO_EMAIL',
        entidadeId: '1',
        acao: 'ATUALIZAR',
        dadosAntes: {
          host: current.host,
          porta: current.porta,
          seguranca: current.seguranca,
          usuario: current.usuario,
          remetenteEmail: current.remetenteEmail,
          ativo: current.ativo,
          senhaConfigurada: Boolean(current.senhaCriptografada),
        },
        dadosDepois: {
          host: this.optional(input.host),
          porta: input.porta,
          seguranca: input.seguranca,
          usuario: this.optional(input.usuario),
          remetenteEmail: this.optional(input.remetenteEmail),
          ativo: input.ativo,
          senhaAlterada: Boolean(encrypted),
        },
      },
    });

    return this.getPublicConfiguration();
  }

  async verify(usuarioId?: string) {
    const config = await this.getConfiguration();

    try {
      const transporter = this.createTransporter(config);
      await transporter.verify();

      await this.prisma.configuracaoEmail.update({
        where: { id: 1 },
        data: {
          testadoEm: new Date(),
          testeSucesso: true,
          testeDetalhe: 'Conexão SMTP validada com sucesso',
          atualizadoPorId: usuarioId,
          atualizadoEm: new Date(),
        },
      });

      return {
        sucesso: true,
        mensagem: 'Conexão SMTP validada com sucesso',
      };
    } catch (error) {
      const detail = this.errorMessage(error);

      await this.prisma.configuracaoEmail.update({
        where: { id: 1 },
        data: {
          testadoEm: new Date(),
          testeSucesso: false,
          testeDetalhe: detail,
          atualizadoPorId: usuarioId,
          atualizadoEm: new Date(),
        },
      });

      throw new BadRequestException(`Falha na conexão SMTP: ${detail}`);
    }
  }

  async send(input: SendEmailInput) {
    const recipients = [
      ...new Set(
        input.to.map((email) => email.trim().toLowerCase()).filter(Boolean),
      ),
    ];

    if (!recipients.length) {
      throw new BadRequestException('Nenhum destinatário informado');
    }

    const config = await this.getConfiguration();

    if (!config.ativo) {
      throw new BadRequestException('O envio de e-mail está desativado');
    }

    const subject = input.subject.trim().slice(0, 255);

    try {
      const info = await this.createTransporter(config).sendMail({
        from: {
          name: config.remetenteNome || 'Engerádios',
          address: config.remetenteEmail || config.usuario || '',
        },
        to: recipients,
        replyTo: input.replyTo || config.responderPara || undefined,
        subject,
        text: input.text,
        html: input.html,
        attachments: input.attachments,
      });

      await this.createLog({
        ...input,
        subject,
        recipients,
        success: true,
        detail: info.messageId || info.response,
      });

      return {
        sucesso: true,
        messageId: info.messageId,
        destinatarios: recipients.length,
      };
    } catch (error) {
      const detail = this.errorMessage(error);
      const code = this.errorCode(error);

      await this.createLog({
        ...input,
        subject,
        recipients,
        success: false,
        detail,
        code,
      });

      throw new BadRequestException(`Falha no envio do e-mail: ${detail}`);
    }
  }

  private async getConfiguration() {
    const config = await this.prisma.configuracaoEmail.findUnique({
      where: { id: 1 },
    });

    if (!config) {
      throw new InternalServerErrorException(
        'Configuração de e-mail não encontrada',
      );
    }

    return config;
  }

  private createTransporter(
    config: Awaited<ReturnType<MailService['getConfiguration']>>,
  ) {
    if (!config.host?.trim()) {
      throw new BadRequestException('Servidor SMTP não configurado');
    }

    let password: string | undefined;

    if (config.senhaCriptografada && config.senhaIv && config.senhaTag) {
      password = this.crypto.decrypt(
        config.senhaCriptografada,
        config.senhaIv,
        config.senhaTag,
      );
    }

    const options: SMTPTransport.Options = {
      host: config.host.trim(),
      port: config.porta,
      secure: config.seguranca === 'SSL',
      requireTLS: config.seguranca === 'STARTTLS',
      ignoreTLS: config.seguranca === 'NENHUMA',
      connectionTimeout: config.timeoutSegundos * 1000,
      greetingTimeout: config.timeoutSegundos * 1000,
      socketTimeout: config.timeoutSegundos * 1000,
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      ...(config.usuario
        ? {
            auth: {
              user: config.usuario,
              pass: password || '',
            },
          }
        : {}),
    };

    return nodemailer.createTransport(options);
  }

  private async createLog(input: {
    contexto: string;
    referenciaId?: string;
    subject: string;
    recipients: string[];
    success: boolean;
    detail?: string;
    code?: string;
    usuarioId?: string;
  }) {
    await this.prisma.emailLog.create({
      data: {
        contexto: input.contexto.slice(0, 40),
        referenciaId: input.referenciaId?.slice(0, 100),
        assunto: input.subject,
        destinatarios: input.recipients.join('; '),
        quantidadeDestinatarios: input.recipients.length,
        sucesso: input.success,
        detalhe: input.detail?.slice(0, 1000),
        codigoErro: input.code?.slice(0, 100),
        usuarioId: input.usuarioId,
      },
    });
  }

  private optional(value?: string) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message.slice(0, 1000);
    }

    return String(error).slice(0, 1000);
  }

  private errorCode(error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return String(error.code).slice(0, 100);
    }

    return 'SMTP';
  }
}
