import { useState, useCallback } from 'react'
import { toast } from '@newwork/nw-design-system'
import {
  buildFilename,
  buildExcelWorkbook,
  buildExcelWorkbookWithSummary,
  downloadExcelWorkbook,
  downloadCsvData
} from '@/common/utils/excelExportUtils'

import type { ExportToastMessages } from '@/common/components/common-relations/apps/data-export/utils/exportI18n'

export interface UseExportBaseOptions<TItem> {
  /** Pre-bound fetch that returns all items for the current filters (no pagination). */
  fetchAllItems: () => Promise<TItem[]>
  /** Maps a single domain item to a flat string record for CSV/Excel. */
  formatItem: (item: TItem) => Record<string, string>
  /** Column definitions used for both CSV and Excel output. */
  columns: readonly { key: string; title: string }[]
  /** Keys whose values should be wrapped in `="value"` in CSV to prevent Excel date auto-conversion. */
  dateColumnKeys: Set<string>
  /** Excel worksheet name (e.g. 'Activities', 'Tasks'). */
  sheetName: string
  /** Singular/plural entity label used in toast messages (e.g. 'activities', 'tasks'). */
  entityLabel: string
  /** Total count used to guard against exporting when no data is available. */
  totalCount: number
  /** Filename prefix (timestamp is appended automatically). */
  filenamePrefix?: string
  /**
   * Optional summary rows to prepend before the data table in both CSV and Excel exports.
   * Each entry is a [label, value] tuple (e.g. ['Total investment:', '€1,234,567']).
   */
  summaryRows?: Array<[string, string]>
  /** Optional localized toast messages for export feedback. */
  toastMessages?: ExportToastMessages
}

/**
 * Generic export hook.
 * Handles the full export flow (guard, fetch, format, download, toasts) so that
 * domain-specific export hooks (useActivityExport, useTaskExport, …) only need
 * to supply the data-mapping details.
 */
export function useExportBase<TItem>({
  fetchAllItems,
  formatItem,
  columns,
  dateColumnKeys,
  sheetName,
  entityLabel,
  totalCount,
  filenamePrefix = 'export',
  summaryRows,
  toastMessages
}: UseExportBaseOptions<TItem>) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(
    async (format: 'csv' | 'excel') => {
      if (isExporting) return

      if (totalCount === 0) {
        toast.error(toastMessages?.noDataTitle ?? 'No data to export', {
          description: toastMessages?.noDataDescription ?? 'Apply different filters or wait for data to load.'
        })
        return
      }

      setIsExporting(true)
      const formatLabel = format === 'csv' ? 'CSV' : 'Excel'

      try {
        const items = await fetchAllItems()

        if (!items || items.length === 0) {
          toast.error(toastMessages?.noDataTitle ?? 'No data to export', {
            description:
              toastMessages?.noFilteredDataDescription ?? `No ${entityLabel} were found for the current filters.`
          })
          return
        }

        const rows = items.map(formatItem)
        const filename = buildFilename(filenamePrefix, format === 'csv' ? 'csv' : 'xlsx')

        if (format === 'csv') {
          downloadCsvData(rows, columns, filename, dateColumnKeys, summaryRows)
        } else {
          const excelColumns = columns.map(col => ({ header: col.title, key: col.key }))
          const workbook =
            summaryRows && summaryRows.length > 0
              ? buildExcelWorkbookWithSummary(sheetName, excelColumns, rows, summaryRows, `NEWWORK ${sheetName} Export`)
              : buildExcelWorkbook(sheetName, excelColumns, rows, `NEWWORK ${sheetName} Export`)
          await downloadExcelWorkbook(workbook, filename)
        }

        toast.success(
          format === 'csv'
            ? (toastMessages?.successCsvTitle ?? `${formatLabel} exported successfully`)
            : (toastMessages?.successExcelTitle ?? `${formatLabel} exported successfully`),
          {
            description: toastMessages?.successDescription(rows.length) ?? `${rows.length} ${entityLabel} exported.`
          }
        )
      } catch (err) {
        console.error(`[EXPORT ${formatLabel}] Error:`, err)
        toast.error(toastMessages?.failedTitle ?? 'Export failed', {
          description: err instanceof Error ? err.message : String(err)
        })
      } finally {
        setIsExporting(false)
      }
    },
    [
      isExporting,
      totalCount,
      fetchAllItems,
      formatItem,
      columns,
      dateColumnKeys,
      sheetName,
      entityLabel,
      filenamePrefix,
      summaryRows,
      toastMessages
    ]
  )

  const handleExportCsv = useCallback(() => handleExport('csv'), [handleExport])
  const handleExportExcel = useCallback(() => handleExport('excel'), [handleExport])

  return { isExporting, handleExportCsv, handleExportExcel }
}
