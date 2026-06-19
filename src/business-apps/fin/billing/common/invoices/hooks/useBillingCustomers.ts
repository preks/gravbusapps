/**
 * Billing customers sourced from the CRM.
 *
 * Billing customers ARE CRM Accounts: an invoice is always raised against a
 * company that already exists in customer relations. This hook loads the live
 * CRM customer account list (name + primary address + country + email) and maps
 * each to a `BillingCustomer`, so the invoice form never invents customers.
 *
 * Backend failures surface as errors with an empty customer list instead of
 * falling back to bundled demo customers.
 */
import { useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { BillingCustomer } from '../types'

interface CrmAddress {
  addressType?: string | null
  addressLine?: string | { lines?: string[] } | null
  locality?: string | null
  postalCode?: string | null
  country?: { code?: string | null; value?: string | null } | null
}

function parseAddressLines(addressLine: CrmAddress['addressLine']): string[] {
  if (!addressLine) return []
  if (typeof addressLine === 'object') {
    return Array.isArray(addressLine.lines) ? addressLine.lines.filter(Boolean) : []
  }
  try {
    const parsed = JSON.parse(addressLine)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
    if (parsed && Array.isArray(parsed.lines)) return parsed.lines.filter(Boolean)
    return []
  } catch {
    return [addressLine]
  }
}

function pickBillingAddress(addresses?: CrmAddress[] | null): CrmAddress | undefined {
  if (!addresses || addresses.length === 0) return undefined
  const billing = addresses.find(address => (address.addressType ?? '').toUpperCase().includes('BILL'))
  return billing ?? addresses[0]
}

function toBillingCustomer(account: CustomerAccount): BillingCustomer {
  const address = pickBillingAddress(account.addresses)
  const lines = parseAddressLines(address?.addressLine)
  const cityLine = [address?.postalCode, address?.locality].filter(Boolean).join(' ').trim()
  const billingAddressLines = [...lines, cityLine].filter(line => line.length > 0)

  return {
    id: account.id ?? '',
    crmAccountId: account.id ?? '',
    name: account.name?.trim() || account.id || '',
    billingAddressLines,
    countryCode: address?.country?.code ?? '',
    vatId: null,
    taxExempt: false,
    defaultPaymentTermId: null,
    defaultCurrency: null,
    preferredLocale: null
  }
}

interface UseBillingCustomersResult {
  customers: BillingCustomer[]
  loading: boolean
  error: string | null
  /** True when the CRM lane was unavailable and sample customers are shown. */
  usingSampleData: boolean
}

export function useBillingCustomers(context: BusinessAppContextProps): UseBillingCustomersResult {
  const accountsResult = useCustomerAccountsList(context, {
    limit: 500,
    prospective: false,
    orderBy: [{ field: 'name', direction: 'ASC_NULLS_LAST' }]
  })

  const customers = useMemo(
    () => accountsResult.accounts.filter(account => account.id).map(toBillingCustomer),
    [accountsResult.accounts]
  )

  return {
    customers,
    loading: accountsResult.loading,
    error: context.accessToken ? accountsResult.error : 'Billing customer lookup requires a valid access token',
    usingSampleData: false
  }
}
