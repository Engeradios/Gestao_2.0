import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProposalTypeAreaDto } from './dto/update-proposal-type-area.dto';

interface AuditContext {
  actorId: string;
  actorName: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class ProposalTypeAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    await this.synchronize();

    const rows = await this.prisma.opTipoPropostaArea.findMany({
      orderBy: [{ ativo: 'desc' }, { tipo: 'asc' }],
    });

    const statistics = await this.prisma.opProposta.groupBy({
      by: ['tipo'],
      where: {
        tipo: { not: null },
      },
      _count: { _all: true },
    });

    const approved = await this.prisma.opProposta.groupBy({
      by: ['tipo'],
      where: {
        tipo: { not: null },
        status: { equals: 'APROVADO', mode: 'insensitive' },
      },
      _count: { _all: true },
    });

    const totals = new Map(
      statistics.map((item) => [item.tipo?.trim(), item._count._all]),
    );

    const approvedTotals = new Map(
      approved.map((item) => [item.tipo?.trim(), item._count._all]),
    );

    return rows.map((row) => ({
      ...row,
      quantidade: totals.get(row.tipo) ?? 0,
      aprovadas: approvedTotals.get(row.tipo) ?? 0,
      configurado: row.ativo && row.prazoPadraoDiasUteis !== null,
    }));
  }

  async update(
    tipo: string,
    dto: UpdateProposalTypeAreaDto,
    audit: AuditContext,
  ) {
    const normalized = decodeURIComponent(tipo).trim();

    const before = await this.prisma.opTipoPropostaArea.findUnique({
      where: { tipo: normalized },
    });

    if (!before) {
      throw new NotFoundException('Tipo de proposta não encontrado.');
    }

    const area = dto.area ?? before.area;
    const prazo = dto.prazoPadraoDiasUteis ?? before.prazoPadraoDiasUteis;
    const ativo = dto.ativo ?? before.ativo;

    if (ativo && !prazo) {
      throw new BadRequestException('Informe o prazo padrão em dias úteis.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.opTipoPropostaArea.update({
        where: { tipo: normalized },
        data: {
          area,
          prazoPadraoDiasUteis: prazo,
          ativo,
          atualizadoPor: audit.actorName,
        },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: audit.actorId,
          entidade: 'TIPO_PROPOSTA_AREA',
          entidadeId: normalized,
          acao: 'TIPO_PROPOSTA_EDITADO',
          dadosAntes: before,
          dadosDepois: updated,
          ip: audit.ip,
          userAgent: audit.userAgent,
        },
      });

      return updated;
    });
  }

  async synchronize() {
    const proposalTypes = await this.prisma.opProposta.findMany({
      where: {
        tipo: { not: null },
      },
      select: { tipo: true },
      distinct: ['tipo'],
    });

    const types = proposalTypes
      .map((item) => item.tipo?.trim())
      .filter((item): item is string => Boolean(item));

    if (!types.length) return { inserted: 0 };

    const existing = await this.prisma.opTipoPropostaArea.findMany({
      where: { tipo: { in: types } },
      select: { tipo: true },
    });

    const known = new Set(existing.map((item) => item.tipo));

    const missing = types.filter((tipo) => !known.has(tipo));

    if (missing.length) {
      await this.prisma.opTipoPropostaArea.createMany({
        data: missing.map((tipo) => ({
          tipo,
          area: 'OPERACIONAL',
          ativo: false,
          atualizadoPor: 'SINCRONIZACAO_AUTOMATICA',
        })),
        skipDuplicates: true,
      });
    }

    return { inserted: missing.length };
  }
}
