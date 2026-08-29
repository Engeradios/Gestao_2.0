import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard, type JwtPayload } from '../auth/guards/jwt-auth.guard';
import { AppFieldTermsService } from './app-field-terms.service';

class AcceptTermDto {
  @IsOptional() @IsString() @Length(1, 30) dispositivoId?: string;
}
type AuthRequest = Request & { user: JwtPayload };

@Controller('app-campo/termos')
@UseGuards(JwtAuthGuard)
export class AppFieldTermsController {
  constructor(private readonly service: AppFieldTermsService) {}
  @Get('vigente') current() {
    return this.service.current();
  }
  @Get('status') status(@Req() req: AuthRequest) {
    return this.service.status(req.user.sub);
  }
  @Post(':id/aceitar') accept(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: AcceptTermDto,
  ) {
    return this.service.accept(
      req.user.sub,
      id,
      dto.dispositivoId,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
