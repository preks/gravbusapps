/**
 * Utility functions for exporting data to CSV and Excel formats
 */

/**
 * Escapes a value for use in CSV format
 * Handles quotes, commas, and newlines
 *
 * Note: Uses replace(/pattern/g) instead of replaceAll() for ES2020 compatibility
 * Project target: ES2020, replaceAll() requires ES2021+
 */
export const escapeCsv = (value: string): string => {
  const needsQuotes = /[",\r\n]/.test(value)
  const out = value.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
}

/**
 * Escapes HTML special characters
 *
 * Note: Uses replace(/pattern/g) instead of replaceAll() for ES2020 compatibility
 * Project target: ES2020, replaceAll() requires ES2021+
 * NOSONAR: Intentionally using replace() for ES2020 compatibility
 */
export const htmlEscape = (value: string): string =>
  value
    // NOSONAR - ES2020 compatibility: replaceAll() requires ES2021+
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * Builds a timestamped filename for exports
 * Uses UTC time to ensure consistent filenames across timezones
 */
export const buildFilename = (type: string, ext: string): string => {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `backoffice-expense-${type}-${ts.getUTCFullYear()}${pad(ts.getUTCMonth() + 1)}${pad(ts.getUTCDate())}-${pad(ts.getUTCHours())}${pad(ts.getUTCMinutes())}${pad(ts.getUTCSeconds())}.${ext}`
}

/**
 * Formats a cell value for display in exports
 * Handles null/undefined, arrays, dates, and objects
 */
export const formatCellValue = (value: any): string => {
  if (value === null || value === undefined) {
    return ''
  }

  // Handle Date objects with readable format
  if (value instanceof Date) {
    return value.toISOString().split('T')[0] // Returns YYYY-MM-DD
  }

  // Handle arrays by joining with comma-space
  if (Array.isArray(value)) {
    return value.map(item => formatCellValue(item)).join(', ')
  }

  // Handle other objects
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Triggers a file download by creating a temporary link element
 * Handles blob URL creation, link click, and cleanup
 */
const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Downloads data as CSV file
 * Includes UTF-8 BOM for proper Excel compatibility with special characters
 */
export const downloadCsv = (data: any[], columns: Array<{ key: string; title: string }>, filename: string) => {
  const header = columns.map(c => escapeCsv(c.title))
  const rows = data.map(row => columns.map(c => escapeCsv(formatCellValue(row[c.key]))))

  const csvLines = [header.join(','), ...rows.map(r => r.join(','))]
  const csvContent = '\uFEFF' + csvLines.join('\n') // UTF-8 BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  triggerDownload(blob, filename)
}

/**
 * Downloads data as Excel-compatible HTML file with proper Excel XML format
 *
 * NOTE: This generates an Excel HTML/XML format that Excel can open natively.
 * Uses proper XML namespace declarations to avoid Excel security warnings.
 * The file opens in Excel without warnings but has limitations:
 * - No formulas, pivot tables, or advanced Excel features
 * - Larger file size compared to binary Excel formats
 * - Basic styling only
 *
 * For true Excel files with advanced features, consider using a library like 'xlsx'.
 */
export const downloadExcel = (data: any[], columns: Array<{ key: string; title: string }>, filename: string) => {
  // Use Excel HTML format with proper XML namespace to avoid security warnings
  const html = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Row>
    ${columns.map(c => `<Cell><Data ss:Type="String">${htmlEscape(c.title)}</Data></Cell>`).join('\n    ')}
   </Row>
   ${data
     .map(
       row => `<Row>
    ${columns.map(c => `<Cell><Data ss:Type="String">${htmlEscape(formatCellValue(row[c.key]))}</Data></Cell>`).join('\n    ')}
   </Row>`
     )
     .join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })

  triggerDownload(blob, filename)
}
