import {
  buildExcelWorkbook,
  buildFilename,
  downloadCsvData,
  downloadExcelWorkbook,
  type ExcelColumn
} from '@/common/utils/excelExportUtils'

interface ExportColumnLike {
  key: string
  title: string
}

export const downloadRowsAsCsv = <TRow extends Record<string, string>>(
  rows: TRow[],
  columns: ExportColumnLike[],
  filePrefix: string,
  dateColumnKeys: Set<string>
): void => {
  downloadCsvData(rows, columns, buildFilename(filePrefix, 'csv'), dateColumnKeys)
}

export const downloadRowsAsXlsx = async <TRow extends Record<string, unknown>>(
  rows: TRow[],
  columns: ExportColumnLike[],
  filePrefix: string,
  sheetName: string
): Promise<void> => {
  const excelColumns: ExcelColumn[] = columns.map(col => ({ header: col.title, key: col.key }))
  const workbook = buildExcelWorkbook(sheetName, excelColumns, rows)

  await downloadExcelWorkbook(workbook, buildFilename(filePrefix, 'xlsx'))
}
