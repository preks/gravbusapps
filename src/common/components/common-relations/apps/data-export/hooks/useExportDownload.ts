import { useCallback, useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import {
  buildFilename,
  buildExcelWorkbook,
  downloadExcelWorkbook,
  downloadCsvData
} from '@/common/utils/excelExportUtils'
import type { EntityExportDefinition } from '../types/configTypes'
import type { ExportToastMessages } from '../utils/exportI18n'
import {
  formatEntityForExport,
  getDateColumnKeys,
  resolveExportFields,
  toExportColumns
} from '../types/exportFieldTypes'

interface UseExportDownloadOptions<TEntity, TQueryVars> {
  definition: EntityExportDefinition<TEntity, TQueryVars>
  selectedFilters: Record<string, unknown>
  totalCount: number
  toastMessages?: ExportToastMessages
}

export function useExportDownload<TEntity, TQueryVars>({
  definition,
  selectedFilters,
  totalCount,
  toastMessages
}: UseExportDownloadOptions<TEntity, TQueryVars>) {
  const [isExporting, setIsExporting] = useState(false)

  const fetchAllItems = useCallback(async (): Promise<TEntity[]> => {
    // Reuse the total already resolved by refreshCount (recomputed on every filter change) instead
    // of issuing a separate limit:1 count probe here. runExport already guards totalCount === 0.
    if (totalCount <= 0) {
      return []
    }

    const fetchVars = definition.buildQueryVariables({
      selectedFilters,
      limit: totalCount,
      offset: 0
    })

    const result = await definition.fetchPage(fetchVars)
    return result.items
  }, [definition, selectedFilters, totalCount])

  const runExport = useCallback(
    async (format: 'csv' | 'excel', fieldKeys: string[]) => {
      if (isExporting) {
        return
      }

      if (totalCount === 0) {
        toast.error(toastMessages?.noDataTitle ?? 'No data to export', {
          description: toastMessages?.noDataDescription ?? 'Apply different filters or wait for data to load.'
        })
        return
      }

      if (fieldKeys.length === 0) {
        return
      }

      setIsExporting(true)
      const formatLabel = format === 'csv' ? 'CSV' : 'Excel'
      const activeFields = resolveExportFields(definition.exportFields, fieldKeys)
      const columns = toExportColumns(activeFields)
      const dateColumnKeys = getDateColumnKeys(activeFields)

      try {
        const items = await fetchAllItems()

        if (!items || items.length === 0) {
          toast.error(toastMessages?.noDataTitle ?? 'No data to export', {
            description:
              toastMessages?.noFilteredDataDescription ??
              `No ${definition.entityLabel} were found for the current filters.`
          })
          return
        }

        const rows = items.map(item => formatEntityForExport(item, activeFields))
        const filename = buildFilename(definition.filenamePrefix, format === 'csv' ? 'csv' : 'xlsx')

        if (format === 'csv') {
          downloadCsvData(rows, columns, filename, dateColumnKeys)
        } else {
          const excelColumns = columns.map(col => ({ header: col.title, key: col.key }))
          const workbook = buildExcelWorkbook(
            definition.sheetName,
            excelColumns,
            rows,
            `NEWWORK ${definition.sheetName} Export`
          )
          await downloadExcelWorkbook(workbook, filename)
        }

        toast.success(
          format === 'csv'
            ? (toastMessages?.successCsvTitle ?? `${formatLabel} exported successfully`)
            : (toastMessages?.successExcelTitle ?? `${formatLabel} exported successfully`),
          {
            description:
              toastMessages?.successDescription(rows.length) ?? `${rows.length} ${definition.entityLabel} exported.`
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
    [definition, fetchAllItems, isExporting, toastMessages, totalCount]
  )

  return { isExporting, runExport }
}
