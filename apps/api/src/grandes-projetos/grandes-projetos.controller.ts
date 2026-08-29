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
  CostDto,
  MaterialDto,
  MilestoneDto,
  OrderDto,
  ProjectDto,
  ProjectQueryDto,
  ReportDto,
} from './dto/grandes-projetos.dto';
import { GrandesProjetosService } from './grandes-projetos.service';
type R = Request & { user?: JwtPayload };
@Controller('grandes-projetos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GrandesProjetosController {
  constructor(private readonly service: GrandesProjetosService) {}
  private actor(r: R) {
    return {
      id: r.user?.sub,
      nome: r.user?.nome || r.user?.email || 'sistema',
    };
  }
  @Get() @RequirePermissions('GRANDES_PROJETOS.PROJETOS.VISUALIZAR') list(
    @Query() q: ProjectQueryDto,
  ) {
    return this.service.list(q);
  }
  @Get('dashboard')
  @RequirePermissions('GRANDES_PROJETOS.PROJETOS.VISUALIZAR')
  dashboard() {
    return this.service.dashboard();
  }
  @Get('propostas/:numero')
  @RequirePermissions('GRANDES_PROJETOS.PROJETOS.VISUALIZAR')
  proposal(@Param('numero') n: string) {
    return this.service.proposal(n);
  }
  @Get(':id') @RequirePermissions('GRANDES_PROJETOS.PROJETOS.VISUALIZAR') one(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.one(id);
  }
  @Post() @RequirePermissions('GRANDES_PROJETOS.PROJETOS.GERENCIAR') create(
    @Body() b: ProjectDto,
    @Req() r: R,
  ) {
    return this.service.save(null, b, this.actor(r));
  }
  @Patch(':id')
  @RequirePermissions('GRANDES_PROJETOS.PROJETOS.GERENCIAR')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: ProjectDto,
    @Req() r: R,
  ) {
    return this.service.save(id, b, this.actor(r));
  }
  @Delete(':id')
  @RequirePermissions('GRANDES_PROJETOS.PROJETOS.EXCLUIR')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
    @Req() r: R,
  ) {
    return this.service.remove('project', id, this.actor(r), body?.motivo);
  }

  @Post(':id/restaurar')
  @RequirePermissions('GRANDES_PROJETOS.PROJETOS.RESTAURAR')
  restore(@Param('id', ParseIntPipe) id: number, @Req() r: R) {
    return this.service.restore(id, this.actor(r));
  }
  @Post(':id/custos')
  @RequirePermissions('GRANDES_PROJETOS.CUSTOS.GERENCIAR')
  cost(@Param('id', ParseIntPipe) id: number, @Body() b: CostDto, @Req() r: R) {
    return this.service.child('cost', id, b, this.actor(r));
  }
  @Delete(':id/custos/:child')
  @RequirePermissions('GRANDES_PROJETOS.CUSTOS.GERENCIAR')
  delCost(
    @Param('id', ParseIntPipe) id: number,
    @Param('child', ParseIntPipe) child: number,
    @Req() r: R,
  ) {
    return this.service.removeChild('cost', id, child, this.actor(r));
  }
  @Post(':id/materiais')
  @RequirePermissions('GRANDES_PROJETOS.MATERIAIS.GERENCIAR')
  material(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: MaterialDto,
    @Req() r: R,
  ) {
    return this.service.child('material', id, b, this.actor(r));
  }
  @Delete(':id/materiais/:child')
  @RequirePermissions('GRANDES_PROJETOS.MATERIAIS.GERENCIAR')
  delMaterial(
    @Param('id', ParseIntPipe) id: number,
    @Param('child', ParseIntPipe) child: number,
    @Req() r: R,
  ) {
    return this.service.removeChild('material', id, child, this.actor(r));
  }
  @Post(':id/os') @RequirePermissions('GRANDES_PROJETOS.OS.GERENCIAR') order(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: OrderDto,
    @Req() r: R,
  ) {
    return this.service.child('order', id, b, this.actor(r));
  }
  @Post(':id/os/importar-contrato')
  @RequirePermissions('GRANDES_PROJETOS.OS.GERENCIAR')
  importOrders(@Param('id', ParseIntPipe) id: number, @Req() r: R) {
    return this.service.importOrders(id, this.actor(r));
  }
  @Delete(':id/os/:child')
  @RequirePermissions('GRANDES_PROJETOS.OS.GERENCIAR')
  delOrder(
    @Param('id', ParseIntPipe) id: number,
    @Param('child', ParseIntPipe) child: number,
    @Req() r: R,
  ) {
    return this.service.removeChild('order', id, child, this.actor(r));
  }
  @Post(':id/marcos')
  @RequirePermissions('GRANDES_PROJETOS.MARCOS.GERENCIAR')
  milestone(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: MilestoneDto,
    @Req() r: R,
  ) {
    return this.service.child('milestone', id, b, this.actor(r));
  }
  @Delete(':id/marcos/:child')
  @RequirePermissions('GRANDES_PROJETOS.MARCOS.GERENCIAR')
  delMilestone(
    @Param('id', ParseIntPipe) id: number,
    @Param('child', ParseIntPipe) child: number,
    @Req() r: R,
  ) {
    return this.service.removeChild('milestone', id, child, this.actor(r));
  }
  @Post(':id/relatorios')
  @RequirePermissions('GRANDES_PROJETOS.RELATORIOS.GERENCIAR')
  report(
    @Param('id', ParseIntPipe) id: number,
    @Body() b: ReportDto,
    @Req() r: R,
  ) {
    return this.service.child('report', id, b, this.actor(r));
  }
  @Patch(':id/relatorios/:child')
  @RequirePermissions('GRANDES_PROJETOS.RELATORIOS.GERENCIAR')
  updReport(
    @Param('id', ParseIntPipe) id: number,
    @Param('child', ParseIntPipe) child: number,
    @Body() b: ReportDto,
    @Req() r: R,
  ) {
    return this.service.updateReport(id, child, b, this.actor(r));
  }
  @Delete(':id/relatorios/:child')
  @RequirePermissions('GRANDES_PROJETOS.RELATORIOS.GERENCIAR')
  delReport(
    @Param('id', ParseIntPipe) id: number,
    @Param('child', ParseIntPipe) child: number,
    @Req() r: R,
  ) {
    return this.service.removeChild('report', id, child, this.actor(r));
  }
}
