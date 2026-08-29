import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';

@Module({
  imports: [AuthModule],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataService],
  exports: [ReferenceDataService],
})
export class ReferenceDataModule {}
