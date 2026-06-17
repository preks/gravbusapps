import { invokeLedgerTool } from '../../ledger/network/ledgerAdminClient'

const ReportTools = {
  listPeriods: 'blnk_list_reporting_periods',
  closePeriod: 'blnk_close_reporting_period',
  reopenPeriod: 'blnk_reopen_reporting_period',
  reportArAging: 'blnk_report_ar_aging',
  reportRevenue: 'blnk_report_revenue',
  reportVat: 'blnk_report_vat'
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
  const rows = await invokeLedgerTool(accessToken, ReportTools.reportArAging, reportArgs(filter))
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
  const rows = await invokeLedgerTool(accessToken, ReportTools.reportRevenue, reportArgs(filter))
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
  const rows = await invokeLedgerTool(accessToken, ReportTools.reportVat, reportArgs(filter))
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
  const rows = await invokeLedgerTool(accessToken, ReportTools.listPeriods, { legal_entity_id: legalEntityId })
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
  await invokeLedgerTool(accessToken, ReportTools.closePeriod, {
    period_key: periodKey,
    legal_entity_id: legalEntityId
  })
}

export async function reopenReportingPeriod(
  accessToken: string,
  periodKey: string,
  legalEntityId?: string
): Promise<void> {
  await invokeLedgerTool(accessToken, ReportTools.reopenPeriod, {
    period_key: periodKey,
    legal_entity_id: legalEntityId
  })
}
