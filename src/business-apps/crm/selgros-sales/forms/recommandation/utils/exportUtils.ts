/**
 * Export utilities for product recommendations
 * Generates PDF and CSV files from selected products
 * Uses existing utility functions from the codebase where possible
 */

import { RecommendedProduct } from '../types'
import { downloadCsv } from '@/business-apps/fin/expenses/apps/backoffice-expenses/utils/exportUtils'
import { sanitizeFilename } from '@/common/utils/textUtils'
import PDFKitModule from 'pdfkit/js/pdfkit.standalone.js'

/**
 * Builds a timestamped filename for exports
 */
const buildFilename = (prefix: string, ext: string): string => {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const filename = `${prefix}-${ts.getUTCFullYear()}${pad(ts.getUTCMonth() + 1)}${pad(ts.getUTCDate())}-${pad(ts.getUTCHours())}${pad(ts.getUTCMinutes())}${pad(ts.getUTCSeconds())}.${ext}`
  return sanitizeFilename(filename)
}

/**
 * Triggers a file download by creating a temporary link element
 */
const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.setAttribute('rel', 'noopener noreferrer')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports selected products to PDF format using PDFKit
 */
export const exportToPDF = async (products: RecommendedProduct[], clientName?: string): Promise<void> => {
  const selectedProducts = products.filter(p => p.isSelected)
  const totalValue = selectedProducts.reduce((sum, p) => sum + p.pricePerUnit * p.quantity, 0)
  const currency = selectedProducts[0]?.currency || 'EUR'
  const title = clientName ? `Product Recommendation - ${clientName}` : 'Product Recommendation'

  // Ensure a global object exists for CJS libs (blob-stream -> blob uses `global`)
  const globalShim: any = globalThis as any
  if (typeof globalShim.global === 'undefined') {
    globalShim.global = globalShim
  }

  const PDFDocument = PDFKitModule.default || PDFKitModule

  // Portrait layout
  const doc = new PDFDocument({ size: 'A4', margin: 40 })

  const margin = 40
  let cursorY = margin

  // Load a Unicode-capable font to properly render diacritics and special characters
  const fontCandidates = [
    'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37/ttf/DejaVuSans.ttf',
    'https://fonts.gstatic.com/s/notosans/v38/o-0IIpQlx3QUlC5A4PNr5TRF.ttf',
    'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/fonts/Roboto-Regular.ttf'
  ]
  let fontLoaded = false
  for (const url of fontCandidates) {
    try {
      const res = await fetch(url, { mode: 'cors' })
      if (res.ok) {
        const buf = await res.arrayBuffer()
        doc.registerFont('UnicodeRegular', buf as unknown as ArrayBuffer)
        doc.font('UnicodeRegular')
        fontLoaded = true
        break
      }
    } catch {
      // try next
    }
  }
  if (!fontLoaded) {
    doc.font('Helvetica')
  }

  // Title
  doc.fillColor('#000000').fontSize(20).text(title, margin, cursorY, { align: 'center' })
  cursorY += 30

  // Client name
  if (clientName) {
    doc.fillColor('#666666').fontSize(12).text(`Client: ${clientName}`, margin, cursorY, { align: 'center' })
    cursorY += 20
  }

  // Generated date
  doc
    .fillColor('#999999')
    .fontSize(9)
    .text(`Generated: ${new Date().toLocaleString()}`, margin, cursorY, { align: 'center' })
  cursorY += 30

  // Table setup
  const tableX = margin
  const availableWidth = (doc.page.width as number) - margin * 2
  const colWidths = {
    name: availableWidth * 0.3,
    sku: availableWidth * 0.12,
    stock: availableWidth * 0.1,
    unit: availableWidth * 0.1,
    price: availableWidth * 0.13,
    quantity: availableWidth * 0.1,
    total: availableWidth * 0.15
  }

  const rowHeight = 20
  const headerBg = '#f5f5f5'

  // Table header
  doc.rect(tableX, cursorY, availableWidth, rowHeight).fill(headerBg)
  doc.strokeColor('#dddddd').lineWidth(1)
  doc.rect(tableX, cursorY, availableWidth, rowHeight).stroke()

  let x = tableX + 5
  doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold')
  doc.text('Product Name', x, cursorY + 6, { width: colWidths.name - 10 })
  x += colWidths.name
  doc.text('SKU', x, cursorY + 6, { width: colWidths.sku - 10, align: 'center' })
  x += colWidths.sku
  doc.text('Stock', x, cursorY + 6, { width: colWidths.stock - 10, align: 'center' })
  x += colWidths.stock
  doc.text('Unit', x, cursorY + 6, { width: colWidths.unit - 10, align: 'center' })
  x += colWidths.unit
  doc.text('Price/Unit', x, cursorY + 6, { width: colWidths.price - 10, align: 'right' })
  x += colWidths.price
  doc.text('Qty', x, cursorY + 6, { width: colWidths.quantity - 10, align: 'center' })
  x += colWidths.quantity
  doc.text('Total', x, cursorY + 6, { width: colWidths.total - 10, align: 'right' })

  cursorY += rowHeight

  // Table rows
  doc.font('Helvetica').fontSize(8)
  selectedProducts.forEach((product, index) => {
    // Check if we need a new page
    if (cursorY + rowHeight > (doc.page.height as number) - margin) {
      doc.addPage()
      cursorY = margin
    }

    const totalPrice = product.pricePerUnit * product.quantity
    const rowBg = index % 2 === 0 ? '#fafafa' : '#ffffff'

    doc.rect(tableX, cursorY, availableWidth, rowHeight).fill(rowBg)
    doc.strokeColor('#eeeeee').lineWidth(0.5)
    doc.rect(tableX, cursorY, availableWidth, rowHeight).stroke()

    x = tableX + 5
    doc.fillColor('#000000')
    doc.text(product.name, x, cursorY + 6, { width: colWidths.name - 10 })
    x += colWidths.name
    doc.text(product.sku, x, cursorY + 6, { width: colWidths.sku - 10, align: 'center' })
    x += colWidths.sku
    doc.text(String(product.stock ?? '-'), x, cursorY + 6, { width: colWidths.stock - 10, align: 'center' })
    x += colWidths.stock
    doc.text(product.unitOfMeasure, x, cursorY + 6, { width: colWidths.unit - 10, align: 'center' })
    x += colWidths.unit
    doc.text(`${product.pricePerUnit.toFixed(2)} ${product.currency}`, x, cursorY + 6, {
      width: colWidths.price - 10,
      align: 'right'
    })
    x += colWidths.price
    doc.text(String(product.quantity), x, cursorY + 6, { width: colWidths.quantity - 10, align: 'center' })
    x += colWidths.quantity
    doc.fillColor('#000000').font('Helvetica-Bold')
    doc.text(`${totalPrice.toFixed(2)} ${product.currency}`, x, cursorY + 6, {
      width: colWidths.total - 10,
      align: 'right'
    })
    doc.font('Helvetica')

    cursorY += rowHeight
  })

  // Footer row with total
  cursorY += 5
  doc.rect(tableX, cursorY, availableWidth, rowHeight).fill(headerBg)
  doc.strokeColor('#dddddd').lineWidth(2)
  doc.rect(tableX, cursorY, availableWidth, rowHeight).stroke()

  // Calculate the starting X position for the total row
  // Start from quantity column to have enough space for the text
  const quantityColumnStartX =
    tableX + colWidths.name + colWidths.sku + colWidths.stock + colWidths.unit + colWidths.price
  const totalWidth = colWidths.quantity + colWidths.total

  // Write "Total Value: x EUR" as a single text, aligned to the right
  doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
  const totalText = `Total Value: ${totalValue.toFixed(2)} ${currency}`
  doc.text(totalText, quantityColumnStartX + 5, cursorY + 6, {
    width: totalWidth - 10,
    align: 'right'
  })

  cursorY += rowHeight + 20

  // Summary
  doc.fillColor('#999999').fontSize(8).font('Helvetica')
  doc.text(`Total items: ${selectedProducts.length}`, margin, cursorY, { align: 'center' })

  // Generate PDF blob and trigger download
  const chunks: Uint8Array[] = []
  doc.on('data', (chunk: Uint8Array) => {
    chunks.push(chunk)
  })
  doc.on('end', () => {
    const parts = chunks.map(c => new Uint8Array(c)) as unknown as BlobPart[]
    const blob = new Blob(parts, { type: 'application/pdf' })
    const prefix = clientName ? `product-recommendation-${clientName.replace(/\s+/g, '-')}` : 'product-recommendation'
    const filename = buildFilename(prefix, 'pdf')
    triggerDownload(blob, filename)
  })
  doc.end()
}

/**
 * Exports selected products to CSV format
 * Uses the existing downloadCsv utility function
 */
export const exportToCSV = (products: RecommendedProduct[], clientName?: string): void => {
  const selectedProducts = products.filter(p => p.isSelected)

  const columns = [
    { key: 'name', title: 'Product Name' },
    { key: 'sku', title: 'SKU' },
    { key: 'stock', title: 'Stock' },
    { key: 'unitOfMeasure', title: 'Unit' },
    { key: 'pricePerUnit', title: 'Price per Unit' },
    { key: 'currency', title: 'Currency' },
    { key: 'quantity', title: 'Quantity' },
    { key: 'total', title: 'Total Price' }
  ]

  // Prepare data with calculated totals
  const data = selectedProducts.map(product => ({
    name: product.name,
    sku: product.sku,
    stock: product.stock ?? '',
    unitOfMeasure: product.unitOfMeasure,
    pricePerUnit: product.pricePerUnit,
    currency: product.currency,
    quantity: product.quantity,
    total: (product.pricePerUnit * product.quantity).toFixed(2)
  }))

  const prefix = clientName ? `product-recommendation-${clientName.replace(/\s+/g, '-')}` : 'product-recommendation'
  const filename = buildFilename(prefix, 'csv')

  // Use existing downloadCsv utility function
  downloadCsv(data, columns, filename)
}
