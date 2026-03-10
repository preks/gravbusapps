export function formatDateTime(value?: string): string {
  if (!value) return 'n/a'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

export function formatEnumLabel(value?: string): string {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatStatusLabel(value?: string): string {
  const normalized = formatEnumLabel(value)
  return normalized ? normalized.toUpperCase() : 'UNKNOWN'
}

export function formatHoursDuration(hours?: number | null): string {
  if (hours == null || Number.isNaN(hours)) return 'n/a'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours.toFixed(1)} h`
  if (hours < 24 * 7) return `${Math.round(hours / 24)} d`
  return `${Math.round(hours / (24 * 7))} w`
}

export function formatDetailedHoursDuration(hours?: number | null): string {
  if (hours == null || Number.isNaN(hours)) return 'n/a'

  const totalMinutes = Math.max(0, Math.round(hours * 60))

  if (totalMinutes < 60) return `${totalMinutes} min`

  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  if (totalHours < 24) {
    return remainingMinutes > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalHours}h`
  }

  const days = Math.floor(totalHours / 24)
  const remainingHours = totalHours % 24

  if (days < 7) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }

  const weeks = Math.floor(days / 7)
  const remainingDays = days % 7

  return remainingDays > 0 ? `${weeks}w ${remainingDays}d` : `${weeks}w`
}

export function formatMinutesDuration(minutes?: number | null): string {
  if (minutes == null || Number.isNaN(minutes)) return 'n/a'
  if (minutes < 60) return `${Math.round(minutes)} min`
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  return `${Math.round(minutes / (24 * 60))} d`
}

export function formatMillisecondsDuration(durationMs?: number | null): string {
  if (durationMs == null || Number.isNaN(durationMs)) return 'n/a'
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`

  const seconds = durationMs / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`

  return `${(seconds / 60).toFixed(1)} min`
}

export function formatPercent(value?: number | null, precision = 1): string {
  if (value == null || Number.isNaN(value)) return '0%'
  return `${value.toFixed(precision)}%`
}
