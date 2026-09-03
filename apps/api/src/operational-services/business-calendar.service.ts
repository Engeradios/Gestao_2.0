import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const VALID_UFS = new Set([
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]);

export type BusinessCalendarInfo = {
  uf: string;
  stateCalendarAvailable: boolean;
  holidays: ReadonlySet<string>;
};

@Injectable()
export class BusinessCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeUf(value: string): string {
    const uf = String(value ?? '')
      .trim()
      .toUpperCase();
    if (!VALID_UFS.has(uf)) {
      throw new BadRequestException('UF inválida para cálculo de dias úteis');
    }
    return uf;
  }

  normalizeDate(value: Date): Date {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new BadRequestException('Data inválida para cálculo de dias úteis');
    }
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  dateKey(value: Date): string {
    return this.normalizeDate(value).toISOString().slice(0, 10);
  }

  isBusinessDay(date: Date, holidays: ReadonlySet<string>): boolean {
    const normalized = this.normalizeDate(date);
    const day = normalized.getUTCDay();
    return day !== 0 && day !== 6 && !holidays.has(this.dateKey(normalized));
  }

  async calendarInfo(ufValue: string): Promise<BusinessCalendarInfo> {
    const uf = this.normalizeUf(ufValue);
    const rows = await this.prisma.opFeriado.findMany({
      where: { OR: [{ uf: null }, { uf }] },
      select: { dia: true, uf: true },
      orderBy: { dia: 'asc' },
    });
    return {
      uf,
      stateCalendarAvailable: rows.some((row) => row.uf?.trim() === uf),
      holidays: new Set(rows.map((row) => this.dateKey(row.dia))),
    };
  }

  async nextBusinessDay(baseDate: Date, ufValue: string): Promise<Date> {
    const calendar = await this.calendarInfo(ufValue);
    let cursor = this.normalizeDate(baseDate);
    do {
      cursor = this.addCalendarDays(cursor, 1);
    } while (!this.isBusinessDay(cursor, calendar.holidays));
    return cursor;
  }

  async calendarInfoForUfs(
    ufValues: readonly string[],
  ): Promise<BusinessCalendarInfo> {
    const ufs = [...new Set(ufValues.map((value) => this.normalizeUf(value)))];
    if (!ufs.length) {
      throw new BadRequestException(
        'Informe ao menos uma UF para o calendário',
      );
    }

    const rows = await this.prisma.opFeriado.findMany({
      where: { OR: [{ uf: null }, { uf: { in: ufs } }] },
      select: { dia: true, uf: true },
      orderBy: { dia: 'asc' },
    });

    return {
      uf: ufs.join(','),
      stateCalendarAvailable: ufs.every((uf) =>
        rows.some((row) => row.uf?.trim() === uf),
      ),
      holidays: new Set(rows.map((row) => this.dateKey(row.dia))),
    };
  }

  nextBusinessDayInclusiveFromCalendar(
    baseDate: Date,
    holidays: ReadonlySet<string>,
  ): Date {
    let cursor = this.normalizeDate(baseDate);

    while (!this.isBusinessDay(cursor, holidays)) {
      cursor = this.addCalendarDays(cursor, 1);
    }

    return cursor;
  }

  addBusinessDaysInclusiveFromCalendar(
    startDate: Date,
    businessDays: number,
    holidays: ReadonlySet<string>,
  ): Date {
    if (!Number.isInteger(businessDays) || businessDays < 0) {
      throw new BadRequestException(
        'Quantidade de dias úteis deve ser inteira e não negativa',
      );
    }

    let cursor = this.normalizeDate(startDate);
    let counted = 0;

    while (counted < businessDays) {
      if (this.isBusinessDay(cursor, holidays)) counted += 1;
      if (counted < businessDays) {
        cursor = this.addCalendarDays(cursor, 1);
      }
    }

    return cursor;
  }

  async nextBusinessDayInclusive(
    baseDate: Date,
    ufValue: string,
  ): Promise<Date> {
    const calendar = await this.calendarInfo(ufValue);
    return this.nextBusinessDayInclusiveFromCalendar(
      baseDate,
      calendar.holidays,
    );
  }

  async addBusinessDaysInclusive(
    startDate: Date,
    businessDays: number,
    ufValue: string,
  ): Promise<Date> {
    const calendar = await this.calendarInfo(ufValue);
    return this.addBusinessDaysInclusiveFromCalendar(
      startDate,
      businessDays,
      calendar.holidays,
    );
  }

  async addBusinessDays(
    baseDate: Date,
    businessDays: number,
    ufValue: string,
  ): Promise<Date> {
    if (!Number.isInteger(businessDays) || businessDays < 0) {
      throw new BadRequestException(
        'Quantidade de dias úteis deve ser inteira e não negativa',
      );
    }
    const calendar = await this.calendarInfo(ufValue);
    let cursor = this.normalizeDate(baseDate);
    let counted = 0;
    while (counted < businessDays) {
      cursor = this.addCalendarDays(cursor, 1);
      if (this.isBusinessDay(cursor, calendar.holidays)) counted += 1;
    }
    return cursor;
  }

  private addCalendarDays(value: Date, days: number): Date {
    const result = this.normalizeDate(value);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }
}
