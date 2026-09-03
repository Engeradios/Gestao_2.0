import { BadRequestException } from '@nestjs/common';
import { BusinessCalendarService } from './business-calendar.service';

type Holiday = { dia: Date; uf: string | null };

describe('BusinessCalendarService', () => {
  const prisma = { opFeriado: { findMany: jest.fn() } };
  const service = new BusinessCalendarService(prisma as never);

  const utc = (date: string) => new Date(`${date}T00:00:00.000Z`);
  const key = (date: Date) => date.toISOString().slice(0, 10);
  const holidays = (rows: Holiday[]) =>
    prisma.opFeriado.findMany.mockResolvedValue(rows);

  beforeEach(() => jest.clearAllMocks());

  it('normaliza UF em minúsculas', () =>
    expect(service.normalizeUf(' rj ')).toBe('RJ'));
  it('rejeita UF inválida', () =>
    expect(() => service.normalizeUf('XX')).toThrow(BadRequestException));
  it('rejeita data inválida', () =>
    expect(() => service.normalizeDate(new Date('invalid'))).toThrow(
      BadRequestException,
    ));
  it('rejeita quantidade negativa', async () => {
    await expect(
      service.addBusinessDays(utc('2026-09-01'), -1, 'RJ'),
    ).rejects.toThrow(BadRequestException);
  });
  it('rejeita quantidade fracionada', async () => {
    await expect(
      service.addBusinessDays(utc('2026-09-01'), 1.5, 'RJ'),
    ).rejects.toThrow(BadRequestException);
  });
  it('mantém a data-base para zero dias úteis', async () => {
    holidays([]);
    await expect(
      service.addBusinessDays(utc('2026-09-05'), 0, 'RJ'),
    ).resolves.toEqual(utc('2026-09-05'));
  });
  it('identifica dia útil comum, sábado e domingo', () => {
    const set = new Set<string>();
    expect(service.isBusinessDay(utc('2026-09-04'), set)).toBe(true);
    expect(service.isBusinessDay(utc('2026-09-05'), set)).toBe(false);
    expect(service.isBusinessDay(utc('2026-09-06'), set)).toBe(false);
  });
  it('inicia a contagem no dia posterior à data-base', async () => {
    holidays([]);
    expect(key(await service.addBusinessDays(utc('2026-09-01'), 1, 'RJ'))).toBe(
      '2026-09-02',
    );
  });
  it('avança da sexta-feira para a segunda-feira', async () => {
    holidays([]);
    expect(key(await service.addBusinessDays(utc('2026-09-04'), 1, 'RJ'))).toBe(
      '2026-09-07',
    );
  });
  it('desconta feriado nacional', async () => {
    holidays([{ dia: utc('2026-09-07'), uf: null }]);
    expect(key(await service.addBusinessDays(utc('2026-09-04'), 1, 'RJ'))).toBe(
      '2026-09-08',
    );
  });
  it('desconta feriado da UF selecionada', async () => {
    holidays([{ dia: utc('2026-09-08'), uf: 'RJ' }]);
    expect(key(await service.addBusinessDays(utc('2026-09-07'), 1, 'RJ'))).toBe(
      '2026-09-09',
    );
  });
  it('não considera feriado de outra UF retornado pelo mock', () => {
    const set = new Set<string>();
    expect(service.isBusinessDay(utc('2026-09-08'), set)).toBe(true);
  });
  it('calcula virada de mês', async () => {
    holidays([]);
    expect(key(await service.addBusinessDays(utc('2026-09-30'), 1, 'RJ'))).toBe(
      '2026-10-01',
    );
  });
  it('calcula virada de ano', async () => {
    holidays([{ dia: utc('2027-01-01'), uf: null }]);
    expect(key(await service.addBusinessDays(utc('2026-12-31'), 1, 'RJ'))).toBe(
      '2027-01-04',
    );
  });
  it('informa calendário estadual disponível', async () => {
    holidays([{ dia: utc('2026-04-23'), uf: 'RJ' }]);
    await expect(service.calendarInfo('RJ')).resolves.toMatchObject({
      uf: 'RJ',
      stateCalendarAvailable: true,
    });
  });
  it('informa calendário estadual ausente sem impedir feriados nacionais', async () => {
    holidays([{ dia: utc('2026-09-07'), uf: null }]);
    const info = await service.calendarInfo('AC');
    expect(info.stateCalendarAvailable).toBe(false);
    expect(info.holidays.has('2026-09-07')).toBe(true);
  });
  it('localiza o próximo dia útil', async () => {
    holidays([{ dia: utc('2026-09-07'), uf: null }]);
    expect(key(await service.nextBusinessDay(utc('2026-09-04'), 'RJ'))).toBe(
      '2026-09-08',
    );
  });
});
