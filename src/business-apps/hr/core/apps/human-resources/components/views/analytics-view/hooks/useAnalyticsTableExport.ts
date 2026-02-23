import { useState, useCallback } from 'react'
import { exportTableToExcel, exportTableToPdf } from '../utils/exportUtils'

export interface ExportColumn {
  key: string
  header: string
}

/**
 * Shared hook for analytics table export (Excel/PDF).
 * Eliminates duplicated handleExport and resolveExportingFormat across Compensation, Dashboard, etc.
 */
export function useAnalyticsTableExport() {
  const [exportingTable, setExportingTable] = useState<string | null>(null)

  const handleExport = useCallback(
    async <T extends object>(
      format: 'excel' | 'pdf',
      tableName: string,
      title: string,
      columns: ExportColumn[],
      data: T[],
      transformRows?: (data: T[], format: 'excel' | 'pdf', columns: ExportColumn[]) => Record<string, unknown>[]
    ) => {
      setExportingTable(`${tableName}-${format}`)
      try {
        const rows = transformRows
          ? transformRows(data, format, columns)
          : (data.map(row => ({ ...row })) as Record<string, unknown>[])
        if (format === 'excel') {
          await exportTableToExcel(title, columns, rows)
        } else {
          await exportTableToPdf(title, columns, rows)
        }
      } finally {
        setExportingTable(null)
      }
    },
    []
  )

  const resolveExportingFormat = useCallback(
    (tableName: string): 'excel' | 'pdf' | null => {
      if (exportingTable === `${tableName}-excel`) return 'excel'
      if (exportingTable === `${tableName}-pdf`) return 'pdf'
      return null
    },
    [exportingTable]
  )

  return { exportingTable, setExportingTable, handleExport, resolveExportingFormat }
}
