import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { ProfilesService } from './profiles.service';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('ferramentas/perfis')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @RequirePermissions('FERRAMENTAS.PERFIS.VISUALIZAR')
  list() {
    return this.profilesService.list();
  }

  @Get('permissoes')
  @RequirePermissions('FERRAMENTAS.PERFIS.VISUALIZAR')
  permissions() {
    return this.profilesService.permissions();
  }

  @Get(':id')
  @RequirePermissions('FERRAMENTAS.PERFIS.VISUALIZAR')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.profilesService.findOne(id);
  }

  @Post()
  @RequirePermissions('FERRAMENTAS.PERFIS.EDITAR')
  create(@Body() dto: CreateProfileDto, @Req() request: AuthenticatedRequest) {
    return this.profilesService.create(dto, this.audit(request));
  }

  @Patch(':id')
  @RequirePermissions('FERRAMENTAS.PERFIS.EDITAR')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.profilesService.update(id, dto, this.audit(request));
  }

  private audit(request: AuthenticatedRequest) {
    return {
      actorId: request.user.sub,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
