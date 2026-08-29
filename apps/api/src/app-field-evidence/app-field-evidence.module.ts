import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AppFieldEvidenceController } from './app-field-evidence.controller';
import { AppFieldEvidenceService } from './app-field-evidence.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppFieldEvidenceController],
  providers: [AppFieldEvidenceService],
})
export class AppFieldEvidenceModule {}
