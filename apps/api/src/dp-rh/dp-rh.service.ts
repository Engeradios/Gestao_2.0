import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CadastroAuxiliarDto,
  CreateFuncionarioDto,
  DashboardQueryDto,
  DesligamentoDto,
  ListarFuncionariosDto,
  MovimentacaoDto,
  UpdateFuncionarioDto,
} from './dto/funcionario.dto';

type TipoCadastro = 'setores' | 'cargos' | 'unidades';

export interface DpRhDashboard {
  inicio: Date;
  fim: Date;
  ativos: number;
  afastados: number;
  admissoes: number;
  desligamentos: number;
  turnoverPercentual: number;
  turnoverDesligamentos: number;
  porSetor: { nome: string; total: number }[];
  porMotivo: { motivo: string; total: number }[];
}

@Injectable()
export class DpRhService {
  constructor(private readonly prisma: PrismaService) {}

  private periodo(query: DashboardQueryDto) {
    const fim = query.fim ? new Date(query.fim) : new Date();
    const inicio = query.inicio
      ? new Date(query.inicio)
      : new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), 1));

    if (inicio.getTime() > fim.getTime()) {
      throw new BadRequestException(
        'Data inicial deve ser menor ou igual a data final',
      );
    }

    return { inicio, fim };
  }

  async listarFuncionarios(filtros: ListarFuncionariosDto) {
    const pagina = filtros.pagina && filtros.pagina > 0 ? filtros.pagina : 1;
    const tamanho =
      filtros.tamanho && filtros.tamanho > 0 && filtros.tamanho <= 200
        ? filtros.tamanho
        : 50;

    const where: Record<string, unknown> = {};

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.setorId) {
      where.setorId = filtros.setorId;
    }

    if (filtros.cargoId) {
      where.cargoId = filtros.cargoId;
    }

    if (filtros.unidadeId) {
      where.unidadeId = filtros.unidadeId;
    }

    if (filtros.busca) {
      where.OR = [
        { nome: { contains: filtros.busca, mode: 'insensitive' } },
        { matricula: { contains: filtros.busca, mode: 'insensitive' } },
        { cpf: { contains: filtros.busca } },
      ];
    }

    const [total, itens] = await Promise.all([
      this.prisma.rhFuncionario.count({ where }),
      this.prisma.rhFuncionario.findMany({
        where,
        include: { setor: true, cargo: true, unidade: true },
        orderBy: { nome: 'asc' },
        skip: (pagina - 1) * tamanho,
        take: tamanho,
      }),
    ]);

    return { total, pagina, tamanho, itens };
  }

  async obterFuncionario(id: string) {
    const funcionario = await this.prisma.rhFuncionario.findUnique({
      where: { id },
      include: {
        setor: true,
        cargo: true,
        unidade: true,
        desligamento: true,
        movimentacoes: { orderBy: { data: 'desc' }, take: 100 },
      },
    });

    if (!funcionario) {
      throw new NotFoundException('Funcionario nao encontrado');
    }

    return funcionario;
  }

  async criarFuncionario(dto: CreateFuncionarioDto) {
    const funcionario = await this.prisma.rhFuncionario.create({
      data: {
        nome: dto.nome,
        cpf: dto.cpf ?? null,
        matricula: dto.matricula ?? null,
        email: dto.email ?? null,
        telefone: dto.telefone ?? null,
        dataNascimento: dto.dataNascimento
          ? new Date(dto.dataNascimento)
          : null,
        dataAdmissao: new Date(dto.dataAdmissao),
        tipoContrato: dto.tipoContrato ?? null,
        salarioCentavos:
          dto.salarioCentavos !== undefined
            ? BigInt(dto.salarioCentavos)
            : null,
        gestor: dto.gestor ?? null,
        observacao: dto.observacao ?? null,
        setorId: dto.setorId ?? null,
        cargoId: dto.cargoId ?? null,
        unidadeId: dto.unidadeId ?? null,
      },
    });

    await this.prisma.rhMovimentacao.create({
      data: {
        funcionarioId: funcionario.id,
        tipo: 'ADMISSAO',
        data: new Date(dto.dataAdmissao),
        observacao: 'Admissao registrada no cadastro',
      },
    });

    return funcionario;
  }

  async atualizarFuncionario(id: string, dto: UpdateFuncionarioDto) {
    await this.obterFuncionario(id);

    const funcionario = await this.prisma.rhFuncionario.update({
      where: { id },
      data: {
        nome: dto.nome,
        cpf: dto.cpf ?? null,
        matricula: dto.matricula ?? null,
        email: dto.email ?? null,
        telefone: dto.telefone ?? null,
        dataNascimento: dto.dataNascimento
          ? new Date(dto.dataNascimento)
          : null,
        dataAdmissao: dto.dataAdmissao ? new Date(dto.dataAdmissao) : undefined,
        tipoContrato: dto.tipoContrato ?? null,
        salarioCentavos:
          dto.salarioCentavos !== undefined
            ? BigInt(dto.salarioCentavos)
            : null,
        gestor: dto.gestor ?? null,
        observacao: dto.observacao ?? null,
        setorId: dto.setorId ?? null,
        cargoId: dto.cargoId ?? null,
        unidadeId: dto.unidadeId ?? null,
      },
    });

    await this.prisma.rhMovimentacao.create({
      data: {
        funcionarioId: id,
        tipo: 'ALTERACAO',
        data: new Date(),
        observacao: 'Dados cadastrais atualizados',
      },
    });

    return funcionario;
  }

  async registrarDesligamento(id: string, dto: DesligamentoDto) {
    const funcionario = await this.obterFuncionario(id);

    if (funcionario.status === 'DESLIGADO') {
      throw new BadRequestException('Funcionario ja esta desligado');
    }

    const data = new Date(dto.dataDesligamento);

    const desligamento = await this.prisma.rhDesligamento.create({
      data: {
        funcionarioId: id,
        dataDesligamento: data,
        motivo: dto.motivo,
        iniciativa: dto.iniciativa,
        avisoPrevio: dto.avisoPrevio ?? null,
        elegivelRecontratacao: dto.elegivelRecontratacao ?? null,
        setorSnapshot: funcionario.setor?.nome ?? null,
        cargoSnapshot: funcionario.cargo?.nome ?? null,
        observacao: dto.observacao ?? null,
      },
    });

    await this.prisma.rhFuncionario.update({
      where: { id },
      data: { status: 'DESLIGADO', dataDesligamento: data },
    });

    await this.prisma.rhMovimentacao.create({
      data: {
        funcionarioId: id,
        tipo: 'DESLIGAMENTO',
        data,
        observacao: dto.motivo,
      },
    });

    return desligamento;
  }

  listarMovimentacoes(funcionarioId?: string) {
    return this.prisma.rhMovimentacao.findMany({
      where: funcionarioId ? { funcionarioId } : undefined,
      include: { funcionario: { select: { nome: true, matricula: true } } },
      orderBy: { data: 'desc' },
      take: 300,
    });
  }

  async criarMovimentacao(dto: MovimentacaoDto) {
    await this.obterFuncionario(dto.funcionarioId);

    const data = new Date(dto.data);

    const movimentacao = await this.prisma.rhMovimentacao.create({
      data: {
        funcionarioId: dto.funcionarioId,
        tipo: dto.tipo as never,
        data,
        observacao: dto.observacao ?? null,
      },
    });

    if (dto.tipo === 'AFASTAMENTO') {
      await this.prisma.rhFuncionario.update({
        where: { id: dto.funcionarioId },
        data: { status: 'AFASTADO' },
      });
    }

    if (dto.tipo === 'RETORNO') {
      await this.prisma.rhFuncionario.update({
        where: { id: dto.funcionarioId },
        data: { status: 'ATIVO' },
      });
    }

    return movimentacao;
  }

  listarCadastro(tipo: TipoCadastro) {
    if (tipo === 'setores') {
      return this.prisma.rhSetor.findMany({ orderBy: { nome: 'asc' } });
    }

    if (tipo === 'cargos') {
      return this.prisma.rhCargo.findMany({ orderBy: { nome: 'asc' } });
    }

    return this.prisma.rhUnidade.findMany({ orderBy: { nome: 'asc' } });
  }

  criarCadastro(tipo: TipoCadastro, dto: CadastroAuxiliarDto) {
    const data = { nome: dto.nome, ativo: dto.ativo ?? true };

    if (tipo === 'setores') {
      return this.prisma.rhSetor.create({ data });
    }

    if (tipo === 'cargos') {
      return this.prisma.rhCargo.create({ data });
    }

    return this.prisma.rhUnidade.create({ data });
  }

  atualizarCadastro(tipo: TipoCadastro, id: string, dto: CadastroAuxiliarDto) {
    const data = { nome: dto.nome, ativo: dto.ativo ?? true };

    if (tipo === 'setores') {
      return this.prisma.rhSetor.update({ where: { id }, data });
    }

    if (tipo === 'cargos') {
      return this.prisma.rhCargo.update({ where: { id }, data });
    }

    return this.prisma.rhUnidade.update({ where: { id }, data });
  }

  async dashboard(query: DashboardQueryDto): Promise<DpRhDashboard> {
    const { inicio, fim } = this.periodo(query);

    const filtroBase: Record<string, unknown> = {};

    if (query.setorId) {
      filtroBase.setorId = query.setorId;
    }

    if (query.cargoId) {
      filtroBase.cargoId = query.cargoId;
    }

    if (query.unidadeId) {
      filtroBase.unidadeId = query.unidadeId;
    }

    const [ativos, afastados, admissoes, desligamentos] = await Promise.all([
      this.prisma.rhFuncionario.count({
        where: { ...filtroBase, status: 'ATIVO' },
      }),
      this.prisma.rhFuncionario.count({
        where: { ...filtroBase, status: 'AFASTADO' },
      }),
      this.prisma.rhFuncionario.count({
        where: { ...filtroBase, dataAdmissao: { gte: inicio, lte: fim } },
      }),
      this.prisma.rhFuncionario.count({
        where: { ...filtroBase, dataDesligamento: { gte: inicio, lte: fim } },
      }),
    ]);

    const base = ativos + afastados + desligamentos;

    const turnoverPercentual =
      base > 0
        ? Number((((admissoes + desligamentos) / 2 / base) * 100).toFixed(2))
        : 0;

    const turnoverDesligamentos =
      base > 0 ? Number(((desligamentos / base) * 100).toFixed(2)) : 0;

    const setores = await this.prisma.rhSetor.findMany({
      select: {
        nome: true,
        _count: { select: { funcionarios: true } },
      },
      orderBy: { nome: 'asc' },
    });

    const porSetor = setores.map((setor) => ({
      nome: setor.nome,
      total: setor._count.funcionarios,
    }));

    const motivos = await this.prisma.rhDesligamento.groupBy({
      by: ['motivo'],
      where: { dataDesligamento: { gte: inicio, lte: fim } },
      _count: { motivo: true },
    });

    const porMotivo = motivos.map((item) => ({
      motivo: item.motivo,
      total: item._count.motivo,
    }));

    return {
      inicio,
      fim,
      ativos,
      afastados,
      admissoes,
      desligamentos,
      turnoverPercentual,
      turnoverDesligamentos,
      porSetor,
      porMotivo,
    };
  }

  async exportarFuncionarios(filtros: ListarFuncionariosDto) {
    const resultado = await this.listarFuncionarios({
      ...filtros,
      pagina: 1,
      tamanho: 200,
    });

    const cabecalho = [
      'Matricula',
      'Nome',
      'CPF',
      'Cargo',
      'Setor',
      'Unidade',
      'Admissao',
      'Desligamento',
      'Situacao',
    ].join(';');

    const linhas = resultado.itens.map((item) =>
      [
        item.matricula ?? '',
        item.nome,
        item.cpf ?? '',
        item.cargo?.nome ?? '',
        item.setor?.nome ?? '',
        item.unidade?.nome ?? '',
        item.dataAdmissao.toISOString().slice(0, 10),
        item.dataDesligamento
          ? item.dataDesligamento.toISOString().slice(0, 10)
          : '',
        item.status,
      ].join(';'),
    );

    return [cabecalho, ...linhas].join('\n');
  }
}
