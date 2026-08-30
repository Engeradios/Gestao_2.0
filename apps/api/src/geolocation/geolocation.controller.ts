import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ReportQueryDto, TeamQueryDto, TrackQueryDto } from './dto/geolocation.dto';
import { GeolocationService } from './geolocation.service';

type AuthenticatedRequest = Request & { user: JwtPayload };

/**
 * Painel de geolocalizacao da equipe em campo (exclusivo do sistema web).
 * Permissao exigida: APP_CAMPO.LOCALIZACAO.VISUALIZAR
 */
@Controller('geolocalizacao')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GeolocationController {
  constructor(private readonly service: GeolocationService) {}

  private contexto(request: AuthenticatedRequest) {
    const payload = request.user as unknown as Record<string, unknown>;
    const id = payload?.sub ?? payload?.id ?? payload?.usuarioId ?? '';
    return {
      consultorId: String(id),
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    };
  }

  /** Ultima posicao de cada usuario com telemetria na janela informada. */
  @Get('equipe')
  @RequirePermissions('APP_CAMPO.LOCALIZACAO.VISUALIZAR')
  async equipe(
    @Query() query: TeamQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const ctx = this.contexto(request);
    return this.service.equipe({
      consultorId: ctx.consultorId,
      horas: query.horas ?? 12,
      somenteAtivos: query.somenteAtivos === 'true',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  /** Jornadas consolidadas para o relatório. */
  @Get('relatorio')
  @RequirePermissions('APP_CAMPO.LOCALIZACAO.VISUALIZAR')
  relatorio(@Query() query: ReportQueryDto, @Req() request: AuthenticatedRequest) {
    const ctx = this.contexto(request);
    return this.service.relatorio({ ...query, consultorId: ctx.consultorId, ip: ctx.ip, userAgent: ctx.userAgent, pagina: query.pagina ?? 1, limite: query.limite ?? 25 });
  }

  /** Percurso completo de um expediente. */
  @Get('trilha/:expedienteId')
  @RequirePermissions('APP_CAMPO.LOCALIZACAO.VISUALIZAR')
  async trilha(
    @Param('expedienteId') expedienteId: string,
    @Query() query: TrackQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const ctx = this.contexto(request);
    return this.service.trilha({
      consultorId: ctx.consultorId,
      expedienteId,
      limite: query.limite ?? 1000,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}
