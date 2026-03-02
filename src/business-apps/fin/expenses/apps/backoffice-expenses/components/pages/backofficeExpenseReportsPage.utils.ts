import type { ReactNode } from 'react'
import { ensureShortDateFormat } from '../../../manager-expenses/utils/dateUtils'
import { sanitizeFilename } from '@/common/utils/textUtils'
import { ReportType } from '../../hooks/useBackofficeExpenseReportData'

export type ReportColumnDef = { key: string; title: ReactNode; widthClass?: string }

const DATE_KEYS = new Set([
  'date',
  'startDate',
  'endDate',
  'submissionDate',
  'requestDate',
  'createdAt',
  'planDate',
  'pendingAt',
  'approvedAt',
  'paidAt'
])

export const isDateKey = (key: string): boolean => DATE_KEYS.has(key)

const formatCellValue = (key: string, raw: any): string => {
  if (raw == null) return ''
  if (DATE_KEYS.has(key)) {
    return raw ? ensureShortDateFormat(raw) : ''
  }
  if (typeof raw === 'number') return String(raw)
  return String(raw)
}

const escapeCsv = (value: string) => {
  const needsQuotes = /[",\r\n]/.test(value)
  const out = value.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
}

const htmlEscape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildFilename = (type: string, ext: string) => {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const filename = `expense-report-${type}-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.${ext}`
  return sanitizeFilename(filename)
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.setAttribute('rel', 'noopener noreferrer')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const downloadCsvReport = (selectedReportType: ReportType | null, columns: ReportColumnDef[], rows: any[]) => {
  const header = columns.map(column => {
    const title = typeof column.title === 'string' ? column.title : String(column.key)
    return escapeCsv(title)
  })
  const csvRows = rows.map(row => columns.map(column => escapeCsv(formatCellValue(column.key, row[column.key]))))
  const csvLines = [header.join(','), ...csvRows.map(row => row.join(','))]
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, buildFilename(String(selectedReportType), 'csv'))
}

export const downloadExcelReport = (selectedReportType: ReportType | null, columns: ReportColumnDef[], rows: any[]) => {
  const headerCells = columns
    .map(column => {
      const title = typeof column.title === 'string' ? column.title : String(column.key)
      return `<th>${htmlEscape(title)}</th>`
    })
    .join('')
  const bodyRows = rows
    .map(row => {
      const cells = columns
        .map(column => `<td>${htmlEscape(formatCellValue(column.key, row[column.key]))}</td>`)
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')
  const headerHtml = `<thead><tr>${headerCells}</tr></thead>`
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table>${headerHtml}<tbody>${bodyRows}</tbody></table></body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  downloadBlob(blob, buildFilename(String(selectedReportType), 'xls'))
}

export const computeSlaKpis = (selectedReportType: ReportType | null, reportData: any[]) => {
  if (selectedReportType !== ReportType.APPROVAL_PAYOUT_CYCLE) {
    return {
      approvalBreachedLabel: '0/0',
      approvalBreachedRate: '0.0%',
      payoutBreachedLabel: '0/0',
      payoutBreachedRate: '0.0%',
      totalBreachedLabel: '0/0',
      totalBreachedRate: '0.0%',
      withinTotalLabel: '0/0',
      withinTotalRate: '0.0%'
    }
  }

  const rows = Array.isArray(reportData) ? reportData : []
  const evaluatedApproval = rows.filter(row => row?.approvalSlaStatus !== '-')
  const evaluatedPayout = rows.filter(row => row?.payoutSlaStatus !== '-')
  const evaluatedTotal = rows.filter(row => row?.totalCycleSlaStatus !== '-')

  const approvalBreached = evaluatedApproval.filter(row => row?.approvalSlaStatus === 'Breached').length
  const payoutBreached = evaluatedPayout.filter(row => row?.payoutSlaStatus === 'Breached').length
  const totalBreached = evaluatedTotal.filter(row => row?.totalCycleSlaStatus === 'Breached').length
  const withinTotal = evaluatedTotal.filter(row => row?.totalCycleSlaStatus === 'Within SLA').length
  const formatRate = (count: number, total: number) => (total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0.0%')

  return {
    approvalBreachedLabel: `${approvalBreached}/${evaluatedApproval.length}`,
    approvalBreachedRate: formatRate(approvalBreached, evaluatedApproval.length),
    payoutBreachedLabel: `${payoutBreached}/${evaluatedPayout.length}`,
    payoutBreachedRate: formatRate(payoutBreached, evaluatedPayout.length),
    totalBreachedLabel: `${totalBreached}/${evaluatedTotal.length}`,
    totalBreachedRate: formatRate(totalBreached, evaluatedTotal.length),
    withinTotalLabel: `${withinTotal}/${evaluatedTotal.length}`,
    withinTotalRate: formatRate(withinTotal, evaluatedTotal.length)
  }
}
