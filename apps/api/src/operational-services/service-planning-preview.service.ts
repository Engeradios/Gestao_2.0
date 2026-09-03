import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ServicePlanningRulesService } from './service-planning-rules.service';

export type ServicePlanningPreviewInput = {
  proposta: string;
  areaResponsavel: string;
  ufExecucao: string;
  pracaResponsavel: string;
  tempoExecucaoDias?: string;
};

@Injectable()
export class ServicePlanningPreviewService {
  constructor(
    private readonly db: PrismaService,
    private readonly planningRules: ServicePlanningRulesService,
  ) {}

  async preview(input: ServicePlanningPreviewInput) {
    const proposalNumber = input.proposta?.trim();
    if (!proposalNumber) {
      throw new BadRequestException('Proposta é obrigatória.');
    }

    const proposta = await this.db.opProposta.findFirst({
      where: {
        numero: { equals: proposalNumber, mode: 'insensitive' },
      },
    });

    if (!proposta) throw new NotFoundException('Proposta não encontrada.');
    if (proposta.status.trim().toUpperCase() !== 'APROVADO') {
      throw new BadRequestException(
        'Somente propostas aprovadas podem gerar prévia.',
      );
    }

    const tipo = proposta.tipo?.trim();
    if (!tipo) {
      throw new BadRequestException('A proposta não possui tipo definido.');
    }

    const configuration = await this.db.opTipoPropostaArea.findUnique({
      where: { tipo },
    });
    if (!configuration?.ativo) {
      throw new BadRequestException('Tipo de proposta sem área ativa.');
    }

    const requestedArea = input.areaResponsavel?.trim().toUpperCase();
    if (!requestedArea || requestedArea !== configuration.area) {
      throw new BadRequestException(
        'Área informada incompatível com o tipo da proposta.',
      );
    }

    const square = input.pracaResponsavel?.trim().replace(/\s+/g, ' ');
    if (!square || square.length > 160) {
      throw new BadRequestException(
        'Praça responsável é obrigatória e deve possuir até 160 caracteres.',
      );
    }

    const approvalEvolution = await this.db.opPropostaEvolucao.findFirst({
      where: {
        proposta: { is: { id: proposta.id } },
        campo: { equals: 'STATUS', mode: 'insensitive' },
        valorNovo: { equals: 'APROVADO', mode: 'insensitive' },
      },
      select: { registradoEm: true },
      orderBy: { registradoEm: 'desc' },
    });

    const approvalDate =
      approvalEvolution?.registradoEm ??
      proposta.atualizadoEm ??
      proposta.dataCadastro;
    if (!approvalDate) {
      throw new BadRequestException(
        'Não foi possível identificar a data de aprovação da proposta.',
      );
    }

    const approvalDateOrigin = approvalEvolution?.registradoEm
      ? 'HISTORICO_STATUS'
      : proposta.atualizadoEm
        ? 'ATUALIZADO_EM'
        : 'DATA_CADASTRO';

    const executionBusinessDays = input.tempoExecucaoDias?.trim()
      ? Number(input.tempoExecucaoDias)
      : null;
    const planning = await this.planningRules.calculate({
      area: requestedArea,
      approvalDate,
      uf: input.ufExecucao || '',
      executionBusinessDays,
    });

    return {
      proposta: proposta.numero,
      tipoProposta: tipo,
      areaResponsavel: planning.area,
      ufExecucao: planning.uf,
      pracaResponsavel: square,
      dataAprovacao: this.dateKey(approvalDate),
      origemDataAprovacao: approvalDateOrigin,
      diasPreparacao: planning.preparationBusinessDays,
      tempoExecucaoDias: planning.executionBusinessDays,
      chegadaPrevista: this.optionalDateKey(planning.deliveryExpectedAt),
      inicioPlanejado: this.optionalDateKey(planning.plannedStartAt),
      prazoFinal: this.dateKey(planning.deadlineAt),
      calendarioEstadualDisponivel: planning.stateCalendarAvailable,
    };
  }

  private dateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private optionalDateKey(value: Date | null): string | null {
    return value ? this.dateKey(value) : null;
  }
}
