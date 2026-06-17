/**
 * Human-readable, translated labels for billing enums.
 *
 * Keeps raw enum/event strings (DRAFT, INVOICE_ISSUED, BANK_TRANSFER, ...) out
 * of the UI by mapping each value to an i18n key. Falls back to the raw value
 * if a key is somehow missing so nothing renders blank.
 */
import type { InvoiceDisplayStatus, LedgerEventType, PaymentMethod } from '../invoices/types'

type TranslateFn = (key: string) => string

const INVOICE_STATUS_KEYS: Record<InvoiceDisplayStatus, string> = {
  DRAFT: 'billing-status-draft',
  ISSUED: 'billing-status-issued',
  SENT: 'billing-status-sent',
  PARTIALLY_PAID: 'billing-status-partially-paid',
  PAID: 'billing-status-paid',
  OVERDUE: 'billing-status-overdue',
  CANCELLED: 'billing-status-cancelled',
  WRITTEN_OFF: 'billing-status-written-off'
}

const PAYMENT_METHOD_KEYS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'billing-payment-method-bank-transfer',
  SEPA_DIRECT_DEBIT: 'billing-payment-method-sepa',
  CARD: 'billing-payment-method-card',
  CASH: 'billing-payment-method-cash',
  OTHER: 'billing-payment-method-other'
}

const LEDGER_EVENT_KEYS: Record<LedgerEventType, string> = {
  INVOICE_ISSUED: 'billing-event-issued',
  INVOICE_PAID: 'billing-event-paid',
  INVOICE_CANCELLED: 'billing-event-cancelled',
  CREDIT_NOTE_ISSUED: 'billing-event-credit-note',
  INVOICE_WRITTEN_OFF: 'billing-event-written-off',
  FX_DIFFERENCE: 'billing-event-fx'
}

function translate(t: TranslateFn, key: string | undefined, fallback: string): string {
  if (!key) {
    return fallback
  }
  const label = t(key)
  return label && label !== key ? label : fallback
}

export function getInvoiceStatusLabel(status: InvoiceDisplayStatus, t: TranslateFn): string {
  return translate(t, INVOICE_STATUS_KEYS[status], status)
}

export function getPaymentMethodLabel(method: PaymentMethod, t: TranslateFn): string {
  return translate(t, PAYMENT_METHOD_KEYS[method], method)
}

export function getLedgerEventLabel(eventType: LedgerEventType, t: TranslateFn): string {
  return translate(t, LEDGER_EVENT_KEYS[eventType], eventType)
}

/** Audit entry action codes are free-form; humanize via i18n with a fallback. */
export function getAuditActionLabel(action: string, t: TranslateFn): string {
  return translate(t, `billing-audit-${action}`, action)
}

/**
 * Ledger transaction statuses come from the engine and are open-ended
 * (APPLIED, QUEUED, INFLIGHT, ...). Prefer a translation, else title-case the
 * raw token so users never see SHOUTING_SNAKE_CASE.
 */
export function getTransactionStatusLabel(status: string | undefined, t: TranslateFn): string {
  if (!status) {
    return '—'
  }
  const key = `billing-tx-status-${status.toLowerCase()}`
  const label = t(key)
  if (label && label !== key) {
    return label
  }
  return status
    .toLowerCase()
    .split(/[_\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
