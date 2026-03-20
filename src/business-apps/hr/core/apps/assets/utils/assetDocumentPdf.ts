import { Asset, AssetAllocation, AssetStatus } from '../types'
import { buildFilename, triggerDownload } from '@/common/utils/excelExportUtils'
import { formatDate, formatNumberFunction, getCatalogValue } from '@/common/utils/windowUtils'
import PDFKitModule from 'pdfkit/js/pdfkit.standalone.js'

const LABELS = {
  assetsReport: 'Assets Report',
  certificateTitle: 'Data Sanitization & Asset Disposal Certificate',
  documentControl: 'DOCUMENT CONTROL',
  issueDate: 'Issue Date',
  status: 'Status',
  assetIdentification: 'ASSET IDENTIFICATION',
  assetIdInventoryNo: 'Asset ID / Inventory No.',
  deviceType: 'Device Type',
  manufacturerAndModel: 'Manufacturer & Model',
  serialNumber: 'Serial Number (S/N)',
  previousCustodian: 'Previous Custodian',
  dataSanitizationDetails: 'DATA SANITIZATION DETAILS',
  sanitizationDate: 'Sanitization Date',
  sanitizationMethod: 'Sanitization Method',
  disposalStatusLogistics: 'DISPOSAL STATUS & LOGISTICS',
  disposalType: 'Disposal Type',
  authorizationSignOff: 'AUTHORIZATION & SIGN-OFF',
  performedBy: 'Performed by',
  finalDeclaration: 'Final Declaration:',
  finalDeclarationText:
    '"I hereby certify that the asset identified above has been sanitized in accordance with the organization\'s Data Retention Policy and ISO 27001 standards. All stored information has been rendered irrecoverable. The physical chain of custody has been maintained until final disposal/transfer."',
  assetInformation: 'Asset Information',
  location: 'Location',
  inventoryValue: 'Inventory Value',
  acquisitionDate: 'Acquisition Date',
  warranty: 'Warranty',
  warrantyPeriod: 'Warranty Period',
  months: 'months',
  endOfWarranty: 'End of warranty period',
  valid: 'Valid',
  expired: 'Expired',
  notes: 'Notes',
  allocationHistory: 'ALLOCATION HISTORY',
  allocationHistoryEmpty: 'No allocation history available for this asset.',
  notAvailable: 'N/A',
  present: 'Present',
  current: 'Current',
  employee: 'Employee',
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
    case AssetStatus.PENDING:
      return 'Pending'
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
  const sectionGap = 24
  let y = margin

  const isDisposalCertificate = asset.assetStatus === AssetStatus.RETIRED

  const titleText = isDisposalCertificate ? labels.certificateTitle : labels.assetsReport
  doc.fontSize(18).font('Helvetica-Bold').text(titleText, margin, y, {
    width: pageWidth,
    align: 'center'
  })
  y += 36
  y += 24

  const category = getCatalogValue(asset.assetCategory) || labels.notAvailable
  const serialDisplay = asset.serialNumber ?? labels.notAvailable
  const manufacturerAndModelDisplay =
    [getCatalogValue(asset.assetBrand), asset.model].filter(Boolean).join(' ') || labels.notAvailable

  const sortedAllocationsForCert = [...allocations].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )
  const lastAllocation = sortedAllocationsForCert[0]
  const previousCustodianDisplay = lastAllocation
    ? employeeDisplayName(lastAllocation, labels.notAvailable)
    : labels.notAvailable
  if (isDisposalCertificate) {
    // DOCUMENT CONTROL
    doc.fontSize(12).font('Helvetica-Bold').text(labels.documentControl, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    const issueDateDisplay = asset.disposalDate
      ? formatDate(asset.disposalDate) || asset.disposalDate
      : labels.notAvailable
    doc.text(`${labels.issueDate}: ${issueDateDisplay}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.status}: Retired`, margin, y, { width: pageWidth })
    y += sectionGap

    // ASSET IDENTIFICATION
    doc.fontSize(12).font('Helvetica-Bold').text(labels.assetIdentification, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    doc.text(`${labels.assetIdInventoryNo}: ${asset.id}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.deviceType}: ${category}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.manufacturerAndModel}: ${manufacturerAndModelDisplay}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.serialNumber}: ${serialDisplay}`, margin, y, { width: pageWidth })
    y += 14
    doc.text(`${labels.previousCustodian}: ${previousCustodianDisplay}`, margin, y, { width: pageWidth })
    y += sectionGap

    // DATA SANITIZATION DETAILS
    doc.fontSize(12).font('Helvetica-Bold').text(labels.dataSanitizationDetails, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    const sanitizationDateDisplay = asset.sanitizationExecutionDate
      ? formatDate(asset.sanitizationExecutionDate) || asset.sanitizationExecutionDate
      : labels.notAvailable
    doc.text(`${labels.sanitizationDate}: ${sanitizationDateDisplay}`, margin, y, { width: pageWidth })
    y += 14
    const sanitizationMethodDisplay =
      getCatalogValue(asset.sanitizationMethod) || asset.sanitizationMethodRef || labels.notAvailable
    doc.text(`${labels.sanitizationMethod}: ${sanitizationMethodDisplay}`, margin, y, { width: pageWidth })
    y += sectionGap

    // DISPOSAL STATUS & LOGISTICS
    doc.fontSize(12).font('Helvetica-Bold').text(labels.disposalStatusLogistics, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    const disposalTypeDisplay =
      getCatalogValue(asset.disposalOutcome) || asset.disposalOutcomeRef || labels.notAvailable
    doc.text(`${labels.disposalType}: ${disposalTypeDisplay}`, margin, y, { width: pageWidth })
    y += sectionGap
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

  if (isDisposalCertificate) {
    y += sectionGap
    doc.fontSize(12).font('Helvetica-Bold').text(labels.authorizationSignOff, margin, y)
    y += 18
    doc.fontSize(10).font('Helvetica')
    doc.text(`${labels.performedBy}: ${performerDisplay(asset, labels.notAvailable)}`, margin, y, {
      width: pageWidth
    })
    y += 14
    y += 16
    doc.fontSize(10).font('Helvetica-Bold').text(labels.finalDeclaration, margin, y, { width: pageWidth })
    y += doc.heightOfString(labels.finalDeclaration, { width: pageWidth }) + 4
    doc.fontSize(10).font('Helvetica').text(labels.finalDeclarationText, margin, y, { width: pageWidth })
    y += doc.heightOfString(labels.finalDeclarationText, { width: pageWidth }) + 24
  }

  doc.end()

  const blob = await promise
  const baseName = isDisposalCertificate
    ? 'disposal-certificate'
    : [getCatalogValue(asset.assetBrand), asset.model, asset.serialNumber].filter(Boolean).join('-') || 'asset'
  const filename = buildFilename(baseName, 'pdf')
  triggerDownload(blob, filename)
}
