import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { JwtAuthGuard, type JwtPayload } from '../auth/guards/jwt-auth.guard';
import { UserSelfProfileService } from './user-self-profile.service';
type AuthRequest = Request & { user: JwtPayload };
@Controller('usuarios/me/perfil')
@UseGuards(JwtAuthGuard)
export class UserSelfProfileController {
  constructor(private readonly service: UserSelfProfileService) {}
  @Get() get(@Req() req: AuthRequest) {
    return this.service.profile(req.user.sub);
  }
  @Patch() update(
    @Req() req: AuthRequest,
    @Body() body: { nome?: string; email?: string },
  ) {
    return this.service.update(req.user.sub, body);
  }
  @Post('photo')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  upload(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File) {
    return this.service.savePhoto(req.user.sub, file);
  }
  @Get('photo') async photo(@Req() req: AuthRequest) {
    const f = await this.service.photo(req.user.sub);
    return new StreamableFile(f.stream, {
      type: f.type,
      disposition: `inline; filename="${f.name.replace(/["\r\n]/g, '')}"`,
    });
  }
  @Delete('photo') remove(@Req() req: AuthRequest) {
    return this.service.removePhoto(req.user.sub);
  }
}
