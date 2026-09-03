import { Module } from '@nestjs/common';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalsImportController } from './proposals-import.controller';
import { ProposalsImportService } from './proposals-import.service';
import { ProposalsPreviewController } from './proposals-preview.controller';
import { ProposalsPreviewService } from './proposals-preview.service';
import { BillingAuditController } from './billing-audit/billing-audit.controller';
import { BillingAuditService } from './billing-audit/billing-audit.service';
import { BillingAuditReviewController } from './billing-audit/billing-audit-review.controller';
import { BillingAuditReviewService } from './billing-audit/billing-audit-review.service';

@Module({
  controllers: [
    BillingAuditReviewController,
    BillingAuditController,
    ProposalsPreviewController,
    ProposalsController,
    ProposalsImportController,
  ],
  providers: [
    BillingAuditReviewService,
    BillingAuditService,
    ProposalsPreviewService,
    ProposalsService,
    ProposalsImportService,
  ],
  exports: [ProposalsService],
})
export class ProposalsModule {}
