import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../database/prisma.service';

type DeliveryPdfStop = {
  ordemExecucao: number;
  origem: string;
  origemNumero: string | null;
  clienteNome: string | null;
  enderecoEntrega: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  observacaoRota: string | null;
};

type DeliveryPdfRoute = {
  status: string;
  entregador: { nome: string } | null;
  veiculo: { placa: string; modelo: string | null } | null;
  entregas: DeliveryPdfStop[];
};

@Injectable()
export class DeliveryRoutePdfService {
  private readonly logo =
    '/opt/engeradios2/apps/web/public/brand/logo_claro.png';

  constructor(private readonly db: PrismaService) {}

  private date(value: string) {
    const normalized = String(value || '').slice(0, 10);
    const parsed = new Date(`${normalized}T00:00:00.000Z`);
    if (!normalized || Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Data inválida');
    }
    return parsed;
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(value);
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
    if (value instanceof Date) return value.toISOString();
    return '';
  }

  private header(doc: PDFKit.PDFDocument, date: Date, scope: string) {
    try {
      doc.image(this.logo, 30, 20, { fit: [105, 34] });
    } catch {
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#b91c1c')
        .text('ENGERÁDIOS', 30, 27);
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(17)
      .fillColor('#0f172a')
      .text('ROTEIRO DE ENTREGA', 150, 24, { width: 610, align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text(`Data: ${this.formatDate(date)}  |  ${scope}`, 150, 48, {
        width: 610,
        align: 'center',
      });
    doc.moveTo(30, 70).lineTo(812, 70).strokeColor('#cbd5e1').stroke();
    doc.y = 82;
  }

  private columns(doc: PDFKit.PDFDocument) {
    const y = doc.y;
    doc.rect(30, y, 782, 22).fill('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a');
    doc.text('ORDEM', 36, y + 7, { width: 40 });
    doc.text('ORIGEM', 78, y + 7, { width: 88 });
    doc.text('CLIENTE', 168, y + 7, { width: 150 });
    doc.text('ENDEREÇO', 320, y + 7, { width: 285 });
    doc.text('OBSERVAÇÃO', 607, y + 7, { width: 125 });
    doc.text('RESULTADO', 734, y + 7, { width: 70 });
    doc.y = y + 22;
  }

  private ensure(
    doc: PDFKit.PDFDocument,
    needed: number,
    date: Date,
    scope: string,
  ) {
    if (doc.y + needed <= 548) return;
    doc.addPage();
    this.header(doc, date, scope);
    this.columns(doc);
  }

  private routeHeader(
    doc: PDFKit.PDFDocument,
    route: DeliveryPdfRoute,
    date: Date,
    general: boolean,
  ) {
    if (general) this.ensure(doc, 35, date, 'Todos os motoristas');
    const y = doc.y;
    doc.rect(30, y, 782, 29).fill('#0f172a');
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#ffffff')
      .text(route.entregador?.nome ?? 'Motorista não definido', 40, y + 8, {
        width: 300,
      });
    doc
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Veículo: ${route.veiculo?.placa ?? 'Não definido'} ${route.veiculo?.modelo ?? ''}  |  Status: ${route.status}`,
        350,
        y + 9,
        { width: 450, align: 'right' },
      );
    doc.y = y + 34;
    this.columns(doc);
  }

  private row(
    doc: PDFKit.PDFDocument,
    delivery: DeliveryPdfStop,
    index: number,
    date: Date,
    scope: string,
  ) {
    this.ensure(doc, 40, date, scope);
    const y = doc.y;
    if (index % 2 === 0) doc.rect(30, y, 782, 37).fill('#f8fafc');
    doc.font('Helvetica').fontSize(7.5).fillColor('#0f172a');
    doc.text(String(delivery.ordemExecucao), 36, y + 7, { width: 35 });
    doc
      .font('Helvetica-Bold')
      .text(
        `${delivery.origem} ${this.text(delivery.origemNumero)}`,
        78,
        y + 7,
        { width: 86, height: 25, ellipsis: true },
      );
    doc
      .font('Helvetica')
      .text(this.text(delivery.clienteNome) || 'Não informado', 168, y + 7, {
        width: 148,
        height: 25,
        ellipsis: true,
      });
    doc.text(
      [delivery.enderecoEntrega, delivery.bairro, delivery.cidade, delivery.uf]
        .filter(Boolean)
        .join(' - '),
      320,
      y + 7,
      { width: 282, height: 25, ellipsis: true },
    );
    doc.text(this.text(delivery.observacaoRota) || '-', 607, y + 7, {
      width: 122,
      height: 25,
      ellipsis: true,
    });
    doc.text('□ Entregue\n□ Retorno', 734, y + 5, { width: 70, height: 28 });
    doc
      .moveTo(30, y + 37)
      .lineTo(812, y + 37)
      .strokeColor('#e2e8f0')
      .stroke();
    doc.y = y + 37;
  }

  async generate(dateValue: string, routeId?: bigint): Promise<Buffer> {
    const date = this.date(dateValue);
    const routes = await this.db.opRoteiroEntregaCabecalho.findMany({
      where: routeId ? { id: routeId } : { dataRota: date },
      include: {
        entregador: true,
        veiculo: true,
        entregas: { orderBy: [{ ordemExecucao: 'asc' }, { id: 'asc' }] },
      },
      orderBy: [{ entregador: { nome: 'asc' } }, { id: 'asc' }],
    });
    if (routeId && !routes.length)
      throw new NotFoundException('Roteiro não encontrado');
    const scope = routeId
      ? `Motorista: ${routes[0]?.entregador?.nome ?? 'Não definido'}`
      : 'Todos os motoristas';
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30,
      bufferPages: true,
      info: {
        Title: `Roteiro de entrega ${dateValue}`,
        Author: 'Gestão Engerádios 2.0',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    this.header(doc, date, scope);
    if (!routes.length) {
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#64748b')
        .text('Nenhum roteiro encontrado para a data.', 30, 170, {
          width: 782,
          align: 'center',
        });
    } else {
      routes.forEach((route, routeIndex) => {
        if (routeIndex > 0) {
          doc.addPage();
          this.header(doc, date, scope);
        }
        this.routeHeader(doc, route, date, !routeId);
        route.entregas.forEach((delivery, index) =>
          this.row(doc, delivery, index, date, scope),
        );
        doc.moveDown(1);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#475569')
          .text(
            'Retorno do motorista: ____________________________________________________________________________________',
            30,
            Math.min(doc.y + 8, 535),
            { width: 782 },
          );
      });
    }
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      const bottomMargin = doc.page.margins.bottom;
      const currentX = doc.x;
      const currentY = doc.y;

      doc.page.margins.bottom = 0;

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text(`Página ${i + 1} de ${pages.count}`, 30, doc.page.height - 22, {
          width: 782,
          align: 'right',
          lineBreak: false,
        });

      doc.page.margins.bottom = bottomMargin;
      doc.x = currentX;
      doc.y = currentY;
    }
    doc.end();
    return finished;
  }
}
