/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { useBillingData } from '../useBillingData'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SAMPLE_SETTINGS } from '../../../data/sampleBillingData'
import type { Invoice, InvoiceStatus } from '../../types'

const ledgerPost = jest.fn()
const mockListInvoices = jest.fn()
const mockCreateInvoice = jest.fn()
const mockIssueInvoice = jest.fn()
const mockRecordInvoicePayment = jest.fn()
const mockCancelInvoice = jest.fn()
const mockWriteOffInvoice = jest.fn()
const mockUpdateInvoice = jest.fn()
const mockGetFinanceSettings = jest.fn()

// Stable client reference so the load effect (keyed on the client) does not loop.
const fakeFlowClient = {
  getResource: jest.fn().mockRejectedValue(new Error('no backend')),
  post: jest.fn()
}

jest.mock('@/common/network/flows/useFlowClient', () => ({
  useFlowClient: () => fakeFlowClient
}))

jest.mock('.../../../ledger/hooks/useLedgerService', () => ({
  useLedgerService: () => ({ post: ledgerPost })
}))

jest.mock('../../network/invoiceClient', () => ({
  billingApiEnabled: () => true,
  listInvoices: (...args: unknown[]) => mockListInvoices(...args),
  createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
  issueInvoice: (...args: unknown[]) => mockIssueInvoice(...args),
  recordInvoicePayment: (...args: unknown[]) => mockRecordInvoicePayment(...args),
  cancelInvoice: (...args: unknown[]) => mockCancelInvoice(...args),
  writeOffInvoice: (...args: unknown[]) => mockWriteOffInvoice(...args),
  updateInvoice: (...args: unknown[]) => mockUpdateInvoice(...args)
}))

jest.mock('../../../settings/network/financeSettingsClient', () => ({
  getFinanceSettings: (...args: unknown[]) => mockGetFinanceSettings(...args)
}))

const context: BusinessAppContextProps = { accessToken: 'token' }

const now = '2026-05-01T00:00:00.000Z'

function makeInvoice(id: string, status: InvoiceStatus, paidAmount = 0): Invoice {
  return {
    id,
    invoiceNumber: status === 'DRAFT' ? null : `INV-${id}`,
    status,
    legalEntityId: SAMPLE_SETTINGS.legalEntities[0].id,
    billingCustomerId: 'customer-1',
    customerName: 'Customer 1',
    crmAccountId: 'account-1',
    crmOpportunityId: null,
    currency: 'USD',
    accountingCurrency: 'USD',
    fxRate: null,
    issueDate: status === 'DRAFT' ? null : now,
    dueDate: '2026-04-01T00:00:00.000Z',
    paymentTermId: null,
    lines: [
      {
        id: `${id}-line-1`,
        description: 'Service',
        quantity: 1,
        unitPrice: 3600,
        discountPercent: 0,
        taxCategoryId: SAMPLE_SETTINGS.taxCategories[0].id,
        taxRatePercent: 0,
        netAmount: 3600,
        taxAmount: 0,
        grossAmount: 3600
      }
    ],
    totals: {
      netTotal: 3600,
      taxTotal: 0,
      grossTotal: 3600,
      roundingAdjustment: 0,
      taxSummary: []
    },
    paidAmount,
    notes: null,
    locale: 'en-US',
    ledgerLinks: [],
    payments: [],
    audit: [{ id: `${id}-audit-1`, action: 'created', timestamp: now }],
    createdAt: now,
    updatedAt: now
  }
}

function invoicesFixture(): Invoice[] {
  return [
    makeInvoice('inv-1001', 'PAID', 3600),
    makeInvoice('inv-1002', 'PARTIALLY_PAID', 1000),
    makeInvoice('inv-1004', 'DRAFT')
  ]
}

async function setup() {
  const hook = renderHook(() => useBillingData(context))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useBillingData lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ledgerPost.mockReset()
    let counter = 0
    ledgerPost.mockImplementation(async (request: { eventId: string }) => ({
      ledgerTransactionRef: `LX-${counter++}`,
      eventId: request.eventId,
      postedAt: '2026-05-01T00:00:00Z'
    }))
    mockListInvoices.mockResolvedValue(invoicesFixture())
    mockGetFinanceSettings.mockResolvedValue(SAMPLE_SETTINGS)
    mockIssueInvoice.mockResolvedValue({
      ...makeInvoice('inv-1004', 'ISSUED'),
      invoiceNumber: 'INV-2026-0004',
      issueDate: '2026-05-01T00:00:00.000Z'
    })
    mockRecordInvoicePayment.mockResolvedValue(undefined)
    mockCancelInvoice.mockResolvedValue(undefined)
    mockWriteOffInvoice.mockResolvedValue(undefined)
    mockUpdateInvoice.mockResolvedValue(undefined)
    mockCreateInvoice.mockResolvedValue(undefined)
  })

  it('shows an error with empty data when the backend is unavailable', async () => {
    mockListInvoices.mockRejectedValueOnce(new Error('no backend'))
    const { result } = await setup()
    expect(result.current.usingSampleData).toBe(false)
    expect(result.current.invoices).toEqual([])
    expect(result.current.error).toBe('no backend')
  })

  it('issues a draft directly without creating a ledger posting', async () => {
    const { result } = await setup()

    let assignedNumber = ''
    await act(async () => {
      assignedNumber = await result.current.issueInvoice('inv-1004')
    })

    expect(assignedNumber).toBe('INV-2026-0004')
    const invoice = result.current.invoices.find(item => item.id === 'inv-1004')
    expect(invoice?.status).toBe('ISSUED')
    expect(invoice?.invoiceNumber).toBe(assignedNumber)
    expect(mockIssueInvoice).toHaveBeenCalledTimes(1)
    expect(mockIssueInvoice.mock.calls[0]?.[2]).not.toHaveProperty('ledgerTransactionRef')
    expect(ledgerPost).not.toHaveBeenCalled()
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
        paymentDate: '2026-05-10T00:00:00Z',
        externalReference: 'BANK-STMT-2026-00045',
        ledgerTransactionRef: 'txn_existing_123'
      })
    })

    const invoice = result.current.invoices.find(item => item.id === 'inv-1004')
    expect(invoice?.paidAmount).toBe(3600)
    expect(invoice?.status).toBe('PAID')
    expect(invoice?.payments).toHaveLength(1)
    expect(ledgerPost).not.toHaveBeenCalled()
    expect(mockRecordInvoicePayment).toHaveBeenCalledWith(
      'token',
      'inv-1004',
      expect.objectContaining({
        idempotencyKey: 'invoice-payment-inv-1004-txn_existing_123',
        amount: 3600,
        currency: 'USD',
        method: 'BANK_TRANSFER',
        reference: 'BANK-STMT-2026-00045',
        ledgerTransactionRef: 'txn_existing_123',
        paidAt: '2026-05-10T00:00:00Z'
      })
    )
  })

  it('cancels a draft without posting to the ledger', async () => {
    const { result } = await setup()

    await act(async () => {
      await result.current.cancelInvoice('inv-1004', 'Customer withdrew')
    })

    const invoice = result.current.invoices.find(item => item.id === 'inv-1004')
    expect(invoice?.status).toBe('CANCELLED')
    expect(ledgerPost).not.toHaveBeenCalled()
    expect(mockCancelInvoice).toHaveBeenCalledWith(
      'token',
      'inv-1004',
      expect.objectContaining({
        idempotencyKey: 'cancel-inv-1004',
        reason: 'Customer withdrew'
      })
    )
    expect(mockCancelInvoice.mock.calls[0]?.[2]).not.toHaveProperty('ledgerTransactionRef')
  })

  it('blocks cancelling a partially paid invoice in the frontend', async () => {
    const { result } = await setup()

    await expect(
      act(async () => {
        await result.current.cancelInvoice('inv-1002', 'Customer requested cancellation')
      })
    ).rejects.toThrow(/transition/i)

    const invoice = result.current.invoices.find(item => item.id === 'inv-1002')
    expect(invoice?.status).toBe('PARTIALLY_PAID')
    expect(invoice?.paidAmount).toBe(1000)
    expect(ledgerPost).not.toHaveBeenCalled()
    expect(mockCancelInvoice).not.toHaveBeenCalled()
  })

  it('writes off an overdue invoice without posting to the ledger', async () => {
    const { result } = await setup()

    await act(async () => {
      await result.current.writeOffInvoice('inv-1002', {
        reason: 'Customer is insolvent; remaining balance approved for write-off',
        idempotencyKey: 'writeoff-inv-1002-user-123-2026-06-18T10:19:00Z'
      })
    })

    const invoice = result.current.invoices.find(item => item.id === 'inv-1002')
    expect(invoice?.status).toBe('WRITTEN_OFF')
    expect(invoice?.paidAmount).toBe(1000)
    expect(ledgerPost).not.toHaveBeenCalled()
    expect(mockWriteOffInvoice).toHaveBeenCalledWith(
      'token',
      'inv-1002',
      expect.objectContaining({
        idempotencyKey: 'writeoff-inv-1002-user-123-2026-06-18T10:19:00Z',
        reason: 'Customer is insolvent; remaining balance approved for write-off'
      })
    )
    expect(mockWriteOffInvoice.mock.calls[0]?.[2]).not.toHaveProperty('ledgerTransactionRef')
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
