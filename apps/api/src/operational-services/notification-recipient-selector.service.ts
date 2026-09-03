import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type NotificationRoutingEvent = 'ABERTURA' | 'CONCLUSAO' | 'LOGISTICA';

export type NotificationRoutingArea = 'OPERACIONAL' | 'LOGISTICA' | 'AMBAS';

export type NotificationRecipientSelectionInput = {
  uf: string;
  praca: string;
  area: string;
  evento: string;
};

export type NotificationRecipient = {
  usuarioId: string;
  nome: string;
  email: string;
};

export type NotificationRecipientSelectionResult = {
  estrategia: 'PRACA_EXATA' | 'TODA_UF' | 'SEM_COBERTURA';
  destinatarios: NotificationRecipient[];
  quantidade: number;
};

type RoutingRow = {
  praca: string | null;
  areaResponsavel: string;
  recAbertura: boolean;
  recConclusao: boolean;
  recLogistica: boolean;
  usuario: {
    id: string;
    nome: string;
    email: string;
    status: string;
  };
};

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

@Injectable()
export class NotificationRecipientSelectorService {
  constructor(private readonly prisma: PrismaService) {}

  async select(
    input: NotificationRecipientSelectionInput,
  ): Promise<NotificationRecipientSelectionResult> {
    const uf = this.normalizeUf(input.uf);
    const praca = this.normalizeRequiredPlace(input.praca);
    const area = this.normalizeArea(input.area);
    const evento = this.normalizeEvent(input.evento);

    const rows = await this.prisma.opNotificacaoResponsabilidade.findMany({
      where: {
        ativo: true,
        uf,
      },
      include: {
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

    const eligible = (rows as RoutingRow[]).filter(
      (row) =>
        row.usuario.status === 'ATIVO' &&
        Boolean(row.usuario.email?.trim()) &&
        this.eventEnabled(row, evento) &&
        this.areaAccepted(row.areaResponsavel, area, evento),
    );

    const exact = eligible.filter(
      (row) =>
        Boolean(this.normalizeOptionalPlace(row.praca)) &&
        this.normalizeOptionalPlace(row.praca) === praca,
    );

    if (exact.length > 0) {
      return this.result('PRACA_EXATA', exact);
    }

    const stateWide = eligible.filter(
      (row) => this.normalizeOptionalPlace(row.praca) === '',
    );

    if (stateWide.length > 0) {
      return this.result('TODA_UF', stateWide);
    }

    return {
      estrategia: 'SEM_COBERTURA',
      destinatarios: [],
      quantidade: 0,
    };
  }

  private result(
    estrategia: 'PRACA_EXATA' | 'TODA_UF',
    rows: RoutingRow[],
  ): NotificationRecipientSelectionResult {
    const byEmail = new Map<string, NotificationRecipient>();

    for (const row of rows) {
      const email = row.usuario.email.trim().toLowerCase();
      const candidate = {
        usuarioId: row.usuario.id,
        nome: row.usuario.nome,
        email,
      };
      const current = byEmail.get(email);

      if (!current || this.compareRecipient(candidate, current) < 0) {
        byEmail.set(email, candidate);
      }
    }

    const destinatarios = [...byEmail.values()].sort((left, right) =>
      this.compareRecipient(left, right),
    );

    return {
      estrategia,
      quantidade: destinatarios.length,
      destinatarios,
    };
  }

  private compareRecipient(
    left: NotificationRecipient,
    right: NotificationRecipient,
  ): number {
    return (
      left.email.localeCompare(right.email, 'pt-BR') ||
      left.usuarioId.localeCompare(right.usuarioId, 'pt-BR')
    );
  }

  private eventEnabled(
    row: RoutingRow,
    evento: NotificationRoutingEvent,
  ): boolean {
    if (evento === 'ABERTURA') return row.recAbertura;
    if (evento === 'CONCLUSAO') return row.recConclusao;
    return row.recLogistica;
  }

  private areaAccepted(
    responsibilityAreaValue: string,
    serviceArea: NotificationRoutingArea,
    evento: NotificationRoutingEvent,
  ): boolean {
    const responsibilityArea = responsibilityAreaValue.trim().toUpperCase();

    if (evento === 'LOGISTICA') {
      return (
        responsibilityArea === 'LOGISTICA' || responsibilityArea === 'AMBAS'
      );
    }

    if (serviceArea === 'LOGISTICA') {
      return (
        responsibilityArea === 'LOGISTICA' || responsibilityArea === 'AMBAS'
      );
    }

    return (
      responsibilityArea === 'OPERACIONAL' || responsibilityArea === 'AMBAS'
    );
  }

  private normalizeUf(value: string): string {
    const uf = String(value ?? '')
      .trim()
      .toUpperCase();
    if (!VALID_UFS.has(uf)) {
      throw new BadRequestException(
        'UF inválida para roteamento de notificações',
      );
    }
    return uf;
  }

  private normalizeRequiredPlace(value: string): string {
    const praca = this.normalizeOptionalPlace(value);
    if (!praca) {
      throw new BadRequestException(
        'Praça é obrigatória para roteamento de notificações',
      );
    }
    return praca;
  }

  private normalizeOptionalPlace(value: string | null | undefined): string {
    return String(value ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('pt-BR');
  }

  private normalizeArea(value: string): NotificationRoutingArea {
    const area = String(value ?? '')
      .trim()
      .toUpperCase();
    if (area !== 'OPERACIONAL' && area !== 'LOGISTICA' && area !== 'AMBAS') {
      throw new BadRequestException(
        'Área inválida para roteamento de notificações',
      );
    }
    return area;
  }

  private normalizeEvent(value: string): NotificationRoutingEvent {
    const evento = String(value ?? '')
      .trim()
      .toUpperCase();
    if (
      evento !== 'ABERTURA' &&
      evento !== 'CONCLUSAO' &&
      evento !== 'LOGISTICA'
    ) {
      throw new BadRequestException(
        'Evento inválido para roteamento de notificações',
      );
    }
    return evento;
  }
}
