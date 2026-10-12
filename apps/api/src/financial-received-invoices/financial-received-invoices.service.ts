import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CheckReceivedInvoiceDto,
  MoveReceivedInvoiceStockDto,
  ReceivedInvoiceListQueryDto,
  RegisterManifestationDto,
  UpdateNsuControlDto,
} from './dto/received-invoice.dto';

type UsuarioOperacao = {
  id?: string;
  nome?: string;
};

@Injectable()
export class FinancialReceivedInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string, field: string): bigint {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(`${field} inválido`);
    }
  }

  private money(value: Prisma.Decimal | number | string | null | undefined) {
    return new Prisma.Decimal(value ?? 0);
  }

  private serialize<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_key, item) =>
        typeof item === 'bigint' ? item.toString() : item,
      ),
    ) as T;
  }

  private async evento(
    tx: Prisma.TransactionClient,
    notaId: bigint,
    tipo: string,
    usuario: UsuarioOperacao,
    dados?: Prisma.InputJsonValue,
    descricao?: string,
    statusAnterior?: string | null,
    statusNovo?: string | null,
    protocolo?: string | null,
  ) {
    await tx.fin_notas_recebidas_eventos.create({
      data: {
        nota_id: notaId,
        tipo,
        usuario_id: usuario.id ?? null,
        usuario_nome: usuario.nome ?? null,
        dados,
        descricao: descricao ?? null,
        status_anterior: statusAnterior ?? null,
        status_novo: statusNovo ?? null,
        protocolo: protocolo ?? null,
      },
    });
  }

  async listar(query: ReceivedInvoiceListQueryDto) {
    const where: Prisma.fin_notas_recebidasWhereInput = {};

    if (query.filialId) {
      where.filial_id = this.toBigInt(query.filialId, 'filialId');
    }

    if (query.statusConferencia) {
      where.status_conferencia = query.statusConferencia;
    }

    if (query.busca?.trim()) {
      const busca = query.busca.trim();

      where.OR = [
        { chave: { contains: busca, mode: 'insensitive' } },
        { numero: { contains: busca, mode: 'insensitive' } },
        { emit_cnpj: { contains: busca, mode: 'insensitive' } },
        { emit_nome: { contains: busca, mode: 'insensitive' } },
        { emit_fantasia: { contains: busca, mode: 'insensitive' } },
      ];
    }

    const registros = await this.prisma.fin_notas_recebidas.findMany({
      where,
      orderBy: [{ data_emissao: 'desc' }, { id: 'desc' }],
      take: 500,
      include: {
        fin_filiais: true,
        fin_notas_recebidas_itens: true,
        fin_notas_recebidas_parcelas: true,
        p5_fornecedor: true,
        p5_compras_pedido: true,
      },
    });

    return this.serialize(registros);
  }

  async detalhar(idTexto: string) {
    const id = this.toBigInt(idTexto, 'id');

    const nota = await this.prisma.fin_notas_recebidas.findUnique({
      where: { id },
      include: {
        fin_filiais: true,
        fin_notas_recebidas_itens: {
          include: {
            p5_produto: true,
            p5_pedido_item: true,
          },
        },
        fin_notas_recebidas_parcelas: true,
        p5_fornecedor: true,
        p5_compras_pedido: true,
        p5_eventos: {
          orderBy: { criado_em: 'desc' },
        },
        p5_movimentos: {
          orderBy: { criado_em: 'desc' },
        },
      },
    });

    if (!nota) {
      throw new NotFoundException('Nota recebida não encontrada');
    }

    return this.serialize(nota);
  }

  async conferir(
    idTexto: string,
    dto: CheckReceivedInvoiceDto,
    usuario: UsuarioOperacao,
  ) {
    const notaId = this.toBigInt(idTexto, 'id');

    if (dto.status === 'RECUSADA' && !dto.motivoRecusa?.trim()) {
      throw new BadRequestException(
        'O motivo da recusa é obrigatório para notas recusadas',
      );
    }

    if (dto.status === 'DIVERGENTE' && !dto.divergenciaObs?.trim()) {
      throw new BadRequestException(
        'A descrição da divergência é obrigatória',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const nota = await tx.fin_notas_recebidas.findUnique({
        where: { id: notaId },
        include: {
          fin_notas_recebidas_itens: true,
        },
      });

      if (!nota) {
        throw new NotFoundException('Nota recebida não encontrada');
      }

      if (nota.status_conferencia === 'CANCELADA') {
        throw new ConflictException(
          'Nota cancelada não pode ser conferida',
        );
      }

      for (const itemDto of dto.itens ?? []) {
        const itemId = this.toBigInt(itemDto.itemId, 'itemId');

        const item = nota.fin_notas_recebidas_itens.find(
          (registro) => registro.id === itemId,
        );

        if (!item) {
          throw new BadRequestException(
            `Item ${itemDto.itemId} não pertence à nota`,
          );
        }

        await tx.fin_notas_recebidas_itens.update({
          where: { id: itemId },
          data: {
            produto_id: itemDto.produtoId
              ? this.toBigInt(itemDto.produtoId, 'produtoId')
              : undefined,
            compras_pedido_item_id:
              itemDto.comprasPedidoItemId ?? undefined,
            quantidade_conferida:
              itemDto.quantidadeConferida !== undefined
                ? this.money(itemDto.quantidadeConferida)
                : undefined,
            unidade_estoque: itemDto.unidadeEstoque ?? undefined,
            fator_conversao:
              itemDto.fatorConversao !== undefined
                ? this.money(itemDto.fatorConversao)
                : undefined,
            movimenta_estoque:
              itemDto.movimentaEstoque !== undefined
                ? itemDto.movimentaEstoque
                : undefined,
            divergencia: itemDto.divergencia ?? undefined,
          },
        });
      }

      const atualizada = await tx.fin_notas_recebidas.update({
        where: { id: notaId },
        data: {
          status_conferencia: dto.status,
          motivo_recusa:
            dto.status === 'RECUSADA'
              ? dto.motivoRecusa?.trim()
              : null,
          divergencia_obs:
            dto.status === 'DIVERGENTE'
              ? dto.divergenciaObs?.trim()
              : null,
          conferido_por_id: usuario.id ?? null,
          conferido_por_nome: usuario.nome ?? null,
          conferido_em: new Date(),
          fornecedor_id: dto.fornecedorId ?? undefined,
          compras_pedido_id: dto.comprasPedidoId ?? undefined,
          estoque_status:
            dto.status === 'ACEITA'
              ? 'PENDENTE'
              : 'NAO_APLICAVEL',
          atualizado_em: new Date(),
        },
      });

      const tipo =
        dto.status === 'ACEITA'
          ? 'ACEITE'
          : dto.status === 'RECUSADA'
            ? 'RECUSA'
            : 'DIVERGENCIA';

      const dadosEvento: Prisma.InputJsonObject = {
        fornecedorId: dto.fornecedorId ?? null,
        comprasPedidoId: dto.comprasPedidoId ?? null,
        itens: (dto.itens ?? []).map(
          (item): Prisma.InputJsonObject => ({
            itemId: item.itemId,
            produtoId: item.produtoId ?? null,
            comprasPedidoItemId:
              item.comprasPedidoItemId ?? null,
            quantidadeConferida:
              item.quantidadeConferida ?? null,
            unidadeEstoque: item.unidadeEstoque ?? null,
            fatorConversao: item.fatorConversao ?? null,
            movimentaEstoque:
              item.movimentaEstoque ?? null,
            divergencia: item.divergencia ?? null,
          }),
        ),
      };
      await this.evento(
        tx,
        notaId,
        tipo,
        usuario,
        dadosEvento,
        dto.motivoRecusa ?? dto.divergenciaObs ?? undefined,
        nota.status_conferencia,
        dto.status,
      );

      return atualizada;
    });

    return this.serialize(resultado);
  }

  async manifestar(
    idTexto: string,
    dto: RegisterManifestationDto,
    usuario: UsuarioOperacao,
  ) {
    const notaId = this.toBigInt(idTexto, 'id');

    const resultado = await this.prisma.$transaction(async (tx) => {
      const nota = await tx.fin_notas_recebidas.findUnique({
        where: { id: notaId },
      });

      if (!nota) {
        throw new NotFoundException('Nota recebida não encontrada');
      }

      if (!nota.chave) {
        throw new BadRequestException(
          'Nota sem chave fiscal não pode receber manifestação',
        );
      }

      const atualizada = await tx.fin_notas_recebidas.update({
        where: { id: notaId },
        data: {
          manifestacao_tipo: dto.tipo,
          manifestacao_status: dto.protocolo
            ? 'REGISTRADA'
            : 'PENDENTE_ENVIO',
          manifestacao_protocolo: dto.protocolo ?? null,
          manifestacao_em: dto.protocolo ? new Date() : null,
          atualizado_em: new Date(),
        },
      });

      await this.evento(
        tx,
        notaId,
        'MANIFESTACAO',
        usuario,
        {
          tipo: dto.tipo,
          status: dto.protocolo
            ? 'REGISTRADA'
            : 'PENDENTE_ENVIO',
        },
        dto.descricao,
        null,
        dto.tipo,
        dto.protocolo,
      );

      return atualizada;
    });

    return this.serialize(resultado);
  }

  async movimentarEstoque(
    idTexto: string,
    dto: MoveReceivedInvoiceStockDto,
    usuario: UsuarioOperacao,
  ) {
    const notaId = this.toBigInt(idTexto, 'id');
    const localId = this.toBigInt(dto.localId, 'localId');

    const resultado = await this.prisma.$transaction(async (tx) => {
      const nota = await tx.fin_notas_recebidas.findUnique({
        where: { id: notaId },
        include: {
          fin_notas_recebidas_itens: true,
          fin_filiais: true,
        },
      });

      if (!nota) {
        throw new NotFoundException('Nota recebida não encontrada');
      }

      if (nota.status_conferencia !== 'ACEITA') {
        throw new ConflictException(
          'Somente nota aceita pode movimentar estoque',
        );
      }

      if (nota.estoque_status === 'MOVIMENTADO') {
        throw new ConflictException('Estoque da nota já foi movimentado');
      }

      const local = await tx.est_locais.findUnique({
        where: { id: localId },
      });

      if (!local || !local.ativo) {
        throw new BadRequestException(
          'Local de estoque inválido ou inativo',
        );
      }

      if (
        nota.filial_id !== null &&
        local.filial_id !== null &&
        nota.filial_id !== local.filial_id
      ) {
        throw new BadRequestException(
          'O local de estoque não pertence à filial da nota',
        );
      }

      const itensMovimentaveis =
        nota.fin_notas_recebidas_itens.filter(
          (item) => item.movimenta_estoque,
        );

      if (itensMovimentaveis.length === 0) {
        throw new BadRequestException(
          'A nota não possui itens marcados para estoque',
        );
      }

      for (const item of itensMovimentaveis) {
        if (!item.produto_id) {
          throw new BadRequestException(
            `Item ${item.id.toString()} não possui produto vinculado`,
          );
        }

        if (item.estoque_movimentado) {
          throw new ConflictException(
            `Item ${item.id.toString()} já movimentado`,
          );
        }

        const quantidadeBase =
          item.quantidade_conferida ?? item.quantidade ?? this.money(0);

        const quantidade = quantidadeBase.mul(item.fator_conversao);

        if (quantidade.lte(0)) {
          throw new BadRequestException(
            `Item ${item.id.toString()} possui quantidade inválida`,
          );
        }

        const custoUnitario = this.money(item.valor_unit);
        const valorTotal = quantidade.mul(custoUnitario);

        await tx.est_movimentos.create({
          data: {
            produto_id: item.produto_id,
            local_id: localId,
            tipo: 'ENTRADA',
            quantidade,
            custo_unitario: custoUnitario,
            valor_total: valorTotal,
            origem: 'NF_ENTRADA',
            origem_nota_id: nota.id,
            origem_nota_item_id: item.id,
            documento: nota.chave ?? nota.numero ?? null,
            observacao: dto.observacao ?? null,
            usuario_id: usuario.id ?? null,
            usuario_nome: usuario.nome ?? null,
          },
        });

        const saldo = await tx.est_saldos.findUnique({
          where: {
            produto_id_local_id: {
              produto_id: item.produto_id,
              local_id: localId,
            },
          },
        });

        const quantidadeAnterior =
          saldo?.quantidade ?? this.money(0);
        const custoAnterior =
          saldo?.custo_medio ?? this.money(0);
        const quantidadeNova = quantidadeAnterior.add(quantidade);

        const custoMedioNovo =
          quantidadeNova.gt(0)
            ? quantidadeAnterior
                .mul(custoAnterior)
                .add(quantidade.mul(custoUnitario))
                .div(quantidadeNova)
            : this.money(0);

        await tx.est_saldos.upsert({
          where: {
            produto_id_local_id: {
              produto_id: item.produto_id,
              local_id: localId,
            },
          },
          create: {
            produto_id: item.produto_id,
            local_id: localId,
            quantidade,
            custo_medio: custoUnitario,
          },
          update: {
            quantidade: quantidadeNova,
            custo_medio: custoMedioNovo,
            atualizado_em: new Date(),
          },
        });

        await tx.fin_notas_recebidas_itens.update({
          where: { id: item.id },
          data: {
            estoque_movimentado: true,
          },
        });
      }

      const atualizada = await tx.fin_notas_recebidas.update({
        where: { id: nota.id },
        data: {
          estoque_status: 'MOVIMENTADO',
          estoque_movimentado_em: new Date(),
          atualizado_em: new Date(),
        },
      });

      await this.evento(
        tx,
        nota.id,
        'ESTOQUE_ENTRADA',
        usuario,
        {
          localId: localId.toString(),
          itens: itensMovimentaveis.map((item) => item.id.toString()),
        },
        dto.observacao,
        'PENDENTE',
        'MOVIMENTADO',
      );

      return atualizada;
    });

    return this.serialize(resultado);
  }

  async enviarContasPagar(
    idTexto: string,
    usuario: UsuarioOperacao,
  ) {
    const notaId = this.toBigInt(idTexto, 'id');

    const resultado = await this.prisma.$transaction(async (tx) => {
      const nota = await tx.fin_notas_recebidas.findUnique({
        where: { id: notaId },
        include: {
          fin_notas_recebidas_parcelas: true,
          fin_filiais: true,
        },
      });

      if (!nota) {
        throw new NotFoundException('Nota recebida não encontrada');
      }

      if (nota.status_conferencia !== 'ACEITA') {
        throw new ConflictException(
          'Somente nota aceita pode ser enviada para contas a pagar',
        );
      }

      if (nota.enviado_pagar) {
        throw new ConflictException(
          'Nota já foi enviada para contas a pagar',
        );
      }

      if (nota.fin_notas_recebidas_parcelas.length === 0) {
        throw new BadRequestException(
          'Nota não possui parcelas para envio',
        );
      }

      let criados = 0;

      for (const parcela of nota.fin_notas_recebidas_parcelas) {
        const existente = await tx.fin_contas_pagar.findFirst({
          where: {
            origem_nf_parcela_id: parcela.id,
          },
        });

        if (existente) {
          continue;
        }

        await tx.fin_contas_pagar.create({
          data: {
            descricao: `NF recebida ${nota.numero ?? nota.id.toString()} - parcela ${parcela.numero ?? parcela.id.toString()}`,
            fornecedor:
              nota.emit_nome ??
              nota.emit_fantasia ??
              nota.emit_cnpj ??
              null,
            documento: nota.chave ?? nota.numero ?? null,
            filial: nota.fin_filiais?.nome ?? null,
            filial_id: nota.filial_id,
            forma_pgto: nota.forma_pgto,
            data_emissao: nota.data_emissao,
            data_vencimento: parcela.vencimento,
            valor: parcela.valor ?? this.money(0),
            valor_pago: this.money(0),
            juros_multa: this.money(0),
            desconto: this.money(0),
            situacao: parcela.pago ? 'Pago' : 'A vencer',
            recorrente: false,
            observacoes: `Gerado automaticamente pela NF recebida ${nota.id.toString()}`,
            criado_por: usuario.nome ?? null,
            atualizado_em: new Date(),
            origem_nf_id: nota.id,
            origem_nf_parcela_id: parcela.id,
          },
        });

        criados += 1;
      }

      if (criados === 0) {
        throw new ConflictException(
          'Todas as parcelas já possuem contas a pagar',
        );
      }

      const atualizada = await tx.fin_notas_recebidas.update({
        where: { id: nota.id },
        data: {
          enviado_pagar: true,
          enviado_pagar_em: new Date(),
          atualizado_em: new Date(),
        },
      });

      await this.evento(
        tx,
        nota.id,
        'ENVIO_PAGAR',
        usuario,
        {
          titulosCriados: criados,
        },
        `${criados} título(s) criado(s) em contas a pagar`,
      );

      return {
        nota: atualizada,
        titulosCriados: criados,
      };
    });

    return this.serialize(resultado);
  }

  async listarControlesNsu() {
    const controles =
      await this.prisma.fin_nfe_dist_controle.findMany({
        include: {
          filial: true,
        },
        orderBy: {
          filial_id: 'asc',
        },
      });

    return this.serialize(controles);
  }

  async atualizarControleNsu(dto: UpdateNsuControlDto) {
    if (!/^\d{15}$/.test(dto.ultNsu)) {
      throw new BadRequestException(
        'ultNsu deve possuir exatamente 15 dígitos',
      );
    }

    if (!/^\d{15}$/.test(dto.maxNsu)) {
      throw new BadRequestException(
        'maxNsu deve possuir exatamente 15 dígitos',
      );
    }

    const filialId = this.toBigInt(dto.filialId, 'filialId');

    const filial = await this.prisma.fin_filiais.findUnique({
      where: { id: filialId },
    });

    if (!filial || !filial.ativo || !filial.cnpj) {
      throw new BadRequestException(
        'Filial inválida, inativa ou sem CNPJ',
      );
    }

    const controle = await this.prisma.fin_nfe_dist_controle.upsert({
      where: { filial_id: filialId },
      create: {
        filial_id: filialId,
        ult_nsu: dto.ultNsu,
        max_nsu: dto.maxNsu,
        ultimo_cstat: dto.cStat ?? null,
        ultimo_xmotivo: dto.xMotivo ?? null,
        ultima_consulta_em: new Date(),
        consultas_total: 1,
        documentos_total: dto.documentosProcessados ?? 0,
        erros_consecutivos: 0,
      },
      update: {
        ult_nsu: dto.ultNsu,
        max_nsu: dto.maxNsu,
        ultimo_cstat: dto.cStat ?? null,
        ultimo_xmotivo: dto.xMotivo ?? null,
        ultima_consulta_em: new Date(),
        consultas_total: { increment: 1 },
        documentos_total: {
          increment: dto.documentosProcessados ?? 0,
        },
        erros_consecutivos: 0,
        ultima_falha_em: null,
        ultima_falha: null,
        atualizado_em: new Date(),
      },
    });

    return this.serialize(controle);
  }
}
