export const toMinutes = (value?: number | string | null): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return 0
  }

  const raw = value.trim()
  if (!raw) {
    return 0
  }

  let normalized = raw
  const isNegative = normalized.startsWith('-')
  if (isNegative) {
    normalized = normalized.slice(1).trim()
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const total = Number(normalized)
    return Number.isFinite(total) ? (isNegative ? -total : total) : 0
  }

  if (/^\d{1,2}:\d{2}$/.test(normalized)) {
    const [hoursPart, minutesPart] = normalized.split(':').map(Number)
    if (!Number.isNaN(hoursPart) && !Number.isNaN(minutesPart)) {
      const total = hoursPart * 60 + minutesPart
      return isNegative ? -total : total
    }
  }

  let total = 0
  normalized.split(/\s+/).forEach(token => {
    if (/^\d+h$/i.test(token)) {
      total += (Number.parseInt(token.slice(0, -1), 10) || 0) * 60
    } else if (/^\d+m$/i.test(token)) {
      total += Number.parseInt(token.slice(0, -1), 10) || 0
    }
  })

  return isNegative ? -total : total
}

export const formatMinutes = (minutes?: number | null): string => {
  if ((!minutes && minutes !== 0) || !Number.isFinite(minutes)) {
    return '-'
  }

  const sign = minutes < 0 ? '-' : ''
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60

  return `${sign}${hours}h ${String(mins).padStart(2, '0')}m`
}

export interface AttendanceDateRange {
  dateFrom: string
  dateTo: string
}

export const clampDateRangeToPast = (dateRange: AttendanceDateRange | null): AttendanceDateRange | null => {
  if (!dateRange?.dateFrom || !dateRange.dateTo) {
    return null
  }

  const today = new Date().toISOString().slice(0, 10)
  const dateTo = dateRange.dateTo > today ? today : dateRange.dateTo

  if (dateRange.dateFrom > dateTo) {
    return null
  }

  return { dateFrom: dateRange.dateFrom, dateTo }
}
