import {
  getAuditActionLabel,
  getInvoiceStatusLabel,
  getLedgerEventLabel,
  getPaymentMethodLabel,
  getTransactionStatusLabel
} from '../billingLabels'

// Identity translator: returns the key, so helpers fall back to their defaults.
const tIdentity = (key: string) => key
// Dictionary translator: returns a real label for known keys.
const tDict =
  (dict: Record<string, string>) =>
  (key: string): string =>
    dict[key] ?? key

describe('billingLabels', () => {
  it('translates invoice status when a key exists', () => {
    const t = tDict({ 'billing-status-partially-paid': 'Partially paid' })
    expect(getInvoiceStatusLabel('PARTIALLY_PAID', t)).toBe('Partially paid')
  })

  it('falls back to the raw status when no translation is available', () => {
    expect(getInvoiceStatusLabel('DRAFT', tIdentity)).toBe('DRAFT')
  })

  it('translates payment methods', () => {
    const t = tDict({ 'billing-payment-method-bank-transfer': 'Bank transfer' })
    expect(getPaymentMethodLabel('BANK_TRANSFER', t)).toBe('Bank transfer')
  })

  it('translates ledger event types', () => {
    const t = tDict({ 'billing-event-issued': 'Issued' })
    expect(getLedgerEventLabel('INVOICE_ISSUED', t)).toBe('Issued')
  })

  it('humanizes audit actions with a fallback', () => {
    expect(getAuditActionLabel('written_off', tIdentity)).toBe('written_off')
    const t = tDict({ 'billing-audit-payment': 'Payment recorded' })
    expect(getAuditActionLabel('payment', t)).toBe('Payment recorded')
  })

  it('title-cases unknown transaction statuses', () => {
    expect(getTransactionStatusLabel('APPLIED', tIdentity)).toBe('Applied')
    expect(getTransactionStatusLabel('IN_FLIGHT', tIdentity)).toBe('In Flight')
    expect(getTransactionStatusLabel(undefined, tIdentity)).toBe('—')
  })

  it('prefers a translation for transaction status when present', () => {
    const t = tDict({ 'billing-tx-status-applied': 'Settled' })
    expect(getTransactionStatusLabel('APPLIED', t)).toBe('Settled')
  })
})
