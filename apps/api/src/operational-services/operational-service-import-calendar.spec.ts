import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(__dirname, 'operational-service-import.service.ts'),
  'utf8',
);

describe('OperationalServiceImportService - calendário compatível', () => {
  it('injeta o BusinessCalendarService', () => {
    expect(source).toContain(
      "import { BusinessCalendarService } from './business-calendar.service';",
    );
    expect(source).toContain(
      'private readonly businessCalendar: BusinessCalendarService',
    );
  });

  it('preserva o calendário legado nacional, RJ e SP', () => {
    expect(source).toContain("calendarInfoForUfs(['RJ', 'SP'])");
  });

  it('usa somente operações inclusivas do motor central', () => {
    expect(source).toContain('nextBusinessDayInclusiveFromCalendar(');
    expect(source).toContain('addBusinessDaysInclusiveFromCalendar(');
  });

  it('remove consulta local de feriados e métodos duplicados', () => {
    expect(source).not.toContain('this.db.opFeriado.findMany');
    expect(source).not.toContain('private isBusinessDay(');
    expect(source).not.toContain('private nextBusinessDay(');
    expect(source).not.toContain('private addBusinessDays(');
  });

  it('preserva temporariamente today e dateKey', () => {
    expect(source).toContain('private today()');
    expect(source).toContain('private dateKey(date: Date)');
  });

  it('preserva o disparo de abertura existente', () => {
    expect(source).toContain('this.openingNotification');
    expect(source).toContain('.send(serviceResult.id, input.actorName)');
  });
});
