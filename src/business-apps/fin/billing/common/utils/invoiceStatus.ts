/**
 * Invoice lifecycle: allowed transitions, derived status, and badge variants.
 */
import { calculateOutstanding } from './invoiceCalculations'
import type { Invoice, InvoiceStatus } from '../types'

/** Allowed direct transitions per status. */
const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
  SENT: ['PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE', 'WRITTEN_OFF'],
  OVERDUE: ['PARTIALLY_PAID', 'PAID', 'WRITTEN_OFF', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
  WRITTEN_OFF: []
}

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTransition(from: InvoiceStatus, to: InvoiceStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid invoice status transition: ${from} -> ${to}`)
  }
}

/**
 * Derive the payment-driven status of an issued invoice from amounts and due
 * date. Does not move terminal/draft/cancelled invoices.
 */
export function derivePaymentStatus(invoice: Invoice, now: Date = new Date()): InvoiceStatus {
  if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED' || invoice.status === 'WRITTEN_OFF') {
    return invoice.status
  }

  const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)
  if (outstanding <= 0 && invoice.totals.grossTotal > 0) {
    return 'PAID'
  }
  if (invoice.paidAmount > 0 && outstanding > 0) {
    return isOverdue(invoice, now) ? 'OVERDUE' : 'PARTIALLY_PAID'
  }
  if (isOverdue(invoice, now)) {
    return 'OVERDUE'
  }
  return invoice.status === 'PAID' ? 'ISSUED' : invoice.status
}

export function isOverdue(invoice: Invoice, now: Date = new Date()): boolean {
  if (!invoice.dueDate) {
    return false
  }
  const due = new Date(invoice.dueDate)
  if (Number.isNaN(due.getTime())) {
    return false
  }
  const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)
  return outstanding > 0 && due.getTime() < now.getTime()
}

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'destructive'
  | 'warning'
  | 'info'
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'outline'

/** Map a status to a design-system Badge variant. */
export function getInvoiceStatusBadgeVariant(status: InvoiceStatus): BadgeVariant {
  switch (status) {
    case 'PAID':
      return 'paid'
    case 'OVERDUE':
      return 'overdue'
    case 'PARTIALLY_PAID':
      return 'info'
    case 'ISSUED':
    case 'SENT':
      return 'success'
    case 'DRAFT':
      return 'secondary'
    case 'CANCELLED':
      return 'destructive'
    case 'WRITTEN_OFF':
      return 'warning'
    default:
      return 'default'
  }
}
