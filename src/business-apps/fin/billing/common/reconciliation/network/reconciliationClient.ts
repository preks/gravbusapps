import { invokeLedgerTool } from '../../ledger/network/ledgerAdminClient'
import type { BankStatementLine, ReconciliationMatch } from '../types'

const ReconciliationTools = {
  importStatement: 'blnk_import_bank_statement',
  listStatementLines: 'blnk_list_bank_statement_lines',
  suggestMatches: 'blnk_suggest_bank_statement_matches',
  applyMatch: 'blnk_apply_bank_statement_match'
} as const

function str(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function num(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

/** Map a backend bank statement row to the UI BankStatementLine shape. */
function toStatementLine(row: Record<string, unknown>): BankStatementLine {
  return {
    id: str(row.line_id),
    bookingDate: str(row.booking_date),
    amount: num(row.amount),
    currency: str(row.currency),
    counterparty: (row.counterparty as string) ?? null,
    reference: (row.reference as string) ?? null,
    matchedInvoiceId: (row.matched_invoice_id as string) || null
  }
}

function toReconciliationMatch(row: Record<string, unknown>): ReconciliationMatch {
  return {
    bankStatementLineId: str(row.bank_statement_line_id ?? row.line_id ?? row.bankStatementLineId),
    invoiceId: str(row.invoice_id ?? row.invoiceId),
    confidence: num(row.confidence),
    matchedAmount: num(row.matched_amount ?? row.matchedAmount ?? row.amount)
  }
}

export interface ImportStatementLine {
  amount: number
  currency: string
  bookingDate?: string | null
  counterparty?: string | null
  reference?: string | null
  description?: string | null
  legalEntityId?: string | null
}

/** Persist imported bank statement lines. Returns the count inserted. */
export async function importBankStatement(accessToken: string, lines: ImportStatementLine[]): Promise<number> {
  const rows = await invokeLedgerTool(accessToken, ReconciliationTools.importStatement, {
    lines: lines.map(line => ({
      amount: line.amount,
      currency: line.currency,
      booking_date: line.bookingDate ?? undefined,
      counterparty: line.counterparty ?? undefined,
      reference: line.reference ?? undefined,
      description: line.description ?? undefined,
      legal_entity_id: line.legalEntityId ?? undefined
    }))
  })
  const first = rows[0] as { imported?: number } | undefined
  return first?.imported ?? 0
}

/** Load persisted bank statement lines. */
export async function listBankStatementLines(accessToken: string, status?: string): Promise<BankStatementLine[]> {
  const rows = await invokeLedgerTool(accessToken, ReconciliationTools.listStatementLines, { status, limit: 500 })
  return rows.map(toStatementLine)
}

/** Load backend-computed bank statement match suggestions. */
export async function suggestBankStatementMatches(accessToken: string): Promise<ReconciliationMatch[]> {
  const rows = await invokeLedgerTool(accessToken, ReconciliationTools.suggestMatches, { limit: 500 })
  return rows.map(toReconciliationMatch).filter(match => match.bankStatementLineId && match.invoiceId)
}

/** Apply a statement line to an invoice (records payment and marks matched). */
export async function applyBankStatementMatch(
  accessToken: string,
  lineId: string,
  invoiceId: string,
  amount: number
): Promise<void> {
  await invokeLedgerTool(accessToken, ReconciliationTools.applyMatch, {
    line_id: lineId,
    invoice_id: invoiceId,
    amount,
    idempotency_key: `recon:${lineId}:${invoiceId}`
  })
}
