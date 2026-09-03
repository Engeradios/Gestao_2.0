import { BusinessCalendarService } from './business-calendar.service';

type Holiday = { dia: Date; uf: string | null };
type Scenario = {
  name: string;
  base: string;
  amount: number;
  holidays?: Holiday[];
};

const utc = (date: string) => new Date(`${date}T00:00:00.000Z`);
const key = (date: Date) => date.toISOString().slice(0, 10);
const dateKey = (date: Date) => key(date);
const isBusinessDay = (date: Date, holidays: ReadonlySet<string>) => {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(dateKey(date));
};
const addDay = (date: Date) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
};

const legacyNextBusinessDayInclusive = (
  date: Date,
  holidays: ReadonlySet<string>,
) => {
  let result = new Date(date);
  while (!isBusinessDay(result, holidays)) result = addDay(result);
  return result;
};

const legacyAddBusinessDaysInclusive = (
  start: Date,
  amount: number,
  holidays: ReadonlySet<string>,
) => {
  let result = new Date(start);
  let counted = 0;
  while (counted < amount) {
    if (isBusinessDay(result, holidays)) counted += 1;
    if (counted < amount) result = addDay(result);
  }
  return result;
};

describe('BusinessCalendarService - caracterização inclusiva', () => {
  const prisma = { opFeriado: { findMany: jest.fn() } };
  const service = new BusinessCalendarService(prisma as never);

  const configure = (rows: Holiday[] = []) => {
    prisma.opFeriado.findMany.mockResolvedValue(rows);
    return new Set(rows.map((row) => key(row.dia)));
  };

  beforeEach(() => jest.clearAllMocks());

  const nextScenarios: Scenario[] = [
    { name: 'dia útil', base: '2026-09-02', amount: 1 },
    { name: 'sábado', base: '2026-09-05', amount: 1 },
    { name: 'domingo', base: '2026-09-06', amount: 1 },
    {
      name: 'feriado',
      base: '2026-09-07',
      amount: 1,
      holidays: [{ dia: utc('2026-09-07'), uf: null }],
    },
  ];

  it.each(nextScenarios)(
    'nextBusinessDayInclusive reproduz o legado em $name',
    async ({ base, holidays = [] }) => {
      const set = configure(holidays);
      const expected = legacyNextBusinessDayInclusive(utc(base), set);
      const actual = await service.nextBusinessDayInclusive(utc(base), 'RJ');
      expect(key(actual)).toBe(key(expected));
    },
  );

  const amountScenarios: Scenario[] = [
    { name: 'prazo de 1 dia', base: '2026-09-02', amount: 1 },
    { name: 'prazo de 5 dias', base: '2026-09-02', amount: 5 },
    { name: 'prazo de 15 dias', base: '2026-09-02', amount: 15 },
    { name: 'virada de mês', base: '2026-09-30', amount: 5 },
    {
      name: 'virada de ano com feriado',
      base: '2026-12-30',
      amount: 3,
      holidays: [{ dia: utc('2027-01-01'), uf: null }],
    },
  ];

  it.each(amountScenarios)(
    'addBusinessDaysInclusive reproduz o legado em $name',
    async ({ base, amount, holidays = [] }) => {
      const set = configure(holidays);
      const expected = legacyAddBusinessDaysInclusive(utc(base), amount, set);
      const actual = await service.addBusinessDaysInclusive(
        utc(base),
        amount,
        'RJ',
      );
      expect(key(actual)).toBe(key(expected));
    },
  );

  it('documenta a diferença entre o modo inclusivo e a nova convenção', async () => {
    configure([]);
    const base = utc('2026-09-02');
    const inclusive = await service.addBusinessDaysInclusive(base, 1, 'RJ');
    const exclusive = await service.addBusinessDays(base, 1, 'RJ');
    expect(key(inclusive)).toBe('2026-09-02');
    expect(key(exclusive)).toBe('2026-09-03');
  });

  it('não integra o motor ao serviço de importação nesta suíte', () => {
    expect(service).toBeDefined();
  });
});
