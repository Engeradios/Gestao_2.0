import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OperationalPreventivesService {
  constructor(private readonly db: PrismaService) {}

  private date(value: unknown, field: string, required = false) {
    if (value === null || value === undefined || value === '') {
      if (required) throw new BadRequestException(`${field} é obrigatório`);
      return null;
    }
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException(`${field} inválido`);
    return date;
  }

  private integer(value: unknown, fallback: number, min = 1, max = 3650) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  async list(query: Record<string, string | undefined>) {
    const page = this.integer(query.pagina, 1, 1, 1_000_000);
    const limit = this.integer(query.limite, 25, 1, 200);
    const search = String(query.busca || '').trim();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const attention = new Date(today);
    attention.setUTCDate(attention.getUTCDate() + 30);

    const where: any = {};
    if (search) {
      where.OR = [
        { clienteNome: { contains: search, mode: 'insensitive' } },
        { contrato: { contains: search, mode: 'insensitive' } },
        { equipamento: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'Atrasada')
      where.dataProximaPreventiva = { lt: today };
    if (query.status === 'Atenção')
      where.dataProximaPreventiva = { gte: today, lte: attention };
    if (query.status === 'Em Dia')
      where.dataProximaPreventiva = { gt: attention };

    const [total, items] = await this.db.$transaction([
      this.db.opPreventiva.count({ where }),
      this.db.opPreventiva.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ dataProximaPreventiva: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      itens: items.map((item) => {
        const days = Math.floor(
          (item.dataProximaPreventiva.getTime() - today.getTime()) / 86_400_000,
        );
        const contractDays = item.vencimentoContrato
          ? Math.floor(
              (item.vencimentoContrato.getTime() - today.getTime()) /
                86_400_000,
            )
          : null;
        return {
          ...item,
          statusCalculado:
            days < 0 ? 'Atrasada' : days <= 30 ? 'Atenção' : 'Em Dia',
          diasRestantes: days,
          contratoVencendo: contractDays !== null && contractDays <= 30,
          diasContrato: contractDays,
        };
      }),
      paginacao: {
        pagina: page,
        limite: limit,
        total,
        paginas: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async indicators() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const attention = new Date(today);
    attention.setUTCDate(attention.getUTCDate() + 30);
    const [total, late, warning, current, contracts] =
      await this.db.$transaction([
        this.db.opPreventiva.count(),
        this.db.opPreventiva.count({
          where: { dataProximaPreventiva: { lt: today } },
        }),
        this.db.opPreventiva.count({
          where: { dataProximaPreventiva: { gte: today, lte: attention } },
        }),
        this.db.opPreventiva.count({
          where: { dataProximaPreventiva: { gt: attention } },
        }),
        this.db.opPreventiva.count({
          where: { vencimentoContrato: { not: null, lte: attention } },
        }),
      ]);
    return {
      total,
      emDia: current,
      atencao: warning,
      atrasadas: late,
      contratosVencendo: contracts,
    };
  }

  async findOne(id: bigint) {
    const item = await this.db.opPreventiva.findUnique({
      where: { id },
      include: {
        roteiroVisitas: { orderBy: [{ dataVisita: 'desc' }, { id: 'desc' }] },
      },
    });
    if (!item) throw new NotFoundException('Preventiva não encontrada');
    return item;
  }

  async save(id: bigint | null, body: any) {
    const clienteNome = String(body.clienteNome || '').trim();
    if (!clienteNome) throw new BadRequestException('Cliente é obrigatório');
    const dataProximaPreventiva = this.date(
      body.dataProximaPreventiva,
      'Próxima preventiva',
      true,
    )!;
    const data: any = {
      clienteNome,
      contrato: String(body.contrato || '').trim() || null,
      vencimentoContrato: this.date(
        body.vencimentoContrato,
        'Vencimento do contrato',
      ),
      equipamento: Array.isArray(body.equipamentos)
        ? body.equipamentos
            .map(String)
            .map((x: string) => x.trim())
            .filter(Boolean)
            .join(', ')
        : String(body.equipamento || '').trim() || null,
      modelo: String(body.modelo || '').trim() || null,
      numeroSerie: String(body.numeroSerie || '').trim() || null,
      qtdTecnicos: this.integer(body.qtdTecnicos, 1, 1, 100),
      frequenciaDias: this.integer(body.frequenciaDias, 30),
      dataUltimaPreventiva: this.date(
        body.dataUltimaPreventiva,
        'Última preventiva',
      ),
      dataProximaPreventiva,
      tecnicoResponsavel: String(body.tecnicoResponsavel || '').trim() || null,
      observacoes: String(body.observacoes || '').trim() || null,
    };
    if (!id) return this.db.opPreventiva.create({ data });
    await this.findOne(id);
    return this.db.opPreventiva.update({ where: { id }, data });
  }

  async remove(id: bigint) {
    await this.findOne(id);
    return this.db.opPreventiva.delete({ where: { id } });
  }
}
