import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrcStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AtualizarOrcamentoDto,
  ConsultarOrcamentosDto,
  CriarOrcamentoDto,
} from './dto';

@Injectable()
export class OrcamentoService {
  constructor(private readonly prisma: PrismaService) {}

  health() {
    return {
      modulo: 'orcamento',
      status: 'crud_configurado',
      fase: 'ORC-0F-B',
    };
  }

  private async gerarNumero(tx: Prisma.TransactionClient): Promise<string> {
    const ano = new Date().getFullYear();
    const prefixo = `ORC-${ano}-`;

    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${`orcamento-numero-${ano}`})
      )
    `;

    const registros = await tx.$queryRaw<Array<{ numero: string }>>`
      SELECT numero
      FROM orc_orcamentos
      WHERE numero LIKE ${`${prefixo}%`}
      ORDER BY numero DESC
      LIMIT 1
    `;

    let sequencial = 1;

    if (registros.length > 0) {
      const ultimoNumero = registros[0].numero;
      const parteNumerica = ultimoNumero.slice(prefixo.length);
      const numeroConvertido = Number.parseInt(parteNumerica, 10);

      if (Number.isFinite(numeroConvertido)) {
        sequencial = numeroConvertido + 1;
      }
    }

    if (sequencial > 999999) {
      throw new ConflictException(
        `Limite anual de orçamentos atingido para ${ano}.`,
      );
    }

    return `${prefixo}${String(sequencial).padStart(6, '0')}`;
  }

  async criar(dto: CriarOrcamentoDto) {
    const [cliente, tecnico, checklist] = await Promise.all([
      this.prisma.clienteOperacional.findUnique({
        where: { id: dto.clienteId },
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          ativo: true,
        },
      }),
      this.prisma.usuario.findUnique({
        where: { id: dto.tecnicoId },
        select: {
          id: true,
          nome: true,
          status: true,
        },
      }),
      dto.checklistModeloId
        ? this.prisma.orcChecklistModelo.findUnique({
            where: { id: dto.checklistModeloId },
            select: {
              id: true,
              nome: true,
              ativo: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!cliente || !cliente.ativo) {
      throw new BadRequestException('Cliente não encontrado ou inativo.');
    }

    if (!tecnico || tecnico.status !== 'ATIVO') {
      throw new BadRequestException('Técnico não encontrado ou inativo.');
    }

    if (dto.checklistModeloId && (!checklist || !checklist.ativo)) {
      throw new BadRequestException(
        'Modelo de checklist não encontrado ou inativo.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const numero = await this.gerarNumero(tx);

        const orcamento = await tx.orcOrcamento.create({
          data: {
            numero,
            status: OrcStatus.RASCUNHO,
            clienteId: dto.clienteId,
            tecnicoId: dto.tecnicoId,
            checklistModeloId: dto.checklistModeloId,
            titulo: dto.titulo,
          },
          include: {
            cliente: {
              select: {
                id: true,
                codigo: true,
                razaoSocial: true,
                nomeFantasia: true,
                cnpj: true,
                municipio: true,
                uf: true,
              },
            },
            tecnico: {
              select: {
                id: true,
                nome: true,
                email: true,
                unidade: true,
              },
            },
            checklistModelo: {
              select: {
                id: true,
                nome: true,
                versao: true,
              },
            },
          },
        });

        await tx.orcOrcamentoHistorico.create({
          data: {
            orcamentoId: orcamento.id,
            usuarioId: dto.tecnicoId,
            acao: 'ORCAMENTO_CRIADO',
            statusNovo: OrcStatus.RASCUNHO,
            observacao: 'Orçamento criado.',
            dados: {
              numero,
              clienteId: dto.clienteId,
              tecnicoId: dto.tecnicoId,
              checklistModeloId: dto.checklistModeloId ?? null,
            },
          },
        });

        return orcamento;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      },
    );
  }

  async listar(query: ConsultarOrcamentosDto) {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;
    const skip = (pagina - 1) * limite;

    const where: Prisma.OrcOrcamentoWhereInput = {
      status: query.status,
      clienteId: query.clienteId,
      tecnicoId: query.tecnicoId,
    };

    if (query.busca) {
      where.OR = [
        {
          numero: {
            contains: query.busca,
            mode: 'insensitive',
          },
        },
        {
          titulo: {
            contains: query.busca,
            mode: 'insensitive',
          },
        },
        {
          cliente: {
            razaoSocial: {
              contains: query.busca,
              mode: 'insensitive',
            },
          },
        },
        {
          cliente: {
            nomeFantasia: {
              contains: query.busca,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [total, registros] = await this.prisma.$transaction([
      this.prisma.orcOrcamento.count({ where }),
      this.prisma.orcOrcamento.findMany({
        where,
        skip,
        take: limite,
        orderBy: {
          criadoEm: 'desc',
        },
        select: {
          id: true,
          numero: true,
          status: true,
          titulo: true,
          criadoEm: true,
          atualizadoEm: true,
          enviadoEm: true,
          analisadoEm: true,
          propostaNumero: true,
          cliente: {
            select: {
              id: true,
              codigo: true,
              razaoSocial: true,
              nomeFantasia: true,
              cnpj: true,
              municipio: true,
              uf: true,
            },
          },
          tecnico: {
            select: {
              id: true,
              nome: true,
              email: true,
              unidade: true,
            },
          },
          checklistModelo: {
            select: {
              id: true,
              nome: true,
              versao: true,
            },
          },
          _count: {
            select: {
              respostas: true,
              itens: true,
              evidencias: true,
              historicos: true,
            },
          },
        },
      }),
    ]);

    return {
      pagina,
      limite,
      total,
      totalPaginas: Math.ceil(total / limite),
      registros,
    };
  }

  async buscarPorId(id: string) {
    const orcamento = await this.prisma.orcOrcamento.findUnique({
      where: { id },
      include: {
        cliente: true,
        tecnico: {
          select: {
            id: true,
            nome: true,
            email: true,
            unidade: true,
          },
        },
        analisadoPor: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        propostaVinculadaPor: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        checklistModelo: {
          include: {
            grupos: {
              where: {
                ativo: true,
              },
              orderBy: {
                ordem: 'asc',
              },
              include: {
                perguntas: {
                  where: {
                    ativo: true,
                  },
                  orderBy: {
                    ordem: 'asc',
                  },
                  include: {
                    opcoes: {
                      where: {
                        ativo: true,
                      },
                      orderBy: {
                        ordem: 'asc',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        proposta: {
          select: {
            id: true,
            numero: true,
            status: true,
            clienteCodigo: true,
            clienteNome: true,
            titulo: true,
            valProposta: true,
          },
        },
        respostas: {
          orderBy: {
            atualizadoEm: 'asc',
          },
        },
        itens: {
          orderBy: {
            descricao: 'asc',
          },
          include: {
            material: true,
          },
        },
        evidencias: {
          orderBy: {
            criadoEm: 'desc',
          },
        },
        historicos: {
          orderBy: {
            criadoEm: 'desc',
          },
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!orcamento) {
      throw new NotFoundException('Orçamento não encontrado.');
    }

    return orcamento;
  }

  async atualizar(id: string, dto: AtualizarOrcamentoDto, usuarioId: string) {
    const atual = await this.prisma.orcOrcamento.findUnique({
      where: { id },
      select: {
        id: true,
        numero: true,
        status: true,
        titulo: true,
        checklistModeloId: true,
      },
    });

    if (!atual) {
      throw new NotFoundException('Orçamento não encontrado.');
    }

    const statusEditaveis: OrcStatus[] = [
      OrcStatus.RASCUNHO,
      OrcStatus.EM_PREENCHIMENTO,
      OrcStatus.DEVOLVIDO_CORRECAO,
    ];

    if (!statusEditaveis.includes(atual.status)) {
      throw new ConflictException(
        'O orçamento não pode ser alterado no status atual.',
      );
    }

    if (dto.checklistModeloId) {
      const checklist = await this.prisma.orcChecklistModelo.findUnique({
        where: {
          id: dto.checklistModeloId,
        },
        select: {
          id: true,
          ativo: true,
        },
      });

      if (!checklist || !checklist.ativo) {
        throw new BadRequestException(
          'Modelo de checklist não encontrado ou inativo.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizado = await tx.orcOrcamento.update({
        where: { id },
        data: {
          titulo: dto.titulo,
          checklistModeloId: dto.checklistModeloId,
          status:
            atual.status === OrcStatus.RASCUNHO
              ? OrcStatus.EM_PREENCHIMENTO
              : atual.status,
        },
      });

      await tx.orcOrcamentoHistorico.create({
        data: {
          orcamentoId: id,
          usuarioId,
          acao: 'ORCAMENTO_ATUALIZADO',
          statusAnterior: atual.status,
          statusNovo: atualizado.status,
          observacao: 'Dados gerais do orçamento atualizados.',
          dados: {
            antes: {
              titulo: atual.titulo,
              checklistModeloId: atual.checklistModeloId,
            },
            depois: {
              titulo: atualizado.titulo,
              checklistModeloId: atualizado.checklistModeloId,
            },
          },
        },
      });

      return atualizado;
    });
  }
}
