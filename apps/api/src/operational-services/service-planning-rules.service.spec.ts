import { BadRequestException } from '@nestjs/common';
import { BusinessCalendarService } from './business-calendar.service';
import {
  PREPARATION_BUSINESS_DAYS,
  ServicePlanningRulesService,
} from './service-planning-rules.service';

const utc = (value: string) => new Date(`${value}T00:00:00.000Z`);
const key = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;

describe('ServicePlanningRulesService', () => {
  const prisma = { opFeriado: { findMany: jest.fn() } };
  const calendar = new BusinessCalendarService(prisma as never);
  const service = new ServicePlanningRulesService(calendar);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.opFeriado.findMany.mockResolvedValue([
      { dia: utc('2026-09-07'), uf: null },
      { dia: utc('2026-09-08'), uf: 'RJ' },
    ]);
  });

  it('calcula OPERACIONAL com preparação fixa e execução', async () => {
    const result = await service.calculate({
      area: 'operacional',
      approvalDate: utc('2026-09-01'),
      uf: 'rj',
      executionBusinessDays: 5,
    });
    expect(result.area).toBe('OPERACIONAL');
    expect(result.uf).toBe('RJ');
    expect(result.preparationBusinessDays).toBe(PREPARATION_BUSINESS_DAYS);
    expect(result.executionBusinessDays).toBe(5);
    expect(result.deliveryExpectedAt).toBeNull();
    expect(result.plannedStartAt).not.toBeNull();
    expect(result.deadlineAt.getTime()).toBeGreaterThan(
      result.plannedStartAt!.getTime(),
    );
  });

  it('calcula LOGISTICA sem execução operacional', async () => {
    const result = await service.calculate({
      area: 'LOGISTICA',
      approvalDate: utc('2026-09-01'),
      uf: 'RJ',
      executionBusinessDays: 50,
    });
    expect(result.executionBusinessDays).toBeNull();
    expect(result.plannedStartAt).toBeNull();
    expect(key(result.deliveryExpectedAt)).toBe(key(result.deadlineAt));
  });

  it('calcula AMBAS com chegada igual ao início operacional', async () => {
    const result = await service.calculate({
      area: 'AMBAS',
      approvalDate: utc('2026-09-01'),
      uf: 'RJ',
      executionBusinessDays: 10,
    });
    expect(key(result.deliveryExpectedAt)).toBe(key(result.plannedStartAt));
    expect(result.deadlineAt.getTime()).toBeGreaterThan(
      result.plannedStartAt!.getTime(),
    );
  });

  it('usa contagem exclusiva após a data de aprovação', async () => {
    prisma.opFeriado.findMany.mockResolvedValue([]);
    const result = await service.calculate({
      area: 'LOGISTICA',
      approvalDate: utc('2026-09-02'),
      uf: 'RJ',
    });
    expect(key(result.deliveryExpectedAt)).toBe('2026-09-23');
  });

  it('desconta finais de semana e feriados nacionais e estaduais', async () => {
    const result = await service.calculate({
      area: 'LOGISTICA',
      approvalDate: utc('2026-09-01'),
      uf: 'RJ',
    });
    expect(result.deliveryExpectedAt).not.toBeNull();
    expect(result.stateCalendarAvailable).toBe(true);
  });

  it('sinaliza calendário estadual ausente sem bloquear o cálculo', async () => {
    prisma.opFeriado.findMany.mockResolvedValue([
      { dia: utc('2026-09-07'), uf: null },
    ]);
    const result = await service.calculate({
      area: 'LOGISTICA',
      approvalDate: utc('2026-09-01'),
      uf: 'AC',
    });
    expect(result.stateCalendarAvailable).toBe(false);
  });

  it('rejeita área inválida', async () => {
    await expect(
      service.calculate({
        area: 'OUTRA',
        approvalDate: utc('2026-09-01'),
        uf: 'RJ',
        executionBusinessDays: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita UF inválida', async () => {
    await expect(
      service.calculate({
        area: 'LOGISTICA',
        approvalDate: utc('2026-09-01'),
        uf: 'XX',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it.each(['OPERACIONAL', 'AMBAS'])(
    'exige dias de execução para %s',
    async (area) => {
      await expect(
        service.calculate({ area, approvalDate: utc('2026-09-01'), uf: 'RJ' }),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('rejeita execução igual a zero', async () => {
    await expect(
      service.calculate({
        area: 'OPERACIONAL',
        approvalDate: utc('2026-09-01'),
        uf: 'RJ',
        executionBusinessDays: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita execução fracionada', async () => {
    await expect(
      service.calculate({
        area: 'OPERACIONAL',
        approvalDate: utc('2026-09-01'),
        uf: 'RJ',
        executionBusinessDays: 1.5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita execução superior ao limite', async () => {
    await expect(
      service.calculate({
        area: 'OPERACIONAL',
        approvalDate: utc('2026-09-01'),
        uf: 'RJ',
        executionBusinessDays: 366,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita data de aprovação inválida', async () => {
    await expect(
      service.calculate({
        area: 'LOGISTICA',
        approvalDate: new Date('invalid'),
        uf: 'RJ',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
