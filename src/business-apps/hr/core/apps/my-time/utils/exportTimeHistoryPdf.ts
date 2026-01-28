import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { parseDurationToMinutes } from './duration'
import type { TimeEntry } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import PDFKitModule from 'pdfkit/js/pdfkit.standalone.js'

/**
 * Generates a monthly time history report.
 * Downloads a proper PDF using a lightweight, on-demand library (pdf-lib).
 */
export const exportTimeHistoryPdf = async (params: {
  reportTitle?: string
  generatedLabel?: string
  holidayDates?: string[]
  vacationDates?: string[]
  workingHours?: {
    sundayHours?: number
    mondayHours?: number
    tuesdayHours?: number
    wednesdayHours?: number
    thursdayHours?: number
    fridayHours?: number
    saturdayHours?: number
  }
  t?: (key: string, args?: Record<string, any>) => string
  entries: TimeEntry[]
  monthDate: Date
  locale: string
  employeeId: string
  employeeCode?: string
  employeeFirstName?: string
  employeeLastName?: string
}) => {
  const { entries, monthDate, locale, employeeCode, employeeFirstName, employeeLastName } = params
  // Ensure the i18n bundle is referenced (tree-shaking safety in some setups)
  const translate = (key: string, defaultValue: string) => {
    try {
      const tf =
        (typeof params.t === 'function' && params.t) ||
        ((globalThis as any)?.window?.lowcoder?.i18n?.t as undefined | ((k: string, a?: any) => string))
      if (typeof tf === 'function') {
        const out = tf(key, { defaultValue })
        if (out && out !== key) return out
      }
    } catch {}
    return defaultValue
  }
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
  const notesLabel = getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.notes', 'Notes')

  // Table headers (aligned to UI terminology) - include weekday and extended fields
  const headers = [
    translate('time_tracking_table_day', 'Day'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.date', 'Date'),
    translate('time_tracking_table_workday', 'Workday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.start', 'Start'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.end', 'End'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.break', 'Break'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.effective', 'Effective'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.planned', 'Planned'),
    getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.diff', 'Diff'),
    notesLabel
  ]

  // Body rows

  // Helper to produce a stable YYYY-MM-DD key in local time
  const toLocalDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // Build a map of entries by local date key
  const entryByDay = new Map<string, TimeEntry>()
  for (const e of entries || []) {
    const d = new Date(e.attendanceDateISO)
    entryByDay.set(toLocalDateKey(d), e)
  }
  const holidaySet = new Set<string>((params.holidayDates || []).map(d => String(d)))
  const vacationSet = new Set<string>((params.vacationDates || []).map(d => String(d)))
  const bankHolidayText = translate('absence_hub_holiday', 'Bank Holiday')
  const vacationText = translate('absence_group_vacation', 'Vacation')

  // Date formatting helper: ensure dd.MM.yyyy for de/ro
  const formatDateForReport = (d: Date): string => {
    const loc = String(locale || 'en-US').toLowerCase()
    if (loc.startsWith('de') || loc.startsWith('ro')) {
      // Always use dd.mm.yyyy format for German and Romanian locales
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}.${month}.${year}`
    }
    // For other locales, use the standard locale formatting
    return d.toLocaleDateString(locale || 'en-US')
  }

  // Helpers for duration formatting
  const formatMinutes = (mins: number): string => {
    const sign = mins < 0 ? '-' : ''
    const abs = Math.abs(mins)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    if (m === 0) return `${sign}${h}h`
    return `${sign}${h}h ${m}m`
  }
  const getPlannedMinutesForDate = (date: Date): number => {
    const wh = params.workingHours
    if (!wh) return 0
    const day = date.getDay() // 0..6 where 0=Sun
    const hoursByDay = [
      wh.sundayHours,
      wh.mondayHours,
      wh.tuesdayHours,
      wh.wednesdayHours,
      wh.thursdayHours,
      wh.fridayHours,
      wh.saturdayHours
    ]
    const hours = hoursByDay[day] ?? 0
    return typeof hours === 'number' ? Math.max(0, Math.round(hours * 60)) : 0
  }

  // Generate rows for every day in the target month, filling blanks when no entry exists
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const rows: Array<string[]> = []
  // Summary accumulators
  let daysWorkedCount = 0
  let totalPlannedMinutes = 0
  let totalEffectiveMinutes = 0
  const bankHolidayDays = new Set<string>()
  const vacationDays = new Set<string>()

  for (
    let cursor = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
    cursor <= monthEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const key = toLocalDateKey(cursor)
    const e = entryByDay.get(key)
    const weekday = cursor.toLocaleDateString(locale || 'en-US', { weekday: 'short' })
    const workdayNote = holidaySet.has(key) ? bankHolidayText : vacationSet.has(key) ? vacationText : ''
    if (holidaySet.has(key)) bankHolidayDays.add(key)
    if (vacationSet.has(key)) vacationDays.add(key)
    if (e) {
      const plannedMin = parseDurationToMinutes(e.plannedTime)
      const effectiveMin = parseDurationToMinutes(e.effectiveTime)
      totalPlannedMinutes += plannedMin
      totalEffectiveMinutes += effectiveMin
      if (effectiveMin > 0 || e.startTimeISO || e.endTimeISO) daysWorkedCount += 1
      rows.push([
        weekday,
        formatDateForReport(cursor),
        workdayNote,
        toTime(e.startTimeISO),
        toTime(e.endTimeISO),
        e.breakTime ?? '0h',
        e.effectiveTime ?? '-',
        e.plannedTime ?? '-',
        e.differenceTime ?? '-',
        e.notes ?? ''
      ])
    } else {
      // For blank days: compute planned minutes from working hours when not holiday/vacation
      let blankPlannedMin = 0
      if (!holidaySet.has(key) && !vacationSet.has(key)) {
        blankPlannedMin = getPlannedMinutesForDate(cursor)
        totalPlannedMinutes += blankPlannedMin
      }
      rows.push([
        weekday,
        formatDateForReport(cursor),
        workdayNote,
        '-',
        '-',
        '0h', // break
        '0h', // effective
        blankPlannedMin > 0 ? formatMinutes(blankPlannedMin) : '-', // planned
        '0h', // diff
        ''
      ])
    }
  }

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

  // Portrait layout
  const doc = new PDFDocument({ size: 'A4', margin: 40 })

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
  doc.fillColor('#000000').fontSize(12).text(title, margin, cursorY)
  cursorY += 16

  // Subtitle
  if (subtitle) {
    doc.fillColor('#333333').fontSize(9).text(subtitle, margin, cursorY)
    cursorY += 14
  }

  // Generated at
  doc
    .fillColor('#595959')
    .fontSize(8)
    .text(
      `${params.generatedLabel || getTranslationFromI18nKeyAndLabel('lowcoder:common.generated', 'Generated')}: ${createdAt}`,
      margin,
      cursorY
    )
  cursorY += 12

  // Table layout
  const headerBg = '#f0f0f0'
  // Compute dynamic column widths from content to avoid header wrapping in long translations
  const paddingX = 4
  const headerFontSize = 9
  const rowFontSize = 8
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
    colWidths = colWidths.map(w => Math.max(35, Math.floor(w * scale)))
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

  // Summary section
  const summaryTitle = translate('time_tracking_summary_title', 'Summary')
  const daysWorkedLabel = translate('time_tracking_summary_days_worked', 'Days worked')
  const bankHolidaysLabel = translate('time_tracking_summary_bank_holidays', 'Bank holidays')
  const vacationDaysLabel = translate('time_tracking_summary_vacation_days', 'Vacation days')
  const plannedHoursLabel = translate('time_tracking_summary_planned_hours', 'Planned hours')
  const effectiveHoursLabel = translate('time_tracking_summary_effective_hours', 'Effective hours')
  const differenceHoursLabel = translate('time_tracking_summary_difference_hours', 'Difference')
  const summaryDiffMinutes = totalPlannedMinutes - totalEffectiveMinutes

  // Ensure space for ~3 lines (reduced from 8 due to multi-column layout)
  const linesNeeded = 4
  if (cursorY + linesNeeded * 14 > (doc.page.height as number) - margin) {
    // Start summary on a fresh page WITHOUT repeating the table header
    doc.addPage()
    cursorY = margin
  }
  // Add spacing between table and summary
  cursorY += 20
  doc.fillColor('#000000').fontSize(9).text(summaryTitle, tableX, cursorY)
  cursorY += 12

  // Multi-column layout: 2 columns with 3 rows
  const numColumns = 2
  const columnSpacing = 20
  const usableWidth = availableWidth - (numColumns - 1) * columnSpacing
  const columnWidth = usableWidth / numColumns
  const labelWidth = columnWidth * 0.65 // 65% for label
  const valueWidth = columnWidth * 0.35 // 35% for value
  const summaryRowHeight = 12

  // Prepare summary items
  const summaryItems: Array<{ label: string; value: string }> = [
    { label: daysWorkedLabel, value: String(daysWorkedCount) },
    { label: bankHolidaysLabel, value: String(bankHolidayDays.size) },
    { label: vacationDaysLabel, value: String(vacationDays.size) },
    { label: plannedHoursLabel, value: formatMinutes(totalPlannedMinutes) },
    { label: effectiveHoursLabel, value: formatMinutes(totalEffectiveMinutes) },
    { label: differenceHoursLabel, value: formatMinutes(summaryDiffMinutes) }
  ]

  // Render in 2 columns (3 rows)
  const itemsPerColumn = Math.ceil(summaryItems.length / numColumns)
  const startY = cursorY

  for (let row = 0; row < itemsPerColumn; row++) {
    for (let col = 0; col < numColumns; col++) {
      const itemIndex = row * numColumns + col
      if (itemIndex >= summaryItems.length) break

      const item = summaryItems[itemIndex]
      const x = tableX + col * (columnWidth + columnSpacing)
      const y = startY + row * summaryRowHeight

      // Write label
      doc.fontSize(8).fillColor('#333333').text(item.label, x, y, { width: labelWidth })
      // Write value
      doc
        .fontSize(8)
        .fillColor('#000000')
        .text(item.value, x + labelWidth + 4, y, { width: valueWidth })
    }
  }
  cursorY = startY + itemsPerColumn * summaryRowHeight

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
