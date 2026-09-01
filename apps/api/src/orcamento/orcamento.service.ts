import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrcStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AtualizarOrcamentoDto,
  ConsultarOrcamentosDto,
  CriarOrcamentoDto,
  SalvarItensOrcamentoDto,
  SalvarRespostasOrcamentoDto,
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

  async criar(dto: CriarOrcamentoDto, usuarioId?: string) {
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
            usuarioId: usuarioId ?? dto.tecnicoId,
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

  private validarStatusEditavel(status: OrcStatus) {
    const permitidos: OrcStatus[] = [
      OrcStatus.RASCUNHO,
      OrcStatus.EM_PREENCHIMENTO,
      OrcStatus.DEVOLVIDO_CORRECAO,
    ];

    if (!permitidos.includes(status)) {
      throw new ConflictException(
        'Respostas e itens não podem ser alterados no status atual.',
      );
    }
  }

  async salvarRespostas(
    id: string,
    dto: SalvarRespostasOrcamentoDto,
    usuarioId: string,
  ) {
    const ids = dto.respostas.map((resposta) => resposta.perguntaId);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Existem perguntas duplicadas na requisição.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const orcamento = await tx.orcOrcamento.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          checklistModeloId: true,
        },
      });

      if (!orcamento) {
        throw new NotFoundException('Orçamento não encontrado.');
      }

      this.validarStatusEditavel(orcamento.status);

      if (!orcamento.checklistModeloId) {
        throw new BadRequestException(
          'O orçamento não possui modelo de checklist.',
        );
      }

      const perguntas = await tx.orcChecklistPergunta.findMany({
        where: {
          id: { in: ids },
          ativo: true,
          grupo: {
            ativo: true,
            modeloId: orcamento.checklistModeloId,
          },
        },
        select: {
          id: true,
        },
      });

      if (perguntas.length !== ids.length) {
        throw new BadRequestException(
          'Uma ou mais perguntas não pertencem ao checklist ativo.',
        );
      }

      for (const resposta of dto.respostas) {
        await tx.orcOrcamentoResposta.upsert({
          where: {
            orcamentoId_perguntaId: {
              orcamentoId: id,
              perguntaId: resposta.perguntaId,
            },
          },
          create: {
            orcamentoId: id,
            perguntaId: resposta.perguntaId,
            valor: resposta.valor as Prisma.InputJsonValue,
          },
          update: {
            valor: resposta.valor as Prisma.InputJsonValue,
          },
        });
      }

      const novoStatus =
        orcamento.status === OrcStatus.RASCUNHO
          ? OrcStatus.EM_PREENCHIMENTO
          : orcamento.status;

      await tx.orcOrcamento.update({
        where: {
          id,
          status: orcamento.status,
        },
        data: {
          status: novoStatus,
        },
      });

      await tx.orcOrcamentoHistorico.create({
        data: {
          orcamentoId: id,
          usuarioId,
          acao: 'RESPOSTAS_SALVAS',
          statusAnterior: orcamento.status,
          statusNovo: novoStatus,
          observacao: 'Respostas do checklist salvas.',
          dados: {
            quantidade: dto.respostas.length,
            perguntas: ids,
          },
        },
      });

      return tx.orcOrcamentoResposta.findMany({
        where: {
          orcamentoId: id,
        },
        orderBy: {
          atualizadoEm: 'asc',
        },
      });
    });
  }

  private condicaoMaterialAtendida(
    condicao: Prisma.JsonValue,
    valor: Prisma.JsonValue,
  ): boolean {
    if (condicao === null) {
      return true;
    }

    if (
      typeof condicao !== 'object' ||
      Array.isArray(condicao) ||
      typeof valor !== 'object' ||
      valor === null ||
      Array.isArray(valor)
    ) {
      return false;
    }

    const esperada = condicao as Record<string, Prisma.JsonValue>;
    const recebida = valor as Record<string, Prisma.JsonValue>;

    return Object.entries(esperada).every(
      ([chave, esperado]) =>
        JSON.stringify(recebida[chave]) === JSON.stringify(esperado),
    );
  }

  private quantidadeAutomatica(
    formula: string | null,
    valor: Prisma.JsonValue,
  ): Prisma.Decimal {
    if (!formula) {
      return new Prisma.Decimal(1);
    }

    if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
      throw new BadRequestException(
        `Não foi possível calcular a fórmula ${formula}.`,
      );
    }

    const objeto = valor as Record<string, Prisma.JsonValue>;

    let quantidade: unknown;

    if (formula === 'valor') {
      quantidade = objeto.numero ?? objeto.valor;
    } else {
      throw new BadRequestException(
        `Fórmula de quantidade não suportada: ${formula}.`,
      );
    }

    if (
      typeof quantidade !== 'number' ||
      !Number.isFinite(quantidade) ||
      quantidade <= 0
    ) {
      throw new BadRequestException(
        `Quantidade inválida para a fórmula ${formula}.`,
      );
    }

    return new Prisma.Decimal(quantidade);
  }

  async gerarItensAutomaticos(id: string, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      const orcamento = await tx.orcOrcamento.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          checklistModeloId: true,
        },
      });

      if (!orcamento) {
        throw new NotFoundException('Orçamento não encontrado.');
      }

      this.validarStatusEditavel(orcamento.status);

      if (!orcamento.checklistModeloId) {
        throw new BadRequestException(
          'O orçamento não possui modelo de checklist.',
        );
      }

      const respostas = await tx.orcOrcamentoResposta.findMany({
        where: {
          orcamentoId: id,
        },
        select: {
          perguntaId: true,
          valor: true,
        },
      });

      const mapaRespostas = new Map(
        respostas.map((resposta) => [resposta.perguntaId, resposta.valor]),
      );

      const vinculos = await tx.orcPerguntaMaterial.findMany({
        where: {
          pergunta: {
            ativo: true,
            grupo: {
              ativo: true,
              modeloId: orcamento.checklistModeloId,
            },
          },
          material: {
            ativo: true,
          },
        },
        include: {
          material: true,
        },
      });

      const gerados = new Map<
        string,
        {
          materialId: string;
          tipo: (typeof vinculos)[number]['material']['tipo'];
          descricao: string;
          unidade: string;
          quantidade: Prisma.Decimal;
          origem: string;
        }
      >();

      for (const vinculo of vinculos) {
        const valor = mapaRespostas.get(vinculo.perguntaId);

        if (valor === undefined) {
          continue;
        }

        if (!this.condicaoMaterialAtendida(vinculo.condicao, valor)) {
          continue;
        }

        const quantidade = this.quantidadeAutomatica(
          vinculo.quantidadeFormula,
          valor,
        );

        const existente = gerados.get(vinculo.materialId);

        if (existente) {
          existente.quantidade = existente.quantidade.add(quantidade);
          continue;
        }

        gerados.set(vinculo.materialId, {
          materialId: vinculo.materialId,
          tipo: vinculo.material.tipo,
          descricao: vinculo.material.nome,
          unidade: vinculo.material.unidade,
          quantidade,
          origem: 'AUTO_CHECKLIST',
        });
      }

      const removidos = await tx.orcOrcamentoItem.deleteMany({
        where: {
          orcamentoId: id,
          origem: 'AUTO_CHECKLIST',
        },
      });

      const novos = Array.from(gerados.values());

      if (novos.length > 0) {
        await tx.orcOrcamentoItem.createMany({
          data: novos.map((item) => ({
            orcamentoId: id,
            materialId: item.materialId,
            tipo: item.tipo,
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade: item.quantidade,
            origem: item.origem,
          })),
        });
      }

      await tx.orcOrcamentoHistorico.create({
        data: {
          orcamentoId: id,
          usuarioId,
          acao: 'ITENS_GERADOS_AUTOMATICAMENTE',
          statusAnterior: orcamento.status,
          statusNovo: orcamento.status,
          observacao: 'Itens automáticos recalculados a partir do checklist.',
          dados: {
            vínculosAvaliados: vinculos.length,
            itensRemovidos: removidos.count,
            itensGerados: novos.length,
            materiais: novos.map((item) => ({
              materialId: item.materialId,
              quantidade: item.quantidade.toString(),
            })),
          },
        },
      });

      return tx.orcOrcamentoItem.findMany({
        where: {
          orcamentoId: id,
        },
        include: {
          material: true,
        },
        orderBy: [
          {
            origem: 'asc',
          },
          {
            descricao: 'asc',
          },
        ],
      });
    });
  }

  async salvarItens(
    id: string,
    dto: SalvarItensOrcamentoDto,
    usuarioId: string,
  ) {
    const materiais = dto.itens
      .map((item) => item.materialId)
      .filter((materialId): materialId is string => Boolean(materialId));

    if (new Set(materiais).size !== materiais.length) {
      throw new BadRequestException(
        'Existem materiais duplicados na requisição.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const orcamento = await tx.orcOrcamento.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
        },
      });

      if (!orcamento) {
        throw new NotFoundException('Orçamento não encontrado.');
      }

      this.validarStatusEditavel(orcamento.status);

      if (materiais.length > 0) {
        const encontrados = await tx.orcMaterialBasico.findMany({
          where: {
            id: { in: materiais },
            ativo: true,
          },
          select: {
            id: true,
            tipo: true,
            unidade: true,
          },
        });

        if (encontrados.length !== materiais.length) {
          throw new BadRequestException(
            'Um ou mais materiais não existem ou estão inativos.',
          );
        }

        const mapa = new Map(
          encontrados.map((material) => [material.id, material]),
        );

        for (const item of dto.itens) {
          if (!item.materialId) {
            continue;
          }

          const material = mapa.get(item.materialId);

          if (
            !material ||
            material.tipo !== item.tipo ||
            material.unidade !== item.unidade
          ) {
            throw new BadRequestException(
              `Tipo ou unidade incompatível com o material ${item.materialId}.`,
            );
          }
        }
      }

      const anteriores = await tx.orcOrcamentoItem.count({
        where: {
          orcamentoId: id,
        },
      });

      await tx.orcOrcamentoItem.deleteMany({
        where: {
          orcamentoId: id,
        },
      });

      if (dto.itens.length > 0) {
        await tx.orcOrcamentoItem.createMany({
          data: dto.itens.map((item) => ({
            orcamentoId: id,
            materialId: item.materialId,
            tipo: item.tipo,
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade: new Prisma.Decimal(item.quantidade),
            origem: item.origem ?? 'MANUAL',
          })),
        });
      }

      const novoStatus =
        orcamento.status === OrcStatus.RASCUNHO
          ? OrcStatus.EM_PREENCHIMENTO
          : orcamento.status;

      await tx.orcOrcamento.update({
        where: {
          id,
          status: orcamento.status,
        },
        data: {
          status: novoStatus,
        },
      });

      await tx.orcOrcamentoHistorico.create({
        data: {
          orcamentoId: id,
          usuarioId,
          acao: 'ITENS_SALVOS',
          statusAnterior: orcamento.status,
          statusNovo: novoStatus,
          observacao: 'Itens do orçamento substituídos.',
          dados: {
            quantidadeAnterior: anteriores,
            quantidadeNova: dto.itens.length,
          },
        },
      });

      return tx.orcOrcamentoItem.findMany({
        where: {
          orcamentoId: id,
        },
        include: {
          material: true,
        },
        orderBy: {
          descricao: 'asc',
        },
      });
    });
  }

  private valorRespostaPreenchido(
    tipo: string,
    valor: Prisma.JsonValue,
  ): boolean {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
      return false;
    }

    const objeto = valor as Record<string, Prisma.JsonValue>;

    switch (tipo) {
      case 'TEXTO':
      case 'TEXTO_LONGO':
      case 'FOTO':
        return (
          typeof objeto.texto === 'string' && objeto.texto.trim().length > 0
        );

      case 'NUMERO':
      case 'DECIMAL':
        return (
          typeof objeto.numero === 'number' && Number.isFinite(objeto.numero)
        );

      case 'BOOLEANO':
        return typeof objeto.valor === 'boolean';

      case 'SELECAO_UNICA':
        return (
          typeof objeto.valor === 'string' && objeto.valor.trim().length > 0
        );

      case 'SELECAO_MULTIPLA':
        return Array.isArray(objeto.valores) && objeto.valores.length > 0;

      case 'MEDIDA':
        return (
          typeof objeto.valor === 'number' && Number.isFinite(objeto.valor)
        );

      default:
        return Object.keys(objeto).length > 0;
    }
  }

  private avaliarRegraCondicional(
    operador: string,
    esperado: Prisma.JsonValue,
    resposta: Prisma.JsonValue | undefined,
  ): boolean {
    const operadores = ['IGUAL', 'DIFERENTE', 'CONTEM'] as const;

    if (!operadores.includes(operador as (typeof operadores)[number])) {
      throw new InternalServerErrorException(
        `Operador condicional não suportado: ${operador}.`,
      );
    }

    if (resposta === undefined) {
      return false;
    }

    const extrair = (valor: Prisma.JsonValue): Prisma.JsonValue => {
      if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        const objeto = valor as Record<string, Prisma.JsonValue>;

        return objeto.valor ?? objeto.numero ?? objeto.texto ?? valor;
      }

      return valor;
    };

    const recebido = extrair(resposta);
    const alvo = extrair(esperado);

    if (operador === 'IGUAL') {
      return JSON.stringify(recebido) === JSON.stringify(alvo);
    }

    if (operador === 'DIFERENTE') {
      return JSON.stringify(recebido) !== JSON.stringify(alvo);
    }

    if (typeof recebido === 'string' && typeof alvo === 'string') {
      return recebido.includes(alvo);
    }

    if (Array.isArray(recebido)) {
      return recebido.some(
        (item) => JSON.stringify(item) === JSON.stringify(alvo),
      );
    }

    return false;
  }

  private async validarRespostasObrigatorias(id: string): Promise<void> {
    const orcamento = await this.prisma.orcOrcamento.findUnique({
      where: { id },
      select: {
        id: true,
        checklistModeloId: true,
        checklistModelo: {
          select: {
            ativo: true,
          },
        },
      },
    });

    if (!orcamento) {
      throw new NotFoundException('Orçamento não encontrado.');
    }

    if (!orcamento.checklistModeloId || !orcamento.checklistModelo?.ativo) {
      throw new BadRequestException('O orçamento não possui checklist ativo.');
    }

    const perguntas = await this.prisma.orcChecklistPergunta.findMany({
      where: {
        obrigatoria: true,
        ativo: true,
        grupo: {
          modeloId: orcamento.checklistModeloId,
          ativo: true,
        },
      },
      select: {
        id: true,
        codigo: true,
        titulo: true,
        tipo: true,
        opcoes: {
          where: {
            ativo: true,
          },
          select: {
            valor: true,
          },
        },
      },
      orderBy: [
        {
          grupo: {
            ordem: 'asc',
          },
        },
        {
          ordem: 'asc',
        },
      ],
    });

    const respostas = await this.prisma.orcOrcamentoResposta.findMany({
      where: {
        orcamentoId: id,
      },
      select: {
        perguntaId: true,
        valor: true,
      },
    });

    const mapa = new Map(
      respostas.map((resposta) => [resposta.perguntaId, resposta.valor]),
    );

    const regras = await this.prisma.orcRegraCondicional.findMany({
      where: {
        ativa: true,
        perguntaOrigem: {
          grupo: {
            modeloId: orcamento.checklistModeloId,
          },
        },
      },
      select: {
        perguntaOrigemId: true,
        perguntaDestinoCodigo: true,
        operador: true,
        valor: true,
        acao: true,
      },
    });

    const acoes = [
      'MOSTRAR',
      'OCULTAR',
      'TORNAR_OBRIGATORIA',
      'TORNAR_OPCIONAL',
    ] as const;

    const obrigatoriedade = new Map(
      perguntas.map((pergunta) => [pergunta.codigo, true]),
    );

    const destinos = await this.prisma.orcChecklistPergunta.findMany({
      where: {
        grupo: {
          modeloId: orcamento.checklistModeloId,
        },
      },
      select: {
        codigo: true,
      },
    });

    for (const destino of destinos) {
      if (!obrigatoriedade.has(destino.codigo)) {
        obrigatoriedade.set(destino.codigo, false);
      }
    }

    for (const regra of regras) {
      if (!acoes.includes(regra.acao as (typeof acoes)[number])) {
        throw new InternalServerErrorException(
          `Ação condicional não suportada: ${regra.acao}.`,
        );
      }

      if (!obrigatoriedade.has(regra.perguntaDestinoCodigo)) {
        throw new InternalServerErrorException(
          `Destino condicional inválido: ${regra.perguntaDestinoCodigo}.`,
        );
      }

      const atendida = this.avaliarRegraCondicional(
        regra.operador,
        regra.valor,
        mapa.get(regra.perguntaOrigemId),
      );

      if (!atendida) {
        continue;
      }

      if (regra.acao === 'TORNAR_OBRIGATORIA' || regra.acao === 'MOSTRAR') {
        obrigatoriedade.set(regra.perguntaDestinoCodigo, true);
      }

      if (regra.acao === 'TORNAR_OPCIONAL' || regra.acao === 'OCULTAR') {
        obrigatoriedade.set(regra.perguntaDestinoCodigo, false);
      }
    }

    const perguntasValidar = await this.prisma.orcChecklistPergunta.findMany({
      where: {
        codigo: {
          in: [...obrigatoriedade.entries()]
            .filter(([, obrigatoria]) => obrigatoria)
            .map(([codigo]) => codigo),
        },
        ativo: true,
        grupo: {
          ativo: true,
          modeloId: orcamento.checklistModeloId,
        },
      },
      select: {
        id: true,
        codigo: true,
        titulo: true,
        tipo: true,
        opcoes: {
          where: {
            ativo: true,
          },
          select: {
            valor: true,
          },
        },
      },
      orderBy: [
        {
          grupo: {
            ordem: 'asc',
          },
        },
        {
          ordem: 'asc',
        },
      ],
    });

    const pendencias: Array<{
      codigo: string;
      titulo: string;
      motivo: string;
    }> = [];

    for (const pergunta of perguntasValidar) {
      const valor = mapa.get(pergunta.id);

      if (
        valor === undefined ||
        !this.valorRespostaPreenchido(pergunta.tipo, valor)
      ) {
        pendencias.push({
          codigo: pergunta.codigo,
          titulo: pergunta.titulo,
          motivo: 'Resposta obrigatória ausente ou inválida.',
        });
        continue;
      }

      if (
        pergunta.tipo === 'SELECAO_UNICA' &&
        valor &&
        typeof valor === 'object' &&
        !Array.isArray(valor)
      ) {
        const selecionado = (valor as Record<string, Prisma.JsonValue>).valor;

        const permitidos = pergunta.opcoes.map((opcao) => opcao.valor);

        if (
          typeof selecionado !== 'string' ||
          !permitidos.includes(selecionado)
        ) {
          pendencias.push({
            codigo: pergunta.codigo,
            titulo: pergunta.titulo,
            motivo: 'Opção selecionada não é válida.',
          });
        }
      }
    }

    if (pendencias.length > 0) {
      throw new BadRequestException({
        message: 'Existem respostas obrigatórias pendentes ou inválidas.',
        quantidade: pendencias.length,
        pendencias,
      });
    }
  }

  private async alterarStatus(
    id: string,
    usuarioId: string,
    permitidos: OrcStatus[],
    statusNovo: OrcStatus,
    acao: string,
    observacao?: string,
    dados?: Prisma.InputJsonValue,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.orcOrcamento.findUnique({
        where: { id },
        select: {
          id: true,
          numero: true,
          status: true,
        },
      });

      if (!atual) {
        throw new NotFoundException('Orçamento não encontrado.');
      }

      if (!permitidos.includes(atual.status)) {
        throw new ConflictException(
          `Transição inválida de ${atual.status} para ${statusNovo}.`,
        );
      }

      const data: Prisma.OrcOrcamentoUpdateInput = {
        status: statusNovo,
      };

      if (statusNovo === OrcStatus.ENVIADO_ANALISE) {
        data.enviadoEm = new Date();
      }

      if (
        statusNovo === OrcStatus.EM_ANALISE ||
        statusNovo === OrcStatus.ACEITO ||
        statusNovo === OrcStatus.RECUSADO ||
        statusNovo === OrcStatus.DEVOLVIDO_CORRECAO
      ) {
        data.analisadoPor = {
          connect: {
            id: usuarioId,
          },
        };
      }

      if (
        statusNovo === OrcStatus.ACEITO ||
        statusNovo === OrcStatus.RECUSADO
      ) {
        data.analisadoEm = new Date();
      }

      if (
        statusNovo === OrcStatus.ACEITO ||
        statusNovo === OrcStatus.DEVOLVIDO_CORRECAO
      ) {
        data.observacaoAnalise = observacao ?? null;
      }

      if (statusNovo === OrcStatus.RECUSADO) {
        data.motivoRecusa = observacao ?? null;
      }

      const atualizado = await tx.orcOrcamento.update({
        where: {
          id,
          status: atual.status,
        },
        data,
      });

      await tx.orcOrcamentoHistorico.create({
        data: {
          orcamentoId: id,
          usuarioId,
          acao,
          statusAnterior: atual.status,
          statusNovo,
          observacao,
          dados,
        },
      });

      return atualizado;
    });
  }

  async enviarAnalise(id: string, usuarioId: string) {
    await this.validarRespostasObrigatorias(id);

    return this.alterarStatus(
      id,
      usuarioId,
      [
        OrcStatus.RASCUNHO,
        OrcStatus.EM_PREENCHIMENTO,
        OrcStatus.DEVOLVIDO_CORRECAO,
      ],
      OrcStatus.ENVIADO_ANALISE,
      'ORCAMENTO_ENVIADO_ANALISE',
      'Orçamento enviado para análise.',
    );
  }

  iniciarAnalise(id: string, usuarioId: string) {
    return this.alterarStatus(
      id,
      usuarioId,
      [OrcStatus.ENVIADO_ANALISE],
      OrcStatus.EM_ANALISE,
      'ANALISE_INICIADA',
      'Análise do orçamento iniciada.',
    );
  }

  aceitar(id: string, usuarioId: string, observacao?: string) {
    return this.alterarStatus(
      id,
      usuarioId,
      [OrcStatus.ENVIADO_ANALISE, OrcStatus.EM_ANALISE],
      OrcStatus.ACEITO,
      'ORCAMENTO_ACEITO',
      observacao,
    );
  }

  devolver(id: string, usuarioId: string, observacao: string) {
    return this.alterarStatus(
      id,
      usuarioId,
      [OrcStatus.ENVIADO_ANALISE, OrcStatus.EM_ANALISE],
      OrcStatus.DEVOLVIDO_CORRECAO,
      'ORCAMENTO_DEVOLVIDO_CORRECAO',
      observacao,
    );
  }

  recusar(id: string, usuarioId: string, motivo: string) {
    return this.alterarStatus(
      id,
      usuarioId,
      [OrcStatus.ENVIADO_ANALISE, OrcStatus.EM_ANALISE],
      OrcStatus.RECUSADO,
      'ORCAMENTO_RECUSADO',
      motivo,
    );
  }
}
