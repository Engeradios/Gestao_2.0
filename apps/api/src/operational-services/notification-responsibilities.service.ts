import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateNotificationResponsibilityDto,
  UpdateNotificationResponsibilityDto,
} from './dto/notification-responsibility.dto';
const UFS = new Set([
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
export class NotificationResponsibilitiesService {
  constructor(private readonly db: PrismaService) {}
  private normalize<
    T extends { uf?: string; praca?: string | null; areaResponsavel?: string },
  >(data: T): T {
    const result = { ...data };
    if (result.uf) {
      result.uf = result.uf.trim().toUpperCase();
      if (!UFS.has(result.uf)) throw new BadRequestException('UF inválida');
    }
    if ('praca' in result)
      result.praca = result.praca?.trim().replace(/\s+/g, ' ') || null;
    if (result.areaResponsavel)
      result.areaResponsavel = result.areaResponsavel.trim().toUpperCase();
    return result;
  }
  private events(data: {
    recAbertura?: boolean;
    recConclusao?: boolean;
    recLogistica?: boolean;
  }) {
    if (!data.recAbertura && !data.recConclusao && !data.recLogistica)
      throw new BadRequestException(
        'Selecione ao menos um tipo de notificação',
      );
  }
  private async eligible(usuarioId: string) {
    const user = await this.db.usuario.findFirst({
      where: { id: usuarioId, status: 'ATIVO', email: { not: '' } },
      select: { id: true, nome: true, email: true, status: true },
    });
    if (!user || !user.email?.trim())
      throw new BadRequestException(
        'Usuário deve estar ativo e possuir e-mail',
      );
    return user;
  }
  async list() {
    return this.db.opNotificacaoResponsabilidade.findMany({
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, status: true },
        },
      },
      orderBy: [
        { uf: 'asc' },
        { praca: 'asc' },
        { areaResponsavel: 'asc' },
        { criadoEm: 'desc' },
      ],
    });
  }
  async users() {
    return this.db.usuario.findMany({
      where: { status: 'ATIVO', email: { not: '' } },
      select: { id: true, nome: true, email: true, status: true },
      orderBy: { nome: 'asc' },
    });
  }
  async create(body: CreateNotificationResponsibilityDto, actor: string) {
    const data = this.normalize(body);
    this.events(data);
    await this.eligible(data.usuarioId);
    try {
      const row = await this.db.opNotificacaoResponsabilidade.create({ data });
      await this.audit(actor, row.id, 'CRIAR', null, row);
      return row;
    } catch (e) {
      if (this.conflict(e))
        throw new ConflictException('Responsabilidade já cadastrada');
      throw e;
    }
  }
  async update(
    id: string,
    body: UpdateNotificationResponsibilityDto,
    actor: string,
  ) {
    const before = await this.get(id);
    const data = this.normalize(body);
    const merged = { ...before, ...data };
    this.events(merged);
    await this.eligible(data.usuarioId || before.usuarioId);
    try {
      const row = await this.db.opNotificacaoResponsabilidade.update({
        where: { id },
        data,
      });
      await this.audit(actor, id, 'ATUALIZAR', before, row);
      return row;
    } catch (e) {
      if (this.conflict(e))
        throw new ConflictException('Responsabilidade já cadastrada');
      throw e;
    }
  }
  async status(id: string, ativo: boolean, actor: string) {
    const before = await this.get(id);
    const row = await this.db.opNotificacaoResponsabilidade.update({
      where: { id },
      data: { ativo },
    });
    await this.audit(actor, id, ativo ? 'ATIVAR' : 'DESATIVAR', before, row);
    return row;
  }
  private async get(id: string) {
    const row = await this.db.opNotificacaoResponsabilidade.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Responsabilidade não encontrada');
    return row;
  }
  private conflict(e: unknown) {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002'
    );
  }
  private audit(
    actor: string,
    id: string,
    acao: string,
    before: unknown,
    after: unknown,
  ) {
    return this.db.auditoria.create({
      data: {
        usuarioId: actor || null,
        entidade: 'op_notificacao_responsabilidades',
        entidadeId: id,
        acao: `NOTIFICACAO_RESPONSABILIDADE_${acao}`,
        dadosAntes: before === null ? undefined : (before as never),
        dadosDepois: after as never,
      },
    });
  }
}
