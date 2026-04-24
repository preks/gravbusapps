import { ReportType } from '../hooks/useExpenseReportData'

const MANAGER_REPORT_TYPE_ORDER: readonly ReportType[] = [
  ReportType.EXPENSE_ITEM,
  ReportType.EXPENSE_PLAN,
  ReportType.EXPENSE_REQUEST,
  ReportType.ADVANCE_PAYMENT
] as const

export const parseManagerReportTypeParam = (raw: string | null): ReportType | null => {
  if (!raw) {
    return null
  }
  if ((MANAGER_REPORT_TYPE_ORDER as readonly string[]).includes(raw)) {
    return raw as ReportType
  }
  return null
}

export const readManagerExpenseReportTypeFromUrl = (): ReportType | null => {
  if (globalThis.location === undefined) {
    return null
  }
  return parseManagerReportTypeParam(new URLSearchParams(globalThis.location.search).get('reportType'))
}

export const syncManagerExpenseReportTypeInUrl = (selectedReportType: string): void => {
  if (globalThis.location === undefined) {
    return
  }
  const params = new URLSearchParams(globalThis.location.search)
  params.set('reportType', selectedReportType)
  const qs = params.toString()
  const next = qs ? `${globalThis.location.pathname}?${qs}` : globalThis.location.pathname
  globalThis.history?.replaceState(null, '', next)
}
