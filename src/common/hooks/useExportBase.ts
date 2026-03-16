import { useState, useCallback } from 'react'
import { toast } from '@newwork/nw-design-system'
import {
  buildFilename,
  buildExcelWorkbook,
  downloadExcelWorkbook,
  downloadCsvData
} from '@/common/utils/excelExportUtils'

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
  filenamePrefix = 'export'
}: UseExportBaseOptions<TItem>) {
  const [isExporting, setIsExporting] = useState(false)

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
        const items = await fetchAllItems()

        if (!items || items.length === 0) {
          toast.error('No data to export', {
            description: `No ${entityLabel} were found for the current filters.`
          })
          return
        }

        const rows = items.map(formatItem)
        const filename = buildFilename(filenamePrefix, format === 'csv' ? 'csv' : 'xlsx')

        if (format === 'csv') {
          downloadCsvData(rows, columns, filename, dateColumnKeys)
        } else {
          const excelColumns = columns.map(col => ({ header: col.title, key: col.key }))
          const workbook = buildExcelWorkbook(sheetName, excelColumns, rows, `NEWWORK ${sheetName} Export`)
          await downloadExcelWorkbook(workbook, filename)
        }

        toast.success(`${formatLabel} exported successfully`, {
          description: `${rows.length} ${entityLabel} exported.`
        })
      } catch (err) {
        console.error(`[EXPORT ${formatLabel}] Error:`, err)
        toast.error('Export failed', {
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
      filenamePrefix
    ]
  )

  const handleExportCsv = useCallback(() => handleExport('csv'), [handleExport])
  const handleExportExcel = useCallback(() => handleExport('excel'), [handleExport])

  return { isExporting, handleExportCsv, handleExportExcel }
}
