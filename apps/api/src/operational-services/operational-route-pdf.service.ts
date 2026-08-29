import { BadRequestException, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../database/prisma.service';

type Visit = Awaited<ReturnType<OperationalRoutePdfService['visits']>>[number];

type Row = {
  technician: string;
  period: string;
  customer: string;
  serviceType: string;
  activity: string;
};

@Injectable()
export class OperationalRoutePdfService {
  private readonly logo =
    '/opt/engeradios2/apps/web/public/brand/logo_claro.png';

  constructor(private readonly db: PrismaService) {}

  private date(value: string): Date {
    const normalized = String(value || '').slice(0, 10);
    const parsed = new Date(`${normalized}T00:00:00.000Z`);

    if (!normalized || Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Data inválida.');
    }

    return parsed;
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC',
    }).format(value);
  }

  private text(value: unknown): string {
    if (value === null || value === undefined) return '';

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint' ||
      typeof value === 'boolean'
    ) {
      return String(value).trim();
    }

    return '';
  }

  private async visits(date: Date, unit: string) {
    return this.db.opRoteiroVisita.findMany({
      where: {
        dataVisita: { lte: date },
        dataFim: { gte: date },
        unidade: unit,
      },
      include: {
        servico: true,
        preventiva: true,
      },
      orderBy: [
        { tecnico: 'asc' },
        { turno: 'asc' },
        { ordemExecucao: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  private row(visit: Visit): Row {
    const technician = this.text(visit.tecnico) || 'Não informado';
    const period = visit.turno === 'Noturno' ? 'Noturno' : 'Diurno';

    if (visit.tipo === 'PREVENTIVA') {
      return {
        technician,
        period,
        customer:
          this.text(visit.preventiva?.clienteNome) ||
          this.text(visit.cliente_nome) ||
          'Não informado',
        serviceType: 'Preventiva',
        activity: 'Manutenção preventiva',
      };
    }

    if (visit.tipo === 'OPERACIONAL') {
      const proposal =
        this.text(visit.servico?.proposta) ||
        this.text(visit.proposta_contrato);

      return {
        technician,
        period,
        customer:
          this.text(visit.servico?.cliente) ||
          this.text(visit.cliente_nome) ||
          'Não informado',
        serviceType: proposal
          ? `Instalação Proposta ${proposal}`
          : 'Instalação',
        activity:
          this.text(visit.servico?.servicoAtividade) ||
          this.text(visit.atividade_resumo) ||
          'Instalação',
      };
    }

    if (visit.tipo === 'SEDE') {
      return {
        technician,
        period,
        customer: 'Engerádios',
        serviceType: 'Sede',
        activity: this.text(visit.observacoes) || 'Atividades internas na sede',
      };
    }

    return {
      technician,
      period,
      customer: 'Engerádios',
      serviceType: 'Afastamento',
      activity: this.text(visit.observacoes) || 'Afastamento',
    };
  }

  private header(document: PDFKit.PDFDocument, date: Date, unit: string) {
    try {
      document.image(this.logo, 32, 20, { fit: [115, 32] });
    } catch {
      document
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#b91c1c')
        .text('ENGERÁDIOS', 32, 27);
    }

    document
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#0f172a')
      .text('ROTEIRO TÉCNICO', 160, 22, {
        width: 500,
        align: 'center',
      });

    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text(`Data: ${this.formatDate(date)}  |  Unidade: ${unit}`, 160, 44, {
        width: 500,
        align: 'center',
      });

    document
      .moveTo(32, 66)
      .lineTo(760, 66)
      .lineWidth(0.8)
      .strokeColor('#cbd5e1')
      .stroke();

    document.y = 76;
    this.tableHeader(document);
  }

  private footer(document: PDFKit.PDFDocument) {
    document
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text(
        `Emitido em ${new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'America/Sao_Paulo',
        }).format(new Date())}`,
        32,
        548,
        { width: 728, align: 'right', lineBreak: false },
      );
  }

  private tableHeader(document: PDFKit.PDFDocument) {
    const y = document.y;
    const columns = [
      { label: 'TÉCNICO', x: 38, width: 145 },
      { label: 'PERÍODO', x: 188, width: 62 },
      { label: 'CLIENTE', x: 255, width: 175 },
      { label: 'TIPO DE SERVIÇO', x: 435, width: 145 },
      { label: 'ATIVIDADE', x: 585, width: 169 },
    ];

    document.rect(32, y, 728, 20).fillColor('#334155').fill();

    for (const column of columns) {
      document
        .font('Helvetica-Bold')
        .fontSize(7.3)
        .fillColor('#ffffff')
        .text(column.label, column.x, y + 6, {
          width: column.width,
          ellipsis: true,
        });
    }

    document.y = y + 20;
  }

  private ensureSpace(
    document: PDFKit.PDFDocument,
    required: number,
    date: Date,
    unit: string,
  ) {
    if (document.y + required <= 560) return;

    this.footer(document);
    document.addPage();
    this.header(document, date, unit);
  }

  private tableRow(document: PDFKit.PDFDocument, row: Row, index: number) {
    const y = document.y;
    const height = 23;
    const background = index % 2 === 0 ? '#f8fafc' : '#ffffff';

    document.rect(32, y, 728, height).fillColor(background).fill();
    document
      .moveTo(32, y + height)
      .lineTo(760, y + height)
      .lineWidth(0.35)
      .strokeColor('#cbd5e1')
      .stroke();

    const cells = [
      { value: row.technician, x: 38, width: 145, bold: true },
      { value: row.period, x: 188, width: 62, bold: false },
      { value: row.customer, x: 255, width: 175, bold: false },
      { value: row.serviceType, x: 435, width: 145, bold: false },
      { value: row.activity, x: 585, width: 169, bold: false },
    ];

    for (const cell of cells) {
      document
        .font(cell.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(7.6)
        .fillColor('#0f172a')
        .text(cell.value, cell.x, y + 7, {
          width: cell.width,
          height: 10,
          lineBreak: false,
          ellipsis: true,
        });
    }

    document.y = y + height;
  }

  async generate(dateValue: string, unitValue: string): Promise<Buffer> {
    const date = this.date(dateValue);
    const unit = unitValue?.toUpperCase() === 'SP' ? 'SP' : 'RJ';
    const visits = await this.visits(date, unit);

    const document = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 32,
      info: {
        Title: `Roteiro Técnico ${dateValue} ${unit}`,
        Author: 'Gestão Engerádios 2.0',
        Subject: 'Roteiro técnico diário simplificado',
      },
    });

    const chunks: Buffer[] = [];

    document.on('data', (chunk: Buffer) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve, reject) => {
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
    });

    this.header(document, date, unit);

    if (!visits.length) {
      document
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#64748b')
        .text('Nenhuma atividade agendada para esta data e unidade.', 32, 160, {
          width: 728,
          align: 'center',
        });
    } else {
      visits.forEach((visit, index) => {
        this.ensureSpace(document, 23, date, unit);
        this.tableRow(document, this.row(visit), index);
      });
    }

    this.footer(document);
    document.end();

    return finished;
  }
}
