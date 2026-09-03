import { BillingAuditService } from './billing-audit.service';
describe('BillingAuditService', () => {
  it('é construído com PrismaService', () => {
    expect(new BillingAuditService({} as never)).toBeDefined();
  });
});
