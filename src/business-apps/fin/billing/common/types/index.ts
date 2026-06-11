/**
 * NEWWORK Billing & Invoicing - domain model.
 *
 * These types describe the NEWWORK-owned billing/invoicing domain. The ledger
 * backend is an internal implementation detail accessed only through the
 * `Ledger Service` abstraction (see common/utils/ledgerPostings.ts and
 * common/hooks/useLedgerService.ts). No ledger-engine vocabulary leaks here.
 */

export type Uuid = string
export type IsoDateString = string

/** Lifecycle states for an invoice. Transitions are enforced in invoiceStatus.ts. */
export const INVOICE_STATUSES = [
  'DRAFT',
  'ISSUED',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'WRITTEN_OFF'
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/** How a tax category behaves for calculation and reporting. */
export const TAX_TREATMENTS = ['STANDARD', 'REDUCED', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE', 'INTRA_EU'] as const
export type TaxTreatment = (typeof TAX_TREATMENTS)[number]

export const PAYMENT_METHODS = ['BANK_TRANSFER', 'SEPA_DIRECT_DEBIT', 'CARD', 'CASH', 'OTHER'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/** Rounding strategy applied to monetary totals. */
export const ROUNDING_MODES = ['HALF_UP', 'HALF_EVEN', 'DOWN', 'UP'] as const
export type RoundingMode = (typeof ROUNDING_MODES)[number]

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

/** A money amount is always paired with its currency and minor-unit precision. */
export interface Money {
  /** Amount in major units (e.g. 1234.56). Persisted alongside precision. */
  amount: number
  /** ISO 4217 currency code, e.g. "EUR". */
  currency: string
  /** Minor-unit precision, e.g. 2 for EUR. */
  precision: number
}

export interface TaxRate {
  id: Uuid
  taxCategoryId: Uuid
  /** Percentage value, e.g. 19 for 19%. */
  ratePercent: number
  /** Inclusive validity window; open-ended when null. */
  validFrom: IsoDateString
  validTo?: IsoDateString | null
  /** Country/region the rate applies to, e.g. "DE". */
  countryCode?: string | null
  /** Reporting code used by accounting/exports. */
  reportingCode?: string | null
}

export interface TaxCategory {
  id: Uuid
  code: string
  name: string
  treatment: TaxTreatment
  /** Currently effective rate snapshot for display; full history in rates. */
  rates: TaxRate[]
}

export interface CurrencySettings {
  /** ISO 4217 codes enabled for invoicing in this tenant. */
  enabledCurrencies: string[]
  /** Per-currency minor-unit precision overrides. */
  precisionByCurrency: Record<string, number>
  roundingMode: RoundingMode
}

export interface FxRate {
  fromCurrency: string
  toCurrency: string
  rate: number
  rateDate: IsoDateString
  /** Where the rate came from, e.g. "ECB". */
  source?: string | null
}

export interface PaymentTerm {
  id: Uuid
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
  id: Uuid
  legalEntityId: Uuid
  prefix: string
  /** Reset cadence for the running number. */
  period: 'YEARLY' | 'MONTHLY' | 'NEVER'
  /** Zero-padding width for the numeric part. */
  padding: number
  nextNumber: number
}

export interface BankAccount {
  id: Uuid
  label: string
  iban: string
  bic?: string | null
  /** Currency the account holds. */
  currency: string
}

export interface LegalEntity {
  id: Uuid
  name: string
  /** Address lines rendered on the invoice. */
  addressLines: string[]
  countryCode: string
  taxId?: string | null
  vatId?: string | null
  /** Accounting (functional) currency for ledger postings. */
  accountingCurrency: string
  /** Default invoice currency for this entity. */
  defaultCurrency: string
  bankAccounts: BankAccount[]
  invoiceFooter?: string | null
  /** Default locale for generated documents, e.g. "de-DE". */
  defaultLocale?: string | null
}

/** Maps a CRM account to its billing-specific configuration. */
export interface BillingCustomer {
  id: Uuid
  /** CRM Account id this billing customer is linked to. */
  crmAccountId: Uuid
  name: string
  billingAddressLines: string[]
  countryCode: string
  vatId?: string | null
  taxExempt: boolean
  defaultPaymentTermId?: Uuid | null
  defaultCurrency?: string | null
  /** Preferred invoice/document language, e.g. "en-US". */
  preferredLocale?: string | null
}

export interface InvoiceLine {
  id: Uuid
  description: string
  quantity: number
  /** Unit price in the invoice currency. */
  unitPrice: number
  /** Line discount percent (0-100). */
  discountPercent: number
  taxCategoryId: Uuid
  /** Resolved tax rate percent captured at calculation time. */
  taxRatePercent: number
  /** GL revenue account this line maps to. */
  revenueAccountCode?: string | null
  costCenterId?: Uuid | null
  projectId?: Uuid | null
  /** Computed net (pre-tax) total for the line. */
  netAmount: number
  /** Computed tax amount for the line. */
  taxAmount: number
  /** Computed gross (net + tax) total for the line. */
  grossAmount: number
}

/** Aggregated tax per rate, shown on the invoice and used for postings. */
export interface TaxSummaryEntry {
  taxCategoryId: Uuid
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
  id: Uuid
  invoiceId: Uuid
  /** Amount allocated to this invoice in the payment currency. */
  amount: number
  currency: string
  method: PaymentMethod
  paymentDate: IsoDateString
  /** External bank/PSP reference, used for reconciliation. */
  externalReference?: string | null
  /** Ledger posting reference produced for this payment. */
  ledgerTransactionRef?: string | null
}

export interface LedgerTransactionLink {
  eventType: LedgerEventType
  /** Idempotent NEWWORK-owned event id used as posting reference. */
  eventId: string
  /** Reference returned by the Ledger Service after posting. */
  ledgerTransactionRef?: string | null
  postedAt?: IsoDateString | null
}

export interface InvoiceAuditEntry {
  id: Uuid
  action: string
  actorId?: string | null
  actorName?: string | null
  timestamp: IsoDateString
  details?: string | null
}

export interface Invoice {
  id: Uuid
  /** Immutable, sequence-controlled number assigned on issue. Null while draft. */
  invoiceNumber?: string | null
  status: InvoiceStatus
  legalEntityId: Uuid
  billingCustomerId: Uuid
  /** Customer display name captured at creation (CRM Account name as-of issue). */
  customerName?: string | null
  /** CRM linkage for navigation and context. */
  crmAccountId?: Uuid | null
  crmOpportunityId?: Uuid | null
  /** Invoice (transaction) currency. */
  currency: string
  /** Accounting currency snapshot at issue time. */
  accountingCurrency: string
  /** FX rate snapshot locked at issue time (invoice -> accounting currency). */
  fxRate?: FxRate | null
  issueDate?: IsoDateString | null
  dueDate?: IsoDateString | null
  paymentTermId?: Uuid | null
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
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

/** A credit note reverses all or part of an invoice. */
export interface CreditNote {
  id: Uuid
  creditNoteNumber?: string | null
  invoiceId: Uuid
  legalEntityId: Uuid
  currency: string
  reason: string
  lines: InvoiceLine[]
  totals: InvoiceTotals
  status: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED' | 'CANCELLED'>
  issueDate?: IsoDateString | null
  ledgerLinks: LedgerTransactionLink[]
  createdAt: IsoDateString
}

/** A bank/PSP line awaiting reconciliation against invoice payments. */
export interface BankStatementLine {
  id: Uuid
  bookingDate: IsoDateString
  amount: number
  currency: string
  counterparty?: string | null
  reference?: string | null
  /** Matched invoice id once reconciled. */
  matchedInvoiceId?: Uuid | null
}

export interface ReconciliationMatch {
  bankStatementLineId: Uuid
  invoiceId: Uuid
  /** 0-1 confidence score from the matching heuristic. */
  confidence: number
  matchedAmount: number
}
