/**
 * Billing customers sourced from the CRM.
 *
 * Billing customers ARE CRM Accounts: an invoice is always raised against a
 * company that already exists in customer relations. This hook loads the live
 * CRM `Account` list (name + primary address + country + email) and maps each
 * to a `BillingCustomer`, so the invoice form never invents customers.
 *
 * Backend failures surface as errors with an empty customer list instead of
 * falling back to bundled demo customers.
 */
import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { BillingCustomer } from '../types'

interface CrmAddress {
  addressType?: string | null
  addressLine?: string | { lines?: string[] } | null
  locality?: string | null
  postalCode?: string | null
  country?: { code?: string | null; value?: string | null } | null
}

interface CrmAccountRow {
  id: string
  name?: string | null
  email?: string | null
  addresses?: CrmAddress[] | null
}

const BILLING_CUSTOMERS_QUERY = `
  query GetBillingCustomers($limit: Int, $offset: Int) {
    Account(
      where: { isDeleted: { _eq: false } }
      orderBy: [{ name: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      email
      addresses {
        addressType
        addressLine
        locality
        postalCode
        country {
          code
          value
        }
      }
    }
  }
`

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

function toBillingCustomer(row: CrmAccountRow): BillingCustomer {
  const address = pickBillingAddress(row.addresses)
  const lines = parseAddressLines(address?.addressLine)
  const cityLine = [address?.postalCode, address?.locality].filter(Boolean).join(' ').trim()
  const billingAddressLines = [...lines, cityLine].filter(line => line.length > 0)

  return {
    id: row.id,
    crmAccountId: row.id,
    name: row.name?.trim() || row.email || row.id,
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
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [customers, setCustomers] = useState<BillingCustomer[]>([])
  const [loading, setLoading] = useState(Boolean(context.accessToken))
  const [error, setError] = useState<string | null>(null)
  const [usingSampleData, setUsingSampleData] = useState(false)

  const load = useCallback(async () => {
    if (!context.accessToken) {
      setCustomers([])
      setError('Billing customer lookup requires a valid access token')
      setUsingSampleData(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await graphqlClient.request<{ Account: CrmAccountRow[] }>(BILLING_CUSTOMERS_QUERY, {
        limit: 500,
        offset: 0
      })
      const mapped = (result.Account ?? []).map(toBillingCustomer)
      setCustomers(mapped)
      setUsingSampleData(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CRM customers')
      setCustomers([])
      setUsingSampleData(false)
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  return { customers, loading, error, usingSampleData }
}
