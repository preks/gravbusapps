import { ensureShortDateFormat } from './dateUtils'
import { sanitizeFilename } from '@/common/utils/textUtils'
import { formatPaymentMethodForExpenseTables } from '../../../common/utils/paymentMethodListDisplay'
import { ReportType } from '../hooks/useExpenseReportData'
import {
  getAdvancePaymentStatusDisplayT,
  getExpenseItemStatusDisplayT,
  getExpensePlanStatusDisplayT,
  getExpenseRequestStatusDisplayT
} from '../utils'

const dateKeys = new Set(['date', 'startDate', 'endDate', 'submissionDate', 'requestDate', 'createdAt', 'planDate'])

const REPORT_EXPORT_EMPTY = '-'

export type FormatManagerExpenseReportCellOptions = {
  reportType: ReportType
  translate: (key: string) => string
}

function unknownToDisplayStringForExport(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function formatStatusForManagerReportExport(
  reportType: ReportType,
  translate: (key: string) => string,
  raw: unknown
): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    return REPORT_EXPORT_EMPTY
  }
  switch (reportType) {
    case ReportType.EXPENSE_ITEM:
      return getExpenseItemStatusDisplayT(translate, raw).label
    case ReportType.EXPENSE_PLAN:
      return getExpensePlanStatusDisplayT(translate, raw).label
    case ReportType.EXPENSE_REQUEST:
      return getExpenseRequestStatusDisplayT(translate, raw).label
    case ReportType.ADVANCE_PAYMENT:
      return getAdvancePaymentStatusDisplayT(translate, raw).label
    default:
      return raw
  }
}

export const formatManagerExpenseReportCell = (
  key: string,
  raw: unknown,
  options?: FormatManagerExpenseReportCellOptions
): string => {
  if (key === 'paymentMethod') {
    return formatPaymentMethodForExpenseTables(raw, REPORT_EXPORT_EMPTY, options?.translate)
  }
  if (key === 'status' && options !== undefined) {
    return formatStatusForManagerReportExport(options.reportType, options.translate, raw)
  }
  if (raw == null) {
    return REPORT_EXPORT_EMPTY
  }
  if (typeof raw === 'string' && !raw.trim()) {
    return REPORT_EXPORT_EMPTY
  }
  if (dateKeys.has(key)) {
    return raw ? ensureShortDateFormat(unknownToDisplayStringForExport(raw)) : REPORT_EXPORT_EMPTY
  }
  if (typeof raw === 'number') {
    return String(raw)
  }
  if (typeof raw === 'string') {
    return raw
  }
  if (typeof raw === 'boolean') {
    return String(raw)
  }
  return unknownToDisplayStringForExport(raw) || REPORT_EXPORT_EMPTY
}

export const escapeManagerExpenseReportCsv = (value: string) => {
  const needsQuotes = /[",\r\n]/.test(value)
  const out = value.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
}

export const htmlEscapeForManagerExpenseReport = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const buildManagerExpenseReportDownloadFilename = (type: string, ext: string) => {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const filename = `expense-report-${type}-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(
    ts.getHours()
  )}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.${ext}`

  return sanitizeFilename(filename)
}
