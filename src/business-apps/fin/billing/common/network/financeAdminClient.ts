/**
 * Finance admin client.
 *
 * Wraps the BLNK admin/report/reconciliation MCP tools through the shared
 * NEWWORK Connect lane (the same transport as the ledger + invoice clients).
 * Keeps all finance data server-owned: reconciliation lines, settings,
 * reporting periods, and reports are computed/persisted by BLNK.
 */
import { invokeLedgerTool, ledgerAdminEnabled } from './ledgerAdminClient'
import type { BankStatementLine } from '../types'
import type { BillingSettings } from '../queries/billingCoreApi'
import type { PostingAccounts } from '../constants'

const AdminTools = {
  importStatement: 'blnk_import_bank_statement',
  listStatementLines: 'blnk_list_bank_statement_lines',
  suggestMatches: 'blnk_suggest_bank_statement_matches',
  applyMatch: 'blnk_apply_bank_statement_match',
  unapplyMatch: 'blnk_unapply_bank_statement_match',
  getSettings: 'blnk_get_finance_settings',
  saveSettings: 'blnk_save_finance_settings',
  listPeriods: 'blnk_list_reporting_periods',
  closePeriod: 'blnk_close_reporting_period',
  reopenPeriod: 'blnk_reopen_reporting_period',
  reportArAging: 'blnk_report_ar_aging',
  reportRevenue: 'blnk_report_revenue',
  reportVat: 'blnk_report_vat',
  healthDetailed: 'blnk_health_detailed'
} as const

export const financeAdminEnabled = (): boolean => ledgerAdminEnabled()

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
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
  const rows = await invokeLedgerTool(accessToken, AdminTools.importStatement, {
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
  const rows = await invokeLedgerTool(accessToken, AdminTools.listStatementLines, { status, limit: 500 })
  return rows.map(toStatementLine)
}

/** Apply a statement line to an invoice (records payment + marks matched). */
export async function applyBankStatementMatch(
  accessToken: string,
  lineId: string,
  invoiceId: string,
  amount: number
): Promise<void> {
  await invokeLedgerTool(accessToken, AdminTools.applyMatch, {
    line_id: lineId,
    invoice_id: invoiceId,
    amount,
    idempotency_key: `recon:${lineId}:${invoiceId}`
  })
}

export interface ReportFilter {
  legalEntityId?: string
  currency?: string
}

export interface ArAgingBucket {
  currency: string
  current: number
  days1To30: number
  days31To60: number
  days61To90: number
  days90Plus: number
  total: number
}

export interface RevenueRow {
  period: string
  currency: string
  net: number
  tax: number
  gross: number
  count: number
}

export interface VatRow {
  currency: string
  net: number
  tax: number
  gross: number
}

function reportArgs(filter?: ReportFilter): Record<string, unknown> {
  return { legal_entity_id: filter?.legalEntityId, currency: filter?.currency }
}

export async function fetchArAging(accessToken: string, filter?: ReportFilter): Promise<ArAgingBucket[]> {
  const rows = await invokeLedgerTool(accessToken, AdminTools.reportArAging, reportArgs(filter))
  return rows.map(row => ({
    currency: str(row.currency),
    current: num(row.current),
    days1To30: num(row.days_1_30),
    days31To60: num(row.days_31_60),
    days61To90: num(row.days_61_90),
    days90Plus: num(row.days_90_plus),
    total: num(row.total)
  }))
}

export async function fetchRevenue(accessToken: string, filter?: ReportFilter): Promise<RevenueRow[]> {
  const rows = await invokeLedgerTool(accessToken, AdminTools.reportRevenue, reportArgs(filter))
  return rows
    .map(row => ({
      period: str(row.period),
      currency: str(row.currency),
      net: num(row.net),
      tax: num(row.tax),
      gross: num(row.gross),
      count: num(row.count)
    }))
    .sort((a, b) => b.period.localeCompare(a.period))
}

export async function fetchVat(accessToken: string, filter?: ReportFilter): Promise<VatRow[]> {
  const rows = await invokeLedgerTool(accessToken, AdminTools.reportVat, reportArgs(filter))
  return rows.map(row => ({
    currency: str(row.currency),
    net: num(row.net),
    tax: num(row.tax),
    gross: num(row.gross)
  }))
}

export interface ReportingPeriod {
  legalEntityId: string
  periodKey: string
  status: string
  closedBy?: string | null
  closedAt?: string | null
}

export async function listReportingPeriods(accessToken: string, legalEntityId?: string): Promise<ReportingPeriod[]> {
  const rows = await invokeLedgerTool(accessToken, AdminTools.listPeriods, { legal_entity_id: legalEntityId })
  return rows.map(row => ({
    legalEntityId: str(row.legal_entity_id),
    periodKey: str(row.period_key),
    status: str(row.status),
    closedBy: (row.closed_by as string) ?? null,
    closedAt: (row.closed_at as string) ?? null
  }))
}

export async function closeReportingPeriod(
  accessToken: string,
  periodKey: string,
  legalEntityId?: string
): Promise<void> {
  await invokeLedgerTool(accessToken, AdminTools.closePeriod, { period_key: periodKey, legal_entity_id: legalEntityId })
}

export async function reopenReportingPeriod(
  accessToken: string,
  periodKey: string,
  legalEntityId?: string
): Promise<void> {
  await invokeLedgerTool(accessToken, AdminTools.reopenPeriod, {
    period_key: periodKey,
    legal_entity_id: legalEntityId
  })
}

export interface BackendHealth {
  status: string
  checks: Record<string, string>
}

export async function fetchDetailedHealth(accessToken: string): Promise<BackendHealth | null> {
  const rows = await invokeLedgerTool(accessToken, AdminTools.healthDetailed, {})
  const first = rows[0] as { status?: string; checks?: Record<string, string> } | undefined
  if (!first) return null
  return { status: first.status ?? 'UNKNOWN', checks: first.checks ?? {} }
}

/**
 * Finance settings document persisted server-side under a single key.
 * Extends the invoice-facing BillingSettings with posting rules and numbering,
 * so the whole finance configuration lives in one authoritative document.
 */
export interface FinanceNumberingSettings {
  format: string
  resetPolicy: string
}

/** Editable posting-account map (same keys as the defaults, free-form codes). */
export type PostingAccountsConfig = Record<keyof PostingAccounts, string>

export interface FinanceSettingsDocument extends BillingSettings {
  postingAccounts: PostingAccountsConfig
  numbering: FinanceNumberingSettings
}

/**
 * Load the finance settings document from BLNK. Returns null when the backend
 * has no document yet (empty data) so callers can distinguish "not seeded" from
 * a real document. Never returns mock data.
 */
export async function getFinanceSettings(
  accessToken: string,
  key = 'default'
): Promise<FinanceSettingsDocument | null> {
  const rows = await invokeLedgerTool(accessToken, AdminTools.getSettings, { key })
  const first = rows[0] as { data?: unknown } | undefined
  const data = first?.data
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
    return null
  }
  return data as FinanceSettingsDocument
}

/** Upsert the finance settings document in BLNK. */
export async function saveFinanceSettings(
  accessToken: string,
  document: FinanceSettingsDocument,
  key = 'default'
): Promise<void> {
  await invokeLedgerTool(accessToken, AdminTools.saveSettings, { key, data: document })
}

/** Create a credit note against an invoice (returns the new credit note row). */
export async function createCreditNote(
  accessToken: string,
  invoiceId: string,
  args: { amount?: number; reason?: string }
): Promise<Record<string, unknown> | null> {
  const rows = await invokeLedgerTool(accessToken, 'blnk_create_credit_note', {
    invoice_id: invoiceId,
    amount: args.amount,
    reason: args.reason,
    idempotency_key: `creditnote:${invoiceId}:${Date.now()}`
  })
  return rows[0] ?? null
}
