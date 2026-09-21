import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express'; import { RequirePermissions } from '../auth/decorators/permissions.decorator'; import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard'; import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GpDeleteDto,GpPageDto,GpRiskDto,GpTeamDto,GpVisitDto } from './dto/gp-governanca.dto'; import { GrandesProjetosGovernancaService as S } from './grandes-projetos-governanca.service';
type R=Request&{user?:JwtPayload};
@Controller('grandes-projetos') @UseGuards(JwtAuthGuard,PermissionsGuard) export class GrandesProjetosGovernancaController { constructor(private readonly s:S){} private a(r:R){return{id:r.user?.sub,nome:r.user?.nome||r.user?.email||'sistema'}} private b(v:string){if(!/^\d+$/.test(v)) throw new Error('ID inválido'); return BigInt(v)}
 @Get(':id/visitas') @RequirePermissions('GRANDES_PROJETOS.VISITAS.VISUALIZAR') lv(@Param('id',ParseIntPipe)id:number,@Query()q:GpPageDto){return this.s.list('visit',id,q)}
 @Post(':id/visitas') @RequirePermissions('GRANDES_PROJETOS.VISITAS.GERENCIAR') cv(@Param('id',ParseIntPipe)id:number,@Body()b:GpVisitDto,@Req()r:R){return this.s.save('visit',id,null,b,this.a(r))}
 @Patch(':id/visitas/:child') @RequirePermissions('GRANDES_PROJETOS.VISITAS.GERENCIAR') uv(@Param('id',ParseIntPipe)id:number,@Param('child')c:string,@Body()b:GpVisitDto,@Req()r:R){return this.s.save('visit',id,this.b(c),b,this.a(r))}
 @Delete(':id/visitas/:child') @RequirePermissions('GRANDES_PROJETOS.VISITAS.GERENCIAR') dv(@Param('id',ParseIntPipe)id:number,@Param('child')c:string,@Body()b:GpDeleteDto,@Req()r:R){return this.s.remove('visit',id,this.b(c),b.versao,b.motivo,this.a(r))}
 @Get(':id/equipe') @RequirePermissions('GRANDES_PROJETOS.EQUIPE.VISUALIZAR') le(@Param('id',ParseIntPipe)id:number,@Query()q:GpPageDto){return this.s.list('team',id,q)}
 @Post(':id/equipe') @RequirePermissions('GRANDES_PROJETOS.EQUIPE.GERENCIAR') ce(@Param('id',ParseIntPipe)id:number,@Body()b:GpTeamDto,@Req()r:R){return this.s.save('team',id,null,b,this.a(r))}
 @Patch(':id/equipe/:child') @RequirePermissions('GRANDES_PROJETOS.EQUIPE.GERENCIAR') ue(@Param('id',ParseIntPipe)id:number,@Param('child')c:string,@Body()b:GpTeamDto,@Req()r:R){return this.s.save('team',id,this.b(c),b,this.a(r))}
 @Delete(':id/equipe/:child') @RequirePermissions('GRANDES_PROJETOS.EQUIPE.GERENCIAR') de(@Param('id',ParseIntPipe)id:number,@Param('child')c:string,@Body()b:GpDeleteDto,@Req()r:R){return this.s.remove('team',id,this.b(c),b.versao,b.motivo,this.a(r))}
 @Get(':id/riscos') @RequirePermissions('GRANDES_PROJETOS.RISCOS.VISUALIZAR') lr(@Param('id',ParseIntPipe)id:number,@Query()q:GpPageDto){return this.s.list('risk',id,q)}
 @Post(':id/riscos') @RequirePermissions('GRANDES_PROJETOS.RISCOS.GERENCIAR') cr(@Param('id',ParseIntPipe)id:number,@Body()b:GpRiskDto,@Req()r:R){return this.s.save('risk',id,null,b,this.a(r))}
 @Patch(':id/riscos/:child') @RequirePermissions('GRANDES_PROJETOS.RISCOS.GERENCIAR') ur(@Param('id',ParseIntPipe)id:number,@Param('child')c:string,@Body()b:GpRiskDto,@Req()r:R){return this.s.save('risk',id,this.b(c),b,this.a(r))}
 @Delete(':id/riscos/:child') @RequirePermissions('GRANDES_PROJETOS.RISCOS.GERENCIAR') dr(@Param('id',ParseIntPipe)id:number,@Param('child')c:string,@Body()b:GpDeleteDto,@Req()r:R){return this.s.remove('risk',id,this.b(c),b.versao,b.motivo,this.a(r))}
}
