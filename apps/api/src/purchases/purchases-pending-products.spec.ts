import { PurchasesOperationsService } from './purchases-operations.service';
describe('Purchases pending products', () => {
  it('prefixes spreadsheet formula cells', () => {
    const service = new PurchasesOperationsService({} as never);
    expect(
      (
        service as unknown as { safeSpreadsheetText(v: unknown): string }
      ).safeSpreadsheetText('=SUM(A1:A2)'),
    ).toBe('\t=SUM(A1:A2)');
  });
});
