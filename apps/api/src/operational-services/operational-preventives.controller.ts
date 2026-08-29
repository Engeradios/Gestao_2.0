import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { OperationalPreventivesService } from './operational-preventives.service';

@Controller('operacional/preventivas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OperationalPreventivesController {
  constructor(private readonly service: OperationalPreventivesService) {}

  @Get()
  @RequirePermissions('OPERACIONAL.PREVENTIVAS.VISUALIZAR')
  list(@Query() query: Record<string, string | undefined>) {
    return this.service.list(query);
  }

  @Get('indicadores')
  @RequirePermissions('OPERACIONAL.PREVENTIVAS.VISUALIZAR')
  indicators() {
    return this.service.indicators();
  }

  @Get(':id')
  @RequirePermissions('OPERACIONAL.PREVENTIVAS.VISUALIZAR')
  findOne(@Param('id') id: string) {
    return this.service.findOne(BigInt(id));
  }

  @Post()
  @RequirePermissions('OPERACIONAL.PREVENTIVAS.GERENCIAR')
  create(@Body() body: any) {
    return this.service.save(null, body);
  }

  @Patch(':id')
  @RequirePermissions('OPERACIONAL.PREVENTIVAS.GERENCIAR')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.save(BigInt(id), body);
  }

  @Delete(':id')
  @RequirePermissions('OPERACIONAL.PREVENTIVAS.GERENCIAR')
  remove(@Param('id') id: string) {
    return this.service.remove(BigInt(id));
  }
}
