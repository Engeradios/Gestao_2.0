import { Module } from '@nestjs/common';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalsImportController } from './proposals-import.controller';
import { ProposalsImportService } from './proposals-import.service';
import { ProposalsPreviewController } from './proposals-preview.controller';
import { ProposalsPreviewService } from './proposals-preview.service';

@Module({
  controllers: [
    ProposalsPreviewController,
    ProposalsController,
    ProposalsImportController,
  ],
  providers: [
    ProposalsPreviewService,
    ProposalsService,
    ProposalsImportService,
  ],
  exports: [ProposalsService],
})
export class ProposalsModule {}
