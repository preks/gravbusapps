/**
 * Compatibility barrel for billing domain types.
 *
 * Prefer importing new code from the owning domain module:
 * - common/invoices/types
 * - common/reconciliation/types
 * - common/settings/types
 */
export type { Money } from './primitives'
export { INVOICE_STATUSES, LEDGER_EVENT_TYPES, PAYMENT_METHODS, TAX_TREATMENTS } from '../invoices/types'
export type {
  BankAccount,
  BillingCustomer,
  CreditNote,
  CurrencySettings,
  FxRate,
  Invoice,
  InvoiceAuditEntry,
  InvoiceDisplayStatus,
  InvoiceLine,
  InvoiceNumberSequence,
  InvoiceStatus,
  InvoiceTotals,
  LedgerEventType,
  LedgerTransactionLink,
  LegalEntity,
  PaymentAllocation,
  PaymentMethod,
  PaymentTerm,
  RoundingMode,
  TaxCategory,
  TaxRate,
  TaxSummaryEntry,
  TaxTreatment
} from '../invoices/types'
export type { BankStatementLine, ReconciliationMatch } from '../reconciliation/types'
export { ROUNDING_MODES } from '../settings/types'
