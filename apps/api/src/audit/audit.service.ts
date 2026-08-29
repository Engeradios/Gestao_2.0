import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditQueryDto) {
    const inicio = query.inicio ? new Date(query.inicio) : undefined;
    const fim = query.fim ? new Date(query.fim) : undefined;
    if (inicio && fim && inicio > fim) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à final',
      );
    }

    const term = query.busca?.trim();
    const where = {
      ...(query.usuarioId ? { usuarioId: query.usuarioId } : {}),
      ...(query.entidade
        ? {
            entidade: {
              contains: query.entidade.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query.acao
        ? {
            acao: { contains: query.acao.trim(), mode: 'insensitive' as const },
          }
        : {}),
      ...(query.entidadeId
        ? {
            entidadeId: {
              contains: query.entidadeId.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(inicio || fim
        ? {
            criadoEm: {
              ...(inicio ? { gte: inicio } : {}),
              ...(fim ? { lte: fim } : {}),
            },
          }
        : {}),
      ...(term
        ? {
            OR: [
              { entidade: { contains: term, mode: 'insensitive' as const } },
              { entidadeId: { contains: term, mode: 'insensitive' as const } },
              { acao: { contains: term, mode: 'insensitive' as const } },
              { ip: { contains: term, mode: 'insensitive' as const } },
              {
                usuario: {
                  nome: { contains: term, mode: 'insensitive' as const },
                },
              },
              {
                usuario: {
                  email: { contains: term, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.pagina - 1) * query.limite;
    const [total, records] = await this.prisma.$transaction([
      this.prisma.auditoria.count({ where }),
      this.prisma.auditoria.findMany({
        where,
        skip,
        take: query.limite,
        select: {
          id: true,
          entidade: true,
          entidadeId: true,
          acao: true,
          dadosAntes: true,
          dadosDepois: true,
          ip: true,
          userAgent: true,
          criadoEm: true,
          usuario: { select: { id: true, nome: true, email: true } },
        },
        orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
      }),
    ]);

    return {
      dados: records.map((record) => ({ ...record, id: record.id.toString() })),
      paginacao: {
        pagina: query.pagina,
        limite: query.limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / query.limite)),
      },
    };
  }

  async findOne(id: string) {
    let numericId: bigint;
    try {
      numericId = BigInt(id);
    } catch {
      throw new BadRequestException('Identificador de auditoria inválido');
    }

    const record = await this.prisma.auditoria.findUnique({
      where: { id: numericId },
      select: {
        id: true,
        entidade: true,
        entidadeId: true,
        acao: true,
        dadosAntes: true,
        dadosDepois: true,
        ip: true,
        userAgent: true,
        criadoEm: true,
        usuario: { select: { id: true, nome: true, email: true } },
      },
    });
    if (!record)
      throw new NotFoundException('Registro de auditoria não encontrado');
    return { ...record, id: record.id.toString() };
  }

  async filters() {
    const [entidades, acoes, usuarios] = await this.prisma.$transaction([
      this.prisma.auditoria.findMany({
        distinct: ['entidade'],
        select: { entidade: true },
        orderBy: { entidade: 'asc' },
      }),
      this.prisma.auditoria.findMany({
        distinct: ['acao'],
        select: { acao: true },
        orderBy: { acao: 'asc' },
      }),
      this.prisma.usuario.findMany({
        where: { auditorias: { some: {} } },
        select: { id: true, nome: true, email: true },
        orderBy: { nome: 'asc' },
      }),
    ]);

    return {
      entidades: entidades.map((item) => item.entidade),
      acoes: acoes.map((item) => item.acao),
      usuarios,
    };
  }
}
