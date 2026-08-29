import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RefreshSessionService } from './refresh-session.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokenService } from './auth-token.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PasswordService } from './password.service';
import { JwtAuthGuard, JwtPayload } from './guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('auth')
// FASE5B_R3_REFRESH
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshSessionService: RefreshSessionService,
    private readonly authTokenService: AuthTokenService,
    private readonly passwordService: PasswordService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    const result = await this.authService.login(
      dto,
      request.ip,
      request.headers['user-agent'],
    );
    const refreshToken = await this.refreshSessionService.issue(
      result.usuario.id,
      request.ip,
      request.headers['user-agent'],
    );
    return { ...result, refreshToken };
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.refreshSessionService.rotate(
      dto.refreshToken,
      request.ip,
      request.headers['user-agent'],
    );
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.refreshSessionService.revoke(dto.refreshToken);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    return this.authTokenService.requestRecovery(
      dto.email,
      request.ip,
      request.headers['user-agent'],
    );
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request) {
    return this.authTokenService.resetPassword(
      dto,
      request.ip,
      request.headers['user-agent'],
    );
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.passwordService.change(
      request.user.sub,
      dto,
      request.ip,
      request.headers['user-agent'],
    );
  }

  @Get('access-history')
  @UseGuards(JwtAuthGuard)
  accessHistory(@Req() request: AuthenticatedRequest) {
    return this.authService.accessHistory(request.user.sub);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
