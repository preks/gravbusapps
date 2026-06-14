/**
 * Billing Core API contract (API-first).
 *
 * Defines NEWWORK-owned endpoint paths and request/response payloads for the
 * Billing Core service. All names are generic (billing/invoice/ledger/posting/
 * payment/reconciliation) and never reference the underlying ledger engine.
 *
 * The MVP routes ledger operations through the NEWWORK Connect / Anypoint
 * Connect / MCP path (see LEDGER_SERVICE_BASE).
 */
import type {
  CreditNote,
  CurrencySettings,
  Invoice,
  InvoiceLine,
  LedgerEventType,
  LegalEntity,
  PaymentAllocation,
  PaymentTerm,
  ReconciliationMatch,
  TaxCategory,
  Uuid
} from '../types'

/** Base path for Billing Core (served behind the platform gateway). */
export const BILLING_API_VERSION = 'v1'
export const BILLING_API_BASE = `/api/fin/billing/${BILLING_API_VERSION}`

/**
 * Ledger Service is reached for MVP through NEWWORK Connect -> Anypoint Connect
 * -> MCP bridge. We model that as a connect route so business code stays
 * decoupled from the concrete transport.
 */
export const LEDGER_SERVICE_BASE = `/connect/fin/ledger/${BILLING_API_VERSION}`

export const BillingEndpoints = {
  invoices: `${BILLING_API_BASE}/invoices`,
  invoiceById: (id: Uuid) => `${BILLING_API_BASE}/invoices/${id}`,
  invoiceIssue: (id: Uuid) => `${BILLING_API_BASE}/invoices/${id}/issue`,
  invoiceCancel: (id: Uuid) => `${BILLING_API_BASE}/invoices/${id}/cancel`,
  invoicePdf: (id: Uuid) => `${BILLING_API_BASE}/invoices/${id}/pdf`,
  invoicePayments: (id: Uuid) => `${BILLING_API_BASE}/invoices/${id}/payments`,
  creditNotes: `${BILLING_API_BASE}/credit-notes`,
  settingsLegalEntities: `${BILLING_API_BASE}/settings/legal-entities`,
  settingsTaxCategories: `${BILLING_API_BASE}/settings/tax-categories`,
  settingsCurrencies: `${BILLING_API_BASE}/settings/currencies`,
  settingsPaymentTerms: `${BILLING_API_BASE}/settings/payment-terms`,
  reconciliation: `${BILLING_API_BASE}/reconciliation`,
  ledgerPost: `${LEDGER_SERVICE_BASE}/postings`
} as const

/** Draft creation/patch payload (totals are computed server-side and locally). */
export interface InvoiceDraftInput {
  legalEntityId: Uuid
  billingCustomerId: Uuid
  /** CRM Account display name captured at creation for invoice snapshots. */
  customerName?: string | null
  crmAccountId?: Uuid | null
  crmOpportunityId?: Uuid | null
  currency: string
  paymentTermId?: Uuid | null
  issueDate?: string | null
  notes?: string | null
  locale?: string | null
  lines: InvoiceLineInput[]
}

export interface InvoiceLineInput {
  description: string
  quantity: number
  unitPrice: number
  discountPercent?: number
  taxCategoryId: Uuid
  revenueAccountCode?: string | null
  costCenterId?: Uuid | null
  projectId?: Uuid | null
}

export interface IssueInvoiceInput {
  /** Idempotency key so retries do not double-issue or double-post. */
  idempotencyKey: string
  issueDate?: string | null
}

export interface CancelInvoiceInput {
  idempotencyKey: string
  reason: string
}

export interface RecordPaymentInput extends Omit<PaymentAllocation, 'id' | 'invoiceId' | 'ledgerTransactionRef'> {
  idempotencyKey: string
}

/** Request to the Ledger Service to post a double-entry transaction. */
export interface LedgerPostingRequest {
  eventType: LedgerEventType
  /** NEWWORK-owned idempotent event id; also used as the posting reference. */
  eventId: string
  /** Accounting currency the postings are expressed in. */
  currency: string
  reference: string
  postingDate: string
  entries: LedgerPostingEntry[]
  /** Correlation metadata copied to each BLNK transaction generated from this posting. */
  metaData?: Record<string, unknown>
}

export interface LedgerPostingEntry {
  accountCode: string
  /** Positive debit amount; mutually exclusive with credit. */
  debit?: number
  /** Positive credit amount; mutually exclusive with debit. */
  credit?: number
  description?: string
}

export interface LedgerPostingResponse {
  /** Reference returned by the Ledger Service (opaque to business code). */
  ledgerTransactionRef: string
  eventId: string
  postedAt: string
}

/** Aggregated settings payload for the Finance Settings screens. */
export interface BillingSettings {
  legalEntities: LegalEntity[]
  taxCategories: TaxCategory[]
  currencies: CurrencySettings
  paymentTerms: PaymentTerm[]
}

/** Read responses. */
export interface InvoiceListResponse {
  items: Invoice[]
  totalCount: number
}

export interface ReconciliationResponse {
  matches: ReconciliationMatch[]
  unmatchedCount: number
}

export interface CreditNoteResponse {
  creditNote: CreditNote
}

/**
 * Ledger Service interface. The MVP implementation (useLedgerService) routes
 * these calls through NEWWORK Connect / Anypoint / MCP. Alternative adapters
 * can implement the same interface without touching business logic.
 */
export interface LedgerService {
  post(request: LedgerPostingRequest): Promise<LedgerPostingResponse>
}

export type { Invoice, InvoiceLine }
