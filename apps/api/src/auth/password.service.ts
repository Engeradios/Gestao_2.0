import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class PasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async change(
    usuarioId: string,
    dto: ChangePasswordDto,
    ip?: string,
    userAgent?: string,
  ) {
    if (dto.novaSenha !== dto.confirmarSenha) {
      throw new BadRequestException('A confirmação da nova senha não confere');
    }

    if (dto.senhaAtual === dto.novaSenha) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário inválido');
    }

    const senhaValida = await bcrypt.compare(dto.senhaAtual, usuario.senhaHash);

    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual inválida');
    }

    const senhaHash = await bcrypt.hash(dto.novaSenha, 12);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          senhaHash,
          trocarSenha: false,
        },
      }),
      this.prisma.auditoria.create({
        data: {
          usuarioId: usuario.id,
          entidade: 'USUARIO',
          entidadeId: usuario.id,
          acao: 'SENHA_ALTERADA',
          ip,
          userAgent,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Senha alterada com sucesso',
    };
  }
}
