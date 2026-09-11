import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { DpRhService } from './dp-rh.service';
import {
  CadastroAuxiliarDto,
  CreateFuncionarioDto,
  DashboardQueryDto,
  DesligamentoDto,
  ListarFuncionariosDto,
  MovimentacaoDto,
  UpdateFuncionarioDto,
} from './dto/funcionario.dto';

@Controller('dp-rh')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DpRhController {
  constructor(private readonly service: DpRhService) {}

  @Get('dashboard')
  @RequirePermissions('DP_RH.DASHBOARD.VISUALIZAR')
  dashboard(@Query() query: DashboardQueryDto) {
    return this.service.dashboard(query);
  }

  @Get('funcionarios')
  @RequirePermissions('DP_RH.FUNCIONARIOS.VISUALIZAR')
  listarFuncionarios(@Query() filtros: ListarFuncionariosDto) {
    return this.service.listarFuncionarios(filtros);
  }

  @Get('funcionarios/:id')
  @RequirePermissions('DP_RH.FUNCIONARIOS.VISUALIZAR')
  obterFuncionario(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.obterFuncionario(id);
  }

  @Post('funcionarios')
  @RequirePermissions('DP_RH.FUNCIONARIOS.CRIAR')
  criarFuncionario(@Body() dto: CreateFuncionarioDto) {
    return this.service.criarFuncionario(dto);
  }

  @Put('funcionarios/:id')
  @RequirePermissions('DP_RH.FUNCIONARIOS.EDITAR')
  atualizarFuncionario(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFuncionarioDto,
  ) {
    return this.service.atualizarFuncionario(id, dto);
  }

  @Post('funcionarios/:id/desligamento')
  @RequirePermissions('DP_RH.FUNCIONARIOS.DESLIGAR')
  desligar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DesligamentoDto,
  ) {
    return this.service.registrarDesligamento(id, dto);
  }

  @Get('movimentacoes')
  @RequirePermissions('DP_RH.MOVIMENTACOES.VISUALIZAR')
  listarMovimentacoes(@Query('funcionarioId') funcionarioId?: string) {
    return this.service.listarMovimentacoes(funcionarioId);
  }

  @Post('movimentacoes')
  @RequirePermissions('DP_RH.MOVIMENTACOES.GERENCIAR')
  criarMovimentacao(@Body() dto: MovimentacaoDto) {
    return this.service.criarMovimentacao(dto);
  }

  @Get('cadastros/setores')
  @RequirePermissions('DP_RH.CADASTROS.VISUALIZAR')
  listarSetores() {
    return this.service.listarCadastro('setores');
  }

  @Post('cadastros/setores')
  @RequirePermissions('DP_RH.CADASTROS.GERENCIAR')
  criarSetor(@Body() dto: CadastroAuxiliarDto) {
    return this.service.criarCadastro('setores', dto);
  }

  @Put('cadastros/setores/:id')
  @RequirePermissions('DP_RH.CADASTROS.GERENCIAR')
  atualizarSetor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CadastroAuxiliarDto,
  ) {
    return this.service.atualizarCadastro('setores', id, dto);
  }

  @Get('cadastros/cargos')
  @RequirePermissions('DP_RH.CADASTROS.VISUALIZAR')
  listarCargos() {
    return this.service.listarCadastro('cargos');
  }

  @Post('cadastros/cargos')
  @RequirePermissions('DP_RH.CADASTROS.GERENCIAR')
  criarCargo(@Body() dto: CadastroAuxiliarDto) {
    return this.service.criarCadastro('cargos', dto);
  }

  @Put('cadastros/cargos/:id')
  @RequirePermissions('DP_RH.CADASTROS.GERENCIAR')
  atualizarCargo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CadastroAuxiliarDto,
  ) {
    return this.service.atualizarCadastro('cargos', id, dto);
  }

  @Get('cadastros/unidades')
  @RequirePermissions('DP_RH.CADASTROS.VISUALIZAR')
  listarUnidades() {
    return this.service.listarCadastro('unidades');
  }

  @Post('cadastros/unidades')
  @RequirePermissions('DP_RH.CADASTROS.GERENCIAR')
  criarUnidade(@Body() dto: CadastroAuxiliarDto) {
    return this.service.criarCadastro('unidades', dto);
  }

  @Put('cadastros/unidades/:id')
  @RequirePermissions('DP_RH.CADASTROS.GERENCIAR')
  atualizarUnidade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CadastroAuxiliarDto,
  ) {
    return this.service.atualizarCadastro('unidades', id, dto);
  }

  @Get('relatorios/funcionarios.csv')
  @RequirePermissions('DP_RH.RELATORIOS.EXPORTAR')
  async exportar(
    @Query() filtros: ListarFuncionariosDto,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportarFuncionarios(filtros);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="funcionarios.csv"',
    );
    res.send(csv);
  }
}
