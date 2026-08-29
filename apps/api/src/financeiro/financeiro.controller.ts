import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  BalanceDto,
  DreDto,
  FinanceQueryDto,
  NoteDto,
  PayableDto,
  ReceivableDto,
  SettlementDto,
} from './dto/financeiro.dto';
import { FinanceiroService } from './financeiro.service';
type AuthRequest = Request & { user: JwtPayload };
@Controller('financeiro')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceiroController {
  constructor(private readonly service: FinanceiroService) {}
  private actor(r: AuthRequest) {
    return { id: r.user.sub, nome: r.user.nome };
  }
  @Get('dashboard')
  @RequirePermissions('FINANCEIRO.VISAO_GERAL.VISUALIZAR')
  dashboard(@Query() q: FinanceQueryDto) {
    return this.service.dashboard(q);
  }
  @Get('receber')
  @RequirePermissions('FINANCEIRO.CONTAS_RECEBER.VISUALIZAR')
  receber(@Query() q: FinanceQueryDto) {
    return this.service.receivables(q);
  }
  @Post('receber')
  @RequirePermissions('FINANCEIRO.CONTAS_RECEBER.GERENCIAR')
  createReceber(@Body() b: ReceivableDto, @Req() r: AuthRequest) {
    return this.service.saveReceivable(null, b, this.actor(r));
  }
  @Patch('receber/:id')
  @RequirePermissions('FINANCEIRO.CONTAS_RECEBER.GERENCIAR')
  updateReceber(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: ReceivableDto,
    @Req() r: AuthRequest,
  ) {
    return this.service.saveReceivable(id, b, this.actor(r));
  }
  @Get('pagar') @RequirePermissions('FINANCEIRO.CONTAS_PAGAR.VISUALIZAR') pagar(
    @Query() q: FinanceQueryDto,
  ) {
    return this.service.payables(q);
  }
  @Post('pagar')
  @RequirePermissions('FINANCEIRO.CONTAS_PAGAR.GERENCIAR')
  createPagar(@Body() b: PayableDto, @Req() r: AuthRequest) {
    return this.service.savePayable(null, b, this.actor(r));
  }
  @Patch('pagar/:id')
  @RequirePermissions('FINANCEIRO.CONTAS_PAGAR.GERENCIAR')
  updatePagar(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: PayableDto,
    @Req() r: AuthRequest,
  ) {
    return this.service.savePayable(id, b, this.actor(r));
  }
  @Post('pagar/:id/baixar')
  @RequirePermissions('FINANCEIRO.CONTAS_PAGAR.GERENCIAR')
  settle(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: SettlementDto,
    @Req() r: AuthRequest,
  ) {
    return this.service.settlePayable(id, b, this.actor(r));
  }
  @Get('dre/contas')
  @RequirePermissions('FINANCEIRO.DRE.VISUALIZAR')
  dreAccounts() {
    return this.service.dreAccounts();
  }
  @Post('dre/contas') @RequirePermissions('FINANCEIRO.DRE.GERENCIAR') createDre(
    @Body() b: DreDto,
    @Req() r: AuthRequest,
  ) {
    return this.service.saveDre(null, b, this.actor(r));
  }
  @Patch('dre/contas/:id')
  @RequirePermissions('FINANCEIRO.DRE.GERENCIAR')
  updateDre(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: DreDto,
    @Req() r: AuthRequest,
  ) {
    return this.service.saveDre(id, b, this.actor(r));
  }
  @Get('dre') @RequirePermissions('FINANCEIRO.DRE.VISUALIZAR') dre(
    @Query() q: FinanceQueryDto,
  ) {
    return this.service.dre(q);
  }
  @Get('fluxo') @RequirePermissions('FINANCEIRO.FLUXO.VISUALIZAR') fluxo(
    @Query() q: FinanceQueryDto,
  ) {
    return this.service.cashFlow(q);
  }
  @Post('fluxo/saldos')
  @RequirePermissions('FINANCEIRO.FLUXO.GERENCIAR')
  balance(@Body() b: BalanceDto, @Req() r: AuthRequest) {
    return this.service.saveBalance(b, this.actor(r));
  }
  @Get('notas-recebidas')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.VISUALIZAR')
  notes(@Query() q: FinanceQueryDto) {
    return this.service.notes(q);
  }
  @Get('notas-recebidas/:id')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.VISUALIZAR')
  note(@Param('id', ParseIntPipe) id: number) {
    return this.service.note(id);
  }
  @Post('notas-recebidas')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR')
  createNote(@Body() b: NoteDto, @Req() r: AuthRequest) {
    return this.service.saveNote(null, b, this.actor(r));
  }
  @Patch('notas-recebidas/:id')
  @RequirePermissions('FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR')
  updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: NoteDto,
    @Req() r: AuthRequest,
  ) {
    return this.service.saveNote(id, b, this.actor(r));
  }
  @Post('notas-recebidas/:id/enviar-pagar')
  @RequirePermissions(
    'FINANCEIRO.NOTAS_RECEBIDAS.GERENCIAR',
    'FINANCEIRO.CONTAS_PAGAR.GERENCIAR',
  )
  sendPayable(@Param('id', ParseIntPipe) id: number, @Req() r: AuthRequest) {
    return this.service.sendNoteToPayables(id, this.actor(r));
  }
  @Get('importacoes')
  @RequirePermissions('FINANCEIRO.IMPORTACOES.VISUALIZAR')
  imports(@Query() q: FinanceQueryDto) {
    return this.service.imports(q);
  }
  @Delete(':kind/:id')
  @RequirePermissions('FINANCEIRO.ADMINISTRACAO.GERENCIAR')
  remove(
    @Param('kind') kind: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() r: AuthRequest,
  ) {
    return this.service.remove(kind, id, this.actor(r));
  }
}
