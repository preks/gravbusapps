/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { useBillingData } from '../useBillingData'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

const ledgerPost = jest.fn()

// Stable client reference so the load effect (keyed on the client) does not loop.
const fakeFlowClient = {
  getResource: jest.fn().mockRejectedValue(new Error('no backend')),
  post: jest.fn()
}

jest.mock('@/common/network/flows/useFlowClient', () => ({
  useFlowClient: () => fakeFlowClient
}))

jest.mock('../useLedgerService', () => ({
  useLedgerService: () => ({ post: ledgerPost })
}))

const context: BusinessAppContextProps = { accessToken: 'token' }

async function setup() {
  const hook = renderHook(() => useBillingData(context))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useBillingData lifecycle', () => {
  beforeEach(() => {
    ledgerPost.mockReset()
    let counter = 0
    ledgerPost.mockImplementation(async (request: { eventId: string }) => ({
      ledgerTransactionRef: `LX-${counter++}`,
      eventId: request.eventId,
      postedAt: '2026-05-01T00:00:00Z'
    }))
  })

  it('falls back to sample data when the backend is unavailable', async () => {
    const { result } = await setup()
    expect(result.current.usingSampleData).toBe(true)
    expect(result.current.invoices.length).toBeGreaterThan(0)
  })

  it('issues a draft: assigns a number, posts the issued event, sets ISSUED', async () => {
    const { result } = await setup()

    let assignedNumber = ''
    await act(async () => {
      assignedNumber = await result.current.issueInvoice('inv-1004')
    })

    expect(assignedNumber).toMatch(/^INV-\d{4}-\d{4}$/)
    const invoice = result.current.invoices.find(item => item.id === 'inv-1004')
    expect(invoice?.status).toBe('ISSUED')
    expect(invoice?.invoiceNumber).toBe(assignedNumber)
    expect(invoice?.ledgerLinks.some(link => link.eventType === 'INVOICE_ISSUED')).toBe(true)
    expect(ledgerPost).toHaveBeenCalledTimes(1)
  })

  it('records a full payment and derives PAID status', async () => {
    const { result } = await setup()

    await act(async () => {
      await result.current.issueInvoice('inv-1004')
    })
    await act(async () => {
      await result.current.recordPayment('inv-1004', {
        amount: 3600,
        currency: 'USD',
        method: 'BANK_TRANSFER',
        paymentDate: '2026-05-10T00:00:00Z'
      })
    })

    const invoice = result.current.invoices.find(item => item.id === 'inv-1004')
    expect(invoice?.paidAmount).toBe(3600)
    expect(invoice?.status).toBe('PAID')
    expect(invoice?.payments).toHaveLength(1)
  })

  it('cancels a draft without posting to the ledger', async () => {
    const { result } = await setup()

    await act(async () => {
      await result.current.cancelInvoice('inv-1004', 'Customer withdrew')
    })

    const invoice = result.current.invoices.find(item => item.id === 'inv-1004')
    expect(invoice?.status).toBe('CANCELLED')
    expect(ledgerPost).not.toHaveBeenCalled()
  })

  it('writes off an overdue invoice and posts the write-off', async () => {
    const { result } = await setup()

    await act(async () => {
      await result.current.writeOffInvoice('inv-1002')
    })

    const invoice = result.current.invoices.find(item => item.id === 'inv-1002')
    expect(invoice?.status).toBe('WRITTEN_OFF')
    expect(ledgerPost).toHaveBeenCalledTimes(1)
  })

  it('rejects an invalid transition (issuing an already paid invoice)', async () => {
    const { result } = await setup()
    await expect(
      act(async () => {
        await result.current.issueInvoice('inv-1001')
      })
    ).rejects.toThrow(/transition/i)
  })
})
