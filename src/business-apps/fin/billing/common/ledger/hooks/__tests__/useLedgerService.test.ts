/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react'
import { useLedgerService } from '../useLedgerService'
import { buildIssuedPosting } from '../../utils/ledgerPostings'
import type { LedgerPostingRequest } from '../../../queries/billingCoreApi'
import type { Invoice } from '../../../invoices/types'

const postLedgerTransactionMock = jest.fn()
const ledgerAdminEnabledMock = jest.fn()

jest.mock('../../network/ledgerAdminClient', () => ({
  ledgerAdminEnabled: () => ledgerAdminEnabledMock(),
  postLedgerTransaction: (...args: unknown[]) => postLedgerTransactionMock(...args)
}))

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

describe('useLedgerService', () => {
  beforeEach(() => {
    postLedgerTransactionMock.mockReset()
    ledgerAdminEnabledMock.mockReset()
    ledgerAdminEnabledMock.mockReturnValue(true)
    postLedgerTransactionMock.mockResolvedValue({
      ledgerTransactionRef: 'ledger-ref-1',
      transactionIds: ['ledger-ref-1'],
      postedAt: '2026-01-01T00:00:00Z'
    })
  })

  it('posts to the BLNK ledger lane when enabled', async () => {
    const { result } = renderHook(() => useLedgerService({ accessToken: 'token' }))
    const request = buildIssuedPosting(makeInvoice())
    const response = await result.current.post(request)

    expect(response.ledgerTransactionRef).toBe('ledger-ref-1')
    expect(postLedgerTransactionMock).toHaveBeenCalledTimes(1)
    expect(postLedgerTransactionMock).toHaveBeenCalledWith('token', request)
  })

  it('falls back to a synthetic ref when the lane is disabled', async () => {
    ledgerAdminEnabledMock.mockReturnValue(false)
    const { result } = renderHook(() => useLedgerService({ accessToken: 'token' }))
    const request = buildIssuedPosting(makeInvoice())
    const response = await result.current.post(request)

    expect(response.ledgerTransactionRef).toBe(`local:${request.eventId}`)
    expect(postLedgerTransactionMock).not.toHaveBeenCalled()
  })

  it('fails live postings when the configured lane throws', async () => {
    postLedgerTransactionMock.mockRejectedValue(new Error('no balances'))
    const { result } = renderHook(() => useLedgerService({ accessToken: 'token' }))
    const request = buildIssuedPosting(makeInvoice())

    await expect(result.current.post(request)).rejects.toThrow('no balances')
  })

  it('dedupes retries with the same eventId (idempotent)', async () => {
    const { result } = renderHook(() => useLedgerService({ accessToken: 'token' }))
    const request = buildIssuedPosting(makeInvoice())

    const first = await result.current.post(request)
    const second = await result.current.post(request)

    expect(postLedgerTransactionMock).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('refuses to post an unbalanced transaction', async () => {
    const { result } = renderHook(() => useLedgerService({ accessToken: 'token' }))
    const unbalanced: LedgerPostingRequest = {
      eventType: 'INVOICE_ISSUED',
      eventId: 'nw-billing:issued:bad',
      currency: 'EUR',
      reference: 'INV',
      postingDate: '2026-01-01T00:00:00Z',
      entries: [{ accountCode: '1400', debit: 119 }]
    }
    await expect(result.current.post(unbalanced)).rejects.toThrow(/unbalanced/i)
    expect(postLedgerTransactionMock).not.toHaveBeenCalled()
  })

  it('throws without an access token', async () => {
    const { result } = renderHook(() => useLedgerService({ accessToken: '' }))
    await expect(result.current.post(buildIssuedPosting(makeInvoice()))).rejects.toThrow(/access token/i)
  })
})
