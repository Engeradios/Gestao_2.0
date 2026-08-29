import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { AdminUpdateServiceDto } from './dto/service.dto';
@Injectable()
export class OperationalServicesService {
  constructor(private readonly db: PrismaService) {}

  private pendenciasPreparacao(servico: Record<string, unknown>) {
    const pendencias: string[] = [];

    const vazio = (valor: unknown) =>
      valor === null ||
      valor === undefined ||
      (typeof valor === 'string' && !valor.trim());

    if (vazio(servico.servicoAtividade)) {
      pendencias.push('Serviço / atividade');
    }

    if (vazio(servico.prioridade)) {
      pendencias.push('Prioridade');
    }

    if (vazio(servico.inicioPlanejado)) {
      pendencias.push('Início planejado');
    }

    if (vazio(servico.prazoFinal)) {
      pendencias.push('Prazo final');
    }

    return pendencias;
  }

  private validarPreparacao(servico: Record<string, unknown>) {
    const status = String(servico.status ?? '')
      .trim()
      .toUpperCase();

    const encerrado = [
      'CONCLUÍDO',
      'CONCLUIDO',
      'CONCLUÍDA',
      'CONCLUIDA',
      'CANCELADO',
      'CANCELADA',
    ].includes(status);

    if (servico.ativo === false || encerrado) {
      return;
    }

    const pendencias = this.pendenciasPreparacao(servico);

    if (pendencias.length) {
      throw new BadRequestException({
        message:
          'Complete a preparação obrigatória antes de executar alterações operacionais.',
        pendencias,
      });
    }
  }
  private page(q: any) {
    const pagina = Math.max(Number(q.pagina) || 1, 1),
      porPagina = Math.min(Math.max(Number(q.porPagina) || 25, 1), 100);
    return { pagina, porPagina, skip: (pagina - 1) * porPagina };
  }
  async painel(q: any) {
    void q;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const base: Prisma.OpServicoWhereInput = {
      ativo: true,
      OR: [
        { areaResponsavel: { in: ['OPERACIONAL', 'AMBAS'] } },
        { areaResponsavel: null },
        { areaResponsavel: '' },
      ],
    };

    const concluidosStatus = [
      'Concluído',
      'Concluida',
      'Concluída',
      'Concluido',
    ];
    const canceladosStatus = ['Cancelado', 'Cancelada'];
    const encerrados = [...concluidosStatus, ...canceladosStatus];

    const [
      total,
      concluidos,
      cancelados,
      atrasados,
      emDia,
      emAndamento,
      aguardandoCliente,
      faltaMaterial,
      planejamento,
    ] = await this.db.$transaction([
      this.db.opServico.count({ where: base }),
      this.db.opServico.count({
        where: { ...base, status: { in: concluidosStatus } },
      }),
      this.db.opServico.count({
        where: { ...base, status: { in: canceladosStatus } },
      }),
      this.db.opServico.count({
        where: {
          ...base,
          prazoFinal: { lt: hoje },
          status: { notIn: encerrados },
        },
      }),
      this.db.opServico.count({
        where: {
          ...base,
          prazoFinal: { gte: hoje },
          status: { notIn: encerrados },
        },
      }),
      this.db.opServico.count({
        where: {
          ...base,
          status: { equals: 'Em andamento', mode: 'insensitive' },
        },
      }),
      this.db.opServico.count({
        where: {
          ...base,
          status: { equals: 'Aguardando Cliente', mode: 'insensitive' },
        },
      }),
      this.db.opServico.count({
        where: {
          ...base,
          status: { equals: 'Falta Material', mode: 'insensitive' },
        },
      }),
      this.db.opServico.count({
        where: {
          ...base,
          status: { in: ['Planejado', 'Não iniciado', 'Nao iniciado'] },
        },
      }),
    ]);

    const [porStatus, porResponsavel, porUf] = await this.db.$transaction([
      this.db.opServico.groupBy({
        by: ['status'],
        where: base,
        _count: { _all: true },
        orderBy: { _count: { status: 'desc' } },
      }),
      this.db.opServico.groupBy({
        by: ['responsavel'],
        where: {
          ...base,
          responsavel: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { responsavel: 'desc' } },
        take: 10,
      }),
      this.db.opServico.groupBy({
        by: ['ufExecucao'],
        where: base,
        _count: { _all: true },
        orderBy: { _count: { ufExecucao: 'desc' } },
      }),
    ]);

    return {
      total,
      concluidos,
      cancelados,
      atrasados,
      ativos: total - concluidos - cancelados,
      emDia,
      emAndamento,
      aguardandoCliente,
      faltaMaterial,
      planejamento,
      porStatus,
      porResponsavel,
      porUf,
    };
  }
  async servicos(q: any) {
    const p = this.page(q);
    const where: Prisma.OpServicoWhereInput = {
      ativo: true,
      AND: [
        {
          OR: [
            {
              areaResponsavel: {
                in: ['OPERACIONAL', 'AMBAS'],
              },
            },
            { areaResponsavel: null },
            { areaResponsavel: '' },
          ],
        },
      ],
    };

    if (q.q) {
      const busca = String(q.q).trim();

      where.OR = [
        { proposta: { contains: busca, mode: 'insensitive' } },
        { cliente: { contains: busca, mode: 'insensitive' } },
        { clienteLocal: { contains: busca, mode: 'insensitive' } },
        { servicoAtividade: { contains: busca, mode: 'insensitive' } },
        { responsavel: { contains: busca, mode: 'insensitive' } },
        { contrato: { contains: busca, mode: 'insensitive' } },
        { pedido: { contains: busca, mode: 'insensitive' } },
        { titulo: { contains: busca, mode: 'insensitive' } },
      ];
    }

    if (q.status) {
      where.status = {
        equals: String(q.status),
        mode: 'insensitive',
      };
    } else if (q.mostrarConcluidos !== 'true' && !q.situacao) {
      where.NOT = {
        status: {
          in: [
            'Concluído',
            'Concluída',
            'CONCLUÍDO',
            'CONCLUIDO',
            'CONCLUÍDA',
            'CONCLUIDA',
          ],
        },
      };
    }

    if (q.responsavel) {
      where.responsavel = {
        contains: String(q.responsavel),
        mode: 'insensitive',
      };
    }

    if (q.uf) {
      where.ufExecucao = String(q.uf).toUpperCase();
    }

    if (q.prioridade) {
      where.prioridade = {
        equals: String(q.prioridade),
        mode: 'insensitive',
      };
    }

    if (q.situacao) {
      const agora = new Date();
      agora.setHours(0, 0, 0, 0);

      const encerrados = [
        'Concluído',
        'Concluida',
        'Concluída',
        'Concluido',
        'Cancelado',
        'Cancelada',
      ];

      const situ = String(q.situacao).toLowerCase();

      const extra: Prisma.OpServicoWhereInput | null =
        situ === 'atrasado'
          ? { prazoFinal: { lt: agora }, status: { notIn: encerrados } }
          : situ === 'em_dia'
            ? { prazoFinal: { gte: agora }, status: { notIn: encerrados } }
            : situ === 'planejamento'
              ? {
                  status: {
                    in: ['Planejado', 'Não iniciado', 'Nao iniciado'],
                  },
                }
              : situ === 'em_andamento'
                ? { status: { equals: 'Em andamento', mode: 'insensitive' } }
                : situ === 'aguardando_cliente'
                  ? {
                      status: {
                        equals: 'Aguardando Cliente',
                        mode: 'insensitive',
                      },
                    }
                  : situ === 'falta_material'
                    ? {
                        status: {
                          equals: 'Falta Material',
                          mode: 'insensitive',
                        },
                      }
                    : situ === 'concluido'
                      ? {
                          status: {
                            in: [
                              'Concluído',
                              'Concluida',
                              'Concluída',
                              'Concluido',
                            ],
                          },
                        }
                      : situ === 'cancelado'
                        ? { status: { in: ['Cancelado', 'Cancelada'] } }
                        : null;

      if (extra && Array.isArray(where.AND)) {
        where.AND.push(extra);
      }
    }

    const direcao: Prisma.SortOrder = q.direcao === 'desc' ? 'desc' : 'asc';

    const principal: Prisma.OpServicoOrderByWithRelationInput =
      q.ordenar === 'proposta'
        ? { proposta: direcao }
        : q.ordenar === 'cliente'
          ? { cliente: direcao }
          : q.ordenar === 'servicoAtividade'
            ? { servicoAtividade: direcao }
            : q.ordenar === 'responsavel'
              ? { responsavel: direcao }
              : q.ordenar === 'prioridade'
                ? { prioridade: direcao }
                : q.ordenar === 'status'
                  ? { status: direcao }
                  : q.ordenar === 'percentual'
                    ? { percentual: direcao }
                    : { prazoFinal: direcao };

    const [total, itens] = await this.db.$transaction([
      this.db.opServico.count({ where }),
      this.db.opServico.findMany({
        where,
        skip: p.skip,
        take: p.porPagina,
        orderBy: [principal, { atualizadoEm: 'desc' }],
        include: {
          clienteCadastro: true,
        },
      }),
    ]);

    return {
      itens: itens.map((item) => {
        const pendenciasPreparacao = this.pendenciasPreparacao(item);

        return {
          ...item,
          preparacaoCompleta: pendenciasPreparacao.length === 0,
          pendenciasPreparacao,
        };
      }),
      total,
      pagina: p.pagina,
      porPagina: p.porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / p.porPagina)),
    };
  }

  async responsaveisElegiveis() {
    return this.db.pessoa.findMany({
      where: {
        ativo: true,
        funcoes: {
          some: {
            ativo: true,
            funcao: {
              in: ['TECNICO', 'AUXILIAR', 'AUXILIAR_TECNICO', 'SUPERVISOR'],
            },
          },
        },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        unidade: true,
        funcoes: {
          where: {
            ativo: true,
            funcao: {
              in: ['TECNICO', 'AUXILIAR', 'AUXILIAR_TECNICO', 'SUPERVISOR'],
            },
          },
          select: { funcao: true },
          orderBy: { funcao: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async propostasAprovadasSemServico() {
    const propostas = await this.db.opProposta.findMany({
      where: {
        status: {
          equals: 'APROVADO',
          mode: 'insensitive',
        },
        servico: null,
      },
      orderBy: [{ atualizadoEm: 'desc' }, { numero: 'desc' }],
      take: 200,
      select: {
        id: true,
        numero: true,
        clienteNome: true,
        clienteCodigo: true,
        clienteUf: true,
        clienteMunicipio: true,
        local: true,
        enderecoInstalacao: true,
        titulo: true,
        tipo: true,
        status: true,
        contrato: true,
        contatoNome: true,
        contatoEmail: true,
        contatoCelular: true,
        dataCadastro: true,
        atualizadoEm: true,
        prazoExecucaoDiasUteis: true,
      },
    });

    const tipos = [
      ...new Set(
        propostas
          .map((item) => item.tipo?.trim())
          .filter((item): item is string => Boolean(item)),
      ),
    ];

    const configuracoes = await this.db.opTipoPropostaArea.findMany({
      where: {
        tipo: { in: tipos },
      },
    });

    const mapa = new Map(configuracoes.map((item) => [item.tipo, item]));

    return propostas.map((proposta) => {
      const tipo = proposta.tipo?.trim() || '';
      const configuracao = mapa.get(tipo);

      const prazo =
        proposta.prazoExecucaoDiasUteis ??
        configuracao?.prazoPadraoDiasUteis ??
        null;

      return {
        ...proposta,
        areaResponsavel: configuracao?.area ?? null,
        prazoExecucaoDiasUteis: prazo,
        configuracaoValida: Boolean(
          configuracao?.ativo && configuracao.area && prazo,
        ),
        motivoBloqueio: !configuracao
          ? 'Tipo de proposta sem associação cadastrada.'
          : !configuracao.ativo
            ? 'Associação do tipo de proposta está inativa.'
            : !prazo
              ? 'Prazo em dias úteis não configurado.'
              : null,
      };
    });
  }

  async proposta(p: string) {
    return {
      existe: !!(await this.db.opServico.findFirst({
        where: { proposta: { equals: p.trim(), mode: 'insensitive' } },
        select: { id: true },
      })),
    };
  }
  async servico(id: string) {
    const x = await this.db.opServico.findUnique({
      where: { id },
      include: {
        clienteCadastro: true,
        andamentos: { orderBy: { registradoEm: 'desc' } },
        historicos: { orderBy: { registradoEm: 'desc' } },
        emails: { orderBy: { enviadoEm: 'desc' } },
      },
    });
    if (!x) throw new NotFoundException('Serviço não encontrado');
    return x;
  }
  async detalhes(id: string) {
    const servico = await this.db.opServico.findUnique({
      where: { id },
      include: {
        clienteCadastro: true,
        propostaCadastro: true,
        responsaveis: {
          orderBy: { atribuidoEm: 'asc' },
          include: {
            pessoa: {
              select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                unidade: true,
                cargo: true,
                ativo: true,
                funcoes: {
                  where: { ativo: true },
                  select: { funcao: true },
                  orderBy: { funcao: 'asc' },
                },
              },
            },
          },
        },
        andamentos: {
          orderBy: [{ registradoEm: 'desc' }, { id: 'desc' }],
        },
        historicos: {
          orderBy: [{ registradoEm: 'desc' }, { id: 'desc' }],
        },
        roteiroVisitas: {
          orderBy: [
            { dataVisita: 'desc' },
            { ordemExecucao: 'asc' },
            { id: 'desc' },
          ],
        },
        anexos: {
          orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
        },
        emails: {
          orderBy: [{ enviadoEm: 'desc' }, { id: 'desc' }],
        },
      },
    });

    if (!servico) {
      throw new NotFoundException('Serviço não encontrado');
    }

    const materiais = servico.proposta
      ? await this.db.fin_pedidos_venda.findMany({
          where: {
            seu_pedido: {
              equals: servico.proposta.trim(),
              mode: 'insensitive',
            },
          },
          orderBy: [{ data_pedido: 'desc' }, { pedido: 'asc' }, { id: 'asc' }],
        })
      : [];

    const contratosNormalizados = servico.contrato?.trim()
      ? await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id
          FROM ordens_servico
          WHERE regexp_replace(
            upper(coalesce(contrato, '')),
            '[^A-Z0-9]',
            '',
            'g'
          ) = regexp_replace(
            upper(${servico.contrato}),
            '[^A-Z0-9]',
            '',
            'g'
          )
          ORDER BY abertura DESC NULLS LAST, id
        `)
      : [];

    const ordensServico = contratosNormalizados.length
      ? await this.db.ordemServico.findMany({
          where: {
            id: {
              in: contratosNormalizados.map((item) => item.id),
            },
          },
          include: {
            equipamentos: {
              orderBy: [{ tipo: 'asc' }, { descricao: 'asc' }, { id: 'asc' }],
            },
          },
          orderBy: [{ abertura: 'desc' }, { numero: 'desc' }],
        })
      : [];

    const auditoria = await this.db.auditoria.findMany({
      where: {
        entidadeId: id,
        entidade: {
          in: ['OP_SERVICO', 'SERVICO', 'OPERACIONAL_SERVICO'],
        },
      },
      select: {
        id: true,
        entidade: true,
        acao: true,
        dadosAntes: true,
        dadosDepois: true,
        ip: true,
        userAgent: true,
        criadoEm: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    });

    const pedidos = new Map<
      string,
      {
        numero: string;
        dataPedido: Date | null;
        situacao: string | null;
        enderecoEntrega: string | null;
        itens: Array<Record<string, unknown>>;
      }
    >();

    for (const item of materiais) {
      const numero = item.pedido?.trim() || 'SEM_NUMERO';
      let pedido = pedidos.get(numero);

      if (!pedido) {
        pedido = {
          numero,
          dataPedido: item.data_pedido,
          situacao: item.situacao_pedido,
          enderecoEntrega: item.endereco_entrega,
          itens: [],
        };
        pedidos.set(numero, pedido);
      }

      pedido.itens.push({
        id: item.id.toString(),
        produto: item.produto,
        descricao: item.descricao,
        grupo: item.grupo,
        quantidade: item.quantidade,
        valorUnitario: item.valor_unitario,
        valorProdutos: item.valor_produtos,
        status: item.status,
        especie: item.especie,
        motivo: item.motivo,
      });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const atrasado =
      Boolean(servico.ativo) &&
      Boolean(servico.prazoFinal) &&
      servico.prazoFinal! < hoje &&
      !['CONCLUÍDA', 'CONCLUIDA', 'CONCLUÍDO', 'CONCLUIDO'].includes(
        servico.status.toUpperCase(),
      );

    return {
      resumo: {
        ...servico,
        atrasado,
        andamentos: undefined,
        historicos: undefined,
        roteiroVisitas: undefined,
        anexos: undefined,
        emails: undefined,
        responsaveis: undefined,
      },

      planejamento: {
        diasPreparacao: servico.diasPreparacao,
        tempoExecucaoDias: servico.tempoExecucaoDias,
        dataAprovacao: servico.dataAprovacao,
        inicioPlanejado: servico.inicioPlanejado,
        prazoFinal: servico.prazoFinal,
        inicioReal: servico.inicioReal,
        conclusaoReal: servico.conclusaoReal,
        status: servico.status,
        statusBase: servico.statusBase,
        percentual: servico.percentual,
        atrasado,
      },

      responsaveis: servico.responsaveis,

      diario: servico.andamentos.map((item) => ({
        ...item,
        id: item.id.toString(),
      })),

      visitasTecnicas: servico.roteiroVisitas.map((item) => ({
        ...item,
        id: item.id.toString(),
        preventivaId: item.preventivaId?.toString() ?? null,
      })),

      materiais: {
        proposta: servico.proposta,
        quantidadePedidos: pedidos.size,
        quantidadeItens: materiais.length,
        pedidos: [...pedidos.values()],
      },

      ordensServico: ordensServico.map((ordem) => ({
        ...ordem,
        equipamentos: ordem.equipamentos,
      })),

      anexos: servico.anexos.map((item) => ({
        ...item,
        tamanho: item.tamanho?.toString() ?? null,
      })),

      emails: servico.emails.map((item) => ({
        ...item,
        id: item.id.toString(),
      })),

      historico: servico.historicos.map((item) => ({
        ...item,
        id: item.id.toString(),
      })),

      auditoria: auditoria.map((item) => ({
        ...item,
        id: item.id.toString(),
      })),

      contadores: {
        responsaveis: servico.responsaveis.filter((item) => item.ativo).length,
        andamentos: servico.andamentos.length,
        visitasTecnicas: servico.roteiroVisitas.length,
        pedidos: pedidos.size,
        materiais: materiais.length,
        ordensServico: ordensServico.length,
        equipamentos: ordensServico.reduce(
          (total, ordem) => total + ordem.equipamentos.length,
          0,
        ),
        anexos: servico.anexos.filter((item) => item.ativo).length,
        emails: servico.emails.length,
        falhasEmail: servico.emails.filter((item) => !item.sucesso).length,
        alteracoes: servico.historicos.length + auditoria.length,
      },
    };
  }

  async salvar(id: string | null, b: any) {
    if (!id) {
      if (!b.proposta) throw new BadRequestException('Proposta obrigatória');
      const proposta = await this.db.opProposta.findFirst({
        where: {
          numero: { equals: String(b.proposta).trim(), mode: 'insensitive' },
        },
      });
      if (!proposta) throw new NotFoundException('Proposta não encontrada');
      if (proposta.status.trim().toUpperCase() !== 'APROVADO')
        throw new BadRequestException(
          'Somente propostas APROVADO podem abrir serviço',
        );
      const existente = await this.db.opServico.findFirst({
        where: { proposta: { equals: proposta.numero, mode: 'insensitive' } },
      });
      if (existente)
        throw new ConflictException('Já existe serviço para esta proposta');
      b.propostaId = proposta.id;
      b.proposta = proposta.numero;
      b.cliente = proposta.clienteNome;
      b.clienteLocal =
        proposta.local || proposta.enderecoInstalacao || b.clienteLocal;
      b.ufExecucao = proposta.clienteUf || b.ufExecucao;
      b.tipoProposta = proposta.tipo || b.tipoProposta;
      b.dataAprovacao =
        proposta.atualizadoEm || proposta.dataCadastro || b.dataAprovacao;
      const cliente = await this.db.opCliente.findFirst({
        where: {
          OR: [
            {
              codigo: proposta.clienteCodigo
                ? Number(proposta.clienteCodigo)
                : -1,
            },
            {
              razaoSocial: {
                equals: proposta.clienteNome || '',
                mode: 'insensitive',
              },
            },
          ],
        },
      });
      if (cliente) b.clienteId = cliente.id;
    }

    if (!b.cliente || !b.servicoAtividade)
      throw new BadRequestException(
        'Cliente e serviço/atividade são obrigatórios',
      );
    if (b.proposta) {
      const dup = await this.db.opServico.findFirst({
        where: {
          proposta: { equals: String(b.proposta).trim(), mode: 'insensitive' },
          ...(id ? { id: { not: id } } : {}),
        },
      });
      if (dup)
        throw new ConflictException('Já existe serviço para esta proposta');
    }
    const data: any = {
      ...b,
      percentual: b.percentual === undefined ? undefined : Number(b.percentual),
    };
    delete data.id;
    delete data.usuario;
    delete data.andamentos;
    delete data.historicos;
    delete data.emails;
    delete data.clienteCadastro;
    delete data.propostaCadastro;
    delete data.criadoEm;
    delete data.atualizadoEm;
    return this.db.$transaction(async (tx: any) => {
      if (!id) {
        this.validarPreparacao(data);
        return tx.opServico.create({ data });
      }

      const antigo = await tx.opServico.findUnique({
        where: { id },
      });

      if (!antigo) {
        throw new NotFoundException('Serviço não encontrado');
      }

      const estadoFinal = {
        ...antigo,
        ...data,
      };

      this.validarPreparacao(estadoFinal);

      const novo = await tx.opServico.update({
        where: { id },
        data,
      });
      for (const campo of [
        'status',
        'percentual',
        'responsavel',
        'prazoFinal',
        'inicioReal',
        'conclusaoReal',
      ]) {
        if (
          b[campo] !== undefined &&
          String(antigo[campo] ?? '') !== String(b[campo] ?? '')
        )
          await tx.opServicoHistorico.create({
            data: {
              servicoId: id,
              usuario: String(b.usuario || 'sistema'),
              campo,
              valorAntigo: String(antigo[campo] ?? ''),
              valorNovo: String(b[campo] ?? ''),
            },
          });
      }
      return novo;
    });
  }
  async atualizarAdministrativo(
    id: string,
    body: AdminUpdateServiceDto,
    usuario: string,
  ) {
    const antigo = await this.db.opServico.findUnique({
      where: { id },
    });

    if (!antigo) {
      throw new NotFoundException('Serviço não encontrado');
    }

    const data: Prisma.OpServicoUpdateInput = {
      cliente: body.cliente,
      clienteLocal: body.clienteLocal,
      contrato: body.contrato,
      pedido: body.pedido,
      contatoNome: body.contatoNome,
      contatoEmail: body.contatoEmail,
      contatoTelefone: body.contatoTelefone,
      enderecoInstalacao: body.enderecoInstalacao,
      titulo: body.titulo,
      categoria: body.categoria,
      dataAprovacao: body.dataAprovacao
        ? new Date(body.dataAprovacao)
        : body.dataAprovacao === null
          ? null
          : undefined,
      inicioPlanejado: body.inicioPlanejado
        ? new Date(body.inicioPlanejado)
        : body.inicioPlanejado === null
          ? null
          : undefined,
      prazoFinal: body.prazoFinal
        ? new Date(body.prazoFinal)
        : body.prazoFinal === null
          ? null
          : undefined,
      diasPreparacao: body.diasPreparacao,
      tempoExecucaoDias: body.tempoExecucaoDias,
      percentual: body.percentual,
      proximaAcao: body.proximaAcao,
      ultimaSituacao: body.ultimaSituacao,
      tipoProposta: body.tipoProposta,
      ufExecucao: body.ufExecucao?.toUpperCase(),
      servicoAtividade: body.servicoAtividade,
      responsavel: body.responsavel || null,
      prioridade: body.prioridade,
      status: body.status,
      inicioReal: body.inicioReal
        ? new Date(body.inicioReal)
        : body.inicioReal === null
          ? null
          : undefined,
      conclusaoReal: body.conclusaoReal
        ? new Date(body.conclusaoReal)
        : body.conclusaoReal === null
          ? null
          : undefined,
      observacoes: body.observacoes,
    };

    return this.db.$transaction(async (tx) => {
      const novo = await tx.opServico.update({
        where: { id },
        data,
      });

      const alteracoes = [
        'cliente',
        'clienteLocal',
        'contrato',
        'pedido',
        'contatoNome',
        'contatoEmail',
        'contatoTelefone',
        'enderecoInstalacao',
        'titulo',
        'categoria',
        'dataAprovacao',
        'inicioPlanejado',
        'prazoFinal',
        'diasPreparacao',
        'tempoExecucaoDias',
        'percentual',
        'proximaAcao',
        'ultimaSituacao',
        'tipoProposta',
        'ufExecucao',
        'servicoAtividade',
        'responsavel',
        'prioridade',
        'status',
        'inicioReal',
        'conclusaoReal',
        'observacoes',
      ] as const;

      for (const campo of alteracoes) {
        const anterior = antigo[campo];
        const posterior = novo[campo];

        if (String(anterior ?? '') === String(posterior ?? '')) {
          continue;
        }

        await tx.opServicoHistorico.create({
          data: {
            servicoId: id,
            usuario,
            campo,
            valorAntigo: String(anterior ?? ''),
            valorNovo: String(posterior ?? ''),
          },
        });
      }

      return novo;
    });
  }

  async excluirServico(id: string) {
    await this.servico(id);
    return this.db.opServico.delete({ where: { id } });
  }
  async andamento(id: string, b: any) {
    if (!b.descricao) {
      throw new BadRequestException('Descrição obrigatória');
    }

    const servico = await this.db.opServico.findUnique({
      where: { id },
    });

    if (!servico) {
      throw new NotFoundException('Serviço não encontrado');
    }

    this.validarPreparacao(servico);

    return this.db.$transaction(async (tx: any) => {
      const a = await tx.opServicoAndamento.create({
        data: {
          servicoId: id,
          usuario: String(b.usuario || 'sistema'),
          descricao: b.descricao,
          percentual: b.percentual == null ? null : Number(b.percentual),
          statusNoMomento: b.status || null,
        },
      });
      const data: any = {};
      if (b.percentual != null) data.percentual = Number(b.percentual);
      if (b.status) data.status = b.status;
      await tx.opServico.update({ where: { id }, data });
      return a;
    });
  }
  async clientes(q: any) {
    const p = this.page(q),
      where: any = {};
    if (q.q)
      where.OR = [
        'razaoSocial',
        'nomeFantasia',
        'cnpj',
        'municipio',
        'contatoNome',
      ].map((f) => ({ [f]: { contains: String(q.q), mode: 'insensitive' } }));
    if (q.uf) where.uf = q.uf;
    const [total, itens] = await this.db.$transaction([
      this.db.opCliente.count({ where }),
      this.db.opCliente.findMany({
        where,
        skip: p.skip,
        take: p.porPagina,
        orderBy: { razaoSocial: 'asc' },
      }),
    ]);
    return {
      itens,
      total,
      pagina: p.pagina,
      porPagina: p.porPagina,
      totalPaginas: Math.ceil(total / p.porPagina),
    };
  }
  async cliente(id: string) {
    const x = await this.db.opCliente.findUnique({ where: { id } });
    if (!x) throw new NotFoundException('Cliente não encontrado');
    return x;
  }
  async salvarCliente(id: string | null, b: any) {
    if (!b.razaoSocial)
      throw new BadRequestException('Razão social obrigatória');
    const data = { ...b };
    delete data.id;
    return id
      ? this.db.opCliente.update({ where: { id }, data })
      : this.db.opCliente.create({ data });
  }
  async excluirCliente(id: string) {
    await this.cliente(id);
    const vinculados = await this.db.opServico.count({
      where: { clienteId: id },
    });
    if (vinculados > 0)
      throw new ConflictException('Cliente possui serviços vinculados');
    return this.db.opCliente.delete({ where: { id } });
  }
  listas(tipo?: string) {
    return this.db.opLista.findMany({
      where: tipo ? { tipo } : undefined,
      orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
    });
  }
  salvarLista(b: any) {
    if (!b.tipo || !b.nome)
      throw new BadRequestException('Tipo e nome obrigatórios');
    return this.db.opLista.upsert({
      where: { tipo_nome: { tipo: b.tipo, nome: b.nome } },
      create: b,
      update: b,
    });
  }
  excluirLista(id: bigint) {
    return this.db.opLista.delete({ where: { id } });
  }
  notificacoes() {
    return this.db.opNotificacaoEmail.findMany({ orderBy: { email: 'asc' } });
  }
  salvarNotificacao(b: any) {
    if (!b.email) throw new BadRequestException('E-mail obrigatório');
    return this.db.opNotificacaoEmail.upsert({
      where: { email: b.email },
      create: b,
      update: b,
    });
  }
  async emails(q: any) {
    const p = this.page(q),
      where: any = {};
    if (q.tipo) where.tipo = q.tipo;
    if (q.sucesso !== undefined) where.sucesso = String(q.sucesso) === 'true';
    const [total, itens] = await this.db.$transaction([
      this.db.opEmailLog.count({ where }),
      this.db.opEmailLog.findMany({
        where,
        skip: p.skip,
        take: p.porPagina,
        orderBy: { enviadoEm: 'desc' },
        include: { servico: { select: { proposta: true, cliente: true } } },
      }),
    ]);
    return { itens, total, pagina: p.pagina, porPagina: p.porPagina };
  }
}
