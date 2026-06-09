import { NEWWORK_CONNECT_API_URL, isNewWorkConnectConfigured } from '@/common/utils/serviceResolver'
import type { CustomerInvoice, CustomerSubjectType, CustomerTransaction } from '../types'

interface FibuEnvelope<T> {
  status?: string
  data?: T
}

function unwrap<T>(json: FibuEnvelope<T[]> | T[] | undefined): T[] {
  if (Array.isArray(json)) return json
  if (json && Array.isArray(json.data)) return json.data
  return []
}

async function fibuRequest<T>(path: string, accessToken: string): Promise<T[]> {
  const response = await fetch(`${NEWWORK_CONNECT_API_URL}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!response.ok) {
    throw new Error(`NewWork Connect request failed: ${response.status}`)
  }
  return unwrap<T>((await response.json()) as FibuEnvelope<T[]> | T[])
}

export interface FibuFetchParams {
  accessToken: string
  subjectType: CustomerSubjectType
  subjectId: string
}

/** True when the Fibu integration is wired; consumers should branch on this. */
export const fibuIntegrationEnabled = isNewWorkConnectConfigured

export function fetchCustomerInvoices(params: FibuFetchParams): Promise<CustomerInvoice[]> {
  const scope = encodeURIComponent(`${params.subjectType}/${params.subjectId}`)
  return fibuRequest<CustomerInvoice>(`/customers/${scope}/invoices`, params.accessToken)
}

export function fetchCustomerTransactions(params: FibuFetchParams): Promise<CustomerTransaction[]> {
  const scope = encodeURIComponent(`${params.subjectType}/${params.subjectId}`)
  return fibuRequest<CustomerTransaction>(`/customers/${scope}/transactions`, params.accessToken)
}
