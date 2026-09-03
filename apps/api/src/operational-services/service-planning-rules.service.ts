import { BadRequestException, Injectable } from '@nestjs/common';
import { BusinessCalendarService } from './business-calendar.service';

export const PREPARATION_BUSINESS_DAYS = 15;
export const MAX_EXECUTION_BUSINESS_DAYS = 365;
export type ServiceArea = 'OPERACIONAL' | 'LOGISTICA' | 'AMBAS';

export type ServicePlanningInput = {
  area: string;
  approvalDate: Date;
  uf: string;
  executionBusinessDays?: number | null;
};

export type ServicePlanningResult = {
  area: ServiceArea;
  uf: string;
  preparationBusinessDays: number;
  executionBusinessDays: number | null;
  deliveryExpectedAt: Date | null;
  plannedStartAt: Date | null;
  deadlineAt: Date;
  stateCalendarAvailable: boolean;
};

@Injectable()
export class ServicePlanningRulesService {
  constructor(private readonly calendar: BusinessCalendarService) {}

  async calculate(input: ServicePlanningInput): Promise<ServicePlanningResult> {
    const area = this.normalizeArea(input.area);
    const uf = this.calendar.normalizeUf(input.uf);
    const approvalDate = this.calendar.normalizeDate(input.approvalDate);
    const executionBusinessDays = this.executionDays(
      area,
      input.executionBusinessDays,
    );
    const calendarInfo = await this.calendar.calendarInfo(uf);
    const preparationDate = await this.calendar.addBusinessDays(
      approvalDate,
      PREPARATION_BUSINESS_DAYS,
      uf,
    );

    if (area === 'LOGISTICA') {
      return {
        area,
        uf,
        preparationBusinessDays: PREPARATION_BUSINESS_DAYS,
        executionBusinessDays: null,
        deliveryExpectedAt: preparationDate,
        plannedStartAt: null,
        deadlineAt: preparationDate,
        stateCalendarAvailable: calendarInfo.stateCalendarAvailable,
      };
    }

    const deadlineAt = await this.calendar.addBusinessDays(
      preparationDate,
      executionBusinessDays,
      uf,
    );

    return {
      area,
      uf,
      preparationBusinessDays: PREPARATION_BUSINESS_DAYS,
      executionBusinessDays,
      deliveryExpectedAt: area === 'AMBAS' ? preparationDate : null,
      plannedStartAt: preparationDate,
      deadlineAt,
      stateCalendarAvailable: calendarInfo.stateCalendarAvailable,
    };
  }

  normalizeArea(value: string): ServiceArea {
    const area = String(value ?? '')
      .trim()
      .toUpperCase();
    if (area !== 'OPERACIONAL' && area !== 'LOGISTICA' && area !== 'AMBAS') {
      throw new BadRequestException('Área responsável inválida');
    }
    return area;
  }

  private executionDays(
    area: ServiceArea,
    value: number | null | undefined,
  ): number {
    if (area === 'LOGISTICA') return 0;
    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(
        'Dias úteis de execução são obrigatórios para a área informada',
      );
    }
    if (Number(value) > MAX_EXECUTION_BUSINESS_DAYS) {
      throw new BadRequestException(
        `Dias úteis de execução não podem exceder ${MAX_EXECUTION_BUSINESS_DAYS}`,
      );
    }
    return Number(value);
  }
}
