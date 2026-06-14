import {
  canTransition,
  assertTransition,
  derivePaymentStatus,
  getInvoiceDisplayStatus,
  isOverdue,
  getInvoiceStatusBadgeVariant
} from '../invoiceStatus'
import type { Invoice, InvoiceDisplayStatus } from '../../types'

function makeInvoice(overrides: Partial<Invoice>): Invoice {
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
    totals: { netTotal: 100, taxTotal: 0, grossTotal: 100, roundingAdjustment: 0, taxSummary: [] },
    paidAmount: 0,
    ledgerLinks: [],
    payments: [],
    audit: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

describe('transitions', () => {
  it('allows valid transitions', () => {
    expect(canTransition('DRAFT', 'ISSUED')).toBe(true)
    expect(canTransition('ISSUED', 'PAID')).toBe(true)
    expect(canTransition('PARTIALLY_PAID', 'WRITTEN_OFF')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(canTransition('PAID', 'DRAFT')).toBe(false)
    expect(canTransition('CANCELLED', 'ISSUED')).toBe(false)
  })

  it('throws on assertTransition for invalid moves', () => {
    expect(() => assertTransition('PAID', 'ISSUED')).toThrow()
    expect(() => assertTransition('DRAFT', 'ISSUED')).not.toThrow()
  })
})

describe('derivePaymentStatus', () => {
  const now = new Date('2026-01-10T00:00:00Z')

  it('keeps an unpaid not-yet-due invoice as ISSUED', () => {
    const invoice = makeInvoice({ status: 'ISSUED', paidAmount: 0 })
    expect(derivePaymentStatus(invoice)).toBe('ISSUED')
  })

  it('returns PARTIALLY_PAID when partially settled and not overdue', () => {
    const invoice = makeInvoice({ status: 'ISSUED', paidAmount: 40 })
    expect(derivePaymentStatus(invoice)).toBe('PARTIALLY_PAID')
  })

  it('returns PAID when fully settled', () => {
    const invoice = makeInvoice({ status: 'ISSUED', paidAmount: 100 })
    expect(derivePaymentStatus(invoice)).toBe('PAID')
  })

  it('keeps backend status when past due and unpaid', () => {
    const invoice = makeInvoice({ status: 'ISSUED', paidAmount: 0, dueDate: '2026-01-05T00:00:00Z' })
    expect(derivePaymentStatus(invoice)).toBe('ISSUED')
    expect(getInvoiceDisplayStatus(invoice, now)).toBe('OVERDUE')
  })

  it('does not change DRAFT or CANCELLED', () => {
    expect(derivePaymentStatus(makeInvoice({ status: 'DRAFT' }))).toBe('DRAFT')
    expect(derivePaymentStatus(makeInvoice({ status: 'CANCELLED' }))).toBe('CANCELLED')
  })
})

describe('isOverdue', () => {
  it('is false without a due date', () => {
    expect(isOverdue(makeInvoice({ dueDate: null }), new Date('2026-02-01T00:00:00Z'))).toBe(false)
  })
  it('is true when outstanding and past due', () => {
    expect(isOverdue(makeInvoice({ paidAmount: 0 }), new Date('2026-02-01T00:00:00Z'))).toBe(true)
  })
  it('is false for terminal invoices', () => {
    expect(isOverdue(makeInvoice({ status: 'CANCELLED' }), new Date('2026-02-01T00:00:00Z'))).toBe(false)
    expect(isOverdue(makeInvoice({ status: 'WRITTEN_OFF' }), new Date('2026-02-01T00:00:00Z'))).toBe(false)
  })
})

describe('getInvoiceStatusBadgeVariant', () => {
  it('maps statuses to variants', () => {
    const cases: Array<[InvoiceDisplayStatus, string]> = [
      ['PAID', 'paid'],
      ['OVERDUE', 'overdue'],
      ['DRAFT', 'secondary'],
      ['CANCELLED', 'destructive'],
      ['WRITTEN_OFF', 'warning']
    ]
    cases.forEach(([status, variant]) => expect(getInvoiceStatusBadgeVariant(status)).toBe(variant))
  })
})
