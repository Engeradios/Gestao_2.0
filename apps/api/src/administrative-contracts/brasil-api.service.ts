import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

type Actor = { id: string; ip?: string; userAgent?: string };
type Qsa = Record<string, unknown>;
type BrasilApiCnpj = Record<string, unknown> & { qsa?: Qsa[] };

@Injectable()
export class BrasilApiService {
  constructor(private readonly prisma: PrismaService) {}

  private scalar(value: unknown) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private digits(value: unknown) {
    return this.scalar(value).replace(/\D/g, '');
  }
  private text(value: unknown) {
    return this.scalar(value).trim();
  }
  private normalized(value: unknown) {
    return this.text(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }
  private date(value: unknown) {
    const v = this.text(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(v)
      ? new Date(`${v}T00:00:00.000Z`)
      : null;
  }

  private differences(
    client: {
      razaoSocial: string;
      nomeFantasia: string | null;
      cnpj: string | null;
      endereco: string | null;
      bairro: string | null;
      municipio: string | null;
      uf: string | null;
      cep: string | null;
      contatoEmail: string | null;
      contatoFone: string | null;
    },
    data: BrasilApiCnpj,
  ) {
    const externalAddress = [
      data.descricao_tipo_de_logradouro,
      data.logradouro,
      data.numero,
      data.complemento,
    ]
      .map((v) => this.text(v))
      .filter(Boolean)
      .join(' ');
    const pairs: Record<string, [unknown, unknown]> = {
      razaoSocial: [client.razaoSocial, data.razao_social],
      nomeFantasia: [client.nomeFantasia, data.nome_fantasia],
      cnpj: [this.digits(client.cnpj), this.digits(data.cnpj)],
      endereco: [client.endereco, externalAddress],
      bairro: [client.bairro, data.bairro],
      municipio: [client.municipio, data.municipio],
      uf: [client.uf, data.uf],
      cep: [this.digits(client.cep), this.digits(data.cep)],
      contatoEmail: [client.contatoEmail, data.email],
      contatoFone: [
        this.digits(client.contatoFone),
        this.digits(data.ddd_telefone_1),
      ],
    };
    return Object.fromEntries(
      Object.entries(pairs)
        .filter(
          ([, [local, api]]) => this.normalized(local) !== this.normalized(api),
        )
        .map(([field, [local, api]]) => [
          field,
          { local: local ?? null, brasilApi: api ?? null },
        ]),
    );
  }

  async consult(contractId: string, actor: Actor) {
    const contract = await this.prisma.contratoAdministrativo.findFirst({
      where: { id: contractId, excluidoEm: null },
      include: { cliente: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    const cnpj = this.digits(contract.cliente.cnpj);
    if (cnpj.length !== 14)
      throw new BadRequestException('Cliente sem CNPJ válido para consulta');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let status: number | null = null;
    let payload: BrasilApiCnpj | null = null;
    let failure: string | null = null;
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
        {
          signal: controller.signal,
          headers: {
            accept: 'application/json',
            'user-agent': 'Engeradios2/1.0',
          },
        },
      );
      status = response.status;
      const raw: unknown = await response.json().catch(() => ({}));
      payload = raw && typeof raw === 'object' ? (raw as BrasilApiCnpj) : {};
      if (!response.ok)
        failure =
          this.text(payload.message) ||
          `BrasilAPI respondeu HTTP ${response.status}`;
    } catch (error) {
      failure =
        error instanceof Error ? error.message : 'Falha na consulta BrasilAPI';
    } finally {
      clearTimeout(timer);
    }
    const differences = payload
      ? this.differences(contract.cliente, payload)
      : {};
    const record = await this.prisma.$transaction(async (tx) => {
      const query = await tx.contratoConsultaCnpj.create({
        data: {
          contratoId: contract.id,
          clienteId: contract.clienteId,
          cnpjConsultado: cnpj,
          httpStatus: status,
          sucesso: !failure,
          divergencias: differences,
          resposta: payload ? (payload as Prisma.InputJsonValue) : undefined,
          erro: failure,
          consultadoPorId: actor.id,
        },
      });
      const qsa = Array.isArray(payload?.qsa) ? payload.qsa : [];
      if (qsa.length)
        await tx.contratoSocioSnapshot.createMany({
          data: qsa.map((item, index) => ({
            consultaId: query.id,
            nomeSocio: this.text(item.nome_socio) || null,
            documentoMascarado: this.text(item.cnpj_cpf_do_socio) || null,
            qualificacaoSocio: this.text(item.qualificacao_socio) || null,
            dataEntradaSociedade: this.date(item.data_entrada_sociedade),
            faixaEtaria: this.text(item.faixa_etaria) || null,
            nomeRepresentanteLegal:
              this.text(item.nome_representante_legal) || null,
            documentoRepresentanteMascarado:
              this.text(item.cpf_representante_legal) || null,
            qualificacaoRepresentante:
              this.text(item.qualificacao_representante_legal) || null,
            ordem: index,
          })),
        });
      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          entidade: 'CONTRATO_CONSULTA_CNPJ',
          entidadeId: query.id,
          acao: failure ? 'CONSULTA_FALHOU' : 'CONSULTA_REALIZADA',
          dadosDepois: {
            contratoId: contractId,
            cnpj,
            httpStatus: status,
            divergencias: differences,
            socios: qsa.length,
          },
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
      });
      return query;
    });
    if (failure)
      throw new BadGatewayException({
        message: failure,
        consultaId: record.id,
      });
    return this.prisma.contratoConsultaCnpj.findUnique({
      where: { id: record.id },
      include: { socios: { orderBy: { ordem: 'asc' } } },
    });
  }
}
