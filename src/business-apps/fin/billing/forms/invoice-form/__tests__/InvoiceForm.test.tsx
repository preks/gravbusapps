/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InvoiceForm from '../InvoiceForm'

const navigateToMock = jest.fn()

// Stable flow client instance so useBillingData's load effect does not re-run
// every render (which would otherwise loop via its [accessToken, flowClient] deps).
const fakeFlowClient = { post: jest.fn().mockResolvedValue({}), getResource: jest.fn().mockResolvedValue({}) }
jest.mock('@/common/network/flows/useFlowClient', () => ({
  useFlowClient: () => fakeFlowClient
}))

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

// Invoices persist through the native BLNK invoice client. Mock it so the form
// test stays focused on validation/navigation without a real connector lane.
jest.mock('../../../common/network/invoiceClient', () => ({
  billingApiEnabled: () => false,
  listInvoices: jest.fn().mockResolvedValue([]),
  createInvoice: jest.fn().mockResolvedValue(undefined),
  updateInvoice: jest.fn().mockResolvedValue(undefined)
}))

// Billing customers come from the CRM at runtime; mock the hook so the form
// test has a deterministic, pre-selected customer without a GraphQL lane.
jest.mock('../../../common/hooks/useBillingCustomers', () => ({
  useBillingCustomers: () => ({
    customers: [
      {
        id: 'cust-1',
        crmAccountId: 'cust-1',
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

describe('InvoiceForm validation', () => {
  beforeEach(() => navigateToMock.mockReset())

  it('shows validation errors and does not navigate when the draft is incomplete', () => {
    render(<InvoiceForm accessToken="token" />)

    fireEvent.click(screen.getByTestId('form-save-button'))

    expect(screen.getByTestId('invoice-form-errors')).toBeInTheDocument()
    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('saves and navigates when the draft is valid', async () => {
    render(<InvoiceForm accessToken="token" />)

    fireEvent.change(screen.getByTestId('line-description-line-initial'), {
      target: { value: 'Consulting services' }
    })
    fireEvent.change(screen.getByTestId('line-price-line-initial'), {
      target: { value: '500' }
    })

    fireEvent.click(screen.getByTestId('form-save-button'))

    await waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/platform/fin/billing/invoices'))
    expect(screen.queryByTestId('invoice-form-errors')).not.toBeInTheDocument()
  })
})
