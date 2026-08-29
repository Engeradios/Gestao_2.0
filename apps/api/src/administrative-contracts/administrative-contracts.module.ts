import { Module } from '@nestjs/common';
import { BrasilApiService } from './brasil-api.service';
import { ContractDocumentsService } from './contract-documents.service';
import { AuthModule } from '../auth/auth.module';
import { AdministrativeContractsController } from './administrative-contracts.controller';
import { AdministrativeContractsService } from './administrative-contracts.service';

@Module({
  imports: [AuthModule],
  controllers: [AdministrativeContractsController],
  providers: [
    AdministrativeContractsService,
    BrasilApiService,
    ContractDocumentsService,
  ],
})
export class AdministrativeContractsModule {}
