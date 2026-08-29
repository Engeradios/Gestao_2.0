import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreatePersonDto,
  CreateVehicleDto,
  ReferenceQueryDto,
  UpdatePersonDto,
  UpdateVehicleDto,
  VehicleQueryDto,
} from './dto/reference-data.dto';

export type AuditContext = {
  actorId: string;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class ReferenceDataService {
  constructor(private readonly db: PrismaService) {}

  private clean(value?: string) {
    const result = value?.trim();
    return result || null;
  }

  private plate(value: string) {
    const plate = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (
      !/^[A-Z]{3}[0-9]{4}$/.test(plate) &&
      !/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(plate)
    ) {
      throw new BadRequestException(
        'Placa deve estar no padrão brasileiro antigo ou Mercosul',
      );
    }

    return plate;
  }

  private auditData(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  async listPeople(query: ReferenceQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const search = query.busca?.trim();

    const where: Prisma.PessoaWhereInput = {
      ...(query.ativo !== undefined ? { ativo: query.ativo } : {}),
      ...(query.unidade
        ? { unidade: { equals: query.unidade, mode: 'insensitive' } }
        : {}),
      ...(query.funcao
        ? {
            funcoes: {
              some: {
                funcao: query.funcao,
                ativo: true,
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { telefone: { contains: search, mode: 'insensitive' } },
              { cargo: { contains: search, mode: 'insensitive' } },
              { cnh: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.db.$transaction([
      this.db.pessoa.findMany({
        where,
        orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          funcoes: {
            where: { ativo: true },
            orderBy: { funcao: 'asc' },
          },
          origens: {
            orderBy: { criadoEm: 'desc' },
          },
          usuario: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
        },
      }),
      this.db.pessoa.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPerson(id: string) {
    const person = await this.db.pessoa.findUnique({
      where: { id },
      include: {
        funcoes: { orderBy: { funcao: 'asc' } },
        origens: { orderBy: { criadoEm: 'desc' } },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!person) throw new NotFoundException('Pessoa não encontrada');
    return person;
  }

  async createPerson(dto: CreatePersonDto, context: AuditContext) {
    if ((dto.origem && !dto.origemId) || (!dto.origem && dto.origemId)) {
      throw new BadRequestException(
        'Origem e identificador da origem devem ser informados juntos',
      );
    }

    if (dto.origem && dto.origemId) {
      const existingOrigin = await this.db.pessoaOrigem.findUnique({
        where: {
          origem_origemId: {
            origem: dto.origem,
            origemId: dto.origemId,
          },
        },
      });

      if (existingOrigin) {
        throw new ConflictException('Registro de origem já vinculado');
      }
    }

    return this.db.$transaction(async (tx) => {
      const person = await tx.pessoa.create({
        data: {
          nome: dto.nome.trim(),
          email: this.clean(dto.email?.toLowerCase()),
          telefone: this.clean(dto.telefone),
          unidade: this.clean(dto.unidade?.toUpperCase()),
          cargo: this.clean(dto.cargo),
          cnh: this.clean(dto.cnh?.toUpperCase()),
          vencimentoCnh: dto.vencimentoCnh ? new Date(dto.vencimentoCnh) : null,
          ativo: dto.ativo ?? true,
          funcoes: dto.funcoes?.length
            ? {
                create: dto.funcoes.map((funcao) => ({
                  funcao,
                  ativo: true,
                })),
              }
            : undefined,
          origens:
            dto.origem && dto.origemId
              ? {
                  create: {
                    origem: dto.origem,
                    origemId: dto.origemId,
                  },
                }
              : undefined,
        },
        include: {
          funcoes: true,
          origens: true,
        },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: context.actorId,
          entidade: 'PESSOA',
          entidadeId: person.id,
          acao: 'PESSOA_CRIADA',
          dadosDepois: this.auditData(person),
          ip: context.ip || null,
          userAgent: context.userAgent || null,
        },
      });

      return person;
    });
  }

  async updatePerson(id: string, dto: UpdatePersonDto, context: AuditContext) {
    const before = await this.getPerson(id);

    return this.db.$transaction(async (tx) => {
      if (dto.funcoes !== undefined) {
        await tx.pessoaFuncao.updateMany({
          where: { pessoaId: id },
          data: { ativo: false },
        });

        for (const funcao of dto.funcoes) {
          await tx.pessoaFuncao.upsert({
            where: {
              pessoaId_funcao: {
                pessoaId: id,
                funcao,
              },
            },
            create: {
              pessoaId: id,
              funcao,
              ativo: true,
            },
            update: {
              ativo: true,
            },
          });
        }
      }

      const person = await tx.pessoa.update({
        where: { id },
        data: {
          ...(dto.nome !== undefined ? { nome: dto.nome.trim() } : {}),
          ...(dto.email !== undefined
            ? { email: this.clean(dto.email.toLowerCase()) }
            : {}),
          ...(dto.telefone !== undefined
            ? { telefone: this.clean(dto.telefone) }
            : {}),
          ...(dto.unidade !== undefined
            ? { unidade: this.clean(dto.unidade.toUpperCase()) }
            : {}),
          ...(dto.cargo !== undefined ? { cargo: this.clean(dto.cargo) } : {}),
          ...(dto.cnh !== undefined
            ? { cnh: this.clean(dto.cnh.toUpperCase()) }
            : {}),
          ...(dto.vencimentoCnh !== undefined
            ? {
                vencimentoCnh: dto.vencimentoCnh
                  ? new Date(dto.vencimentoCnh)
                  : null,
              }
            : {}),
          ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
          atualizadoEm: new Date(),
        },
        include: {
          funcoes: { orderBy: { funcao: 'asc' } },
          origens: true,
        },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: context.actorId,
          entidade: 'PESSOA',
          entidadeId: id,
          acao:
            dto.funcoes !== undefined
              ? 'PESSOA_FUNCOES_ALTERADAS'
              : 'PESSOA_ATUALIZADA',
          dadosAntes: this.auditData(before),
          dadosDepois: this.auditData(person),
          ip: context.ip || null,
          userAgent: context.userAgent || null,
        },
      });

      return person;
    });
  }

  history(entity: 'PESSOA' | 'VEICULO', id: string) {
    return this.db.auditoria.findMany({
      where: {
        entidade: entity,
        entidadeId: id,
      },
      orderBy: { criadoEm: 'desc' },
      take: 100,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });
  }

  async listVehicles(query: VehicleQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const search = query.busca?.trim();

    const where: Prisma.OpVeiculoWhereInput = {
      ...(query.ativo !== undefined ? { ativo: query.ativo } : {}),
      ...(query.tipo
        ? { tipo: { equals: query.tipo, mode: 'insensitive' } }
        : {}),
      ...(search
        ? {
            OR: [
              {
                placa: {
                  contains: search.replace(/[^a-zA-Z0-9]/g, ''),
                  mode: 'insensitive',
                },
              },
              { marca: { contains: search, mode: 'insensitive' } },
              { modelo: { contains: search, mode: 'insensitive' } },
              { tipo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.db.$transaction([
      this.db.opVeiculo.findMany({
        where,
        orderBy: [{ ativo: 'desc' }, { placa: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { entregas: true },
          },
        },
      }),
      this.db.opVeiculo.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getVehicle(id: bigint) {
    const vehicle = await this.db.opVeiculo.findUnique({
      where: { id },
      include: {
        _count: {
          select: { entregas: true },
        },
      },
    });

    if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    return vehicle;
  }

  async createVehicle(dto: CreateVehicleDto, context: AuditContext) {
    const plate = this.plate(dto.placa);

    const duplicate = await this.db.opVeiculo.findFirst({
      where: {
        OR: [
          { placa: plate },
          ...(dto.legadoId ? [{ legadoId: dto.legadoId }] : []),
        ],
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Placa ou identificador legado já cadastrado',
      );
    }

    return this.db.$transaction(async (tx) => {
      const vehicle = await tx.opVeiculo.create({
        data: {
          placa: plate,
          tipo: this.clean(dto.tipo?.toUpperCase()),
          marca: this.clean(dto.marca?.toUpperCase()),
          modelo: this.clean(dto.modelo?.toUpperCase()),
          ativo: dto.ativo ?? true,
          legadoId: dto.legadoId,
        },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: context.actorId,
          entidade: 'VEICULO',
          entidadeId: vehicle.id.toString(),
          acao: 'VEICULO_CRIADO',
          dadosDepois: this.auditData(vehicle),
          ip: context.ip || null,
          userAgent: context.userAgent || null,
        },
      });

      return vehicle;
    });
  }

  async updateVehicle(
    id: bigint,
    dto: UpdateVehicleDto,
    context: AuditContext,
  ) {
    const before = await this.getVehicle(id);
    const plate = dto.placa ? this.plate(dto.placa) : undefined;

    if (plate || dto.legadoId) {
      const duplicate = await this.db.opVeiculo.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(plate ? [{ placa: plate }] : []),
            ...(dto.legadoId ? [{ legadoId: dto.legadoId }] : []),
          ],
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Placa ou identificador legado já utilizado',
        );
      }
    }

    return this.db.$transaction(async (tx) => {
      const vehicle = await tx.opVeiculo.update({
        where: { id },
        data: {
          ...(plate !== undefined ? { placa: plate } : {}),
          ...(dto.tipo !== undefined
            ? { tipo: this.clean(dto.tipo.toUpperCase()) }
            : {}),
          ...(dto.marca !== undefined
            ? { marca: this.clean(dto.marca.toUpperCase()) }
            : {}),
          ...(dto.modelo !== undefined
            ? { modelo: this.clean(dto.modelo.toUpperCase()) }
            : {}),
          ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
          ...(dto.legadoId !== undefined ? { legadoId: dto.legadoId } : {}),
          atualizadoEm: new Date(),
        },
        include: {
          _count: {
            select: { entregas: true },
          },
        },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: context.actorId,
          entidade: 'VEICULO',
          entidadeId: id.toString(),
          acao:
            dto.ativo !== undefined
              ? 'VEICULO_STATUS_ALTERADO'
              : 'VEICULO_ATUALIZADO',
          dadosAntes: this.auditData(before),
          dadosDepois: this.auditData(vehicle),
          ip: context.ip || null,
          userAgent: context.userAgent || null,
        },
      });

      return vehicle;
    });
  }
}
