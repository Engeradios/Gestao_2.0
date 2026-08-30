import { AppFieldTermsService } from './app-field-terms.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  FinishShiftDto,
  PauseShiftDto,
  RegisterDeviceDto,
  ResumeShiftDto,
  StartShiftDto,
  TelemetryDto,
} from './dto/app-field-core.dto';

@Injectable()
export class AppFieldCoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly terms: AppFieldTermsService,
  ) {}

  private async identity(usuarioId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, pessoaId: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async registerDevice(usuarioId: string, dto: RegisterDeviceDto) {
    const user = await this.identity(usuarioId);
    const existing = await this.prisma.appCampoDispositivo.findUnique({
      where: { identificador: dto.identificador },
    });
    if (existing && existing.usuarioId !== usuarioId)
      throw new ConflictException('Dispositivo já associado a outro usuário');
    const data = {
      usuarioId,
      pessoaId: user.pessoaId,
      plataforma: dto.plataforma,
      modelo: dto.modelo,
      fabricante: dto.fabricante,
      versaoSistema: dto.versaoSistema,
      versaoAplicativo: dto.versaoAplicativo,
      corporativo: dto.corporativo ?? false,
      ativo: true,
      ultimoAcessoEm: new Date(),
      atualizadoEm: new Date(),
    };
    return existing
      ? this.prisma.appCampoDispositivo.update({
          where: { id: existing.id },
          data,
        })
      : this.prisma.appCampoDispositivo.create({
          data: { identificador: dto.identificador, ...data },
        });
  }

  devices(usuarioId: string) {
    return this.prisma.appCampoDispositivo.findMany({
      where: { usuarioId, ativo: true },
      orderBy: { ultimoAcessoEm: 'desc' },
      select: {
        id: true,
        identificador: true,
        plataforma: true,
        modelo: true,
        fabricante: true,
        versaoSistema: true,
        versaoAplicativo: true,
        corporativo: true,
        ativo: true,
        ultimoAcessoEm: true,
      },
    });
  }

  current(usuarioId: string) {
    return this.prisma.appCampoExpediente.findFirst({
      where: { usuarioId, status: { in: ['ATIVO', 'PAUSADO'] } },
      orderBy: { iniciadoServidorEm: 'desc' },
      include: {
        dispositivo: true,
        pausas: { orderBy: { iniciadaServidorEm: 'desc' }, take: 1 },
      },
    });
  }

  async start(usuarioId: string, dto: StartShiftDto) {
    await this.terms.assertAccepted(usuarioId);
    const user = await this.identity(usuarioId);
    const repeated = await this.prisma.appCampoExpediente.findUnique({
      where: { eventoInicioId: dto.eventoInicioId },
    });
    if (repeated) {
      if (repeated.usuarioId !== usuarioId) throw new ForbiddenException();
      return repeated;
    }
    const active = await this.current(usuarioId);
    if (active)
      throw new ConflictException('Já existe expediente ativo ou pausado');
    const deviceId = BigInt(dto.dispositivoId);
    const device = await this.prisma.appCampoDispositivo.findFirst({
      where: { id: deviceId, usuarioId, ativo: true },
    });
    if (!device)
      throw new BadRequestException(
        'Dispositivo inválido ou não associado ao usuário',
      );
    return this.prisma.appCampoExpediente.create({
      data: {
        usuarioId,
        pessoaId: user.pessoaId,
        dispositivoId: device.id,
        eventoInicioId: dto.eventoInicioId,
        status: 'ATIVO',
        origem: 'APP',
        iniciadoDispositivoEm: new Date(dto.iniciadoDispositivoEm),
      },
    });
  }

  private async owned(usuarioId: string, id: string) {
    let value: bigint;
    try {
      value = BigInt(id);
    } catch {
      throw new BadRequestException('ID de expediente inválido');
    }
    const shift = await this.prisma.appCampoExpediente.findFirst({
      where: { id: value, usuarioId },
    });
    if (!shift) throw new NotFoundException('Expediente não encontrado');
    return shift;
  }

  async pause(usuarioId: string, id: string, dto: PauseShiftDto) {
    const shift = await this.owned(usuarioId, id);
    if (shift.status !== 'ATIVO')
      throw new ConflictException('Somente expediente ativo pode ser pausado');
    const repeated = await this.prisma.appCampoPausa.findUnique({
      where: { eventoInicioId: dto.eventoInicioId },
    });
    if (repeated) return repeated;
    return this.prisma.$transaction(async (tx) => {
      const pause = await tx.appCampoPausa.create({
        data: {
          expedienteId: shift.id,
          eventoInicioId: dto.eventoInicioId,
          motivo: dto.motivo,
          iniciadaDispositivoEm: new Date(dto.iniciadaDispositivoEm),
        },
      });
      await tx.appCampoExpediente.update({
        where: { id: shift.id },
        data: { status: 'PAUSADO' },
      });
      return pause;
    });
  }

  async resume(usuarioId: string, id: string, dto: ResumeShiftDto) {
    const shift = await this.owned(usuarioId, id);
    if (shift.status !== 'PAUSADO')
      throw new ConflictException('Expediente não está pausado');
    const pause = await this.prisma.appCampoPausa.findFirst({
      where: { expedienteId: shift.id, eventoFimId: null },
      orderBy: { iniciadaServidorEm: 'desc' },
    });
    if (!pause) throw new ConflictException('Pausa aberta não encontrada');
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.appCampoPausa.update({
        where: { id: pause.id },
        data: {
          eventoFimId: dto.eventoFimId,
          finalizadaDispositivoEm: new Date(dto.finalizadaDispositivoEm),
          finalizadaServidorEm: new Date(),
        },
      });
      await tx.appCampoExpediente.update({
        where: { id: shift.id },
        data: { status: 'ATIVO' },
      });
      return result;
    });
  }

  async finish(usuarioId: string, id: string, dto: FinishShiftDto) {
    const shift = await this.owned(usuarioId, id);
    if (shift.status === 'FINALIZADO') return shift;
    if (!['ATIVO', 'PAUSADO'].includes(shift.status))
      throw new ConflictException('Expediente não pode ser finalizado');
    return this.prisma.$transaction(async (tx) => {
      if (shift.status === 'PAUSADO') {
        const pause = await tx.appCampoPausa.findFirst({
          where: { expedienteId: shift.id, eventoFimId: null },
          orderBy: { iniciadaServidorEm: 'desc' },
        });
        if (pause)
          await tx.appCampoPausa.update({
            where: { id: pause.id },
            data: {
              eventoFimId: `AUTO-${dto.eventoFimId}`,
              finalizadaDispositivoEm: new Date(dto.finalizadoDispositivoEm),
              finalizadaServidorEm: new Date(),
            },
          });
      }
      return tx.appCampoExpediente.update({
        where: { id: shift.id },
        data: {
          eventoFimId: dto.eventoFimId,
          status: 'FINALIZADO',
          finalizadoDispositivoEm: new Date(dto.finalizadoDispositivoEm),
          finalizadoServidorEm: new Date(),
        },
      });
    });
  }

  async telemetry(usuarioId: string, id: string, dto: TelemetryDto) {
    await this.terms.assertAccepted(usuarioId);

    const shift = await this.owned(usuarioId, id);

    if (shift.status !== 'ATIVO') {
      throw new ConflictException(
        'Telemetria permitida somente durante expediente ativo',
      );
    }

    const existing = await this.prisma.appCampoTelemetria.findUnique({
      where: {
        eventoId: dto.eventoId,
      },
    });

    if (existing) {
      if (existing.usuarioId !== usuarioId) {
        throw new ForbiddenException();
      }

      return {
        id: existing.id,
        eventoId: existing.eventoId,
        duplicado: true,
        recebidoEm: existing.recebidoEm,
      };
    }

    let dispositivoId: bigint;

    try {
      dispositivoId = BigInt(dto.dispositivoId);
    } catch {
      throw new BadRequestException('ID de dispositivo inválido');
    }

    const device = await this.prisma.appCampoDispositivo.findFirst({
      where: {
        id: dispositivoId,
        usuarioId,
        ativo: true,
      },
    });

    if (!device) {
      throw new BadRequestException(
        'Dispositivo inválido ou não associado ao usuário',
      );
    }

    if (shift.dispositivoId !== null && shift.dispositivoId !== device.id) {
      throw new ForbiddenException(
        'Dispositivo diferente do utilizado no expediente',
      );
    }

    const capturedAt = new Date(dto.capturadoEm);

    if (Number.isNaN(capturedAt.getTime())) {
      throw new BadRequestException('Data de captura inválida');
    }

    const toleranceMs = 5 * 60 * 1000;
    const currentTime = Date.now();

    if (capturedAt.getTime() > currentTime + toleranceMs) {
      throw new BadRequestException('Data de captura está no futuro');
    }

    if (
      capturedAt.getTime() <
      shift.iniciadoDispositivoEm.getTime() - toleranceMs
    ) {
      throw new BadRequestException('Captura anterior ao início do expediente');
    }

    const created = await this.prisma.appCampoTelemetria.create({
      data: {
        eventoId: dto.eventoId,
        usuarioId,
        pessoaId: shift.pessoaId,
        expedienteId: shift.id,
        dispositivoId: device.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        precisaoMetros: dto.precisaoMetros,
        altitudeMetros: dto.altitudeMetros,
        velocidadeMetrosSegundo: dto.velocidadeMetrosSegundo,
        bateriaPercentual: dto.bateriaPercentual,
        carregando: dto.carregando,
        tipoConexao: dto.tipoConexao,
        qualidadeSinal: dto.qualidadeSinal,
        online: dto.online,
        enderecoLogradouro: dto.enderecoLogradouro,
        enderecoNumero: dto.enderecoNumero,
        enderecoBairro: dto.enderecoBairro,
        enderecoCidade: dto.enderecoCidade,
        enderecoUf: dto.enderecoUf,
        enderecoCompleto: dto.enderecoCompleto,
        capturadoEm: capturedAt,
      },
    });

    return {
      id: created.id,
      eventoId: created.eventoId,
      duplicado: false,
      recebidoEm: created.recebidoEm,
    };
  }
}
