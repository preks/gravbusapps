/**
 * Resolve a billing customer's display name.
 *
 * Production invoices are expected to be served with their customer already
 * resolved; until then we use the provided live customer list and fall back to
 * the id.
 */
import type { BillingCustomer, Invoice } from '../types'

export function resolveCustomerName(billingCustomerId: string, customers?: BillingCustomer[]): string {
  const fromProvided = customers?.find(customer => customer.id === billingCustomerId)
  if (fromProvided) {
    return fromProvided.name
  }
  return billingCustomerId
}

/**
 * Display name for an invoice's customer. Prefers the name snapshotted on the
 * invoice at creation (CRM Account name as-of issue) so list/detail screens show
 * a real name without re-fetching the CRM; falls back to id-based resolution.
 */
export function invoiceCustomerName(
  invoice: Pick<Invoice, 'customerName' | 'billingCustomerId'>,
  customers?: BillingCustomer[]
): string {
  const snapshot = invoice.customerName?.trim()
  if (snapshot) {
    return snapshot
  }
  return resolveCustomerName(invoice.billingCustomerId, customers)
}
