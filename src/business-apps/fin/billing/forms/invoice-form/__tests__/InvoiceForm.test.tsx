/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InvoiceForm from '../InvoiceForm'
import { SAMPLE_SETTINGS } from '../../../common/data/sampleBillingData'
import type { BillingCustomer } from '../../../common/invoices/types'

const navigateToMock = jest.fn()
const dispatchProcessContinueEventMock = jest.fn()
const mockListInvoices = jest.fn()
const mockCreateInvoice = jest.fn()
const mockGetFinanceSettings = jest.fn()

// Stable flow client instance so useBillingData's load effect does not re-run
// every render (which would otherwise loop via its [accessToken, flowClient] deps).
const fakeFlowClient = { post: jest.fn().mockResolvedValue({}), getResource: jest.fn().mockResolvedValue({}) }
jest.mock('@/common/network/flows/useFlowClient', () => ({
  useFlowClient: () => fakeFlowClient
}))

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

jest.mock('../../../common/invoices/components/CustomerSelect', () => ({
  CustomerSelect: ({
    customers,
    value,
    onChange
  }: {
    customers: BillingCustomer[]
    value: string
    onChange: (value: string) => void
  }) => (
    <select data-testid="form-customer" value={value} onChange={event => onChange(event.target.value)}>
      {customers.map(customer => (
        <option key={customer.id} value={customer.id}>
          {customer.name}
        </option>
      ))}
    </select>
  )
}))

// Invoices persist through the native BLNK invoice client. Mock it so the form
// test stays focused on validation/navigation without a real connector lane.
jest.mock('../../../common/invoices/network/invoiceClient', () => ({
  billingApiEnabled: () => true,
  listInvoices: (...args: unknown[]) => mockListInvoices(...args),
  createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
  updateInvoice: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('../../../common/settings/network/financeSettingsClient', () => ({
  getFinanceSettings: (...args: unknown[]) => mockGetFinanceSettings(...args)
}))

// Billing customers come from the CRM at runtime; mock the hook so the form
// test has a deterministic, pre-selected customer without a GraphQL lane.
jest.mock('../../../common/invoices/hooks/useBillingCustomers', () => ({
  useBillingCustomers: () => ({
    customers: [
      {
        id: 'cust-decoy',
        crmAccountId: 'acc-decoy',
        name: 'Decoy Corporation',
        billingAddressLines: [],
        countryCode: 'DE',
        vatId: null,
        taxExempt: false,
        defaultPaymentTermId: null,
        defaultCurrency: null,
        preferredLocale: null
      },
      {
        id: 'cust-1',
        crmAccountId: 'acc-acme',
        name: 'Acme Corporation',
        billingAddressLines: [],
        countryCode: 'DE',
        vatId: null,
        taxExempt: false,
        defaultPaymentTermId: null,
        defaultCurrency: null,
        preferredLocale: null
      }
    ],
    loading: false,
    error: null,
    usingSampleData: false
  })
}))

jest.mock('@/common/utils/navigationUtils', () => ({
  navigateTo: (...args: unknown[]) => navigateToMock(...args),
  Navigation: { FIN_BILLING_INVOICES: '/platform/fin/billing/invoices' }
}))

jest.mock('@/common/utils/processEventUtils', () => ({
  dispatchProcessContinueEvent: (...args: unknown[]) => dispatchProcessContinueEventMock(...args)
}))

describe('InvoiceForm validation', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    dispatchProcessContinueEventMock.mockReset()
    mockListInvoices.mockReset()
    mockListInvoices.mockResolvedValue([])
    mockCreateInvoice.mockReset()
    mockCreateInvoice.mockResolvedValue(undefined)
    mockGetFinanceSettings.mockReset()
    mockGetFinanceSettings.mockResolvedValue(SAMPLE_SETTINGS)
    window.history.replaceState({}, '', '/')
  })

  it('shows validation errors and does not navigate when the draft is incomplete', async () => {
    render(<InvoiceForm accessToken="token" />)
    await waitFor(() => expect(mockGetFinanceSettings).toHaveBeenCalled())

    fireEvent.click(screen.getByTestId('form-save-button'))

    expect(screen.getByTestId('invoice-form-errors')).toBeInTheDocument()
    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('saves and navigates when the draft is valid', async () => {
    render(<InvoiceForm accessToken="token" />)
    await waitFor(() => expect(mockGetFinanceSettings).toHaveBeenCalled())

    fireEvent.change(screen.getByTestId('line-description-line-initial'), {
      target: { value: 'Consulting services' }
    })
    fireEvent.change(screen.getByTestId('line-price-line-initial'), {
      target: { value: '500' }
    })

    fireEvent.click(screen.getByTestId('form-save-button'))

    await waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/platform/fin/billing/invoices'))
    expect(screen.queryByTestId('invoice-form-errors')).not.toBeInTheDocument()
    expect(mockCreateInvoice.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        dueDate: expect.any(String)
      })
    )
  })

  it('saves a custom due date instead of a payment term', async () => {
    render(<InvoiceForm accessToken="token" />)
    await waitFor(() => expect(mockGetFinanceSettings).toHaveBeenCalled())

    fireEvent.change(screen.getByTestId('line-description-line-initial'), {
      target: { value: 'Consulting services' }
    })
    fireEvent.change(screen.getByTestId('line-price-line-initial'), {
      target: { value: '500' }
    })

    fireEvent.change(screen.getByTestId('form-payment-term'), {
      target: { value: '__custom_due_date__' }
    })
    fireEvent.input(screen.getByTestId('form-custom-due-date'), {
      target: { value: '2026-07-15' }
    })
    fireEvent.blur(screen.getByTestId('form-custom-due-date'))

    fireEvent.click(screen.getByTestId('form-save-button'))

    await waitFor(() => expect(mockCreateInvoice).toHaveBeenCalled())
    expect(mockCreateInvoice.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        paymentTermId: null,
        dueDate: '2026-07-15T00:00:00.000Z'
      })
    )
  })

  it('prefills the billing customer from the CRM account id in the URL', async () => {
    window.history.replaceState({}, '', '/?accountId=acc-acme')

    render(<InvoiceForm accessToken="token" />)
    await waitFor(() => expect(mockGetFinanceSettings).toHaveBeenCalled())

    await waitFor(() => expect(screen.getByTestId('form-customer')).toHaveValue('cust-1'))
  })

  it('renders embedded content and closes without navigating when launched from an action modal', async () => {
    const onClose = jest.fn()

    render(
      <InvoiceForm
        accessToken="token"
        additionalData={{ psi_taskPayload: { psi_initialParameters: { accountId: 'acc-acme' } } }}
        onClose={onClose}
      />
    )
    await waitFor(() => expect(mockGetFinanceSettings).toHaveBeenCalled())

    expect(screen.getByTestId('invoice-form-embedded')).toBeInTheDocument()
    expect(screen.queryByTestId('invoice-form-back-button')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'billing-form-create-title' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('form-customer')).toHaveValue('cust-1'))

    fireEvent.change(screen.getByTestId('line-description-line-initial'), {
      target: { value: 'Consulting services' }
    })
    fireEvent.change(screen.getByTestId('line-price-line-initial'), {
      target: { value: '500' }
    })
    fireEvent.click(screen.getByTestId('form-save-button'))

    await waitFor(() => expect(mockCreateInvoice).toHaveBeenCalled())
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(dispatchProcessContinueEventMock).toHaveBeenCalledWith('pse_submit', { event: 'pse_submit' })
    expect(onClose).toHaveBeenCalled()
  })
})
