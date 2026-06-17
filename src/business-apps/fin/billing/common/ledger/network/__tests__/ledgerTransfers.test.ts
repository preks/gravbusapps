import { buildTransfers, ledgerBalanceRef } from '../ledgerAdminClient'
import { buildIssuedPosting, buildPaidPosting } from '../../utils/ledgerPostings'
import { DEFAULT_POSTING_ACCOUNTS } from '../../../constants'
import type { Invoice, PaymentAllocation } from '../../../invoices/types'

function makeInvoice(): Invoice {
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
    updatedAt: '2026-01-01T00:00:00Z'
  }
}

describe('ledgerBalanceRef', () => {
  it('maps a GL account code to a stable, named balance reference', () => {
    expect(ledgerBalanceRef('1400')).toBe('nw-gl-1400')
  })
})

describe('buildTransfers', () => {
  it('decomposes a multi-leg issued posting into matched transfers', () => {
    const posting = buildIssuedPosting(makeInvoice())
    const transfers = buildTransfers(posting)

    // 1 debit (AR) matched against 2 credits (revenue, tax) -> 2 transfers.
    expect(transfers).toHaveLength(2)

    const total = transfers.reduce((sum, transfer) => sum + transfer.amount, 0)
    expect(total).toBeCloseTo(119, 5)

    // Every transfer credits the accounts-receivable balance (the debit leg).
    const arRef = ledgerBalanceRef(DEFAULT_POSTING_ACCOUNTS.accountsReceivable)
    transfers.forEach(transfer => expect(transfer.destination).toBe(arRef))

    const sources = transfers.map(transfer => transfer.source).sort()
    expect(sources).toEqual(
      [ledgerBalanceRef(DEFAULT_POSTING_ACCOUNTS.revenue), ledgerBalanceRef(DEFAULT_POSTING_ACCOUNTS.taxPayable)].sort()
    )
  })

  it('decomposes a simple paid posting into a single transfer', () => {
    const payment: PaymentAllocation = {
      id: 'pay-1',
      invoiceId: 'inv-1',
      amount: 119,
      currency: 'EUR',
      method: 'BANK_TRANSFER',
      paymentDate: '2026-01-10T00:00:00Z'
    }
    const posting = buildPaidPosting(makeInvoice(), payment)
    const transfers = buildTransfers(posting)

    expect(transfers).toHaveLength(1)
    expect(transfers[0].amount).toBeCloseTo(119, 5)
    expect(transfers[0].destination).toBe(ledgerBalanceRef(DEFAULT_POSTING_ACCOUNTS.cashClearing))
    expect(transfers[0].source).toBe(ledgerBalanceRef(DEFAULT_POSTING_ACCOUNTS.accountsReceivable))
  })
})
