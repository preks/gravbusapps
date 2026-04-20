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

/** Format a cell value for PDF display: numbers are rounded to avoid floating-point noise (e.g. 416.6700000000001 → 416.67). */
function formatCellValueForPdf(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value === Math.round(value) ? String(Math.round(value)) : value.toFixed(2)
  }
  return formatCellValue(value)
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
  const filename = buildFilename(title.trim().split(/\s+/).join('-'), 'xlsx')
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
  if (globalShim.global === undefined) {
    globalShim.global = globalShim
  }

  const PDFDocument = (PDFKitModule as { default?: new (...args: any[]) => any }).default
  const PdfCtor = PDFDocument ?? (PDFKitModule as unknown as new (...args: any[]) => any)
  const doc = new PdfCtor({ size: 'A4', margin: 40 })

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
        const filename = buildFilename(title.trim().split(/\s+/).join('-'), 'pdf')
        triggerDownload(blob, filename)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
    doc.on('error', reject)
  })

  const margin = 40
  const headerRowHeight = 18
  const minRowHeight = 18
  const cellPaddingX = 4
  const cellPaddingY = 4
  const headerFontSize = 10
  const cellFontSize = 9
  const maxCellChars = 600
  const minColWidth = 64
  const maxColWidth = 220
  const availableWidth = doc.page.width - margin * 2

  const estimateColWidth = (texts: string[]): number => {
    const maxLen = texts.reduce((acc, text) => Math.max(acc, text.length), 0)
    const approx = Math.ceil(maxLen * 5.8 + 20)
    return Math.max(minColWidth, Math.min(maxColWidth, approx))
  }

  const sampleRows = data.slice(0, 200)
  const colWidths = columns.map(col => {
    const texts = [col.header, ...sampleRows.map(row => formatCellValueForPdf(row[col.key]).slice(0, maxCellChars))]
    return estimateColWidth(texts)
  })

  const columnChunks: number[][] = []
  let currentChunk: number[] = []
  let currentWidth = 0

  columns.forEach((_, index) => {
    const nextWidth = colWidths[index]
    if (currentChunk.length > 0 && currentWidth + nextWidth > availableWidth) {
      columnChunks.push(currentChunk)
      currentChunk = [index]
      currentWidth = nextWidth
    } else {
      currentChunk.push(index)
      currentWidth += nextWidth
    }
  })
  if (currentChunk.length > 0) {
    columnChunks.push(currentChunk)
  }

  const drawChunk = (chunk: number[], chunkIndex: number) => {
    let y = margin
    const suffix = columnChunks.length > 1 ? ` (${chunkIndex + 1}/${columnChunks.length})` : ''

    doc.fontSize(14).font('Helvetica-Bold').text(`${title}${suffix}`, margin, y)
    y += 28

    const drawHeader = () => {
      doc.fontSize(headerFontSize)
      doc.font('Helvetica-Bold')
      let x = margin
      chunk.forEach(colIndex => {
        const width = colWidths[colIndex]
        const col = columns[colIndex]
        doc.rect(x, y - 2, width, headerRowHeight).stroke()
        doc.text(col.header, x + cellPaddingX, y + cellPaddingY, {
          width: width - cellPaddingX * 2,
          lineBreak: false,
          ellipsis: true
        })
        x += width
      })
      y += headerRowHeight
    }

    const ensureRowSpace = (targetRowHeight: number) => {
      const pageBottom = doc.page.height - margin
      if (y + targetRowHeight > pageBottom) {
        doc.addPage()
        y = margin
        doc.fontSize(14).font('Helvetica-Bold').text(`${title}${suffix}`, margin, y)
        y += 28
        drawHeader()
        doc.font('Helvetica').fontSize(cellFontSize)
      }
    }

    drawHeader()
    doc.font('Helvetica').fontSize(cellFontSize)
    for (const row of data) {
      const rowValues = chunk.map(colIndex => {
        const col = columns[colIndex]
        return formatCellValueForPdf(row[col.key]).slice(0, maxCellChars)
      })

      const rowHeight = rowValues.reduce((currentMax, value, index) => {
        const colIndex = chunk[index]
        const width = colWidths[colIndex]
        const textHeight = doc.heightOfString(value, {
          width: width - cellPaddingX * 2,
          lineBreak: true
        })
        return Math.max(currentMax, Math.ceil(textHeight) + cellPaddingY * 2)
      }, minRowHeight)

      ensureRowSpace(rowHeight)
      let x = margin
      chunk.forEach((colIndex, rowValueIndex) => {
        const width = colWidths[colIndex]
        const value = rowValues[rowValueIndex]
        doc.rect(x, y - 2, width, rowHeight).stroke()
        doc.text(value, x + cellPaddingX, y + cellPaddingY, {
          width: width - cellPaddingX * 2,
          height: rowHeight - cellPaddingY * 2,
          lineBreak: true,
          ellipsis: true
        })
        x += width
      })
      y += rowHeight
    }
  }

  columnChunks.forEach((chunk, chunkIndex) => {
    if (chunkIndex > 0) {
      doc.addPage()
    }
    drawChunk(chunk, chunkIndex)
  })

  doc.end()
  return resultPromise
}
