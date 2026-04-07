import dayjs from 'dayjs'

export type TenureUnitMessages = {
  year: string
  years: string
  month: string
  months: string
}

/**
 * Human-readable tenure since hire date (same rules as employee profile header).
 */
export function formatTenureSinceHireDate(
  hireDate: string | null | undefined,
  messages: TenureUnitMessages
): string | null {
  if (!hireDate) return null
  const start = dayjs(hireDate)
  if (!start.isValid()) return null
  const now = dayjs()
  const years = now.diff(start, 'year')
  const months = now.diff(start, 'month') % 12

  let result = ''
  if (years > 0) {
    result += `${years} ${years === 1 ? messages.year : messages.years}`
  }
  if (months > 0 || years === 0) {
    if (years > 0) result += ' '
    result += `${months} ${months === 1 ? messages.month : messages.months}`
  }
  return result
}
