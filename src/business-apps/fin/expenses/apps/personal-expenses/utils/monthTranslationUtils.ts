const PERSONAL_EXPENSES_MONTH_KEYS = [
  'personal-expenses-month-january',
  'personal-expenses-month-february',
  'personal-expenses-month-march',
  'personal-expenses-month-april',
  'personal-expenses-month-may',
  'personal-expenses-month-june',
  'personal-expenses-month-july',
  'personal-expenses-month-august',
  'personal-expenses-month-september',
  'personal-expenses-month-october',
  'personal-expenses-month-november',
  'personal-expenses-month-december'
] as const

/**
 * Localized month name for personal-expenses (FTL / useTranslation).
 * Replaces legacy lowcoder absence_report.employee_table.* keys.
 */
export function getTranslatedMonthName(date: string | Date, t: (key: string) => string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const monthIndex = dateObj.getMonth()
  return t(PERSONAL_EXPENSES_MONTH_KEYS[monthIndex])
}
