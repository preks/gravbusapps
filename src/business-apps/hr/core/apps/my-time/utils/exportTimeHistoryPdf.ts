import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { TimeEntry } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'

/**
 * Generates a monthly time history report.
 * Downloads a proper PDF using a lightweight, on-demand library (pdf-lib).
 */
export const exportTimeHistoryPdf = async (params: {
  entries: TimeEntry[]
  monthDate: Date
  locale: string
  employeeId: string
  employeeFirstName?: string
  employeeLastName?: string
}) => {
  const { entries, monthDate, locale, employeeId, employeeFirstName, employeeLastName } = params

  // Title
  const monthTitle = monthDate.toLocaleString(locale, { month: 'long', year: 'numeric' })
  const title = `${getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_tracking.history.report_title',
    'Time History Report'
  )} • ${monthTitle}`

  // Filename hint: many browsers use document.title as default in Save as PDF
  const year = monthDate.getFullYear()
  const month = String(monthDate.getMonth() + 1).padStart(2, '0')
  const filename = `timesheet-${year}-${month}.pdf`

  const toTime = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleTimeString(locale || 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      : '-'

  // Table headers (aligned to UI terminology)
  const headers = [
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.date', 'Date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.start', 'Start'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.end', 'End'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.recorded', 'Recorded'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.break', 'Break'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.effective', 'Effective'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.planned', 'Planned'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.diff', 'Diff')
  ]

  // Body rows
  const rows = (entries || []).map(e => [
    new Date(e.attendanceDateISO).toLocaleDateString(locale || 'en-US'),
    toTime(e.startTimeISO),
    toTime(e.endTimeISO),
    e.recordedTime ?? '-',
    e.breakTime ?? '0h',
    e.effectiveTime ?? '-',
    e.plannedTime ?? '-',
    e.differenceTime ?? '-'
  ])

  const employeeLabel = getTranslationFromI18nKeyAndLabel('lowcoder:employee.label', 'Employee')
  const fullName =
    employeeFirstName || employeeLastName ? `${employeeFirstName ?? ''} ${employeeLastName ?? ''}`.trim() : ''
  const subtitle = employeeId
    ? fullName
      ? `${employeeLabel}: ${fullName} (${employeeId})`
      : `${employeeLabel}: ${employeeId}`
    : ''

  const createdAt = new Date().toLocaleString(locale || 'en-US')

  // Build PDF using pdfkit (browser) + blob-stream
  // Ensure a global object exists for CJS libs (blob-stream -> blob uses `global`)
  const globalShim: any = globalThis as any
  if (typeof globalShim.global === 'undefined') {
    globalShim.global = globalShim
  }

  const PDFKitModule: any = await import('pdfkit/js/pdfkit.standalone.js')
  const PDFDocument = PDFKitModule.default || PDFKitModule

  const doc = new PDFDocument({ size: 'A4', margin: 40 })

  const margin = 40
  let cursorY = margin

  doc.font('Helvetica')

  // Title
  doc.fillColor('#000000').fontSize(14).text(title, margin, cursorY)
  cursorY += 18

  // Subtitle
  if (subtitle) {
    doc.fillColor('#333333').fontSize(10).text(subtitle, margin, cursorY)
    cursorY += 16
  }

  // Generated at
  doc
    .fillColor('#595959')
    .fontSize(9)
    .text(
      `${getTranslationFromI18nKeyAndLabel('lowcoder:common.generated', 'Generated')}: ${createdAt}`,
      margin,
      cursorY
    )
  cursorY += 12

  // Table layout
  const headerBg = '#f0f0f0'
  // widen time columns, slight adjust others for readability
  const colWidths = [70, 60, 60, 60, 55, 65, 65, 40]
  const tableX = margin
  const tableWidth = colWidths.reduce((a: number, b: number) => a + b, 0)
  const rowHeight = 20
  const paddingX = 4

  const drawHeader = () => {
    // Header background
    doc.save()
    doc.rect(tableX, cursorY, tableWidth, rowHeight).fill(headerBg)
    doc.restore()
    // Header text
    let cx = tableX + paddingX
    headers.forEach((h, idx) => {
      doc
        .fillColor('#000000')
        .fontSize(10)
        .text(String(h), cx, cursorY + 4, {
          width: colWidths[idx] - paddingX * 2,
          ellipsis: true,
          lineBreak: false
        })
      cx += colWidths[idx]
    })
    cursorY += rowHeight
  }

  const newPage = () => {
    doc.addPage()
    cursorY = margin
    drawHeader()
  }

  const ensureSpace = () => {
    const pageHeight = doc.page.height
    if (cursorY + rowHeight > pageHeight - margin) newPage()
  }

  // Header
  drawHeader()

  // Rows
  rows.forEach(r => {
    ensureSpace()
    let cx = tableX + paddingX
    r.forEach((cell, idx) => {
      doc
        .fillColor('#000000')
        .fontSize(10)
        .text(String(cell ?? ''), cx, cursorY + 4, {
          width: colWidths[idx] - paddingX * 2,
          ellipsis: true,
          lineBreak: false
        })
      cx += colWidths[idx]
    })
    // Optional: light row separator
    doc
      .moveTo(tableX, cursorY + rowHeight)
      .lineTo(tableX + tableWidth, cursorY + rowHeight)
      .strokeColor('#d9d9d9')
      .lineWidth(0.5)
      .stroke()
    cursorY += rowHeight
  })

  // Collect chunks directly from PDFKit stream and download
  const chunks: Uint8Array[] = []
  doc.on('data', (chunk: Uint8Array) => {
    chunks.push(chunk)
  })
  doc.on('end', () => {
    const parts = chunks.map(c => new Uint8Array(c)) as unknown as BlobPart[]
    const blob = new Blob(parts, { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  })
  doc.end()
}
