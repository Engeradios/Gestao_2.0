import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FilialDto } from './filiais.dto';
function digits(v?: string | null) {
  return v === undefined ? undefined : v?.replace(/\D/g, '') || null;
}
function jsonSafe<T>(value: T) {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === 'bigint' ? item.toString() : item,
    ),
  );
}
function validCnpj(v: string) {
  if (!/^\d{14}$/.test(v) || /^(\d)\1+$/.test(v)) return false;
  const calc = (n: number) => {
    let sum = 0,
      pos = n - 7;
    for (let i = n; i >= 1; i--) {
      sum += +v.charAt(n - i) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +v[12] && calc(13) === +v[13];
}
function text(v?: string) {
  return v === undefined ? undefined : v.trim() || null;
}
@Injectable()
export class FiliaisService {
  constructor(private readonly prisma: PrismaService) {}
  list() {
    return this.prisma.fin_filiais.findMany({ orderBy: { nome: 'asc' } });
  }
  async history(id: bigint) {
    return this.prisma.fin_filiais_historico.findMany({
      where: { filial_id: id },
      orderBy: { criado_em: 'desc' },
      take: 100,
    });
  }
  private data(d: FilialDto, creating = false) {
    if (creating && !d.codigo?.trim())
      throw new BadRequestException('Informe o código da filial.');
    if (creating && !d.nome?.trim())
      throw new BadRequestException('Informe o nome operacional da filial.');
    if (d.codigo !== undefined && !d.codigo.trim())
      throw new BadRequestException('O código da filial não pode ficar vazio.');
    if (d.nome !== undefined && !d.nome.trim())
      throw new BadRequestException('O nome operacional não pode ficar vazio.');
    const c = digits(d.cnpj);
    if (c && !validCnpj(c))
      throw new BadRequestException('CNPJ inválido. Confira os 14 dígitos.');
    return {
      codigo: d.codigo?.trim().toUpperCase(),
      nome: d.nome?.trim(),
      razao_social: text(d.razaoSocial),
      nome_fantasia: text(d.nomeFantasia),
      cnpj: c,
      tipo_estabelecimento: d.tipoEstabelecimento,
      inscricao_estadual: text(d.inscricaoEstadual),
      inscricao_municipal: text(d.inscricaoMunicipal),
      cep: digits(d.cep),
      logradouro: text(d.logradouro),
      numero: text(d.numero),
      complemento: text(d.complemento),
      bairro: text(d.bairro),
      cidade: text(d.cidade),
      uf: d.uf === undefined ? undefined : d.uf.trim().toUpperCase() || null,
      ativo: d.ativo,
      atualizado_em: new Date(),
    };
  }
  async create(d: FilialDto, user?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.fin_filiais.create({
          data: this.data(d, true) as never,
        });
        await tx.fin_filiais_historico.create({
          data: {
            filial_id: row.id,
            usuario_id: user || null,
            acao: 'CRIAR',
            depois: jsonSafe(row),
          },
        });
        return row;
      });
    } catch (e) {
      if (String(e).includes('Unique constraint'))
        throw new ConflictException(
          'Já existe uma filial com este código ou CNPJ.',
        );
      throw e;
    }
  }
  async update(id: bigint, d: FilialDto, user?: string) {
    const old = await this.prisma.fin_filiais.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Filial não encontrada.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.fin_filiais.update({
          where: { id },
          data: this.data(d),
        });
        await tx.fin_filiais_historico.create({
          data: {
            filial_id: id,
            usuario_id: user || null,
            acao: 'ATUALIZAR',
            antes: jsonSafe(old),
            depois: jsonSafe(row),
          },
        });
        return row;
      });
    } catch (e) {
      if (String(e).includes('Unique constraint'))
        throw new ConflictException(
          'Já existe uma filial com este código ou CNPJ.',
        );
      throw e;
    }
  }
}
