import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { ReceiveLogisticsProposalDto } from './dto/logistics-proposals.dto';

interface LogisticsProposalQuery {
  q?: string;
  status?: string;
  area?: string;
  pagina?: string;
  porPagina?: string;
}

@Injectable()
export class LogisticsProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LogisticsProposalQuery) {
    const pagina = Math.max(Number(query.pagina) || 1, 1);
    const porPagina = Math.min(Math.max(Number(query.porPagina) || 25, 1), 100);

    const where: Prisma.OpPropostaWhereInput = {
      status: {
        equals: 'APROVADO',
        mode: 'insensitive',
      },
      tipo: {
        in: await this.logisticsTypes(query.area),
      },
    };

    if (query.q?.trim()) {
      const term = query.q.trim();

      where.OR = [
        {
          numero: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          clienteNome: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          local: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          titulo: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          contrato: {
            contains: term,
            mode: 'insensitive',
          },
        },
      ];
    }

    const trackingStatus = query.status?.trim().toUpperCase();

    if (trackingStatus === 'NOVA') {
      where.acompanhamentoLogistica = null;
    } else if (trackingStatus) {
      where.acompanhamentoLogistica = {
        is: {
          status: trackingStatus,
        },
      };
    }

    const [total, itens] = await this.prisma.$transaction([
      this.prisma.opProposta.count({ where }),
      this.prisma.opProposta.findMany({
        where,
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        orderBy: [
          { acompanhamentoLogistica: { atualizadoEm: 'asc' } },
          { atualizadoEm: 'desc' },
          { numero: 'desc' },
        ],
        select: {
          id: true,
          numero: true,
          tipo: true,
          status: true,
          clienteCodigo: true,
          clienteNome: true,
          clienteMunicipio: true,
          clienteUf: true,
          local: true,
          titulo: true,
          contrato: true,
          dataCadastro: true,
          atualizadoEm: true,
          valProdutos: true,
          valServicos: true,
          valProposta: true,
          prazoExecucaoDiasUteis: true,
          acompanhamentoLogistica: true,
        },
      }),
    ]);

    const typeAreas = await this.prisma.opTipoPropostaArea.findMany({
      where: {
        tipo: {
          in: [
            ...new Set(
              itens
                .map((item) => item.tipo)
                .filter((item): item is string => typeof item === 'string'),
            ),
          ],
        },
      },
      select: {
        tipo: true,
        area: true,
      },
    });

    const areaMap = new Map(typeAreas.map((item) => [item.tipo, item.area]));

    return {
      itens: itens.map((item) => ({
        ...item,
        area: item.tipo ? (areaMap.get(item.tipo) ?? null) : null,
        nova: !item.acompanhamentoLogistica,
        acompanhamento: item.acompanhamentoLogistica ?? {
          status: 'NOVA',
          responsavel: null,
          observacoes: null,
          recebidaEm: null,
          recebidaPor: null,
        },
      })),
      total,
      pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    };
  }

  async receive(
    propostaId: number,
    body: ReceiveLogisticsProposalDto,
    actor: string,
  ) {
    const proposta = await this.prisma.opProposta.findUnique({
      where: { id: propostaId },
      include: {
        acompanhamentoLogistica: true,
      },
    });

    if (!proposta) {
      throw new NotFoundException('Proposta não encontrada.');
    }

    if (proposta.status.trim().toUpperCase() !== 'APROVADO') {
      throw new BadRequestException(
        'Somente propostas aprovadas podem ser recebidas.',
      );
    }

    const configuration = await this.prisma.opTipoPropostaArea.findUnique({
      where: {
        tipo: proposta.tipo ?? '',
      },
    });

    if (
      !configuration?.ativo ||
      !['LOGISTICA', 'AMBAS'].includes(configuration.area)
    ) {
      throw new BadRequestException(
        'A proposta não pertence ao fluxo logístico.',
      );
    }

    return this.prisma.opPropostaLogistica.upsert({
      where: { propostaId },
      create: {
        propostaId,
        status: 'RECEBIDA',
        responsavel: body.responsavel?.trim() || actor,
        observacoes: body.observacoes?.trim() || null,
        recebidaEm: new Date(),
        recebidaPor: actor,
      },
      update: {
        status: 'RECEBIDA',
        responsavel: body.responsavel?.trim() || actor,
        observacoes: body.observacoes?.trim() || null,
        recebidaEm: new Date(),
        recebidaPor: actor,
      },
    });
  }

  private async logisticsTypes(area?: string) {
    const requested = area?.trim().toUpperCase();

    const areas =
      requested && ['LOGISTICA', 'AMBAS'].includes(requested)
        ? [requested]
        : ['LOGISTICA', 'AMBAS'];

    const configurations = await this.prisma.opTipoPropostaArea.findMany({
      where: {
        ativo: true,
        area: { in: areas },
      },
      select: { tipo: true },
    });

    return configurations.map((item) => item.tipo);
  }
}
