/**
 * Utility functions for exporting data to CSV and Excel formats
 */

import { sanitizeFilename } from '@/common/utils/textUtils'

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
 * Sanitizes output to prevent XSS attacks using shared utility function
 *
 * Note: Input parameters (type, ext) are hardcoded in calling code,
 * so only the final filename needs sanitization for defense-in-depth.
 */
export const buildFilename = (type: string, ext: string): string => {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const filename = `backoffice-expense-${type}-${ts.getUTCFullYear()}${pad(ts.getUTCMonth() + 1)}${pad(ts.getUTCDate())}-${pad(ts.getUTCHours())}${pad(ts.getUTCMinutes())}${pad(ts.getUTCSeconds())}.${ext}`

  // Sanitize once at the end for defense-in-depth
  return sanitizeFilename(filename)
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
 *
 * Note: Filename is already sanitized by buildFilename(), no need to sanitize again
 */
const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  // Set additional security attributes
  link.setAttribute('rel', 'noopener noreferrer')

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
 * Downloads data as Excel-compatible HTML file
 *
 * NOTE: This generates a simple HTML table file with Excel-specific MIME type.
 * Excel will open it directly without warnings when using .xls extension.
 * Limitations:
 * - No formulas, pivot tables, or advanced Excel features
 * - Larger file size compared to binary Excel formats
 * - Basic styling only
 *
 * For true Excel files with advanced features, consider using a library like 'xlsx'.
 */
export const downloadExcel = (data: any[], columns: Array<{ key: string; title: string }>, filename: string) => {
  // Use simple HTML table with BOM for Excel compatibility
  const headerCells = columns.map(c => {
    const escapedTitle = htmlEscape(c.title)
    return `<th>${escapedTitle}</th>`
  })
  const header = `<tr>${headerCells.join('')}</tr>`

  const bodyRows = data.map(row => {
    const cells = columns.map(c => {
      const cellValue = formatCellValue(row[c.key])
      const escapedValue = htmlEscape(cellValue)
      return `<td>${escapedValue}</td>`
    })
    return `<tr>${cells.join('')}</tr>`
  })
  const rows = bodyRows.join('\n')

  // Add UTF-8 BOM and meta tag for proper character encoding
  const html = `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>
<table border="1">
<thead>${header}</thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })

  triggerDownload(blob, filename)
}
