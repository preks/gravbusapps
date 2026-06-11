/**
 * Resolve a billing customer's display name.
 *
 * Production invoices are expected to be served with their customer already
 * resolved; until then we look up known sample customers and fall back to the id.
 */
import { SAMPLE_BILLING_CUSTOMERS } from '../data/sampleBillingData'
import type { BillingCustomer, Invoice } from '../types'

const SAMPLE_BY_ID = new Map<string, BillingCustomer>(SAMPLE_BILLING_CUSTOMERS.map(customer => [customer.id, customer]))

export function resolveCustomerName(billingCustomerId: string, customers?: BillingCustomer[]): string {
  const fromProvided = customers?.find(customer => customer.id === billingCustomerId)
  if (fromProvided) {
    return fromProvided.name
  }
  return SAMPLE_BY_ID.get(billingCustomerId)?.name ?? billingCustomerId
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

export function getSampleCustomers(): BillingCustomer[] {
  return SAMPLE_BILLING_CUSTOMERS
}
