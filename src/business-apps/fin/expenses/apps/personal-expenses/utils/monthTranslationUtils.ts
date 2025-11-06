import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Gets the translated month name using the absence_report.employee_table pattern
 * @param date - Date object or date string
 * @returns Translated month name
 */
export const getTranslatedMonthName = (date: string | Date): string => {
  const monthKeys = [
    'lowcoder:absence_report.employee_table.january',
    'lowcoder:absence_report.employee_table.february',
    'lowcoder:absence_report.employee_table.march',
    'lowcoder:absence_report.employee_table.april',
    'lowcoder:absence_report.employee_table.may',
    'lowcoder:absence_report.employee_table.june',
    'lowcoder:absence_report.employee_table.july',
    'lowcoder:absence_report.employee_table.august',
    'lowcoder:absence_report.employee_table.september',
    'lowcoder:absence_report.employee_table.october',
    'lowcoder:absence_report.employee_table.november',
    'lowcoder:absence_report.employee_table.december'
  ]

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]

  const dateObj = typeof date === 'string' ? new Date(date) : date
  const monthIndex = dateObj.getMonth()

  return getTranslationFromI18nKeyAndLabel(monthKeys[monthIndex], monthNames[monthIndex])
}
