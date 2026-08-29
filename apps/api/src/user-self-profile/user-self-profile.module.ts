import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma.service';
import { UserSelfProfileController } from './user-self-profile.controller';
import { UserSelfProfileService } from './user-self-profile.service';
@Module({
  imports: [AuthModule],
  controllers: [UserSelfProfileController],
  providers: [PrismaService, UserSelfProfileService],
})
export class UserSelfProfileModule {}
