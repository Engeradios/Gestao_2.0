import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

type TokenType = 'ATIVACAO' | 'RECUPERACAO';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private appUrl(): string {
    return (
      process.env.PUBLIC_APP_URL || 'https://gestao.engeradios.com.br'
    ).replace(/\/+$/, '');
  }

  private escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async createToken(
    usuarioId: string,
    tipo: TokenType,
    ip?: string,
    userAgent?: string,
  ): Promise<string> {
    const token = randomBytes(48).toString('base64url');
    const tokenHash = this.hash(token);
    const expiraEm = new Date();

    expiraEm.setMinutes(
      expiraEm.getMinutes() + (tipo === 'ATIVACAO' ? 24 * 60 : 60),
    );

    await this.prisma.$transaction([
      this.prisma.tokenAutenticacao.updateMany({
        where: {
          usuarioId,
          tipo,
          utilizadoEm: null,
        },
        data: {
          utilizadoEm: new Date(),
        },
      }),
      this.prisma.tokenAutenticacao.create({
        data: {
          usuarioId,
          tipo,
          tokenHash,
          expiraEm,
          ip,
          userAgent,
        },
      }),
    ]);

    return token;
  }

  private emailHtml(input: {
    title: string;
    name: string;
    buttonLabel: string;
    actionUrl: string;
    expiration: string;
    introduction: string;
    userEmail?: string;
  }): string {
    const lt = String.fromCharCode(60);
    const gt = String.fromCharCode(62);
    const appUrl = this.appUrl();

    const tag = (value: string) =>
      value.replaceAll('__LT__', lt).replaceAll('__GT__', gt);

    return tag(`
__LT__div style="background:#f1f5f9;padding:32px;font-family:Arial,sans-serif"__GT__
  __LT__div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden"__GT__
    __LT__div style="background:#0f172a;padding:28px;text-align:center"__GT__
      __LT__img src="cid:logo-engeradios@gestao" alt="Engerádios" width="220" style="display:block;max-width:220px;height:auto;margin:auto" /__GT__
    __LT__/div__GT__

    __LT__div style="padding:32px;color:#334155"__GT__
      __LT__h1 style="margin:0 0 20px;color:#0f172a;font-size:24px"__GT__
        ${this.escape(input.title)}
      __LT__/h1__GT__

      __LT__p__GT__Olá, __LT__strong__GT__${this.escape(input.name)}__LT__/strong__GT__.__LT__/p__GT__
      __LT__p__GT__${this.escape(input.introduction)}__LT__/p__GT__

      ${
        input.userEmail
          ? `__LT__div style="margin:20px 0;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px"__GT__
               __LT__strong__GT__Usuário:__LT__/strong__GT__ ${this.escape(input.userEmail)}
             __LT__/div__GT__`
          : ''
      }

      __LT__div style="margin:30px 0;text-align:center"__GT__
        __LT__a href="${input.actionUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:10px"__GT__
          ${this.escape(input.buttonLabel)}
        __LT__/a__GT__
      __LT__/div__GT__

      __LT__p style="font-size:14px"__GT__
        Acesso ao portal:
        __LT__a href="${appUrl}" style="color:#dc2626"__GT__${appUrl}__LT__/a__GT__
      __LT__/p__GT__

      __LT__p style="font-size:13px;color:#64748b"__GT__
        Este link é pessoal, de uso único e expira em ${this.escape(input.expiration)}.
        Caso expire, solicite um novo envio na página de acesso.
      __LT__/p__GT__
    __LT__/div__GT__
  __LT__/div__GT__
__LT__/div__GT__
    `);
  }

  private logoAttachment() {
    return {
      filename: 'logo_escuro.png',
      path: '/opt/engeradios2/apps/web/public/brand/logo_escuro.png',
      cid: 'logo-engeradios@gestao',
      contentDisposition: 'inline' as const,
    };
  }

  async sendWelcome(input: {
    usuarioId: string;
    nome: string;
    email: string;
    ip?: string;
    userAgent?: string;
  }) {
    const token = await this.createToken(
      input.usuarioId,
      'ATIVACAO',
      input.ip,
      input.userAgent,
    );

    const appUrl = this.appUrl();
    const link = `${appUrl}/definir-senha?token=` + encodeURIComponent(token);

    await this.mail.send({
      to: [input.email],
      subject: 'Bem-vindo ao Gestão Engerádios 2.0',
      contexto: 'USUARIO_BOAS_VINDAS',
      referenciaId: input.usuarioId,
      usuarioId: input.usuarioId,
      attachments: [this.logoAttachment()],
      text:
        `Olá, ${input.nome}.\n\n` +
        `Seu acesso foi criado.\nUsuário: ${input.email}\n` +
        `Definir senha: ${link}\nPortal: ${appUrl}`,
      html: this.emailHtml({
        title: 'Bem-vindo ao Gestão Engerádios 2.0',
        name: input.nome,
        introduction: 'Seu acesso ao sistema foi criado.',
        userEmail: input.email,
        buttonLabel: 'Acessar e definir minha senha',
        actionUrl: link,
        expiration: '24 horas',
      }),
    });

    return { enviado: true };
  }

  async requestRecovery(emailValue: string, ip?: string, userAgent?: string) {
    const email = emailValue.trim().toLowerCase();

    const user = await this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        status: true,
      },
    });

    if (user?.status === 'ATIVO') {
      const recent = await this.prisma.tokenAutenticacao.count({
        where: {
          usuarioId: user.id,
          tipo: 'RECUPERACAO',
          criadoEm: {
            gte: new Date(Date.now() - 15 * 60 * 1000),
          },
        },
      });

      if (recent < 3) {
        const token = await this.createToken(
          user.id,
          'RECUPERACAO',
          ip,
          userAgent,
        );

        const appUrl = this.appUrl();
        const link =
          `${appUrl}/redefinir-senha?token=` + encodeURIComponent(token);

        await this.mail.send({
          to: [user.email],
          subject: 'Redefinição de senha',
          contexto: 'RECUPERACAO_SENHA',
          referenciaId: user.id,
          usuarioId: user.id,
          attachments: [this.logoAttachment()],
          text:
            `Olá, ${user.nome}.\n\nRedefina sua senha: ${link}\n` +
            `Portal: ${appUrl}`,
          html: this.emailHtml({
            title: 'Redefinição de senha',
            name: user.nome,
            introduction: 'Foi solicitada a redefinição da sua senha.',
            buttonLabel: 'Redefinir minha senha',
            actionUrl: link,
            expiration: '60 minutos',
          }),
        });
      }
    }

    return {
      message:
        'Se o e-mail estiver cadastrado e ativo, enviaremos as instruções.',
    };
  }

  async resetPassword(dto: ResetPasswordDto, ip?: string, userAgent?: string) {
    if (dto.novaSenha !== dto.confirmarSenha) {
      throw new BadRequestException('A confirmação da senha não confere.');
    }

    const tokenHash = this.hash(dto.token);

    const token = await this.prisma.tokenAutenticacao.findUnique({
      where: { tokenHash },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (
      !token ||
      token.utilizadoEm ||
      token.expiraEm <= new Date() ||
      token.usuario.status !== 'ATIVO'
    ) {
      throw new BadRequestException('Link inválido, expirado ou já utilizado.');
    }

    const senhaHash = await bcrypt.hash(dto.novaSenha, 12);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: token.usuarioId },
        data: {
          senhaHash,
          trocarSenha: false,
        },
      }),
      this.prisma.tokenAutenticacao.updateMany({
        where: {
          usuarioId: token.usuarioId,
          utilizadoEm: null,
        },
        data: {
          utilizadoEm: new Date(),
        },
      }),
      this.prisma.auditoria.create({
        data: {
          usuarioId: token.usuarioId,
          entidade: 'USUARIO',
          entidadeId: token.usuarioId,
          acao:
            token.tipo === 'ATIVACAO' ? 'USUARIO_ATIVADO' : 'SENHA_RECUPERADA',
          ip,
          userAgent,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Senha definida com sucesso.',
    };
  }
}
