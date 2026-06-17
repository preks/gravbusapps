import {
  buildEventId,
  buildIssuedPosting,
  buildPaidPosting,
  buildCancelledPosting,
  buildCreditNotePosting,
  buildWriteOffPosting,
  buildFxDifferencePosting,
  isPostingBalanced
} from '../ledgerPostings'
import type { Invoice, PaymentAllocation } from '../../../invoices/types'

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    status: 'ISSUED',
    legalEntityId: 'le-1',
    billingCustomerId: 'bc-1',
    currency: 'EUR',
    accountingCurrency: 'EUR',
    issueDate: '2026-01-01T00:00:00Z',
    dueDate: '2026-01-15T00:00:00Z',
    lines: [],
    totals: { netTotal: 100, taxTotal: 19, grossTotal: 119, roundingAdjustment: 0, taxSummary: [] },
    paidAmount: 0,
    ledgerLinks: [],
    payments: [],
    audit: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

const payment: PaymentAllocation = {
  id: 'pay-1',
  invoiceId: 'inv-1',
  amount: 119,
  currency: 'EUR',
  method: 'BANK_TRANSFER',
  paymentDate: '2026-01-10T00:00:00Z'
}

describe('buildEventId', () => {
  it('is deterministic per invoice and event (idempotency key)', () => {
    expect(buildEventId('inv-1', 'issued')).toBe('nw-billing:issued:inv-1')
    expect(buildEventId('inv-1', 'paid', 'pay-1')).toBe('nw-billing:paid:inv-1:pay-1')
    expect(buildEventId('inv-1', 'issued')).toBe(buildEventId('inv-1', 'issued'))
  })
})

describe('posting builders produce balanced double entries', () => {
  const invoice = makeInvoice()

  it('issued: debit AR, credit revenue + tax', () => {
    const posting = buildIssuedPosting(invoice)
    expect(posting.eventType).toBe('INVOICE_ISSUED')
    expect(isPostingBalanced(posting)).toBe(true)
    const ar = posting.entries.find(entry => entry.debit === 119)
    expect(ar).toBeDefined()
  })

  it('paid: debit cash, credit AR', () => {
    const posting = buildPaidPosting(invoice, payment)
    expect(isPostingBalanced(posting)).toBe(true)
    expect(posting.eventId).toBe('nw-billing:paid:inv-1:pay-1')
  })

  it('cancelled: reverses the issued posting', () => {
    const posting = buildCancelledPosting(invoice)
    expect(isPostingBalanced(posting)).toBe(true)
    expect(posting.eventType).toBe('INVOICE_CANCELLED')
  })

  it('credit note: reverses credited amounts', () => {
    const posting = buildCreditNotePosting(invoice, 50, 9.5, 'cn-1')
    expect(isPostingBalanced(posting)).toBe(true)
    expect(posting.eventId).toBe('nw-billing:credit:inv-1:cn-1')
  })

  it('write-off: debit bad debt, credit AR', () => {
    const posting = buildWriteOffPosting(invoice, 119)
    expect(isPostingBalanced(posting)).toBe(true)
    expect(posting.eventType).toBe('INVOICE_WRITTEN_OFF')
  })

  it('applies an FX rate to issued postings', () => {
    const usdInvoice = makeInvoice({ currency: 'USD', accountingCurrency: 'EUR' })
    const posting = buildIssuedPosting(usdInvoice, { fxRate: 0.9, accountingCurrency: 'EUR' })
    expect(posting.currency).toBe('EUR')
    expect(isPostingBalanced(posting)).toBe(true)
    expect(posting.entries.find(entry => entry.debit)?.debit).toBeCloseTo(107.1) // 119 * 0.9
  })
})

describe('buildFxDifferencePosting', () => {
  it('returns null for zero delta', () => {
    expect(buildFxDifferencePosting(makeInvoice(), 0)).toBeNull()
  })
  it('posts a balanced gain entry for positive delta', () => {
    const posting = buildFxDifferencePosting(makeInvoice(), 5)
    expect(posting).not.toBeNull()
    expect(isPostingBalanced(posting!)).toBe(true)
  })
})
