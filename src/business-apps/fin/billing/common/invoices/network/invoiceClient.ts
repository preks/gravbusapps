/**
 * Invoice client.
 *
 * Talks to the native NEWWORK invoices domain in the BLNK backend through the
 * shared NEWWORK Connect lane (the `blnk_*_invoice` MCP tools). The canonical
 * NEWWORK invoice is stored as the backend invoice's `data` document, so reads
 * simply return that document and writes send the full invoice plus a few
 * promoted columns used for indexing/listing.
 */
import { invokeLedgerTool, ledgerAdminEnabled } from '../../ledger/network/ledgerAdminClient'
import { INVOICE_STATUSES } from '../types'
import type {
  Invoice,
  InvoiceAuditEntry,
  InvoiceDocumentType,
  InvoiceLine,
  InvoiceStatus,
  InvoiceTotals,
  LedgerTransactionLink,
  PaymentAllocation,
  PaymentMethod
} from '../types'

const InvoiceTools = {
  create: 'blnk_create_invoice',
  list: 'blnk_list_invoices',
  get: 'blnk_get_invoice',
  update: 'blnk_update_invoice',
  filter: 'blnk_filter_invoices',
  issue: 'blnk_issue_invoice',
  payment: 'blnk_record_invoice_payment',
  cancel: 'blnk_cancel_invoice',
  writeOff: 'blnk_write_off_invoice',
  audit: 'blnk_get_invoice_audit'
} as const

/** The invoice API is available whenever the BLNK connector lane is configured. */
export const billingApiEnabled = (): boolean => ledgerAdminEnabled()

/** Build the BLNK invoice request body (promoted columns + full document). */
function toBlnkInvoiceBody(invoice: Invoice): Record<string, unknown> {
  const customerRef = invoice.crmAccountId ? `account:${invoice.crmAccountId}` : undefined

  return {
    invoice_id: invoice.id,
    reference: invoice.invoiceNumber ?? undefined,
    invoice_number: invoice.invoiceNumber ?? undefined,
    status: invoice.status,
    currency: invoice.currency,
    customer_id: invoice.billingCustomerId,
    legal_entity_id: invoice.legalEntityId,
    gross_amount: invoice.totals.grossTotal,
    issue_date: invoice.issueDate ?? undefined,
    due_date: invoice.dueDate ?? undefined,
    data: invoice,
    meta_data: {
      source: 'newwork-billing',
      crmAccountId: invoice.crmAccountId ?? undefined,
      crmOpportunityId: invoice.crmOpportunityId ?? undefined,
      customerType: invoice.crmAccountId ? 'account' : undefined,
      customerRef
    }
  }
}

/** Extract the canonical NEWWORK invoice from a BLNK invoice row. */
function fromBlnkRow(row: Record<string, unknown>): Invoice | null {
  const data = row.data
  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    return normalizeInvoice(data as Invoice, row)
  }
  return null
}

function normalizeDocumentType(value: unknown): InvoiceDocumentType | undefined {
  const documentType = stringValue(value).toUpperCase()
  if (documentType === 'CREDIT_NOTE') return 'CREDIT_NOTE'
  if (documentType === 'INVOICE') return 'INVOICE'
  return undefined
}

function normalizeInvoiceStatus(value: unknown): InvoiceStatus | undefined {
  const status = stringValue(value).toUpperCase()
  return INVOICE_STATUSES.includes(status as InvoiceStatus) ? (status as InvoiceStatus) : undefined
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const method = stringValue(value).toUpperCase()
  if (['BANK_TRANSFER', 'SEPA_DIRECT_DEBIT', 'CARD', 'CASH', 'OTHER'].includes(method)) {
    return method as PaymentMethod
  }
  return 'OTHER'
}

function normalizePayment(payment: PaymentAllocation & Record<string, unknown>, index: number): PaymentAllocation {
  const paymentDate =
    stringValue(payment.paymentDate) ||
    stringValue(payment.paidAt) ||
    stringValue(payment.paid_at) ||
    stringValue(payment.createdAt) ||
    stringValue(payment.created_at)

  return {
    id: stringValue(payment.id) || stringValue(payment.payment_id) || `payment-${index}`,
    invoiceId: stringValue(payment.invoiceId) || stringValue(payment.invoice_id),
    amount: typeof payment.amount === 'number' ? payment.amount : Number(payment.amount ?? 0),
    currency: stringValue(payment.currency),
    method: normalizePaymentMethod(payment.method),
    paymentDate,
    externalReference:
      stringValue(payment.externalReference) ||
      stringValue(payment.external_reference) ||
      stringValue(payment.reference) ||
      null,
    ledgerTransactionRef:
      stringValue(payment.ledgerTransactionRef) || stringValue(payment.ledger_transaction_ref) || null
  }
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normalizeInvoiceTotals(
  invoice: Invoice & Record<string, unknown>,
  row: Record<string, unknown> = {}
): InvoiceTotals {
  const totals = invoice.totals as (Partial<InvoiceTotals> & Record<string, unknown>) | undefined
  return {
    netTotal: numberValue(totals?.netTotal ?? totals?.net_total ?? invoice.net_amount ?? row.net_amount),
    taxTotal: numberValue(totals?.taxTotal ?? totals?.tax_total ?? invoice.tax_amount ?? row.tax_amount),
    grossTotal: numberValue(totals?.grossTotal ?? totals?.gross_total ?? invoice.gross_amount ?? row.gross_amount)
  }
}

function invoiceArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function normalizeInvoice(
  invoice: Invoice & Record<string, unknown>,
  row: Record<string, unknown> = {}
): Invoice {
  const lines = invoiceArray<InvoiceLine>(invoice.lines)
  const ledgerLinks = invoiceArray<LedgerTransactionLink>(invoice.ledgerLinks).length
    ? invoiceArray<LedgerTransactionLink>(invoice.ledgerLinks)
    : invoiceArray<LedgerTransactionLink>(invoice.ledger_links)
  const payments = invoiceArray<PaymentAllocation>(invoice.payments)
  const audit = invoiceArray<InvoiceAuditEntry>(invoice.audit)

  return {
    ...invoice,
    id: invoice.id || stringValue(row.invoice_id),
    invoiceNumber:
      invoice.invoiceNumber || stringValue(invoice.invoice_number) || stringValue(row.invoice_number) || null,
    status: normalizeInvoiceStatus(invoice.status) ?? normalizeInvoiceStatus(row.status) ?? 'DRAFT',
    legalEntityId: invoice.legalEntityId || stringValue(invoice.legal_entity_id) || stringValue(row.legal_entity_id),
    billingCustomerId: invoice.billingCustomerId || stringValue(invoice.customer_id) || stringValue(row.customer_id),
    currency: invoice.currency || stringValue(row.currency),
    issueDate: invoice.issueDate || stringValue(invoice.issue_date) || stringValue(row.issue_date) || null,
    dueDate: invoice.dueDate || stringValue(invoice.due_date) || stringValue(row.due_date) || null,
    documentType:
      normalizeDocumentType(invoice.documentType) ??
      normalizeDocumentType(invoice.document_type) ??
      normalizeDocumentType(row.document_type) ??
      'INVOICE',
    originalInvoiceId: stringValue(invoice.originalInvoiceId) || stringValue(invoice.original_invoice_id) || null,
    originalInvoiceNumber:
      stringValue(invoice.originalInvoiceNumber) || stringValue(invoice.original_invoice_number) || null,
    lines,
    totals: normalizeInvoiceTotals(invoice, row),
    paidAmount: numberValue(invoice.paidAmount ?? invoice.paid_amount ?? row.paid_amount),
    ledgerLinks,
    payments: payments.map((payment, index) =>
      normalizePayment(payment as PaymentAllocation & Record<string, unknown>, index)
    ),
    audit,
    createdAt: invoice.createdAt || stringValue(invoice.created_at) || stringValue(row.created_at),
    updatedAt: invoice.updatedAt || stringValue(invoice.updated_at) || stringValue(row.updated_at)
  }
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function toToolPaymentMethod(method: string | undefined): string | undefined {
  return method ? method.toLowerCase() : undefined
}

/** Load all invoices (latest snapshot per id) from the backend. */
export async function listInvoices(accessToken: string): Promise<Invoice[]> {
  const rows = await invokeLedgerTool(accessToken, InvoiceTools.list, { limit: 500 })
  return rows.map(fromBlnkRow).filter((invoice): invoice is Invoice => invoice !== null)
}

/** Load a single invoice directly from the backend. */
export async function getInvoice(accessToken: string, invoiceId: string): Promise<Invoice | null> {
  const rows = await invokeLedgerTool(accessToken, InvoiceTools.get, { invoice_id: invoiceId })
  return firstInvoiceRow(rows)
}

/** Persist a brand-new invoice. Throws if the backend rejects it. */
export async function createInvoice(accessToken: string, invoice: Invoice): Promise<void> {
  await invokeLedgerTool(accessToken, InvoiceTools.create, toBlnkInvoiceBody(invoice))
}

/** Replace an existing invoice with a new snapshot (status changes, payments, edits). */
export async function updateInvoice(accessToken: string, invoice: Invoice): Promise<void> {
  await invokeLedgerTool(accessToken, InvoiceTools.update, toBlnkInvoiceBody(invoice))
}

/** Return the canonical invoice from the first workflow response row, if any. */
function firstInvoiceRow(rows: Array<Record<string, unknown>>): Invoice | null {
  if (rows.length === 0) return null
  return fromBlnkRow(rows[0])
}

export interface IssueInvoiceArgs {
  idempotencyKey: string
  actorId?: string
  numberPrefix?: string
  numberPeriod?: string
  numberPadding?: number
  dueDate?: string
  ledgerTransactionRef?: string
}

/** Issue a draft invoice; the server assigns the authoritative number + status. */
export async function issueInvoice(
  accessToken: string,
  invoiceId: string,
  args: IssueInvoiceArgs
): Promise<Invoice | null> {
  const rows = await invokeLedgerTool(accessToken, InvoiceTools.issue, {
    invoice_id: invoiceId,
    idempotency_key: args.idempotencyKey,
    actor_id: args.actorId,
    number_prefix: args.numberPrefix,
    number_period: args.numberPeriod,
    number_padding: args.numberPadding,
    due_date: args.dueDate,
    ledger_transaction_ref: args.ledgerTransactionRef
  })
  return firstInvoiceRow(rows)
}

export interface RecordPaymentArgs {
  idempotencyKey: string
  actorId?: string
  amount: number
  currency?: string
  method?: string
  reference?: string
  ledgerTransactionRef?: string
  paidAt?: string
}

/** Record a payment allocation server-side; status is derived by the backend. */
export async function recordInvoicePayment(
  accessToken: string,
  invoiceId: string,
  args: RecordPaymentArgs
): Promise<Invoice | null> {
  const rows = await invokeLedgerTool(accessToken, InvoiceTools.payment, {
    invoice_id: invoiceId,
    idempotency_key: args.idempotencyKey,
    actor_id: args.actorId,
    amount: args.amount,
    currency: args.currency,
    method: toToolPaymentMethod(args.method),
    reference: args.reference,
    ledger_transaction_ref: args.ledgerTransactionRef,
    paid_at: args.paidAt
  })
  return firstInvoiceRow(rows)
}

export interface SimpleWorkflowArgs {
  idempotencyKey: string
  actorId?: string
  reason?: string
  ledgerTransactionRef?: string
}

/** Cancel an invoice server-side. */
export async function cancelInvoice(
  accessToken: string,
  invoiceId: string,
  args: SimpleWorkflowArgs
): Promise<Invoice | null> {
  const rows = await invokeLedgerTool(accessToken, InvoiceTools.cancel, {
    invoice_id: invoiceId,
    idempotency_key: args.idempotencyKey,
    actor_id: args.actorId,
    reason: args.reason,
    ledger_transaction_ref: args.ledgerTransactionRef
  })
  return firstInvoiceRow(rows)
}

/** Write off an invoice server-side. */
export async function writeOffInvoice(
  accessToken: string,
  invoiceId: string,
  args: SimpleWorkflowArgs
): Promise<Invoice | null> {
  const rows = await invokeLedgerTool(accessToken, InvoiceTools.writeOff, {
    invoice_id: invoiceId,
    idempotency_key: args.idempotencyKey,
    actor_id: args.actorId,
    reason: args.reason,
    ledger_transaction_ref: args.ledgerTransactionRef
  })
  return firstInvoiceRow(rows)
}

/** Fetch the server-recorded audit trail for an invoice. */
export async function getInvoiceAudit(accessToken: string, invoiceId: string): Promise<InvoiceAuditEntry[]> {
  const rows = await invokeLedgerTool(accessToken, InvoiceTools.audit, { invoice_id: invoiceId })
  return rows.map(row => ({
    id: stringValue(row.event_id),
    action: stringValue(row.action),
    timestamp: stringValue(row.created_at),
    actorId: (row.actor_id ?? null) as string | null,
    details: (row.details ?? null) as string | null,
    metaData: (row.meta_data ?? null) as Record<string, unknown> | null
  }))
}
