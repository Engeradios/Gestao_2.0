import { Module } from '@nestjs/common';
import { FinancialReceivedInvoicesController } from './financial-received-invoices.controller';
import { FinancialReceivedInvoicesService } from './financial-received-invoices.service';

@Module({
  controllers: [FinancialReceivedInvoicesController],
  providers: [FinancialReceivedInvoicesService],
  exports: [FinancialReceivedInvoicesService],
})
export class FinancialReceivedInvoicesModule {}
