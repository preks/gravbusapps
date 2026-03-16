import { useState, useCallback } from 'react'
import { toast } from '@newwork/nw-design-system'
import {
  buildFilename,
  formatCellValue,
  triggerDownload,
  buildExcelWorkbook,
  downloadExcelWorkbook
} from '@/common/utils/excelExportUtils'
import type { Activity } from '@/common/data/relations/types/activityTypes'
import dayjs from 'dayjs'

// ─── Column definitions ───────────────────────────────────────────────────────

export const ACTIVITY_EXPORT_COLUMNS = [
  { key: 'owner', title: 'Owner' },
  { key: 'title', title: 'Title' },
  { key: 'description', title: 'Description' },
  { key: 'type', title: 'Type' },
  { key: 'reference', title: 'Reference' },
  { key: 'referenceType', title: 'Reference Type' },
  { key: 'createdAt', title: 'Created Date' },
  { key: 'occurredAt', title: 'Occurred Date' }
] as const

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatDate = (value?: string | null): string => {
  if (!value) return '-'
  const parsed = dayjs(value)
  // Use DD-MMM-YYYY (e.g. "25-Feb-2026") — fixed 11-char width so Excel
  // never shows "########" due to column-too-narrow, and is less likely
  // to be auto-converted to a locale date serial by Excel.
  return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : '-'
}

const getReferenceName = (activity: Activity): string => {
  if (activity.account) return activity.account.name || '-'
  if (activity.contact) {
    const c = activity.contact as any
    return c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '-'
  }
  if (activity.lead) {
    const l = activity.lead as any
    return l.fullName || [l.firstName, l.lastName].filter(Boolean).join(' ') || '-'
  }
  if (activity.opportunity) return (activity.opportunity as any).name || '-'
  // IRM-only: investment
  const inv = (activity as any).investment
  if (inv) return inv.name || '-'
  return 'General'
}

const getReferenceType = (activity: Activity): string => {
  if (activity.accountId) return 'Account'
  if (activity.contactId) return 'Contact'
  if (activity.leadId) return 'Lead'
  if (activity.opportunityId) return 'Opportunity'
  if ((activity as any).investmentId) return 'Investment'
  return 'General'
}

export const formatActivityForExport = (activity: Activity): Record<string, string> => ({
  owner: activity.ownerEmployee?.displayName || '-',
  title: activity.title || '-',
  description: activity.description || '-',
  type: activity.activityType?.value || '-',
  reference: getReferenceName(activity),
  referenceType: getReferenceType(activity),
  createdAt: formatDate(activity.createdAt),
  occurredAt: formatDate(activity.occurredAt)
})

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const sanitizeText = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim()

const escapeCsv = (value: string): string => {
  const sanitized = sanitizeText(value)
  const needsQuotes = /[",]/.test(sanitized)
  const out = sanitized.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
}

// Date columns use ="value" formula syntax so Excel treats them as plain text
// and never auto-converts them to date serials (which causes "########").
const DATE_COLUMN_KEYS = new Set(['createdAt', 'occurredAt'])

const escapeCsvCell = (key: string, value: string): string => {
  if (DATE_COLUMN_KEYS.has(key) && value !== '-') {
    return `="${value}"`
  }
  return escapeCsv(value)
}

const downloadCsv = (
  data: Record<string, string>[],
  columns: readonly { key: string; title: string }[],
  filename: string
) => {
  const header = columns.map(c => escapeCsv(c.title))
  const rows = data.map(row => columns.map(c => escapeCsvCell(c.key, formatCellValue(row[c.key]))))
  const csvContent = '\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

const downloadExcel = async (
  data: Record<string, string>[],
  columns: readonly { key: string; title: string }[],
  filename: string
): Promise<void> => {
  const excelColumns = columns.map(col => ({ header: col.title, key: col.key }))
  const workbook = buildExcelWorkbook('Activities', excelColumns, data, 'NEWWORK Activity Export')
  await downloadExcelWorkbook(workbook, filename)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseActivityExportOptions {
  fetchActivities: (variables: any) => Promise<{ activities?: Activity[]; total?: number }>
  queryVariables: any
  totalCount: number
  filenamePrefix?: string
}

export function useActivityExport({
  fetchActivities,
  queryVariables,
  totalCount,
  filenamePrefix = 'activities'
}: UseActivityExportOptions) {
  const [isExporting, setIsExporting] = useState(false)

  const fetchAllForExport = useCallback(async (): Promise<Activity[]> => {
    const result = await fetchActivities({
      ...queryVariables,
      limit: totalCount,
      offset: 0
    })
    return result.activities || []
  }, [fetchActivities, queryVariables, totalCount])

  const handleExport = useCallback(
    async (format: 'csv' | 'excel') => {
      if (isExporting) return

      if (totalCount === 0) {
        toast.error('No data to export', { description: 'Apply different filters or wait for data to load.' })
        return
      }

      setIsExporting(true)
      const formatLabel = format === 'csv' ? 'CSV' : 'Excel'

      try {
        const activities = await fetchAllForExport()

        if (!activities || activities.length === 0) {
          toast.error('No data to export', { description: 'No activities were found for the current filters.' })
          return
        }

        const rows = activities.map(formatActivityForExport)
        const filename = buildFilename(filenamePrefix, format === 'csv' ? 'csv' : 'xlsx')

        if (format === 'csv') {
          downloadCsv(rows, ACTIVITY_EXPORT_COLUMNS, filename)
        } else {
          await downloadExcel(rows, ACTIVITY_EXPORT_COLUMNS, filename)
        }

        toast.success(`${formatLabel} exported successfully`, {
          description: `${rows.length} activities exported.`
        })
      } catch (err) {
        console.error(`[EXPORT ${formatLabel}] Error:`, err)
        toast.error(`Export failed`, {
          description: err instanceof Error ? err.message : String(err)
        })
      } finally {
        setIsExporting(false)
      }
    },
    [isExporting, totalCount, fetchAllForExport, filenamePrefix]
  )

  const handleExportCsv = useCallback(() => handleExport('csv'), [handleExport])
  const handleExportExcel = useCallback(() => handleExport('excel'), [handleExport])

  return { isExporting, handleExportCsv, handleExportExcel }
}
