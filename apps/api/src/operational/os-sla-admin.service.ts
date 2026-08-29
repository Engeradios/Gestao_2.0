import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OsSlaHolidayDto } from './dto/os-sla-holiday.dto';
import { UpdateOsSlaConfigDto } from './dto/update-os-sla-config.dto';
import { UpdateOsSlaSchedulesDto } from './dto/update-os-sla-schedules.dto';

type Actor = {
  id: string;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class OsSlaAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    // SLA_ADMIN_USA_OP_FERIADOS
    const [config, feriados] = await this.prisma.$transaction([
      this.prisma.osSlaConfiguracao.findFirst({
        where: { ativo: true },
        orderBy: { criadoEm: 'asc' },
        include: {
          horarios: {
            orderBy: { diaSemana: 'asc' },
          },
        },
      }),
      this.prisma.opFeriado.findMany({
        orderBy: [{ dia: 'asc' }, { id: 'asc' }],
      }),
    ]);

    if (!config) {
      throw new NotFoundException('Configuração de SLA não encontrada');
    }

    return {
      ...config,
      feriados: feriados.map((feriado) => ({
        id: feriado.id.toString(),
        data: feriado.dia,
        nome: feriado.descricao ?? 'Feriado',
        uf: feriado.uf?.trim() || null,
        municipio: null,
        ativo: true,
      })),
    };
  }

  async update(body: UpdateOsSlaConfigDto, actor: Actor) {
    if (
      body.normalAteMinutos >= body.atencaoAteMinutos ||
      body.atencaoAteMinutos >= body.urgenteAteMinutos
    ) {
      throw new BadRequestException(
        'Os limites devem seguir a ordem Normal < Atenção < Urgente',
      );
    }

    const current = await this.prisma.osSlaConfiguracao.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: 'asc' },
    });

    if (!current) {
      throw new NotFoundException('Configuração de SLA não encontrada');
    }

    const before = {
      normalAteMinutos: current.normalAteMinutos,
      atencaoAteMinutos: current.atencaoAteMinutos,
      urgenteAteMinutos: current.urgenteAteMinutos,
      fusoHorario: current.fusoHorario,
    };

    const after = {
      normalAteMinutos: body.normalAteMinutos,
      atencaoAteMinutos: body.atencaoAteMinutos,
      urgenteAteMinutos: body.urgenteAteMinutos,
      fusoHorario: body.fusoHorario.trim(),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.osSlaConfiguracao.update({
        where: { id: current.id },
        data: {
          ...after,
          atualizadoPorId: actor.id,
          atualizadoEm: new Date(),
        },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'OS_SLA_CONFIGURACAO',
          entidadeId: current.id,
          acao: 'ATUALIZAR',
          dadosAntes: before,
          dadosDepois: after,
          ip: actor.ip?.slice(0, 45),
          userAgent: actor.userAgent?.slice(0, 500),
        },
      });
    });

    return this.get();
  }

  async updateSchedules(body: UpdateOsSlaSchedulesDto, actor: Actor) {
    const days = body.horarios.map((item) => item.diaSemana);

    if (
      new Set(days).size !== 7 ||
      ![0, 1, 2, 3, 4, 5, 6].every((day) => days.includes(day))
    ) {
      throw new BadRequestException(
        'Informe exatamente uma configuração para cada dia da semana',
      );
    }

    const toMinutes = (value: string) => {
      const [hours, minutes] = value.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const toTime = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

    for (const schedule of body.horarios) {
      const start = toMinutes(schedule.inicio);
      const end = toMinutes(schedule.fim);
      const breakStart = schedule.intervaloInicio
        ? toMinutes(schedule.intervaloInicio)
        : null;
      const breakEnd = schedule.intervaloFim
        ? toMinutes(schedule.intervaloFim)
        : null;

      if (end <= start) {
        throw new BadRequestException(
          `No dia ${schedule.diaSemana}, o horário final deve ser posterior ao inicial`,
        );
      }

      if ((breakStart === null) !== (breakEnd === null)) {
        throw new BadRequestException(
          `No dia ${schedule.diaSemana}, informe início e fim do intervalo`,
        );
      }

      if (
        breakStart !== null &&
        breakEnd !== null &&
        !(start < breakStart && breakStart < breakEnd && breakEnd < end)
      ) {
        throw new BadRequestException(
          `No dia ${schedule.diaSemana}, o intervalo deve estar dentro do expediente`,
        );
      }
    }

    const current = await this.prisma.osSlaConfiguracao.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: 'asc' },
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' },
        },
      },
    });

    if (!current) {
      throw new NotFoundException('Configuração de SLA não encontrada');
    }

    const before = current.horarios.map((item) => ({
      diaSemana: item.diaSemana,
      ativo: item.ativo,
      inicio: item.inicio,
      fim: item.fim,
      intervaloInicio: item.intervaloInicio,
      intervaloFim: item.intervaloFim,
    }));

    const after = body.horarios.map((item) => ({
      diaSemana: item.diaSemana,
      ativo: item.ativo,
      inicio: item.inicio,
      fim: item.fim,
      intervaloInicio: item.intervaloInicio ?? null,
      intervaloFim: item.intervaloFim ?? null,
    }));

    await this.prisma.$transaction(async (tx) => {
      for (const schedule of body.horarios) {
        await tx.osSlaHorario.upsert({
          where: {
            configuracaoId_diaSemana: {
              configuracaoId: current.id,
              diaSemana: schedule.diaSemana,
            },
          },
          create: {
            configuracaoId: current.id,
            diaSemana: schedule.diaSemana,
            ativo: schedule.ativo,
            inicio: toTime(schedule.inicio),
            fim: toTime(schedule.fim),
            intervaloInicio: schedule.intervaloInicio
              ? toTime(schedule.intervaloInicio)
              : null,
            intervaloFim: schedule.intervaloFim
              ? toTime(schedule.intervaloFim)
              : null,
          },
          update: {
            ativo: schedule.ativo,
            inicio: toTime(schedule.inicio),
            fim: toTime(schedule.fim),
            intervaloInicio: schedule.intervaloInicio
              ? toTime(schedule.intervaloInicio)
              : null,
            intervaloFim: schedule.intervaloFim
              ? toTime(schedule.intervaloFim)
              : null,
            atualizadoEm: new Date(),
          },
        });
      }

      await tx.osSlaConfiguracao.update({
        where: { id: current.id },
        data: {
          atualizadoPorId: actor.id,
          atualizadoEm: new Date(),
        },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'OS_SLA_HORARIOS',
          entidadeId: current.id,
          acao: 'ATUALIZAR',
          dadosAntes: before,
          dadosDepois: after,
          ip: actor.ip?.slice(0, 45),
          userAgent: actor.userAgent?.slice(0, 500),
        },
      });
    });

    return this.get();
  }

  private parseHolidayId(value: string) {
    if (!/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException('Identificador de feriado inválido');
    }

    return BigInt(value);
  }

  private holidayData(body: OsSlaHolidayDto) {
    const descricao = body.nome.trim();
    const uf = body.uf?.trim().toUpperCase() || null;
    const dia = new Date(`${body.data}T00:00:00.000Z`);

    if (Number.isNaN(dia.getTime())) {
      throw new BadRequestException('Data do feriado inválida');
    }

    return {
      dia,
      descricao,
      uf,
    };
  }

  private async ensureHolidayUnique(
    dia: Date,
    uf: string | null,
    ignoredId?: bigint,
  ) {
    const sameDay = await this.prisma.opFeriado.findMany({
      where: {
        dia,
        ...(ignoredId
          ? {
              id: {
                not: ignoredId,
              },
            }
          : {}),
      },
      select: {
        id: true,
        uf: true,
      },
    });

    const normalizedUf = uf ?? '';

    const duplicate = sameDay.some(
      (item) => (item.uf?.trim().toUpperCase() ?? '') === normalizedUf,
    );

    if (duplicate) {
      throw new BadRequestException(
        'Já existe feriado cadastrado para esta data e UF',
      );
    }
  }

  private holidayResponse(holiday: {
    id: bigint;
    dia: Date;
    descricao: string | null;
    uf: string | null;
  }) {
    return {
      id: holiday.id.toString(),
      data: holiday.dia,
      nome: holiday.descricao ?? 'Feriado',
      uf: holiday.uf?.trim().toUpperCase() || null,
      municipio: null,
      ativo: true,
    };
  }

  async createHoliday(body: OsSlaHolidayDto, actor: Actor) {
    const data = this.holidayData(body);

    await this.ensureHolidayUnique(data.dia, data.uf);

    const created = await this.prisma.$transaction(async (tx) => {
      const holiday = await tx.opFeriado.create({
        data,
      });

      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'OP_FERIADO',
          entidadeId: holiday.id.toString(),
          acao: 'CRIAR',
          dadosDepois: {
            id: holiday.id.toString(),
            dia: holiday.dia.toISOString(),
            descricao: holiday.descricao,
            uf: holiday.uf,
            legadoId: holiday.legado_id,
          },
          ip: actor.ip?.slice(0, 45),
          userAgent: actor.userAgent?.slice(0, 500),
        },
      });

      return holiday;
    });

    return this.holidayResponse(created);
  }

  async updateHoliday(idValue: string, body: OsSlaHolidayDto, actor: Actor) {
    const id = this.parseHolidayId(idValue);

    const current = await this.prisma.opFeriado.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Feriado não encontrado');
    }

    const data = this.holidayData(body);

    await this.ensureHolidayUnique(data.dia, data.uf, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const holiday = await tx.opFeriado.update({
        where: { id },
        data,
      });

      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'OP_FERIADO',
          entidadeId: id.toString(),
          acao: 'ATUALIZAR',
          dadosAntes: {
            id: current.id.toString(),
            dia: current.dia.toISOString(),
            descricao: current.descricao,
            uf: current.uf,
            legadoId: current.legado_id,
          },
          dadosDepois: {
            id: holiday.id.toString(),
            dia: holiday.dia.toISOString(),
            descricao: holiday.descricao,
            uf: holiday.uf,
            legadoId: holiday.legado_id,
          },
          ip: actor.ip?.slice(0, 45),
          userAgent: actor.userAgent?.slice(0, 500),
        },
      });

      return holiday;
    });

    return this.holidayResponse(updated);
  }

  async deleteHoliday(idValue: string, actor: Actor) {
    const id = this.parseHolidayId(idValue);

    const current = await this.prisma.opFeriado.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Feriado não encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.opFeriado.delete({
        where: { id },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'OP_FERIADO',
          entidadeId: id.toString(),
          acao: 'EXCLUIR',
          dadosAntes: {
            id: current.id.toString(),
            dia: current.dia.toISOString(),
            descricao: current.descricao,
            uf: current.uf,
            legadoId: current.legado_id,
          },
          ip: actor.ip?.slice(0, 45),
          userAgent: actor.userAgent?.slice(0, 500),
        },
      });
    });

    return {
      success: true,
      id: id.toString(),
    };
  }
}
