import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshSessionService } from './refresh-session.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordService } from './password.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m' as const,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshSessionService,
    AuthTokenService,
    PasswordService,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [AuthTokenService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
