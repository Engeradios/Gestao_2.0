import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../database/prisma.service';
import { ServiceOpeningNotificationService } from './service-opening-notification.service';

interface CreateInput {
  proposta: string;
  servicoAtividade: string;
  responsaveis: string[];
  prioridade?: string;
  observacoes?: string;
  actorId: string;
  actorName: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class OperationalServiceImportService {
  private readonly directory =
    process.env.OP_ANEXO_DIR || '/opt/engeradios2/storage/servicos';

  constructor(
    private readonly db: PrismaService,
    private readonly openingNotification: ServiceOpeningNotificationService,
  ) {}

  async create(input: CreateInput, file: Express.Multer.File) {
    this.validatePdf(file);

    const proposta = await this.db.opProposta.findFirst({
      where: {
        numero: {
          equals: input.proposta.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (!proposta) {
      throw new NotFoundException('Proposta não encontrada.');
    }

    if (proposta.status.trim().toUpperCase() !== 'APROVADO') {
      throw new BadRequestException(
        'Somente propostas aprovadas podem gerar serviço.',
      );
    }

    const existing = await this.db.opServico.findFirst({
      where: { propostaId: proposta.id },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe serviço vinculado a esta proposta.',
      );
    }

    const tipo = proposta.tipo?.trim();

    if (!tipo) {
      throw new BadRequestException('A proposta não possui tipo definido.');
    }

    const configuration = await this.db.opTipoPropostaArea.findUnique({
      where: { tipo },
    });

    const duration =
      proposta.prazoExecucaoDiasUteis ?? configuration?.prazoPadraoDiasUteis;

    if (!configuration?.ativo || !duration) {
      throw new BadRequestException(
        'Tipo de proposta sem área e prazo ativos.',
      );
    }

    const responsibleIds = [...new Set(input.responsaveis)];

    const people = await this.db.pessoa.findMany({
      where: {
        id: { in: responsibleIds },
        ativo: true,
        funcoes: {
          some: {
            ativo: true,
            funcao: {
              in: ['TECNICO', 'AUXILIAR', 'AUXILIAR_TECNICO', 'SUPERVISOR'],
            },
          },
        },
      },
      include: {
        funcoes: {
          where: { ativo: true },
          select: { funcao: true },
        },
      },
    });

    if (responsibleIds.length > 0 && people.length !== responsibleIds.length) {
      throw new BadRequestException(
        'Um ou mais responsáveis são inválidos ou estão inativos.',
      );
    }

    const holidays = await this.db.opFeriado.findMany({
      where: {
        OR: [{ uf: null }, { uf: { in: ['RJ', 'SP'] } }],
      },
      select: { dia: true },
    });

    const holidaySet = new Set(holidays.map((item) => this.dateKey(item.dia)));

    const plannedStart = this.nextBusinessDay(this.today(), holidaySet);

    const deadline = this.addBusinessDays(plannedStart, duration, holidaySet);

    await fs.mkdir(this.directory, {
      recursive: true,
      mode: 0o750,
    });

    const storedName = `${randomUUID()}.pdf`;
    const path = join(this.directory, storedName);
    const hash = createHash('sha256').update(file.buffer).digest('hex');

    await fs.writeFile(path, file.buffer, { mode: 0o640 });

    try {
      const serviceResult = await this.db.$transaction(async (tx) => {
        const service = await tx.opServico.create({
          data: {
            propostaId: proposta.id,
            proposta: proposta.numero,
            cliente: proposta.clienteNome || 'Não informado',
            clienteLocal:
              proposta.local ||
              proposta.enderecoInstalacao ||
              proposta.clienteMunicipio,
            dataAprovacao: proposta.atualizadoEm ?? proposta.dataCadastro,
            tipoProposta: tipo,
            areaResponsavel: configuration.area,
            prazoExecucaoDiasUteis: duration,
            tempoExecucaoDias: duration,
            ufExecucao: proposta.clienteUf || 'RJ',
            servicoAtividade:
              proposta.titulo?.trim() || `Proposta ${proposta.numero}`,
            prioridade: input.prioridade?.trim() || 'NORMAL',
            observacoes: input.observacoes?.trim() || null,
            inicioPlanejado: plannedStart,
            prazoFinal: deadline,
            status: 'Planejado',
            percentual: 0,
            contrato: proposta.contrato,
            contatoNome: proposta.contatoNome,
            contatoEmail: proposta.contatoEmail,
            contatoTelefone: proposta.contatoCelular,
            enderecoInstalacao: proposta.enderecoInstalacao,
            titulo: proposta.titulo,
            responsavel: people.length
              ? people.map((person) => person.nome).join(', ')
              : null,
            propostaPdf: storedName,
            propostaPdfNome: file.originalname,
            propostaPdfEm: new Date(),
          },
        });

        if (people.length) {
          await tx.opServicoResponsavel.createMany({
            data: people.map((person) => ({
              servicoId: service.id,
              pessoaId: person.id,
              papel: person.funcoes[0]?.funcao || null,
              atribuidoPor: input.actorName,
            })),
          });
        }

        await tx.opServicoAnexo.create({
          data: {
            servicoId: service.id,
            tipo: 'PROPOSTA',
            nomeOriginal: file.originalname,
            nomeArmazenado: storedName,
            mimeType: 'application/pdf',
            tamanho: BigInt(file.size),
            caminho: path,
            hashSha256: hash,
            criadoPor: input.actorName,
          },
        });

        await tx.auditoria.create({
          data: {
            usuarioId: input.actorId,
            entidade: 'SERVICO',
            entidadeId: service.id,
            acao: 'SERVICO_CRIADO_PROPOSTA',
            dadosDepois: {
              proposta: proposta.numero,
              area: configuration.area,
              prazoDiasUteis: duration,
              inicioPlanejado: this.dateKey(plannedStart),
              prazoFinal: this.dateKey(deadline),
              responsaveis: people.map((person) => person.id),
              pdfHashSha256: hash,
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
        });

        return {
          ...service,
          responsaveis: people.map((person) => ({
            id: person.id,
            nome: person.nome,
          })),
        };
      });

      await this.openingNotification
        .send(serviceResult.id, input.actorName)
        .catch(() => undefined);

      return serviceResult;
    } catch (error) {
      await fs.unlink(path).catch(() => undefined);
      throw error;
    }
  }

  private validatePdf(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('O PDF da proposta é obrigatório.');
    }

    if (
      file.mimetype !== 'application/pdf' ||
      !file.originalname.toLowerCase().endsWith('.pdf') ||
      file.buffer.subarray(0, 5).toString() !== '%PDF-'
    ) {
      throw new BadRequestException('Arquivo PDF inválido.');
    }
  }

  private today() {
    const date = new Date();
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }

  private dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private isBusinessDay(date: Date, holidays: Set<string>) {
    const weekday = date.getUTCDay();

    return weekday !== 0 && weekday !== 6 && !holidays.has(this.dateKey(date));
  }

  private nextBusinessDay(date: Date, holidays: Set<string>) {
    const result = new Date(date);

    while (!this.isBusinessDay(result, holidays)) {
      result.setUTCDate(result.getUTCDate() + 1);
    }

    return result;
  }

  private addBusinessDays(start: Date, amount: number, holidays: Set<string>) {
    const result = new Date(start);
    let counted = 0;

    while (counted < amount) {
      if (this.isBusinessDay(result, holidays)) {
        counted++;
      }

      if (counted < amount) {
        result.setUTCDate(result.getUTCDate() + 1);
      }
    }

    return result;
  }
}
