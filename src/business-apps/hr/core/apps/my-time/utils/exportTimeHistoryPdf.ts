import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { TimeEntry } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import PDFKitModule from 'pdfkit/js/pdfkit.standalone.js'

/**
 * Generates a monthly time history report.
 * Downloads a proper PDF using a lightweight, on-demand library (pdf-lib).
 */
export const exportTimeHistoryPdf = async (params: {
  reportTitle?: string
  entries: TimeEntry[]
  monthDate: Date
  locale: string
  employeeId: string
  employeeCode?: string
  employeeFirstName?: string
  employeeLastName?: string
}) => {
  const { entries, monthDate, locale, employeeCode, employeeFirstName, employeeLastName } = params

  // Title
  const monthTitle = monthDate.toLocaleString(locale, { month: 'long', year: 'numeric' })
  const providedTitle = params.reportTitle && String(params.reportTitle).trim().length > 0 ? params.reportTitle : null
  const title = `${providedTitle || getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.history.report_title', 'Time History Report')} • ${monthTitle}`

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

  // Helper labels
  const yesLabel = getTranslationFromI18nKeyAndLabel('common.yes', 'Yes')
  const noLabel = getTranslationFromI18nKeyAndLabel('common.no', 'No')
  const locationLabel = getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.label', 'Location')
  const manualLabel = getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.manual', 'Manual')
  const notesLabel = getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.notes', 'Notes')
  const statusLabel = getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.status', 'Status')

  // Table headers (aligned to UI terminology) - include weekday and extended fields
  const headers = [
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.weekday', 'Weekday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.date', 'Date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.start', 'Start'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.end', 'End'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.recorded', 'Recorded'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.break', 'Break'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.effective', 'Effective'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.planned', 'Planned'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.diff', 'Diff'),
    manualLabel,
    locationLabel,
    notesLabel,
    statusLabel
  ]

  // Body rows
  const getLocationText = (loc?: string) => {
    switch (loc) {
      case 'IS_NEAR_HOME':
        return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.home', 'Home')
      case 'IS_NEAR_OFFICE':
        return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.office', 'Office')
      case 'IS_OTHER_LOCATION':
        return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.remote', 'Remote Location')
      default:
        return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.unknown', 'Unknown')
    }
  }

  const rows = [...(entries || [])]
    // Sort by date ascending for the report regardless of UI sort
    .sort((a, b) => {
      const ta = new Date(a.attendanceDateISO).getTime()
      const tb = new Date(b.attendanceDateISO).getTime()
      return ta - tb
    })
    .map(e => {
      const d = new Date(e.attendanceDateISO)
      const weekday = d.toLocaleDateString(locale || 'en-US', { weekday: 'short' })
      return [
        weekday,
        d.toLocaleDateString(locale || 'en-US'),
        toTime(e.startTimeISO),
        toTime(e.endTimeISO),
        e.recordedTime ?? '-',
        e.breakTime ?? '0h',
        e.effectiveTime ?? '-',
        e.plannedTime ?? '-',
        e.differenceTime ?? '-',
        e.manualOverride ? yesLabel : noLabel,
        getLocationText(e.attendanceLocation),
        e.notes ?? '',
        e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : '-'
      ]
    })

  // Use a more widely-available key for "Employee" label
  const employeeLabel = getTranslationFromI18nKeyAndLabel('lowcoder:working_hours_form.employee_label', 'Employee')
  const fullName =
    employeeFirstName || employeeLastName ? `${employeeFirstName ?? ''} ${employeeLastName ?? ''}`.trim() : ''
  // For privacy, do not show internal employeeId. Prefer employeeCode when available.
  const subtitle = fullName
    ? employeeCode
      ? `${employeeLabel}: ${fullName} (${employeeCode})`
      : `${employeeLabel}: ${fullName}`
    : employeeCode
      ? `${employeeLabel}: ${employeeCode}`
      : ''

  const createdAt = new Date().toLocaleString(locale || 'en-US')

  // Build PDF using pdfkit (browser) + blob-stream
  // Ensure a global object exists for CJS libs (blob-stream -> blob uses `global`)
  const globalShim: any = globalThis as any
  if (typeof globalShim.global === 'undefined') {
    globalShim.global = globalShim
  }

  const PDFDocument = PDFKitModule.default || PDFKitModule

  // Landscape layout per requirement
  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' })

  const margin = 40
  let cursorY = margin

  // Load a Unicode-capable font to properly render diacritics and special characters.
  // We try a couple of widely available TTFs with permissive CORS. If all fail, we fall back.
  const fontCandidates = [
    // Broad Unicode coverage and permissive CDN
    'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37/ttf/DejaVuSans.ttf',
    // Backup
    'https://fonts.gstatic.com/s/notosans/v38/o-0IIpQlx3QUlC5A4PNr5TRF.ttf',
    // Another backup
    'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/fonts/Roboto-Regular.ttf'
  ]
  let fontLoaded = false
  for (const url of fontCandidates) {
    try {
      const res = await fetch(url, { mode: 'cors' })
      if (res.ok) {
        const buf = await res.arrayBuffer()
        // pdfkit (browser) accepts ArrayBuffer/Uint8Array
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
  // Compute dynamic column widths from content to avoid header wrapping in long translations
  const paddingX = 4
  const headerFontSize = 10
  const rowFontSize = 10
  const tableX = margin
  const availableWidth = (doc.page.width as number) - margin * 2

  const measure = (text: string, fs: number) => {
    try {
      doc.fontSize(fs)
      return Math.ceil(doc.widthOfString(String(text || '')) + paddingX * 2 + 6)
    } catch {
      return 50
    }
  }

  let colWidths = headers.map(h => measure(String(h), headerFontSize))
  const sampleCount = Math.min(rows.length, 100)
  for (let i = 0; i < sampleCount; i++) {
    const row = rows[i]
    for (let c = 0; c < row.length; c++) {
      colWidths[c] = Math.max(colWidths[c], measure(String(row[c] ?? ''), rowFontSize))
    }
  }
  // If total exceeds available space, scale proportionally
  const totalNatural = colWidths.reduce((a, b) => a + b, 0)
  if (totalNatural > availableWidth) {
    const scale = availableWidth / totalNatural
    colWidths = colWidths.map(w => Math.max(40, Math.floor(w * scale)))
  }
  const tableWidth = colWidths.reduce((a: number, b: number) => a + b, 0)
  const rowHeight = 20

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
        .fontSize(headerFontSize)
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
        .fontSize(rowFontSize)
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
    // Defer revocation slightly to avoid race condition with the download trigger
    setTimeout(() => URL.revokeObjectURL(url), 100)
  })
  doc.end()
}
