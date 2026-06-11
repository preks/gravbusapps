import { suggestMatches, findExceptions } from '../reconciliation'
import type { BankStatementLine, Invoice } from '../../types'

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

function makeLine(overrides: Partial<BankStatementLine> = {}): BankStatementLine {
  return {
    id: 'line-1',
    bookingDate: '2026-01-12T00:00:00Z',
    amount: 119,
    currency: 'EUR',
    counterparty: 'ACME',
    reference: 'Payment INV-2026-0001',
    ...overrides
  }
}

describe('suggestMatches', () => {
  it('returns high confidence for a reference + exact amount match', () => {
    const matches = suggestMatches([makeLine()], [makeInvoice()])
    expect(matches).toHaveLength(1)
    expect(matches[0].confidence).toBeCloseTo(1)
    expect(matches[0].matchedAmount).toBe(119)
    expect(matches[0].invoiceId).toBe('inv-1')
  })

  it('treats a smaller amount with no reference as a low-confidence partial match', () => {
    const matches = suggestMatches([makeLine({ amount: 50, reference: 'unrelated' })], [makeInvoice()])
    expect(matches).toHaveLength(1)
    expect(matches[0].confidence).toBeCloseTo(0.15)
    expect(matches[0].matchedAmount).toBe(50)
  })

  it('does not match across currencies', () => {
    const matches = suggestMatches([makeLine({ currency: 'USD' })], [makeInvoice()])
    expect(matches).toHaveLength(0)
  })

  it('skips already-reconciled lines and fully-paid invoices', () => {
    const reconciled = suggestMatches([makeLine({ matchedInvoiceId: 'inv-1' })], [makeInvoice()])
    expect(reconciled).toHaveLength(0)
    const paid = suggestMatches([makeLine()], [makeInvoice({ paidAmount: 119 })])
    expect(paid).toHaveLength(0)
  })

  it('picks the highest scoring invoice when several are candidates', () => {
    const matches = suggestMatches(
      [makeLine()],
      [makeInvoice({ id: 'inv-2', invoiceNumber: 'INV-2026-0002' }), makeInvoice()]
    )
    expect(matches[0].invoiceId).toBe('inv-1')
  })
})

describe('findExceptions', () => {
  it('returns lines without a suggested match', () => {
    const lines = [makeLine(), makeLine({ id: 'line-2', currency: 'USD' })]
    const matches = suggestMatches(lines, [makeInvoice()])
    const exceptions = findExceptions(lines, matches)
    expect(exceptions.map(line => line.id)).toEqual(['line-2'])
  })
})
