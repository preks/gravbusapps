// Shared duration utilities for My Time features.
// Accepts from BE: "HH:MM", "Xh Ym", "Xh", "Xm". Sends to BE: "HH:MM".

/**
 * Parse duration string into total minutes.
 * Supports:
 * - "HH:MM" or "H:MM" (e.g. "08:30" -> 510, "8:00" -> 480)
 * - "Xh Ym" (e.g. "4h 30m" -> 270), "-Xh Ym" / "-30m" (negative)
 * - "Xh" (e.g. "8h" -> 480)
 * - "Xm" (e.g. "45m" -> 45)
 */
export const parseDurationToMinutes = (text?: string): number => {
  if (!text) return 0
  let trimmed = String(text).trim()
  if (!trimmed) return 0

  const negative = trimmed.startsWith('-')
  if (negative) trimmed = trimmed.slice(1).trim()

  // HH:MM or H:MM
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number)
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      const total = h * 60 + m
      return negative ? -total : total
    }
  }

  // Xh Ym / Xh / Xm
  let hours = 0
  let minutes = 0
  const tokens = trimmed.split(/\s+/)
  for (const token of tokens) {
    if (/^\d+h$/i.test(token)) {
      hours = Number.parseInt(token.slice(0, -1), 10) || 0
    } else if (/^\d+m$/i.test(token)) {
      minutes = Number.parseInt(token.slice(0, -1), 10) || 0
    }
  }
  const total = hours * 60 + minutes
  return negative ? -total : total
}

/**
 * Convert total minutes to "HH:MM" string (for sending to BE or display).
 * Examples: 0 -> "00:00", 90 -> "01:30", 480 -> "08:00"
 */
export const minutesToHHMM = (minutes: number): string => {
  const total = Math.max(0, Math.floor(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * Convert total minutes to signed "HH:MM" string, preserving negative values.
 * Use for difference/delta fields where negative is meaningful.
 * Examples: -60 -> "-01:00", 90 -> "01:30", 0 -> "00:00"
 */
export const minutesToSignedHHMM = (minutes: number): string => {
  if (minutes < 0) return `-${minutesToHHMM(Math.abs(minutes))}`
  return minutesToHHMM(minutes)
}

/**
 * Parse any duration string from BE and return normalized "HH:MM" for display.
 * Handles "HH:MM", "Xh Ym"/"Xh", and negative (e.g. "-30m" -> "-00:30").
 */
export const formatDurationToHHMM = (text?: string): string => {
  if (!text || !String(text).trim()) return '00:00'
  const minutes = parseDurationToMinutes(text)
  if (minutes < 0) return `-${minutesToHHMM(Math.abs(minutes))}`
  return minutesToHHMM(minutes)
}

/**
 * Convert total minutes to "Xh Ym" / "Xh" string (for display in calendar etc.).
 * Handles negative: -30 -> "-30m", -90 -> "-1h 30m".
 * Examples: 0 -> "0h", 90 -> "1h 30m", 480 -> "8h", 45 -> "45m"
 */
export const minutesToXhYm = (minutes: number): string => {
  const sign = minutes < 0 ? '-' : ''
  const total = Math.abs(Math.floor(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0 && m === 0) return `${sign}0h`
  if (h === 0) return `${sign}${m}m`
  if (m === 0) return `${sign}${h}h`
  return `${sign}${h}h ${m}m`
}

/**
 * Parse any duration string from BE (HH:MM, Xh Ym, Xh, Xm) and return
 * normalized "Xh Ym" / "Xh" for display (e.g. in AbsenceCalendar).
 */
export const formatDurationToXhYm = (text?: string): string => {
  if (!text || !String(text).trim()) return '0h'
  return minutesToXhYm(parseDurationToMinutes(text))
}
