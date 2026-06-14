/**
 * Invoice client.
 *
 * Talks to the native NEWWORK invoices domain in the BLNK backend through the
 * shared NEWWORK Connect lane (the `blnk_*_invoice` MCP tools). The canonical
 * NEWWORK invoice is stored as the backend invoice's `data` document, so reads
 * simply return that document and writes send the full invoice plus a few
 * promoted columns used for indexing/listing.
 */
import { invokeLedgerTool, ledgerAdminEnabled } from './ledgerAdminClient'
import type { Invoice, InvoiceAuditEntry } from '../types'

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
  if (data && typeof data === 'object' && Object.keys(data as object).length > 0) {
    return data as Invoice
  }
  return null
}

/** Load all invoices (latest snapshot per id) from the backend. */
export async function listInvoices(accessToken: string): Promise<Invoice[]> {
  const rows = await invokeLedgerTool(accessToken, InvoiceTools.list, { limit: 500 })
  return rows.map(fromBlnkRow).filter((invoice): invoice is Invoice => invoice !== null)
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
    method: args.method,
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
    id: String(row.event_id ?? ''),
    action: String(row.action ?? ''),
    timestamp: String(row.created_at ?? ''),
    actorId: (row.actor_id ?? null) as string | null,
    details: (row.details ?? null) as string | null
  }))
}
