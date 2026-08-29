import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  SaveMailConfigurationDto,
  TestMailDeliveryDto,
} from './dto/mail-configuration.dto';
import { MailService } from './mail.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('ferramentas/configuracao-email')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('FERRAMENTAS.EMAIL.CONFIGURAR')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  configuration() {
    return this.mailService.getPublicConfiguration();
  }

  @Patch()
  save(@Body() body: SaveMailConfigurationDto, @Req() request: AuthRequest) {
    return this.mailService.saveConfiguration(body, request.user.sub);
  }

  @Post('testar-conexao')
  verify(@Req() request: AuthRequest) {
    return this.mailService.verify(request.user.sub);
  }

  @Post('enviar-teste')
  sendTest(@Body() body: TestMailDeliveryDto, @Req() request: AuthRequest) {
    return this.mailService.send({
      to: [body.destinatario],
      subject: 'Teste de configuração de e-mail',
      text: 'Esta mensagem confirma que a configuração SMTP da Gestão Engerádios 2.0 está funcionando.',
      html: `
        <h2>Teste de configuração SMTP</h2>
        <p>Esta mensagem confirma que a configuração SMTP da Gestão Engerádios 2.0 está funcionando.</p>
      `,
      contexto: 'TESTE_CONFIGURACAO',
      referenciaId: 'CONFIGURACAO_EMAIL:1',
      usuarioId: request.user.sub,
    });
  }
}
