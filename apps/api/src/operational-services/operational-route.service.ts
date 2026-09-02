import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class OperationalRouteService {
  constructor(private readonly db: PrismaService) {}

  private date(value: unknown, field: string) {
    const text = String(value || '').slice(0, 10);
    const date = new Date(`${text}T00:00:00.000Z`);
    if (!text || Number.isNaN(date.getTime()))
      throw new BadRequestException(`${field} inválida`);
    return date;
  }

  private isAdmin(user: Record<string, unknown> | undefined) {
    const values = [
      user?.perfil,
      user?.profile,
      user?.role,
      ...(Array.isArray(user?.perfis) ? user.perfis : []),
      ...(Array.isArray(user?.profiles) ? user.profiles : []),
      ...(Array.isArray(user?.roles) ? user.roles : []),
    ]
      .map((value) =>
        String(value || '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);

    return values.some(
      (value) => value === 'admin' || value === 'administrador',
    );
  }

  private assertUnlocked(date: Date, user: any) {
    if (this.isAdmin(user)) return;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setUTCDate(limit.getUTCDate() - 3);
    if (date < limit)
      throw new ForbiddenException(
        'Data bloqueada há mais de 3 dias. Apenas administradores podem alterar.',
      );
  }

  async technicians(unit: string) {
    const normalized = unit.toUpperCase() === 'SP' ? 'SP' : 'RJ';
    return this.db.opLista.findMany({
      where: {
        tipo: 'responsavel',
        ativo: true,
        ...(normalized === 'SP'
          ? { unidade: 'SP' }
          : { OR: [{ unidade: { not: 'SP' } }, { unidade: null }] }),
      },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  async dispatch(query: Record<string, string | undefined>) {
    const date = this.date(query.data || new Date().toISOString(), 'Data');
    const unit = query.unidade?.toUpperCase() === 'SP' ? 'SP' : 'RJ';
    const end = new Date(date);
    const operationalWhere: Prisma.OpServicoWhereInput = {
      ativo: true,
      status: { notIn: ['Concluído', 'Cancelado'] },
      OR: [
        { areaResponsavel: { in: ['OPERACIONAL', 'AMBAS'] } },
        { areaResponsavel: null },
        { areaResponsavel: '' },
      ],
    };
    if (query.statusOperacional && query.statusOperacional !== 'Todos')
      operationalWhere.status = query.statusOperacional;

    const [visits, services, preventives, technicians] = await Promise.all([
      this.db.opRoteiroVisita.findMany({
        where: {
          dataVisita: { lte: date },
          dataFim: { gte: date },
          unidade: unit,
        },
        include: { servico: true, preventiva: true },
        orderBy: [{ tecnico: 'asc' }, { ordemExecucao: 'asc' }, { id: 'asc' }],
      }),
      this.db.opServico.findMany({
        where: operationalWhere,
        orderBy: { atualizadoEm: 'desc' },
      }),
      this.db.opPreventiva.findMany({
        orderBy: { dataProximaPreventiva: 'asc' },
      }),
      this.technicians(unit),
    ]);
    return {
      data: end,
      unidade: unit,
      visitas: visits,
      servicos: services,
      preventivas: preventives,
      tecnicos: technicians,
    };
  }

  private safeSpreadsheetText(value: unknown): string {
    let text = '';

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      text = String(value);
    }

    return /^[=+\-@\t\r\n]/.test(text) ? `\t${text}` : text;
  }

  async exportRouteXlsx(
    data: string,
    unidade: string,
    statusOperacional?: string,
  ) {
    const roteiro = await this.dispatch({
      data,
      unidade,
      statusOperacional,
    });

    const formatDate = (value: Date | string | null): string => {
      if (!value) return '';

      const parsed = value instanceof Date ? value : new Date(value);

      if (Number.isNaN(parsed.getTime())) {
        return '';
      }

      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'UTC',
      }).format(parsed);
    };

    const rows = roteiro.visitas.map((visita) => {
      const cliente =
        visita.servico?.cliente || visita.preventiva?.clienteNome || '';

      const origem =
        visita.servico?.proposta ||
        visita.servicoId ||
        visita.preventivaId ||
        visita.tipo;

      return {
        Ordem: Number(visita.ordemExecucao),
        'Data da visita': formatDate(visita.dataVisita),
        'Data final': formatDate(visita.dataFim),
        Técnico: this.safeSpreadsheetText(visita.tecnico),
        Função: this.safeSpreadsheetText(visita.funcaoProfissional),
        Unidade: this.safeSpreadsheetText(visita.unidade),
        Turno: this.safeSpreadsheetText(visita.turno),
        Tipo: this.safeSpreadsheetText(visita.tipo),
        Status: this.safeSpreadsheetText(visita.status),
        Cliente: this.safeSpreadsheetText(cliente),
        Origem: this.safeSpreadsheetText(origem),
        Observações: this.safeSpreadsheetText(visita.observacoes),
      };
    });

    const headers = [
      'Ordem',
      'Data da visita',
      'Data final',
      'Técnico',
      'Função',
      'Unidade',
      'Turno',
      'Tipo',
      'Status',
      'Cliente',
      'Origem',
      'Observações',
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: headers,
    });

    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 28 },
      { wch: 22 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 36 },
      { wch: 24 },
      { wch: 50 },
    ];

    if (worksheet['!ref']) {
      worksheet['!autofilter'] = {
        ref: worksheet['!ref'],
      };
    }

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roteiro Técnico');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
    }) as Buffer;

    const unit = unidade?.toUpperCase() === 'SP' ? 'SP' : 'RJ';

    const safeDate = String(data || '')
      .slice(0, 10)
      .replace(/[^0-9-]/g, '');

    return {
      buffer,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      name: `roteiro-tecnico-${safeDate}-${unit}.xlsx`,
    };
  }

  async agenda(query: Record<string, string | undefined>) {
    const start = this.date(
      query.dataInicio || new Date().toISOString().slice(0, 7) + '-01',
      'Data inicial',
    );
    const finish = this.date(
      query.dataFim || new Date().toISOString(),
      'Data final',
    );
    if (start > finish) throw new BadRequestException('Período inválido');
    const unit = query.unidade?.toUpperCase() === 'SP' ? 'SP' : 'RJ';
    return this.db.opRoteiroVisita.findMany({
      where: {
        unidade: unit,
        dataVisita: { gte: start, lte: finish },
        ...(query.tecnico ? { tecnico: query.tecnico } : {}),
      },
      include: { servico: true, preventiva: true },
      orderBy: [
        { dataVisita: 'desc' },
        { tecnico: 'asc' },
        { ordemExecucao: 'asc' },
      ],
    });
  }

  async assign(body: any, user: any) {
    const dataVisita = this.date(body.dataVisita, 'Data da visita');
    this.assertUnlocked(dataVisita, user);
    const tipo = String(body.tipo || '').toUpperCase();
    if (!['OPERACIONAL', 'PREVENTIVA', 'SEDE', 'AFASTADO'].includes(tipo))
      throw new BadRequestException('Tipo inválido');
    const dataFim = new Date(dataVisita);
    if (tipo === 'AFASTADO')
      dataFim.setUTCDate(
        dataFim.getUTCDate() +
          Math.max(1, Number(body.diasAfastamento) || 1) -
          1,
      );
    const profissional = await this.db.opLista.findFirst({
      where: {
        tipo: 'responsavel',
        ativo: true,
        nome: {
          equals: String(body.tecnico || '').trim(),
          mode: 'insensitive',
        },
      },
      select: {
        pessoaId: true,
        funcao: true,
        nome: true,
      },
    });

    if (!profissional?.pessoaId) {
      throw new BadRequestException(
        'Profissional não vinculado ao cadastro de pessoas.',
      );
    }

    const data: any = {
      dataVisita,
      dataFim,
      tecnico: profissional.nome,
      pessoaId: profissional.pessoaId,
      funcaoProfissional: profissional.funcao || 'Não definida',
      unidade:
        String(body.unidade || 'RJ').toUpperCase() === 'SP' ? 'SP' : 'RJ',
      turno:
        tipo === 'AFASTADO'
          ? 'Diurno'
          : body.turno === 'Noturno'
            ? 'Noturno'
            : 'Diurno',
      tipo,
      servicoId: tipo === 'OPERACIONAL' ? String(body.origemId || '') : null,
      preventivaId: tipo === 'PREVENTIVA' ? BigInt(body.origemId) : null,
      observacoes: String(body.observacoes || '').trim() || null,
      criadoPor: String(user?.nome || user?.email || user?.sub || 'sistema'),
      ordemExecucao:
        tipo === 'AFASTADO' ? 1 : Math.max(1, Number(body.ordemExecucao) || 1),
      status: 'Agendado',
    };
    if (!data.tecnico) throw new BadRequestException('Técnico é obrigatório');
    if (tipo === 'OPERACIONAL' && !data.servicoId)
      throw new BadRequestException('Serviço é obrigatório');
    if (tipo === 'PREVENTIVA' && !data.preventivaId)
      throw new BadRequestException('Preventiva é obrigatória');
    try {
      return await this.db.opRoteiroVisita.create({
        data,
        include: {
          servico: true,
          preventiva: true,
          pessoa: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Este profissional já está associado ao item, turno e data informados.',
        );
      }

      throw error;
    }
  }

  async move(id: bigint, body: any, user: any) {
    const current = await this.db.opRoteiroVisita.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Visita não encontrada');
    }

    this.assertUnlocked(current.dataVisita, user);

    const tipo = String(body.tipo || current.tipo).toUpperCase();

    if (!['OPERACIONAL', 'PREVENTIVA', 'SEDE', 'AFASTADO'].includes(tipo)) {
      throw new BadRequestException('Tipo inválido');
    }

    const tecnico = String(body.tecnico || current.tecnico).trim();
    const ordemExecucao = Math.max(
      1,
      Number(body.ordemExecucao || current.ordemExecucao),
    );

    if (!tecnico) {
      throw new BadRequestException('Técnico é obrigatório');
    }

    let servicoId: string | null = current.servicoId;
    let preventivaId: bigint | null = current.preventivaId;

    if (tipo === 'OPERACIONAL') {
      servicoId = String(body.origemId || current.servicoId || '');

      if (!servicoId) {
        throw new BadRequestException('Serviço é obrigatório');
      }

      preventivaId = null;
    } else if (tipo === 'PREVENTIVA') {
      const origem = body.origemId || current.preventivaId;

      if (!origem) {
        throw new BadRequestException('Preventiva é obrigatória');
      }

      preventivaId = BigInt(origem);
      servicoId = null;
    } else {
      servicoId = null;
      preventivaId = null;
    }

    return this.db.$transaction(async (tx) => {
      await tx.opRoteiroVisita.updateMany({
        where: {
          id: { not: id },
          tecnico,
          unidade: current.unidade,
          dataVisita: { lte: current.dataVisita },
          dataFim: { gte: current.dataVisita },
          ordemExecucao: { gte: ordemExecucao },
          tipo: { not: 'AFASTADO' },
        },
        data: {
          ordemExecucao: {
            increment: 1,
          },
        },
      });

      return tx.opRoteiroVisita.update({
        where: { id },
        data: {
          tecnico,
          tipo,
          servicoId,
          preventivaId,
          turno:
            tipo === 'AFASTADO'
              ? 'Diurno'
              : body.turno === 'Noturno'
                ? 'Noturno'
                : current.turno,
          ordemExecucao: tipo === 'AFASTADO' ? 1 : ordemExecucao,
        },
        include: {
          servico: true,
          preventiva: true,
        },
      });
    });
  }

  async remove(id: bigint, user: any) {
    const current = await this.db.opRoteiroVisita.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Visita não encontrada');
    this.assertUnlocked(current.dataVisita, user);
    return this.db.opRoteiroVisita.delete({ where: { id } });
  }

  async updateStatus(id: bigint, body: any, user: any) {
    const current = await this.db.opRoteiroVisita.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Visita não encontrada');
    this.assertUnlocked(current.dataVisita, user);
    const status = String(body.status || '').trim();
    const allowed = [
      'Agendado',
      'Em Deslocamento',
      'Em Atendimento',
      'Realizado',
      'Frustrado',
      'Cancelado',
    ];
    if (!allowed.includes(status))
      throw new BadRequestException('Status inválido');

    return this.db.$transaction(async (tx) => {
      const updated = await tx.opRoteiroVisita.update({
        where: { id },
        data: {
          status,
          observacoes: String(body.observacoes || '').trim() || null,
        },
      });
      if (
        status === 'Realizado' &&
        current.tipo === 'PREVENTIVA' &&
        current.preventivaId
      ) {
        const preventive = await tx.opPreventiva.findUnique({
          where: { id: current.preventivaId },
        });
        if (preventive) {
          const next = new Date(current.dataVisita);
          next.setUTCDate(next.getUTCDate() + preventive.frequenciaDias);
          if (
            !preventive.dataUltimaPreventiva ||
            preventive.dataUltimaPreventiva < current.dataVisita
          ) {
            await tx.opPreventiva.update({
              where: { id: current.preventivaId },
              data: {
                dataUltimaPreventiva: current.dataVisita,
                dataProximaPreventiva: next,
              },
            });
          }
        }
      }
      return updated;
    });
  }

  async markAllCompleted(body: any, user: any) {
    const date = this.date(body.dataVisita, 'Data da visita');
    this.assertUnlocked(date, user);
    const unit =
      String(body.unidade || 'RJ').toUpperCase() === 'SP' ? 'SP' : 'RJ';
    const visits = await this.db.opRoteiroVisita.findMany({
      where: {
        dataVisita: { lte: date },
        dataFim: { gte: date },
        unidade: unit,
        tipo: { in: ['OPERACIONAL', 'PREVENTIVA'] },
        status: { not: 'Realizado' },
      },
      select: { id: true },
    });
    for (const visit of visits)
      await this.updateStatus(visit.id, { status: 'Realizado' }, user);
    return { quantidade: visits.length };
  }
}
