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

  it('issues a draft: assigns a number, posts the issued event, sets ISSUED', async () => {
    const { result } = await setup()

    let assignedNumber = ''
    await act(async () => {
      assignedNumber = await result.current.issueInvoice('inv-1004')
    })

    expect(assignedNumber).toBe('INV-2026-0004')
    const invoice = result.current.invoices.find(item => item.id === 'inv-1004')
    expect(invoice?.status).toBe('ISSUED')
    expect(invoice?.invoiceNumber).toBe(assignedNumber)
    expect(invoice?.ledgerLinks.some(link => link.eventType === 'INVOICE_ISSUED')).toBe(true)
    expect(ledgerPost).toHaveBeenCalledTimes(1)
    expect(mockIssueInvoice).toHaveBeenCalledTimes(1)
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
