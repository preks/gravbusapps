/**
 * Generates asset detail PDF and triggers download (same approach as HR Analytics export).
 * Uses PDFKit + triggerDownload — no popup, no templates.
 */

import { Asset, AssetAllocation, AssetStatus } from '../types'
import { buildFilename, triggerDownload } from '@/common/utils/excelExportUtils'
import { formatDate, formatNumberFunction, getCatalogValue } from '@/common/utils/windowUtils'
import PDFKitModule from 'pdfkit/js/pdfkit.standalone.js'

/** Fixed English labels for PDF export (no i18n to avoid font/character issues). */
const LABELS = {
  assetsReport: 'Assets Report',
  disposalCertificate: 'Disposal Certificate',
  assetInformation: 'Asset Information',
  assetIdentifiers: 'Asset Identifiers',
  assetId: 'Asset ID',
  serialNumber: 'Serial Number',
  model: 'Model',
  category: 'Category',
  status: 'Status',
  location: 'Location',
  inventoryValue: 'Inventory Value',
  acquisitionDate: 'Acquisition Date',
  disposalMethod: 'Disposal Method',
  disposalDate: 'Disposal Date',
  disposalSection: 'Disposal',
  responsiblePerson: 'Responsible Person',
  sanitizationMethod: 'Sanitization Method',
  sanitizationExecutionDate: 'Sanitization Execution Date',
  sanitizationSection: 'Sanitization',
  performedBy: 'Performed by',
  warranty: 'Warranty',
  warrantyPeriod: 'Warranty Period',
  months: 'months',
  endOfWarranty: 'End of warranty period',
  valid: 'Valid',
  expired: 'Expired',
  notes: 'Notes',
  allocationHistory: 'Allocation History',
  allocationHistoryEmpty: 'No allocation history available for this asset.',
  notAvailable: 'N/A',
  present: 'Present',
  current: 'Current',
  employee: 'Employee',
  start: 'Start',
  end: 'End',
  startCondition: 'Start condition',
  returnCondition: 'Return condition',
  expectedReturn: 'Expected return',
  period: 'Period',
  asset: 'Asset'
} as const

function formatCurrency(amount: number, currency?: string): string {
  const formatted = formatNumberFunction(amount)
  return currency ? `${formatted} ${currency}` : formatted
}

function employeeDisplayName(alloc: AssetAllocation, notAvailable: string): string {
  const e = alloc.employee
  if (e?.displayName) return e.displayName
  if (e?.firstName || e?.lastName) return `${e?.firstName ?? ''} ${e?.lastName ?? ''}`.trim()
  return notAvailable
}

function statusDisplayName(status: AssetStatus): string {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'Available'
    case AssetStatus.ALLOCATED:
      return 'Allocated'
    case AssetStatus.UNDER_REPAIR:
      return 'In Repair'
    case AssetStatus.RETIRED:
      return 'Retired'
    default:
      return 'N/A'
  }
}

function responsiblePersonDisplay(asset: Asset, notAvailable: string): string {
  const r = asset.responsibleEmployee
  if (r?.displayName) return r.displayName
  if (r?.firstName || r?.lastName) return `${r?.firstName ?? ''} ${r?.lastName ?? ''}`.trim()
  return notAvailable
}

function performerDisplay(asset: Asset, notAvailable: string): string {
  const p = asset.performerEmployee
  if (p?.displayName) return p.displayName
  if (p?.firstName || p?.lastName) return `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim()
  return notAvailable
}

const ROW_PADDING = 4
const CELL_PADDING = 6

/**
 * Draws a table row and returns the new y position (after the row).
 * Handles multi-line cells by using the maximum cell height.
 */
function drawTableRow(doc: any, x: number, y: number, colWidths: number[], cells: string[], isHeader: boolean): number {
  const font = isHeader ? 'Helvetica-Bold' : 'Helvetica'
  doc.font(font).fontSize(9)
  let maxH = 0
  const cellY = y + CELL_PADDING
  let cellX = x
  for (let i = 0; i < cells.length; i++) {
    const w = colWidths[i]! - CELL_PADDING * 2
    if (w <= 0) {
      cellX += colWidths[i]!
      continue
    }
    const h = doc.heightOfString(cells[i]!, { width: w }) || 10
    if (h > maxH) maxH = h
    doc.text(cells[i]!, cellX + CELL_PADDING, cellY, { width: w })
    cellX += colWidths[i]!
  }
  return y + maxH + CELL_PADDING * 2 + ROW_PADDING
}

function drawHorizontalLine(doc: any, x: number, y: number, width: number): void {
  doc
    .strokeColor('#cccccc')
    .lineWidth(0.5)
    .moveTo(x, y)
    .lineTo(x + width, y)
    .stroke()
}

function createPdfDoc(): { doc: any; promise: Promise<Blob> } {
  const globalShim = globalThis as unknown as { global?: unknown }
  if (globalShim.global === undefined) {
    globalShim.global = globalShim
  }
  const PDFDocument = (PDFKitModule as { default?: new (...args: any[]) => any }).default
  const PdfCtor = PDFDocument ?? (PDFKitModule as unknown as new (...args: any[]) => any)
  const doc = new PdfCtor({ size: 'A4', margin: 40 })

  const chunks: Uint8Array[] = []
  doc.on('data', (chunk: unknown) => chunks.push(chunk as Uint8Array))

  const promise = new Promise<Blob>((resolve, reject) => {
    doc.on('end', () => {
      try {
        const total = chunks.reduce((acc, c) => acc + c.length, 0)
        const out = new Uint8Array(total)
        let offset = 0
        for (const c of chunks) {
          out.set(c, offset)
          offset += c.length
        }
        resolve(new Blob([out], { type: 'application/pdf' }))
      } catch (e) {
        reject(e)
      }
    })
    doc.on('error', reject)
  })

  return { doc, promise }
}

export async function generateAssetDocumentPdf(asset: Asset, allocations: AssetAllocation[]): Promise<void> {
  const labels = LABELS
  const { doc, promise } = createPdfDoc()
  const margin = 40
  const pageWidth = doc.page.width - margin * 2
  let y = margin

  const isDisposalCertificate = asset.assetStatus === AssetStatus.RETIRED

  const titleText = isDisposalCertificate ? labels.disposalCertificate : labels.assetsReport
  doc.fontSize(18).font('Helvetica-Bold').text(titleText, margin, y, {
    width: pageWidth,
    align: 'center'
  })
  y += 36
  y += 24

  const category = getCatalogValue(asset.assetCategory) || labels.notAvailable
  const modelDisplay = asset.model || labels.notAvailable
  const serialDisplay = asset.serialNumber ?? labels.notAvailable

  if (isDisposalCertificate) {
    // --- Asset Identifiers (kept as requested) ---
    doc.fontSize(12).font('Helvetica-Bold').text(labels.assetIdentifiers, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    doc.text(`${labels.assetId}: ${asset.id}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.serialNumber}: ${serialDisplay}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.model}: ${modelDisplay}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.category}: ${category}`, margin, y, { width: pageWidth })
    y += 24

    // --- Disposal method (disposal_outcome_ref) & disposal date (disposal_date) ---
    doc.fontSize(12).font('Helvetica-Bold').text(labels.disposalSection, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    const disposalMethodDisplay =
      getCatalogValue(asset.disposalOutcome) || asset.disposalOutcomeRef || labels.notAvailable
    doc.text(`${labels.disposalMethod}: ${disposalMethodDisplay}`, margin, y, { width: pageWidth })
    y += 14
    const disposalDateDisplay = asset.disposalDate
      ? formatDate(asset.disposalDate) || asset.disposalDate
      : labels.notAvailable
    doc.text(`${labels.disposalDate}: ${disposalDateDisplay}`, margin, y, { width: pageWidth })
    y += 24

    // --- Responsible person (responsible_employee_id) ---
    doc.fontSize(12).font('Helvetica-Bold').text(labels.responsiblePerson, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    doc.text(responsiblePersonDisplay(asset, labels.notAvailable), margin, y, { width: pageWidth })
    y += 24

    // --- Sanitization: method (sanitization_method_ref), execution date (sanitization_execution_date), performed by (performer_employee_id) ---
    if (asset.requireSanitization) {
      doc.fontSize(12).font('Helvetica-Bold').text(labels.sanitizationSection, margin, y)
      y += 18
      doc.fontSize(10).font('Helvetica')
      const sanitizationMethodDisplay =
        getCatalogValue(asset.sanitizationMethod) || asset.sanitizationMethodRef || labels.notAvailable
      doc.text(`${labels.sanitizationMethod}: ${sanitizationMethodDisplay}`, margin, y, { width: pageWidth })
      y += 14
      const sanitizationDateDisplay = asset.sanitizationExecutionDate
        ? formatDate(asset.sanitizationExecutionDate) || asset.sanitizationExecutionDate
        : labels.notAvailable
      doc.text(`${labels.sanitizationExecutionDate}: ${sanitizationDateDisplay}`, margin, y, { width: pageWidth })
      y += 14
      doc.text(`${labels.performedBy}: ${performerDisplay(asset, labels.notAvailable)}`, margin, y, {
        width: pageWidth
      })
      y += 24
    }

    doc.fontSize(12).font('Helvetica-Bold').text(labels.allocationHistory, margin, y)
    y += 18
  } else {
    const title = [getCatalogValue(asset.assetBrand), asset.model].filter(Boolean).join(' ') || labels.asset
    doc.fontSize(14).font('Helvetica-Bold').text(title, margin, y, { width: pageWidth })
    y += 20
    doc.fontSize(10).font('Helvetica').text(category, margin, y, { width: pageWidth })
    y += 20

    doc.fontSize(12).font('Helvetica-Bold').text(labels.assetInformation, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    const serial = asset.serialNumber ?? labels.notAvailable
    const statusStr = statusDisplayName(asset.assetStatus)
    const location = asset.siteLocation?.name ?? labels.notAvailable
    const value = formatCurrency(asset.inventoryValue, asset.currency?.code)
    const acquisition = asset.acquisitionDate
      ? formatDate(asset.acquisitionDate) || asset.acquisitionDate
      : labels.notAvailable
    doc.text(`${labels.serialNumber}: ${serial}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.status}: ${statusStr}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.location}: ${location}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.inventoryValue}: ${value}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.acquisitionDate}: ${acquisition}`, margin, y, { width: pageWidth })
    y += 24

    doc.fontSize(12).font('Helvetica-Bold').text(labels.warranty, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    const hasWarranty =
      asset.acquisitionDate &&
      typeof asset.warrantyPeriodMonths === 'number' &&
      !Number.isNaN(asset.warrantyPeriodMonths)
    let warrantyExpiry: Date | null = null
    if (hasWarranty && asset.acquisitionDate) {
      const d = new Date(asset.acquisitionDate)
      d.setMonth(d.getMonth() + (asset.warrantyPeriodMonths ?? 0))
      warrantyExpiry = d
    }
    const warrantyExpired = warrantyExpiry != null && warrantyExpiry.getTime() < Date.now()
    const warrantyPeriodStr =
      typeof asset.warrantyPeriodMonths === 'number'
        ? `${asset.warrantyPeriodMonths} ${labels.months}`
        : labels.notAvailable
    const warrantyStatusStr = !hasWarranty ? labels.notAvailable : warrantyExpired ? labels.expired : labels.valid
    const warrantyEndStr =
      warrantyExpiry != null
        ? formatDate(warrantyExpiry.toISOString()) || warrantyExpiry.toISOString()
        : labels.notAvailable
    doc.text(`${labels.warrantyPeriod}: ${warrantyPeriodStr} (${warrantyStatusStr})`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.endOfWarranty}: ${warrantyEndStr}`, margin, y, { width: pageWidth })
    y += 24

    if (asset.notes && asset.notes.trim()) {
      doc.fontSize(12).font('Helvetica-Bold').text(labels.notes, margin, y)
      y += 18
      doc.fontSize(10).font('Helvetica').text(asset.notes.trim(), margin, y, { width: pageWidth })
      y += doc.heightOfString(asset.notes.trim(), { width: pageWidth }) + 24
    }

    doc.fontSize(12).font('Helvetica-Bold').text(labels.allocationHistory, margin, y)
    y += 18
  }

  const sortedAllocations = [...allocations].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )

  if (sortedAllocations.length === 0) {
    doc.fontSize(10).font('Helvetica').text(labels.allocationHistoryEmpty, margin, y, { width: pageWidth })
    y += 18
  } else {
    const tableWidth = pageWidth
    const colWidths = [22, 75, 72, 58, 58, 58, tableWidth - 22 - 75 - 72 - 58 - 58 - 58] as const
    const headerCells = [
      '#',
      labels.employee,
      labels.period,
      labels.startCondition,
      labels.returnCondition,
      labels.expectedReturn,
      labels.notes
    ]
    const pageBottom = doc.page.height - margin
    const minRowSpace = 40

    y = drawTableRow(doc, margin, y, [...colWidths], headerCells, true)
    drawHorizontalLine(doc, margin, y - ROW_PADDING, tableWidth)

    for (let i = 0; i < sortedAllocations.length; i++) {
      if (y > pageBottom - minRowSpace) {
        doc.addPage()
        y = margin
      }
      const alloc = sortedAllocations[i]!
      const startStr = formatDate(alloc.startDate) || alloc.startDate
      const endStr = alloc.endDate ? formatDate(alloc.endDate) || alloc.endDate : labels.present
      const employee = employeeDisplayName(alloc, labels.notAvailable)
      const currentLabel = !alloc.endDate ? ` (${labels.current})` : ''
      const startCondition = alloc.startAssetCondition?.value ?? labels.notAvailable
      const endCondition = alloc.endAssetCondition?.value ?? labels.notAvailable
      const expectedReturnStr =
        !alloc.endDate && alloc.expectedEndDate
          ? formatDate(alloc.expectedEndDate) || alloc.expectedEndDate
          : labels.notAvailable
      const notesStr = alloc.notes?.trim() || labels.notAvailable

      const rowCells = [
        String(i + 1),
        `${employee}${currentLabel}`,
        `${startStr} - ${endStr}`,
        startCondition,
        endCondition,
        expectedReturnStr,
        notesStr
      ]
      y = drawTableRow(doc, margin, y, [...colWidths], rowCells, false)
      drawHorizontalLine(doc, margin, y - ROW_PADDING, tableWidth)
    }
  }

  doc.end()

  const blob = await promise
  const baseName = isDisposalCertificate
    ? 'disposal-certificate'
    : [getCatalogValue(asset.assetBrand), asset.model, asset.serialNumber].filter(Boolean).join('-') || 'asset'
  const filename = buildFilename(baseName, 'pdf')
  triggerDownload(blob, filename)
}
