import { computeArAging } from '../arAging'
import type { Invoice } from '../../types'

function makeInvoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'inv',
    invoiceNumber: 'INV',
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

const now = new Date('2026-03-01T00:00:00Z')

function bucket(buckets: ReturnType<typeof computeArAging>, key: string) {
  return buckets.find(item => item.key === key)
}

describe('computeArAging', () => {
  it('buckets outstanding invoices by how overdue they are', () => {
    const invoices = [
      makeInvoice({ id: 'a', dueDate: '2026-03-15T00:00:00Z' }), // not yet due
      makeInvoice({ id: 'b', dueDate: '2026-02-20T00:00:00Z' }), // ~9 days
      makeInvoice({ id: 'c', dueDate: '2026-01-20T00:00:00Z' }), // ~40 days
      makeInvoice({ id: 'd', dueDate: '2025-11-01T00:00:00Z' }) // >90 days
    ]
    const buckets = computeArAging(invoices, now)

    expect(bucket(buckets, 'current')?.amount).toBe(100)
    expect(bucket(buckets, 'days1_30')?.amount).toBe(100)
    expect(bucket(buckets, 'days31_60')?.amount).toBe(100)
    expect(bucket(buckets, 'days90Plus')?.amount).toBe(100)
    expect(bucket(buckets, 'days61_90')?.amount).toBe(0)
  })

  it('excludes draft, cancelled, and fully-paid invoices', () => {
    const invoices = [
      makeInvoice({ id: 'draft', status: 'DRAFT', dueDate: '2026-01-01T00:00:00Z' }),
      makeInvoice({ id: 'cancelled', status: 'CANCELLED', dueDate: '2026-01-01T00:00:00Z' }),
      makeInvoice({ id: 'paid', paidAmount: 100, dueDate: '2026-01-01T00:00:00Z' })
    ]
    const buckets = computeArAging(invoices, now)
    const totalAmount = buckets.reduce((sum, item) => sum + item.amount, 0)
    const totalCount = buckets.reduce((sum, item) => sum + item.count, 0)
    expect(totalAmount).toBe(0)
    expect(totalCount).toBe(0)
  })

  it('sums partially paid outstanding amounts', () => {
    const buckets = computeArAging([makeInvoice({ paidAmount: 40, dueDate: '2026-02-20T00:00:00Z' })], now)
    expect(bucket(buckets, 'days1_30')?.amount).toBe(60)
    expect(bucket(buckets, 'days1_30')?.count).toBe(1)
  })
})
