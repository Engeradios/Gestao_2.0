import { Module } from '@nestjs/common';
import { LogisticsProposalsController } from './logistics-proposals.controller';
import { LogisticsProposalsService } from './logistics-proposals.service';

@Module({
  controllers: [LogisticsProposalsController],
  providers: [LogisticsProposalsService],
})
export class LogisticsProposalsModule {}
