import { BillingAuditReviewService } from './billing-audit-review.service';
describe('BillingAuditReviewService', () => {
  it('é construído com PrismaService', () => {
    expect(new BillingAuditReviewService({} as never)).toBeDefined();
  });
});
