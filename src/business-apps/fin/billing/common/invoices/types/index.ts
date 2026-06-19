/**
 * NEWWORK Billing & Invoicing domain model.
 *
 * These types describe the NEWWORK-owned invoicing domain. The ledger backend is
 * an internal implementation detail accessed only through the Ledger Service
 * abstraction.
 */

export type { CurrencySettings, RoundingMode } from '../../settings/types'
export type { Money } from '../../types/primitives'

/** Lifecycle states for an invoice. Transitions are enforced in invoiceStatus.ts. */
export const INVOICE_STATUSES = [
  'DRAFT',
  'ISSUED',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
  'WRITTEN_OFF'
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/** UI-only status derived from due date and outstanding amount; never persisted to Blnk. */
export type InvoiceDisplayStatus = InvoiceStatus | 'OVERDUE'

export type InvoiceDocumentType = 'INVOICE' | 'CREDIT_NOTE'

/** How a tax category behaves for calculation and reporting. */
export const TAX_TREATMENTS = ['STANDARD', 'REDUCED', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE', 'INTRA_EU'] as const
export type TaxTreatment = (typeof TAX_TREATMENTS)[number]

export const PAYMENT_METHODS = ['BANK_TRANSFER', 'SEPA_DIRECT_DEBIT', 'CARD', 'CASH', 'OTHER'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/** Ledger lifecycle events that produce double-entry postings. */
export const LEDGER_EVENT_TYPES = [
  'INVOICE_ISSUED',
  'INVOICE_PAID',
  'INVOICE_CANCELLED',
  'CREDIT_NOTE_ISSUED',
  'INVOICE_WRITTEN_OFF',
  'FX_DIFFERENCE'
] as const
export type LedgerEventType = (typeof LEDGER_EVENT_TYPES)[number]

export interface TaxRate {
  id: string
  taxCategoryId: string
  /** Percentage value, for example 19 for 19%. */
  ratePercent: number
  /** Inclusive validity window; open-ended when null. */
  validFrom: string
  validTo?: string | null
  /** Country/region the rate applies to, for example "DE". */
  countryCode?: string | null
  /** Reporting code used by accounting/exports. */
  reportingCode?: string | null
}

export interface TaxCategory {
  id: string
  code: string
  name: string
  treatment: TaxTreatment
  /** Currently effective rate snapshot for display; full history in rates. */
  rates: TaxRate[]
}

export interface FxRate {
  fromCurrency: string
  toCurrency: string
  rate: number
  rateDate: string
  /** Where the rate came from, for example "ECB". */
  source?: string | null
}

export interface PaymentTerm {
  id: string
  code: string
  name: string
  /** Net days until due from the invoice date. */
  dueDays: number
  /** Optional early-payment discount percent. */
  earlyPaymentDiscountPercent?: number | null
  /** Days within which the early-payment discount applies. */
  earlyPaymentDiscountDays?: number | null
}

export interface InvoiceNumberSequence {
  id: string
  legalEntityId: string
  prefix: string
  /** Reset cadence for the running number. */
  period: 'YEARLY' | 'MONTHLY' | 'NEVER'
  /** Zero-padding width for the numeric part. */
  padding: number
  nextNumber: number
}

export interface BankAccount {
  id: string
  label: string
  iban: string
  bic?: string | null
  /** Currency the account holds. */
  currency: string
}

export interface LegalEntity {
  id: string
  name: string
  /** Address lines rendered on the invoice. */
  addressLines: string[]
  countryCode: string
  taxId?: string | null
  vatId?: string | null
  /** Accounting currency for ledger postings. */
  accountingCurrency: string
  /** Default invoice currency for this entity. */
  defaultCurrency: string
  bankAccounts: BankAccount[]
  invoiceFooter?: string | null
  /** Default locale for generated documents, for example "de-DE". */
  defaultLocale?: string | null
}

/** Maps a CRM account to its billing-specific configuration. */
export interface BillingCustomer {
  id: string
  /** CRM Account id this billing customer is linked to. */
  crmAccountId: string
  name: string
  billingAddressLines: string[]
  countryCode: string
  vatId?: string | null
  taxExempt: boolean
  defaultPaymentTermId?: string | null
  defaultCurrency?: string | null
  /** Preferred invoice/document language, for example "en-US". */
  preferredLocale?: string | null
}

export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  /** Unit price in the invoice currency. */
  unitPrice: number
  /** Line discount percent (0-100). */
  discountPercent: number
  taxCategoryId: string
  /** Resolved tax rate percent captured at calculation time. */
  taxRatePercent: number
  /** GL revenue account this line maps to. */
  revenueAccountCode?: string | null
  costCenterId?: string | null
  projectId?: string | null
  /** Computed net total for the line. */
  netAmount: number
  /** Computed tax amount for the line. */
  taxAmount: number
  /** Computed gross total for the line. */
  grossAmount: number
}

/** Aggregated tax per rate, shown on the invoice and used for postings. */
export interface TaxSummaryEntry {
  taxCategoryId: string
  taxRatePercent: number
  treatment: TaxTreatment
  netAmount: number
  taxAmount: number
}

export interface InvoiceTotals {
  netTotal: number
  taxTotal: number
  grossTotal: number
  /** Rounding adjustment applied to reach the final gross total. */
  roundingAdjustment: number
  taxSummary: TaxSummaryEntry[]
}

export interface PaymentAllocation {
  id: string
  invoiceId: string
  /** Amount allocated to this invoice in the payment currency. */
  amount: number
  currency: string
  method: PaymentMethod
  paymentDate: string
  /** External bank/PSP reference, used for reconciliation. */
  externalReference?: string | null
  /** Existing ledger transaction reference linked to this payment, when available. */
  ledgerTransactionRef?: string | null
}

export type RecordPaymentInput = Omit<PaymentAllocation, 'id' | 'invoiceId'>

export interface LedgerTransactionLink {
  eventType: LedgerEventType
  /** Idempotent NEWWORK-owned event id used as posting reference. */
  eventId: string
  /** Reference returned by the Ledger Service after posting. */
  ledgerTransactionRef?: string | null
  postedAt?: string | null
}

export interface InvoiceAuditEntry {
  id: string
  action: string
  actorId?: string | null
  actorName?: string | null
  timestamp: string
  details?: string | null
  metaData?: Record<string, unknown> | null
}

export interface Invoice {
  id: string
  /** Invoice-like document type. Credit notes are separate documents linked to an original invoice. */
  documentType?: InvoiceDocumentType
  /** Immutable, sequence-controlled number assigned on issue. Null while draft. */
  invoiceNumber?: string | null
  status: InvoiceStatus
  legalEntityId: string
  billingCustomerId: string
  /** Customer display name captured at creation. */
  customerName?: string | null
  /** CRM linkage for navigation and context. */
  crmAccountId?: string | null
  crmOpportunityId?: string | null
  /** Original invoice linkage for CREDIT_NOTE documents. */
  originalInvoiceId?: string | null
  originalInvoiceNumber?: string | null
  /** Invoice transaction currency. */
  currency: string
  /** Accounting currency snapshot at issue time. */
  accountingCurrency: string
  /** FX rate snapshot locked at issue time. */
  fxRate?: FxRate | null
  issueDate?: string | null
  dueDate?: string | null
  paymentTermId?: string | null
  lines: InvoiceLine[]
  totals: InvoiceTotals
  /** Amount already settled across payment allocations. */
  paidAmount: number
  notes?: string | null
  /** Document language for PDF/email. */
  locale?: string | null
  ledgerLinks: LedgerTransactionLink[]
  payments: PaymentAllocation[]
  audit: InvoiceAuditEntry[]
  createdAt: string
  updatedAt: string
}

/** A credit note reverses all or part of an invoice. */
export interface CreditNote {
  id: string
  creditNoteNumber?: string | null
  invoiceId: string
  legalEntityId: string
  currency: string
  reason: string
  lines: InvoiceLine[]
  totals: InvoiceTotals
  status: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED' | 'CANCELLED'>
  issueDate?: string | null
  ledgerLinks: LedgerTransactionLink[]
  createdAt: string
}
