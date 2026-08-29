import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { SalesOrdersImportController } from './sales-orders-import.controller';
import { SalesOrdersImportService } from './sales-orders-import.service';

@Module({
  imports: [PrismaModule],
  controllers: [SalesOrdersImportController],
  providers: [SalesOrdersImportService],
})
export class SalesOrdersImportModule {}
