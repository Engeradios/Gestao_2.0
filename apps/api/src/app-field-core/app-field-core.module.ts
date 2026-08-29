import { AppFieldTermsService } from './app-field-terms.service';
import { AppFieldTermsController } from './app-field-terms.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AppFieldCoreController } from './app-field-core.controller';
import { AppFieldCoreService } from './app-field-core.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppFieldCoreController, AppFieldTermsController],
  providers: [AppFieldCoreService, AppFieldTermsService],
})
export class AppFieldCoreModule {}
