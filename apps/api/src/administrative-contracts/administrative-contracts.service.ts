import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ContractQueryDto,
  CreateContractDto,
  CreateContractProgressDto,
  UpdateContractDto,
} from './dto/administrative-contracts.dto';

type Actor = { id: string; ip?: string; userAgent?: string };

@Injectable()
export class AdministrativeContractsService {
  constructor(private readonly prisma: PrismaService) {}

  private date(value?: string) {
    return value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : undefined;
  }
  private decimal(value?: number) {
    return value === undefined ? undefined : new Prisma.Decimal(value);
  }
  private assertActor(actor: Actor) {
    if (!actor.id)
      throw new BadRequestException('Usuário autenticado inválido');
  }
  private async existing(id: string) {
    const contract = await this.prisma.contratoAdministrativo.findFirst({
      where: { id, excluidoEm: null },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }
  private async validateReferences(
    clienteId: string,
    responsavelId?: string,
    propostaIds: number[] = [],
  ) {
    const [client, proposals] = await this.prisma.$transaction([
      this.prisma.clienteOperacional.findUnique({
        where: { id: clienteId },
        select: { id: true },
      }),
      this.prisma.opProposta.findMany({
        where: { id: { in: [...new Set(propostaIds)] } },
        select: { id: true },
      }),
    ]);
    const responsible = responsavelId
      ? await this.prisma.usuario.findUnique({
          where: { id: responsavelId },
          select: { id: true, status: true },
        })
      : null;
    if (!client) throw new BadRequestException('Cliente não encontrado');
    if (responsavelId && (!responsible || responsible.status !== 'ATIVO'))
      throw new BadRequestException('Responsável inválido ou inativo');
    if (proposals.length !== new Set(propostaIds).size)
      throw new BadRequestException(
        'Uma ou mais propostas não foram encontradas',
      );
  }
  private data(
    body: CreateContractDto | UpdateContractDto,
  ): Prisma.ContratoAdministrativoUncheckedUpdateInput {
    return {
      ...(body.titulo !== undefined ? { titulo: body.titulo } : {}),
      ...(body.tipo !== undefined ? { tipo: body.tipo || null } : {}),
      ...(body.objeto !== undefined ? { objeto: body.objeto || null } : {}),
      ...(body.etapa !== undefined ? { etapa: body.etapa } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.numeroDocumento !== undefined
        ? { numeroDocumento: body.numeroDocumento || null }
        : {}),
      ...(body.dataAssinatura !== undefined
        ? { dataAssinatura: this.date(body.dataAssinatura) }
        : {}),
      ...(body.vigenciaInicio !== undefined
        ? { vigenciaInicio: this.date(body.vigenciaInicio) }
        : {}),
      ...(body.vigenciaFim !== undefined
        ? { vigenciaFim: this.date(body.vigenciaFim) }
        : {}),
      ...(body.renovacaoAutomatica !== undefined
        ? { renovacaoAutomatica: body.renovacaoAutomatica }
        : {}),
      ...(body.avisoRenovacaoDias !== undefined
        ? { avisoRenovacaoDias: body.avisoRenovacaoDias }
        : {}),
      ...(body.valorGlobal !== undefined
        ? { valorGlobal: this.decimal(body.valorGlobal) }
        : {}),
      ...(body.valorMensal !== undefined
        ? { valorMensal: this.decimal(body.valorMensal) }
        : {}),
      ...(body.moeda !== undefined ? { moeda: body.moeda.toUpperCase() } : {}),
      ...(body.indiceReajuste !== undefined
        ? { indiceReajuste: body.indiceReajuste || null }
        : {}),
      ...(body.dataBaseReajuste !== undefined
        ? { dataBaseReajuste: this.date(body.dataBaseReajuste) }
        : {}),
      ...(body.observacoes !== undefined
        ? { observacoes: body.observacoes || null }
        : {}),
      ...(body.responsavelId !== undefined
        ? { responsavelId: body.responsavelId || null }
        : {}),
    };
  }
  private validateDates(start?: string, end?: string) {
    if (start && end && new Date(start) > new Date(end))
      throw new BadRequestException(
        'A vigência inicial não pode ser posterior à final',
      );
  }
  private async nextCode() {
    const rows = await this.prisma.$queryRaw<
      Array<{ next_value: bigint }>
    >`SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '[^0-9]', '', 'g'), '')::bigint), 0) + 1 AS next_value FROM contratos_administrativos`;
    return `ADM-CTR-${String(rows[0]?.next_value ?? 1n).padStart(6, '0')}`;
  }

  async clientOptions(search = '', page = 1, limit = 20) {
    const busca = search.trim();
    const pagina = Math.max(1, Math.trunc(page) || 1);
    const limite = Math.min(50, Math.max(1, Math.trunc(limit) || 20));
    const digits = busca.replace(/\D/g, '');
    const where: Prisma.ClienteOperacionalWhereInput = {
      ativo: true,
      ...(busca
        ? {
            OR: [
              { codigo: { contains: busca, mode: 'insensitive' } },
              { razaoSocial: { contains: busca, mode: 'insensitive' } },
              { nomeFantasia: { contains: busca, mode: 'insensitive' } },
              { cnpj: { contains: busca, mode: 'insensitive' } },
              ...(digits && digits !== busca
                ? [{ cnpj: { contains: digits, mode: 'insensitive' as const } }]
                : []),
            ],
          }
        : {}),
    };
    const [total, itens] = await this.prisma.$transaction([
      this.prisma.clienteOperacional.count({ where }),
      this.prisma.clienteOperacional.findMany({
        where,
        skip: (pagina - 1) * limite,
        take: limite,
        orderBy: [{ razaoSocial: 'asc' }, { codigo: 'asc' }],
        select: {
          id: true,
          codigo: true,
          razaoSocial: true,
          nomeFantasia: true,
          cnpj: true,
          municipio: true,
          uf: true,
        },
      }),
    ]);
    return {
      itens,
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / limite)),
      },
    };
  }

  async proposalOptions(clienteId: string, search = '', page = 1, limit = 20) {
    const cliente = await this.prisma.clienteOperacional.findFirst({
      where: { id: clienteId, ativo: true },
      select: { id: true, codigo: true, razaoSocial: true },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    if (!cliente.codigo)
      return {
        itens: [],
        paginacao: { pagina: 1, limite: 20, total: 0, totalPaginas: 1 },
      };
    const busca = search.trim();
    const pagina = Math.max(1, Math.trunc(page) || 1);
    const limite = Math.min(50, Math.max(1, Math.trunc(limit) || 20));
    const where: Prisma.OpPropostaWhereInput = {
      clienteCodigo: { equals: cliente.codigo, mode: 'insensitive' },
      ...(busca
        ? {
            OR: [
              { numero: { contains: busca, mode: 'insensitive' } },
              { titulo: { contains: busca, mode: 'insensitive' } },
              { local: { contains: busca, mode: 'insensitive' } },
              { status: { contains: busca, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, itens] = await this.prisma.$transaction([
      this.prisma.opProposta.count({ where }),
      this.prisma.opProposta.findMany({
        where,
        skip: (pagina - 1) * limite,
        take: limite,
        orderBy: [{ atualizadoEm: 'desc' }, { numero: 'desc' }],
        select: {
          id: true,
          numero: true,
          titulo: true,
          status: true,
          tipo: true,
          local: true,
          valProposta: true,
          clienteCodigo: true,
          clienteNome: true,
        },
      }),
    ]);
    return {
      cliente,
      itens,
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / limite)),
      },
    };
  }

  async list(query: ContractQueryDto) {
    const term = query.busca?.trim();
    const where: Prisma.ContratoAdministrativoWhereInput = {
      excluidoEm: null,
      ...(query.etapa ? { etapa: query.etapa } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.clienteId ? { clienteId: query.clienteId } : {}),
      ...(query.responsavelId ? { responsavelId: query.responsavelId } : {}),
      ...(term
        ? {
            OR: [
              { codigo: { contains: term, mode: 'insensitive' } },
              { titulo: { contains: term, mode: 'insensitive' } },
              { numeroDocumento: { contains: term, mode: 'insensitive' } },
              {
                cliente: {
                  razaoSocial: { contains: term, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.contratoAdministrativo.count({ where }),
      this.prisma.contratoAdministrativo.findMany({
        where,
        skip: (query.pagina - 1) * query.limite,
        take: query.limite,
        select: {
          id: true,
          codigo: true,
          titulo: true,
          tipo: true,
          etapa: true,
          status: true,
          vigenciaInicio: true,
          vigenciaFim: true,
          valorGlobal: true,
          valorMensal: true,
          atualizadoEm: true,
          cliente: {
            select: {
              id: true,
              codigo: true,
              razaoSocial: true,
              nomeFantasia: true,
              cnpj: true,
            },
          },
          responsavel: { select: { id: true, nome: true, email: true } },
          _count: {
            select: { propostas: true, andamentos: true, documentos: true },
          },
        },
        orderBy: [{ atualizadoEm: 'desc' }, { codigo: 'desc' }],
      }),
    ]);
    return {
      dados: records,
      paginacao: {
        pagina: query.pagina,
        limite: query.limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / query.limite)),
      },
    };
  }
  async indicators() {
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    const limite30 = new Date(hoje);
    limite30.setUTCDate(limite30.getUTCDate() + 30);
    const inicio31 = new Date(limite30);
    inicio31.setUTCDate(inicio31.getUTCDate() + 1);
    const limite90 = new Date(hoje);
    limite90.setUTCDate(limite90.getUTCDate() + 90);

    const [total, byStatus, byStage, expiring30, expiring31To90] =
      await this.prisma.$transaction([
        this.prisma.contratoAdministrativo.count({
          where: { excluidoEm: null },
        }),
        this.prisma.contratoAdministrativo.groupBy({
          by: ['status'],
          where: { excluidoEm: null },
          orderBy: { status: 'asc' },
          _count: { _all: true },
        }),
        this.prisma.contratoAdministrativo.groupBy({
          by: ['etapa'],
          where: { excluidoEm: null },
          orderBy: { etapa: 'asc' },
          _count: { _all: true },
        }),
        this.prisma.contratoAdministrativo.count({
          where: {
            excluidoEm: null,
            vigenciaFim: { gte: hoje, lte: limite30 },
          },
        }),
        this.prisma.contratoAdministrativo.count({
          where: {
            excluidoEm: null,
            vigenciaFim: { gte: inicio31, lte: limite90 },
          },
        }),
      ]);

    return {
      total,
      vencendoEm30Dias: expiring30,
      vencendoEntre31E90Dias: expiring31To90,
      vencendoEm90Dias: expiring30 + expiring31To90,
      porStatus: byStatus,
      porEtapa: byStage,
    };
  }
  async one(id: string) {
    await this.existing(id);
    return this.prisma.contratoAdministrativo.findUnique({
      where: { id },
      include: {
        cliente: true,
        criadoPor: { select: { id: true, nome: true, email: true } },
        responsavel: { select: { id: true, nome: true, email: true } },
        atualizadoPor: { select: { id: true, nome: true, email: true } },
        propostas: {
          include: { proposta: true },
          orderBy: { criadoEm: 'asc' },
        },
        andamentos: {
          include: {
            usuario: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { registradoEm: 'desc' },
        },
        documentos: {
          where: { excluidoEm: null },
          orderBy: { enviadoEm: 'desc' },
        },
        consultasCnpj: {
          orderBy: { consultadoEm: 'desc' },
          take: 10,
          include: { socios: { orderBy: { ordem: 'asc' } } },
        },
      },
    });
  }
  async create(body: CreateContractDto, actor: Actor) {
    this.assertActor(actor);
    this.validateDates(body.vigenciaInicio, body.vigenciaFim);
    const proposals = [...new Set(body.propostaIds ?? [])];
    await this.validateReferences(
      body.clienteId,
      body.responsavelId,
      proposals,
    );
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = await this.nextCode();
      try {
        return await this.prisma.$transaction(async (tx) => {
          const contract = await tx.contratoAdministrativo.create({
            data: {
              ...this.data(body),
              codigo: code,
              clienteId: body.clienteId,
              criadoPorId: actor.id,
              atualizadoPorId: actor.id,
            } as Prisma.ContratoAdministrativoUncheckedCreateInput,
          });
          if (proposals.length)
            await tx.contratoProposta.createMany({
              data: proposals.map((propostaId, index) => ({
                contratoId: contract.id,
                propostaId,
                principal: index === 0,
              })),
            });
          await tx.contratoAndamento.create({
            data: {
              contratoId: contract.id,
              etapaNova: contract.etapa,
              descricao: 'Contrato administrativo cadastrado',
              percentual: 0,
              usuarioId: actor.id,
            },
          });
          await tx.auditoria.create({
            data: {
              usuarioId: actor.id,
              entidade: 'CONTRATO_ADMINISTRATIVO',
              entidadeId: contract.id,
              acao: 'CRIADO',
              dadosDepois: contract,
              ip: actor.ip,
              userAgent: actor.userAgent,
            },
          });
          return contract;
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 2
        )
          continue;
        throw error;
      }
    }
    throw new ConflictException('Não foi possível gerar o código do contrato');
  }
  async update(id: string, body: UpdateContractDto, actor: Actor) {
    this.assertActor(actor);
    const before = await this.existing(id);
    this.validateDates(
      body.vigenciaInicio ?? before.vigenciaInicio?.toISOString(),
      body.vigenciaFim ?? before.vigenciaFim?.toISOString(),
    );
    const proposals =
      body.propostaIds === undefined
        ? undefined
        : [...new Set(body.propostaIds)];
    await this.validateReferences(
      before.clienteId,
      body.responsavelId,
      proposals ?? [],
    );
    return this.prisma.$transaction(async (tx) => {
      if (proposals) {
        await tx.contratoProposta.deleteMany({ where: { contratoId: id } });
        if (proposals.length)
          await tx.contratoProposta.createMany({
            data: proposals.map((propostaId, index) => ({
              contratoId: id,
              propostaId,
              principal: index === 0,
            })),
          });
      }
      const updated = await tx.contratoAdministrativo.update({
        where: { id },
        data: { ...this.data(body), atualizadoPorId: actor.id },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'CONTRATO_ADMINISTRATIVO',
          entidadeId: id,
          acao: 'ATUALIZADO',
          dadosAntes: before,
          dadosDepois: updated,
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
      });
      return updated;
    });
  }
  async remove(id: string, actor: Actor) {
    this.assertActor(actor);
    const before = await this.existing(id);
    const removed = await this.prisma.$transaction(async (tx) => {
      const record = await tx.contratoAdministrativo.update({
        where: { id },
        data: { excluidoEm: new Date(), atualizadoPorId: actor.id },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'CONTRATO_ADMINISTRATIVO',
          entidadeId: id,
          acao: 'EXCLUIDO_LOGICAMENTE',
          dadosAntes: before,
          dadosDepois: record,
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
      });
      return record;
    });
    return { success: true, id: removed.id };
  }
  async progress(id: string, body: CreateContractProgressDto, actor: Actor) {
    this.assertActor(actor);
    const before = await this.existing(id);
    return this.prisma.$transaction(async (tx) => {
      const progress = await tx.contratoAndamento.create({
        data: {
          contratoId: id,
          etapaAnterior: before.etapa,
          etapaNova: body.etapaNova,
          descricao: body.descricao,
          pendencia: body.pendencia || null,
          prazo: this.date(body.prazo),
          destinatario: body.destinatario || null,
          observacaoInterna: body.observacaoInterna || null,
          percentual: body.percentual,
          usuarioId: actor.id,
        },
      });
      const updated = await tx.contratoAdministrativo.update({
        where: { id },
        data: {
          etapa: body.etapaNova,
          percentualAtual: body.percentual,
          atualizadoPorId: actor.id,
        },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'CONTRATO_ANDAMENTO',
          entidadeId: progress.id,
          acao: 'CRIADO',
          dadosAntes: {
            etapa: before.etapa,
            percentual: before.percentualAtual,
          },
          dadosDepois: {
            andamento: progress,
            etapa: updated.etapa,
            percentual: updated.percentualAtual,
          },
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
      });
      return progress;
    });
  }
}
