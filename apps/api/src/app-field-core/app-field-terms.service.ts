import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AppFieldTermsService {
  constructor(private readonly prisma: PrismaService) {}

  async current() {
    const term = await this.prisma.appCampoTermo.findFirst({
      where: { vigente: true, publicadoEm: { lte: new Date() } },
      orderBy: { publicadoEm: 'desc' },
    });
    if (!term) throw new NotFoundException('Nenhum termo vigente publicado');
    const hash = createHash('sha256')
      .update(term.conteudo, 'utf8')
      .digest('hex');
    if (hash !== term.conteudoHash)
      throw new ConflictException('Integridade do termo inválida');
    return term;
  }

  async status(usuarioId: string) {
    const term = await this.current();
    const acceptance = await this.prisma.appCampoTermoAceite.findUnique({
      where: { termoId_usuarioId: { termoId: term.id, usuarioId } },
    });
    return {
      termo: term,
      aceito: Boolean(acceptance && !acceptance.revogadoEm),
      aceite: acceptance,
    };
  }

  async accept(
    usuarioId: string,
    termIdText: string,
    deviceIdText: string | undefined,
    ip: string | undefined,
    userAgent: string | undefined,
  ) {
    let termId: bigint;
    let deviceId: bigint | undefined;
    try {
      termId = BigInt(termIdText);
      deviceId = deviceIdText ? BigInt(deviceIdText) : undefined;
    } catch {
      throw new ConflictException('Identificador inválido');
    }
    const current = await this.current();
    if (current.id !== termId)
      throw new ConflictException('Somente o termo vigente pode ser aceito');
    if (deviceId) {
      const device = await this.prisma.appCampoDispositivo.findFirst({
        where: { id: deviceId, usuarioId, ativo: true },
      });
      if (!device) throw new ConflictException('Dispositivo inválido');
    }
    return this.prisma.appCampoTermoAceite.upsert({
      where: { termoId_usuarioId: { termoId: termId, usuarioId } },
      create: {
        termoId: termId,
        usuarioId,
        dispositivoId: deviceId,
        ip,
        userAgent,
        aceitoEm: new Date(),
      },
      update: {
        dispositivoId: deviceId,
        ip,
        userAgent,
        aceitoEm: new Date(),
        revogadoEm: null,
      },
    });
  }

  async assertAccepted(usuarioId: string) {
    const state = await this.status(usuarioId);
    if (!state.aceito)
      throw new ConflictException('Aceite do termo vigente obrigatório');
  }
}
