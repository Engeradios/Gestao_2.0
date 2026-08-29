import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import {
  CancelDeliveryDto,
  DeliveryReturnDto,
  DeliveryRouteQueryDto,
  DeliverySourceQueryDto,
  DeliveryStatusDto,
  ReDeliveryDto,
  ReorderDeliveryDto,
  SaveDeliveryDto,
  SaveDeliveryRouteHeaderDto,
  SaveDeliveryRouteStopsDto,
  SaveDriverDto,
  SaveVehicleDto,
} from './dto/delivery-route.dto';

@Injectable()
export class DeliveryRouteService {
  constructor(private readonly db: PrismaService) {}

  private date(value?: string): Date {
    const text = (value || new Date().toISOString()).slice(0, 10);
    const date = new Date(`${text}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('Data inválida');

    return date;
  }

  private normalize(value: string): string {
    return value.replace(/\D/g, '');
  }

  private json<T>(value: T): T {
    const serialized = JSON.stringify(value, (_, item: unknown) =>
      typeof item === 'bigint' ? item.toString() : item,
    );

    return JSON.parse(serialized) as T;
  }

  async dashboard(query: DeliveryRouteQueryDto) {
    const dataEntrega = this.date(query.data);

    const statusFilter =
      query.status === 'OCORRENCIAS'
        ? { in: ['Não Entregue', 'Devolvido'] }
        : query.status
          ? { equals: query.status }
          : undefined;
    const where: Prisma.OpRoteiroEntregaWhereInput = {
      dataEntrega,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.entregadorId
        ? { entregadorId: BigInt(query.entregadorId) }
        : {}),
    };
    const indicatorWhere: Prisma.OpRoteiroEntregaWhereInput = {
      dataEntrega,
      ...(query.entregadorId
        ? { entregadorId: BigInt(query.entregadorId) }
        : {}),
    };

    const [
      entregas,
      total,
      agendadas,
      emRota,
      entregues,
      naoEntregues,
      devolvidas,
      canceladas,
    ] = await this.db.$transaction([
      this.db.opRoteiroEntrega.findMany({
        where,
        include: {
          entregador: true,
          veiculo: true,
          ordens_servico: {
            select: {
              id: true,
              numero: true,
              clienteNome: true,
              enderecoObra: true,
              local: true,
              telefone: true,
              cepEntrega: true,
            },
          },
        },
        orderBy: [
          { entregador: { nome: 'asc' } },
          { ordemExecucao: 'asc' },
          { id: 'asc' },
        ],
      }),
      this.db.opRoteiroEntrega.count({ where: indicatorWhere }),
      this.db.opRoteiroEntrega.count({
        where: { ...indicatorWhere, status: 'Agendado' },
      }),
      this.db.opRoteiroEntrega.count({
        where: { ...indicatorWhere, status: 'Em Rota' },
      }),
      this.db.opRoteiroEntrega.count({
        where: { ...indicatorWhere, status: 'Entregue' },
      }),
      this.db.opRoteiroEntrega.count({
        where: { ...indicatorWhere, status: 'Não Entregue' },
      }),
      this.db.opRoteiroEntrega.count({
        where: { ...indicatorWhere, status: 'Devolvido' },
      }),
      this.db.opRoteiroEntrega.count({
        where: { ...indicatorWhere, status: 'Cancelado' },
      }),
    ]);

    return this.json({
      data: dataEntrega,
      indicadores: {
        total,
        agendadas,
        emRota,
        entregues,
        naoEntregues,
        devolvidas,
        ocorrencias: naoEntregues + devolvidas,
        canceladas,
      },
      entregas,
    });
  }

  async routes(dataValue?: string) {
    const dataRota = dataValue ? this.date(dataValue) : undefined;
    return this.json(
      await this.db.opRoteiroEntregaCabecalho.findMany({
        where: dataRota ? { dataRota } : {},
        include: {
          entregador: true,
          veiculo: true,
          _count: { select: { entregas: true } },
        },
        orderBy: [{ dataRota: 'desc' }, { id: 'desc' }],
      }),
    );
  }

  async route(id: bigint) {
    const route = await this.db.opRoteiroEntregaCabecalho.findUnique({
      where: { id },
      include: {
        entregador: true,
        veiculo: true,
        entregas: {
          include: { ordens_servico: true },
          orderBy: [{ ordemExecucao: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!route) throw new NotFoundException('Roteiro não encontrado');
    return this.json(route);
  }

  async saveRoute(
    id: bigint | null,
    body: SaveDeliveryRouteHeaderDto,
    actor: { id: string; nome: string },
  ) {
    return this.db.$transaction(async (tx) => {
      const before = id
        ? await tx.opRoteiroEntregaCabecalho.findUnique({ where: { id } })
        : null;
      if (id && !before) throw new NotFoundException('Roteiro não encontrado');
      if (before && before.status !== 'RASCUNHO') {
        throw new BadRequestException(
          'Somente roteiros em rascunho podem ser editados',
        );
      }

      const [driver, vehicle] = await Promise.all([
        tx.opEntregador.findFirst({
          where: { id: BigInt(body.entregadorId), ativo: true },
        }),
        tx.opVeiculo.findFirst({
          where: { id: BigInt(body.veiculoId), ativo: true },
        }),
      ]);
      if (!driver)
        throw new BadRequestException('Entregador inválido ou inativo');
      if (!vehicle)
        throw new BadRequestException('Veículo inválido ou inativo');

      const data = {
        dataRota: this.date(body.dataRota),
        entregadorId: BigInt(body.entregadorId),
        veiculoId: BigInt(body.veiculoId),
        observacoes: body.observacoes?.trim() || null,
        criadoPor: before?.criadoPor ?? actor.nome,
        atualizadoEm: new Date(),
      };
      const saved = id
        ? await tx.opRoteiroEntregaCabecalho.update({ where: { id }, data })
        : await tx.opRoteiroEntregaCabecalho.create({ data });

      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA_CABECALHO',
        saved.id,
        id ? 'ATUALIZAR_RASCUNHO' : 'CRIAR_RASCUNHO',
        before,
        saved,
      );
      return this.json(saved);
    });
  }

  async saveRouteStops(
    id: bigint,
    body: SaveDeliveryRouteStopsDto,
    actor: { id: string; nome: string },
  ) {
    const duplicateKeys = new Set<string>();
    for (const stop of body.paradas) {
      const number = stop.origemNumero?.trim();
      if (!number) continue;
      const key = `${stop.origem}:${this.normalize(number) || number}`;
      if (duplicateKeys.has(key)) {
        throw new BadRequestException(
          `Origem duplicada no roteiro: ${stop.origem} ${number}`,
        );
      }
      duplicateKeys.add(key);
    }

    return this.db.$transaction(async (tx) => {
      const route = await tx.opRoteiroEntregaCabecalho.findUnique({
        where: { id },
        include: {
          entregas: { orderBy: [{ ordemExecucao: 'asc' }, { id: 'asc' }] },
        },
      });
      if (!route) throw new NotFoundException('Roteiro não encontrado');
      if (route.status !== 'RASCUNHO') {
        throw new BadRequestException(
          'Somente roteiros em rascunho podem ter paradas alteradas',
        );
      }

      await tx.opRoteiroEntrega.deleteMany({ where: { roteiroId: id } });

      for (const stop of body.paradas) {
        const number = stop.origemNumero?.trim() || null;
        const normalized = number ? this.normalize(number) : null;
        let ordemServicoId: string | null = null;

        if (stop.origem === 'OS') {
          if (!number) {
            throw new BadRequestException('Informe o número da OS');
          }
          const serviceOrder = await tx.ordemServico.findFirst({
            where: {
              OR: [
                { numero: number },
                { numero: normalized || number },
                { chamado: number },
                { chamado: normalized || number },
              ],
            },
            orderBy: { atualizadoEm: 'desc' },
          });
          if (!serviceOrder) {
            throw new NotFoundException(
              `Ordem de serviço não encontrada: ${number}`,
            );
          }
          ordemServicoId = serviceOrder.id;
        }

        await tx.opRoteiroEntrega.create({
          data: {
            roteiroId: id,
            dataEntrega: route.dataRota,
            entregadorId: route.entregadorId,
            veiculoId: route.veiculoId,
            ordemServicoId,
            origem: stop.origem,
            origemNumero: number,
            origemNumeroNormalizado: normalized,
            clienteNome: stop.clienteNome?.trim() || null,
            enderecoEntrega: stop.enderecoEntrega?.trim() || null,
            bairro: stop.bairro?.trim() || null,
            cidade: stop.cidade?.trim() || null,
            uf: stop.uf?.trim().toUpperCase() || null,
            observacaoRota: stop.observacaoRota?.trim() || null,
            status: 'Agendado',
            ordemExecucao: stop.ordemExecucao,
            criadoPor: actor.nome,
            origemEvento: 'WEB',
          },
        });
      }

      const updatedRoute = await tx.opRoteiroEntregaCabecalho.update({
        where: { id },
        data: { atualizadoEm: new Date() },
        include: {
          entregador: true,
          veiculo: true,
          entregas: { orderBy: [{ ordemExecucao: 'asc' }, { id: 'asc' }] },
        },
      });

      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA_CABECALHO',
        id,
        'SALVAR_PARADAS',
        route,
        updatedRoute,
      );
      return this.json(updatedRoute);
    });
  }

  async dispatchRoute(id: bigint, actor: { id: string; nome: string }) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.opRoteiroEntregaCabecalho.findUnique({
        where: { id },
        include: { _count: { select: { entregas: true } } },
      });
      if (!before) throw new NotFoundException('Roteiro não encontrado');
      if (before.status !== 'RASCUNHO') {
        throw new BadRequestException(
          'Somente roteiros em rascunho podem ser despachados',
        );
      }
      if (before._count.entregas === 0) {
        throw new BadRequestException(
          'Inclua ao menos uma entrega antes do despacho',
        );
      }

      const updated = await tx.opRoteiroEntregaCabecalho.update({
        where: { id },
        data: {
          status: 'DESPACHADO',
          despachadoEm: new Date(),
          despachadoPor: actor.nome,
          atualizadoEm: new Date(),
        },
      });
      await tx.opRoteiroEntrega.updateMany({
        where: { roteiroId: id, status: 'Agendado' },
        data: { status: 'Em Rota', atualizadoEm: new Date() },
      });
      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA_CABECALHO',
        id,
        'DESPACHAR',
        before,
        updated,
      );
      return this.json(updated);
    });
  }

  async history(id: bigint) {
    const delivery = await this.db.opRoteiroEntrega.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!delivery) throw new NotFoundException('Entrega não encontrada');

    return this.json(
      await this.db.opRoteiroEntregaHistorico.findMany({
        where: { entregaId: id },
        orderBy: [{ registradoEm: 'asc' }, { id: 'asc' }],
      }),
    );
  }

  async suggestions(typeValue: string, queryValue: string) {
    const type = String(typeValue || '')
      .trim()
      .toUpperCase();
    const query = String(queryValue || '').trim();
    if (!['OS', 'PEDIDO'].includes(type)) {
      throw new BadRequestException('Tipo de sugestão inválido');
    }
    if (query.length < 2) return [];
    const normalized = this.normalize(query);

    if (type === 'OS') {
      const rows = await this.db.ordemServico.findMany({
        where: {
          OR: [
            { numero: { contains: query, mode: 'insensitive' } },
            { chamado: { contains: query, mode: 'insensitive' } },
            { clienteNome: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          numero: true,
          chamado: true,
          clienteNome: true,
          enderecoObra: true,
          local: true,
          uf: true,
          cepEntrega: true,
          cliente: {
            select: { endereco: true, bairro: true, municipio: true, uf: true },
          },
        },
        orderBy: [{ atualizadoEm: 'desc' }],
        take: 8,
      });
      return this.json(
        rows
          .sort((a, b) => {
            const aNumber = this.normalize(a.numero || a.chamado || '');
            const bNumber = this.normalize(b.numero || b.chamado || '');
            return (
              Number(bNumber.startsWith(normalized)) -
              Number(aNumber.startsWith(normalized))
            );
          })
          .map((row) => ({
            origem: 'OS',
            numero: row.numero || row.chamado,
            clienteNome: row.clienteNome,
            enderecoEntrega: row.enderecoObra || row.cliente?.endereco,
            bairro: row.cliente?.bairro,
            cidade: row.cliente?.municipio,
            uf: row.uf || row.cliente?.uf,
            cep: row.cepEntrega,
            local: row.local,
          })),
      );
    }

    const rows = await this.db.fin_pedidos_venda.findMany({
      where: {
        OR: [
          { pedido: { contains: query, mode: 'insensitive' } },
          { pedido_normalizado: { contains: normalized, mode: 'insensitive' } },
          { cliente: { contains: query, mode: 'insensitive' } },
        ],
      },
      distinct: ['pedido_normalizado'],
      orderBy: [{ id: 'desc' }],
      take: 8,
    });
    return this.json(
      rows
        .sort(
          (a, b) =>
            Number((b.pedido_normalizado || '').startsWith(normalized)) -
            Number((a.pedido_normalizado || '').startsWith(normalized)),
        )
        .map((row) => ({
          origem: 'PEDIDO',
          numero: row.pedido,
          numeroNormalizado: row.pedido_normalizado,
          clienteNome: row.cliente,
          enderecoEntrega: row.endereco_entrega,
          bairro: row.bairro_entrega,
          cidade: row.cidade_entrega,
          status: row.status,
        })),
    );
  }

  async source(query: DeliverySourceQueryDto) {
    const numero = query.numero.trim();
    const normalizado = this.normalize(numero);

    if (query.origem === 'OS') {
      const ordem = await this.db.ordemServico.findFirst({
        where: {
          OR: [
            { numero },
            { numero: normalizado },
            { chamado: numero },
            { chamado: normalizado },
          ],
        },
        include: {
          cliente: {
            select: {
              razaoSocial: true,
              nomeFantasia: true,
              endereco: true,
              bairro: true,
              municipio: true,
              uf: true,
              cep: true,
            },
          },
        },
        orderBy: { atualizadoEm: 'desc' },
      });

      if (!ordem)
        throw new NotFoundException('Ordem de serviço não encontrada');

      return this.json({
        origem: 'OS',
        numero: ordem.numero,
        ordemServicoId: ordem.id,
        clienteNome:
          ordem.clienteNome ||
          ordem.cliente?.nomeFantasia ||
          ordem.cliente?.razaoSocial,
        enderecoEntrega: ordem.enderecoObra || ordem.cliente?.endereco,
        bairro: ordem.cliente?.bairro,
        cidade: ordem.cliente?.municipio,
        uf: ordem.uf || ordem.cliente?.uf,
        cep: ordem.cepEntrega || ordem.cep || ordem.cliente?.cep,
        local: ordem.local,
        telefone: ordem.telefone,
      });
    }

    const pedido = await this.db.fin_pedidos_venda.findFirst({
      where: {
        OR: [
          { pedido: numero },
          { pedido_normalizado: numero },
          { pedido_normalizado: normalizado },
        ],
      },
      orderBy: { id: 'desc' },
    });

    if (!pedido) throw new NotFoundException('Pedido de venda não encontrado');

    return this.json({
      origem: 'PEDIDO',
      numero: pedido.pedido,
      numeroNormalizado: pedido.pedido_normalizado,
      clienteNome: pedido.cliente,
      enderecoEntrega: pedido.endereco_entrega,
      bairro: pedido.bairro_entrega,
      cidade: pedido.cidade_entrega,
      dataPedido: pedido.data_pedido,
      previsaoFaturamento: pedido.data_prev_fat,
      status: pedido.status,
      transportadora: pedido.transportadora,
      tipoFrete: pedido.tipo_frete,
    });
  }

  async drivers(includeInactive = false) {
    return this.json(
      await this.db.opEntregador.findMany({
        where: includeInactive ? {} : { ativo: true },
        orderBy: { nome: 'asc' },
      }),
    );
  }

  async vehicles(includeInactive = false) {
    return this.json(
      await this.db.opVeiculo.findMany({
        where: includeInactive ? {} : { ativo: true },
        orderBy: [{ placa: 'asc' }, { modelo: 'asc' }],
      }),
    );
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actor: { id: string },
    entidade: string,
    entidadeId: bigint,
    acao: string,
    antes: unknown,
    depois: unknown,
  ) {
    await tx.auditoria.create({
      data: {
        usuarioId: actor.id,
        entidade,
        entidadeId: entidadeId.toString(),
        acao,
        dadosAntes: this.json(antes) as Prisma.InputJsonValue,
        dadosDepois: this.json(depois) as Prisma.InputJsonValue,
      },
    });
  }

  async saveDelivery(
    id: bigint | null,
    body: SaveDeliveryDto,
    actor: { id: string; nome: string },
  ) {
    const before = id
      ? await this.db.opRoteiroEntrega.findUnique({ where: { id } })
      : null;

    if (id && !before) throw new NotFoundException('Entrega não encontrada');

    let ordemServicoId: string | null = before?.ordemServicoId ?? null;
    const numero = body.origemNumero?.trim() || null;
    const normalizado = numero ? this.normalize(numero) : null;

    if (body.origem === 'OS' && numero) {
      const ordem = await this.db.ordemServico.findFirst({
        where: {
          OR: [
            { numero },
            { numero: normalizado || numero },
            { chamado: numero },
            { chamado: normalizado || numero },
          ],
        },
        orderBy: { atualizadoEm: 'desc' },
      });

      if (!ordem)
        throw new NotFoundException('Ordem de serviço não encontrada');

      ordemServicoId = ordem.id;
    } else if (body.origem !== 'OS') {
      ordemServicoId = null;
    }

    const data = {
      dataEntrega: this.date(body.dataEntrega),
      origem: body.origem,
      origemNumero: numero,
      origemNumeroNormalizado: normalizado,
      ordemServicoId,
      clienteNome: body.clienteNome?.trim() || null,
      enderecoEntrega: body.enderecoEntrega?.trim() || null,
      bairro: body.bairro?.trim() || null,
      cidade: body.cidade?.trim() || null,
      uf: body.uf?.trim().toUpperCase() || null,
      entregadorId: body.entregadorId ? BigInt(body.entregadorId) : null,
      veiculoId: body.veiculoId ? BigInt(body.veiculoId) : null,
      ordemExecucao: body.ordemExecucao ?? 1,
      observacaoRota: body.observacaoRota?.trim() || null,
      isReentrega: body.isReentrega ?? false,
      criadoPor: before?.criadoPor ?? actor.nome,
      atualizadoEm: new Date(),
    };

    return this.db.$transaction(async (tx) => {
      const saved = id
        ? await tx.opRoteiroEntrega.update({
            where: { id },
            data,
          })
        : await tx.opRoteiroEntrega.create({
            data,
          });

      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA',
        saved.id,
        id ? 'ATUALIZAR' : 'CRIAR',
        before,
        saved,
      );

      return this.json(saved);
    });
  }

  async updateStatus(
    id: bigint,
    body: DeliveryStatusDto,
    actor: { id: string },
  ) {
    const before = await this.db.opRoteiroEntrega.findUnique({
      where: { id },
    });

    if (!before) throw new NotFoundException('Entrega não encontrada');

    return this.db.$transaction(async (tx) => {
      const updated = await tx.opRoteiroEntrega.update({
        where: { id },
        data: {
          status: body.status,
          observacaoRetorno: body.observacaoRetorno?.trim() || null,
          atualizadoEm: new Date(),
        },
      });

      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA',
        id,
        'ALTERAR_STATUS',
        before,
        updated,
      );

      return this.json(updated);
    });
  }

  async confirmReturn(
    id: bigint,
    body: DeliveryReturnDto,
    actor: { id: string; nome: string },
  ) {
    if (body.status === 'Não Entregue' && (!body.motivo || !body.observacao)) {
      throw new BadRequestException(
        'Motivo e observação são obrigatórios para entrega não realizada',
      );
    }

    return this.db.$transaction(async (tx) => {
      if (body.eventoId) {
        const duplicate = await tx.opRoteiroEntregaHistorico.findUnique({
          where: { eventoId: body.eventoId },
        });
        if (duplicate) {
          return this.json(
            await tx.opRoteiroEntrega.findUniqueOrThrow({ where: { id } }),
          );
        }
      }

      const before = await tx.opRoteiroEntrega.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Entrega não encontrada');

      const updated = await tx.opRoteiroEntrega.update({
        where: { id },
        data: {
          status: body.status,
          observacaoRetorno: body.observacao?.trim() || null,
          motivoInsucesso:
            body.status === 'Não Entregue' ? body.motivo?.trim() || null : null,
          confirmadoEm: new Date(),
          confirmadoPor: actor.nome,
          origemEvento: body.origemEvento || 'WEB',
          atualizadoEm: new Date(),
        },
      });

      await tx.opRoteiroEntregaHistorico.create({
        data: {
          entregaId: id,
          statusAnterior: before.status,
          statusNovo: body.status,
          observacao: body.observacao?.trim() || null,
          motivo: body.motivo?.trim() || null,
          usuarioId: actor.id,
          usuarioNome: actor.nome,
          origemEvento: body.origemEvento || 'WEB',
          eventoId: body.eventoId?.trim() || null,
        },
      });

      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA',
        id,
        'RETORNO',
        before,
        updated,
      );
      return this.json(updated);
    });
  }

  async returnToBase(
    id: bigint,
    body: CancelDeliveryDto,
    actor: { id: string; nome: string },
  ) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.opRoteiroEntrega.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Entrega não encontrada');
      if (!['Em Rota', 'Não Entregue'].includes(before.status)) {
        throw new BadRequestException(
          'Somente entregas em rota ou não entregues podem ser devolvidas',
        );
      }
      const updated = await tx.opRoteiroEntrega.update({
        where: { id },
        data: {
          status: 'Devolvido',
          observacaoRetorno: body.observacao.trim(),
          motivoInsucesso: 'Devolvido à base',
          confirmadoEm: new Date(),
          confirmadoPor: actor.nome,
          origemEvento: body.origemEvento || 'WEB',
          atualizadoEm: new Date(),
        },
      });
      await tx.opRoteiroEntregaHistorico.create({
        data: {
          entregaId: id,
          statusAnterior: before.status,
          statusNovo: 'Devolvido',
          observacao: body.observacao.trim(),
          motivo: 'Devolvido à base',
          usuarioId: actor.id,
          usuarioNome: actor.nome,
          origemEvento: body.origemEvento || 'WEB',
          eventoId: body.eventoId?.trim() || null,
        },
      });
      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA',
        id,
        'DEVOLVER_BASE',
        before,
        updated,
      );
      return this.json(updated);
    });
  }

  async cancelDelivery(
    id: bigint,
    body: CancelDeliveryDto,
    actor: { id: string; nome: string },
  ) {
    return this.db.$transaction(async (tx) => {
      if (body.eventoId) {
        const duplicate = await tx.opRoteiroEntregaHistorico.findUnique({
          where: { eventoId: body.eventoId },
        });
        if (duplicate) {
          return this.json(
            await tx.opRoteiroEntrega.findUniqueOrThrow({ where: { id } }),
          );
        }
      }

      const before = await tx.opRoteiroEntrega.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Entrega não encontrada');

      const updated = await tx.opRoteiroEntrega.update({
        where: { id },
        data: {
          status: 'Cancelado',
          observacaoRetorno: body.observacao.trim(),
          confirmadoEm: new Date(),
          confirmadoPor: actor.nome,
          origemEvento: body.origemEvento || 'WEB',
          atualizadoEm: new Date(),
        },
      });

      await tx.opRoteiroEntregaHistorico.create({
        data: {
          entregaId: id,
          statusAnterior: before.status,
          statusNovo: 'Cancelado',
          observacao: body.observacao.trim(),
          usuarioId: actor.id,
          usuarioNome: actor.nome,
          origemEvento: body.origemEvento || 'WEB',
          eventoId: body.eventoId?.trim() || null,
        },
      });

      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA',
        id,
        'CANCELAR',
        before,
        updated,
      );
      return this.json(updated);
    });
  }

  async reorder(id: bigint, body: ReorderDeliveryDto, actor: { id: string }) {
    const before = await this.db.opRoteiroEntrega.findUnique({
      where: { id },
    });

    if (!before) throw new NotFoundException('Entrega não encontrada');

    return this.db.$transaction(async (tx) => {
      const updated = await tx.opRoteiroEntrega.update({
        where: { id },
        data: {
          ordemExecucao: body.ordemExecucao,
          atualizadoEm: new Date(),
        },
      });

      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA',
        id,
        'REORDENAR',
        before,
        updated,
      );

      return this.json(updated);
    });
  }

  async redelivery(
    id: bigint,
    body: ReDeliveryDto,
    actor: { id: string; nome: string },
  ) {
    return this.db.$transaction(async (tx) => {
      if (body.eventoId) {
        const duplicate = await tx.opRoteiroEntrega.findUnique({
          where: { eventoId: body.eventoId },
        });
        if (duplicate) return this.json(duplicate);
      }

      const source = await tx.opRoteiroEntrega.findUnique({ where: { id } });
      if (!source) {
        throw new NotFoundException('Entrega original não encontrada');
      }
      if (source.status !== 'Não Entregue') {
        throw new BadRequestException(
          'A reentrega só pode ser criada após retorno como Não Entregue',
        );
      }

      const rootId = source.entregaOriginalId || source.id;
      const nextAttempt = source.tentativaNumero + 1;
      const created = await tx.opRoteiroEntrega.create({
        data: {
          dataEntrega: this.date(body.dataEntrega),
          entregadorId: source.entregadorId,
          veiculoId: source.veiculoId,
          ordemServicoId: source.ordemServicoId,
          origem: source.origem,
          origemNumero: source.origemNumero,
          origemNumeroNormalizado: source.origemNumeroNormalizado,
          clienteNome: source.clienteNome,
          enderecoEntrega: source.enderecoEntrega,
          bairro: source.bairro,
          cidade: source.cidade,
          uf: source.uf,
          observacaoRota: body.observacao?.trim() || source.observacaoRota,
          status: 'Agendado',
          criadoPor: actor.nome,
          ordemExecucao: source.ordemExecucao,
          isReentrega: true,
          entregaOriginalId: rootId,
          tentativaNumero: nextAttempt,
          origemEvento: body.origemEvento || 'WEB',
          eventoId: body.eventoId?.trim() || null,
        },
      });

      await tx.opRoteiroEntregaHistorico.create({
        data: {
          entregaId: source.id,
          statusAnterior: source.status,
          statusNovo: 'Reentrega Gerada',
          observacao: body.observacao?.trim() || null,
          usuarioId: actor.id,
          usuarioNome: actor.nome,
          origemEvento: body.origemEvento || 'WEB',
        },
      });
      await tx.opRoteiroEntregaHistorico.create({
        data: {
          entregaId: created.id,
          statusAnterior: null,
          statusNovo: 'Agendado',
          observacao: `Tentativa ${nextAttempt}`,
          usuarioId: actor.id,
          usuarioNome: actor.nome,
          origemEvento: body.origemEvento || 'WEB',
        },
      });

      await this.audit(
        tx,
        actor,
        'ROTEIRO_ENTREGA',
        created.id,
        'REENTREGA',
        source,
        created,
      );
      return this.json(created);
    });
  }

  async saveDriver(
    id: bigint | null,
    body: SaveDriverDto,
    actor: { id: string },
  ) {
    const before = id
      ? await this.db.opEntregador.findUnique({ where: { id } })
      : null;

    if (id && !before) throw new NotFoundException('Entregador não encontrado');

    const data = {
      nome: body.nome.trim(),
      cnh: body.cnh?.trim() || null,
      vencimentoCnh: body.vencimentoCnh ? this.date(body.vencimentoCnh) : null,
      ativo: body.ativo ?? true,
      atualizadoEm: new Date(),
    };

    return this.db.$transaction(async (tx) => {
      const saved = id
        ? await tx.opEntregador.update({ where: { id }, data })
        : await tx.opEntregador.create({ data });

      await this.audit(
        tx,
        actor,
        'ENTREGADOR',
        saved.id,
        id ? 'ATUALIZAR' : 'CRIAR',
        before,
        saved,
      );

      return this.json(saved);
    });
  }

  async saveVehicle(
    id: bigint | null,
    body: SaveVehicleDto,
    actor: { id: string },
  ) {
    const before = id
      ? await this.db.opVeiculo.findUnique({ where: { id } })
      : null;

    if (id && !before) throw new NotFoundException('Veículo não encontrado');

    const data = {
      placa: body.placa.trim().toUpperCase(),
      tipo: body.tipo?.trim() || null,
      marca: body.marca?.trim() || null,
      modelo: body.modelo?.trim() || null,
      ativo: body.ativo ?? true,
      atualizadoEm: new Date(),
    };

    return this.db.$transaction(async (tx) => {
      const saved = id
        ? await tx.opVeiculo.update({ where: { id }, data })
        : await tx.opVeiculo.create({ data });

      await this.audit(
        tx,
        actor,
        'VEICULO',
        saved.id,
        id ? 'ATUALIZAR' : 'CRIAR',
        before,
        saved,
      );

      return this.json(saved);
    });
  }
}
