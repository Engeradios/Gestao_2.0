import { PurchasesOperationsService } from './purchases-operations.service';
import { PurchasesOperationsController } from './purchases-operations.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PurchasesImportController } from './purchases-import.controller';
import { PurchasesImportService } from './purchases-import.service';

@Module({
  imports: [AuthModule],
  controllers: [PurchasesImportController, PurchasesOperationsController],
  providers: [PurchasesImportService, PurchasesOperationsService],
})
export class PurchasesModule {}
