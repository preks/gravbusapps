/**
 * HR Analytics export utilities: Excel and PDF for data tables.
 */

import {
  buildExcelWorkbook,
  downloadExcelWorkbook,
  buildFilename,
  triggerDownload,
  formatCellValue
} from '@/common/utils/excelExportUtils'
import PDFKitModule from 'pdfkit/js/pdfkit.standalone.js'

export interface ExportColumn {
  key: string
  header: string
}

/**
 * Export table data to Excel (.xlsx) and trigger download.
 */
export async function exportTableToExcel(
  title: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[]
): Promise<void> {
  const excelColumns = columns.map(c => ({ header: c.header, key: c.key }))
  const sheetName = title.slice(0, 31) // Excel sheet name length limit
  const workbook = buildExcelWorkbook(sheetName, excelColumns, data, 'NEWWORK HR Analytics')
  const filename = buildFilename(title.replace(/\s+/g, '-'), 'xlsx')
  await downloadExcelWorkbook(workbook, filename)
}

/**
 * Export table data to PDF and trigger download.
 * Uses PDFKit standalone (browser); collects stream chunks and creates a blob for download.
 */
export async function exportTableToPdf(
  title: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[]
): Promise<void> {
  const globalShim = globalThis as unknown as { global?: unknown }
  if (typeof globalShim.global === 'undefined') {
    globalShim.global = globalShim
  }

  const PDFDocument = (PDFKitModule as { default?: unknown }).default ?? PDFKitModule

  const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 })

  const chunks: Uint8Array[] = []
  doc.on('data', (chunk: unknown) => chunks.push(chunk as Uint8Array))

  const resultPromise = new Promise<void>((resolve, reject) => {
    doc.on('end', () => {
      try {
        const total = chunks.reduce((acc, c) => acc + c.length, 0)
        const out = new Uint8Array(total)
        let offset = 0
        for (const c of chunks) {
          out.set(c, offset)
          offset += c.length
        }
        const blob = new Blob([out], { type: 'application/pdf' })
        const filename = buildFilename(title.replace(/\s+/g, '-'), 'pdf')
        triggerDownload(blob, filename)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
    doc.on('error', reject)
  })

  const margin = 40
  const rowHeight = 18
  const colWidths = columns.map((_, i) => (i === 0 ? 180 : 120))
  let y = margin

  doc.fontSize(14).font('Helvetica-Bold').text(title, margin, y)
  y += 28

  const drawHeader = () => {
    doc.fontSize(10)
    doc.font('Helvetica-Bold')
    let x = margin
    columns.forEach((col, i) => {
      doc.rect(x, y - 2, colWidths[i], rowHeight).stroke()
      doc.text(col.header, x + 4, y + 4, {
        width: colWidths[i] - 8,
        lineBreak: false,
        ellipsis: true
      })
      x += colWidths[i]
    })
    y += rowHeight
  }

  const ensureRowSpace = () => {
    const pageBottom = doc.page.height - margin
    if (y + rowHeight > pageBottom) {
      doc.addPage()
      y = margin
      drawHeader()
      doc.font('Helvetica')
    }
  }

  drawHeader()

  doc.font('Helvetica')
  for (const row of data) {
    ensureRowSpace()
    let x = margin
    columns.forEach((col, i) => {
      const value = formatCellValue(row[col.key])
      doc.rect(x, y - 2, colWidths[i], rowHeight).stroke()
      doc.text(String(value).slice(0, 50), x + 4, y + 4, {
        width: colWidths[i] - 8,
        lineBreak: false,
        ellipsis: true
      })
      x += colWidths[i]
    })
    y += rowHeight
  }

  doc.end()
  return resultPromise
}
