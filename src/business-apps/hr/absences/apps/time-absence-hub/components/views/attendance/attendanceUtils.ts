export const toMinutes = (value?: number | null): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

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
