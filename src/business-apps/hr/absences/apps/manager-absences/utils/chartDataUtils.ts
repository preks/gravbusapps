import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const getMonthlyUsage = (absences: any[], year: number): number[] => {
  const monthlyCounts = new Array(12).fill(0)

  absences.forEach(absence => {
    const startDate = dayjs(absence.startDate)
    const endDate = dayjs(absence.endDate)

    const isActiveInYear =
      (startDate.year() === year && startDate.month() >= 0 && startDate.month() < 12) ||
      (endDate.year() === year && endDate.month() >= 0 && endDate.month() < 12) ||
      (startDate.year() < year && endDate.year() > year)

    if (isActiveInYear) {
      let currentDate = startDate.isBefore(dayjs().year(year).startOf('year'))
        ? dayjs().year(year).startOf('year')
        : startDate
      const yearEnd = dayjs().year(year).endOf('year')

      while (currentDate.isBefore(endDate) && currentDate.isBefore(yearEnd)) {
        const month = currentDate.month()
        if (month >= 0 && month < 12) {
          monthlyCounts[month]++
        }
        currentDate = currentDate.add(1, 'day')
      }
    }
  })

  return monthlyCounts
}

export const generateYearOverYearChartData = (
  yearOverYearRawData: any[],
  currentYear: number,
  previousYear: number
) => {
  const currentYearMonthly = getMonthlyUsage(yearOverYearRawData, currentYear)
  const previousYearMonthly = getMonthlyUsage(yearOverYearRawData, previousYear)

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
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const translatedMonths = monthKeys.map((key, index) => getTranslationFromI18nKeyAndLabel(key, monthNames[index]))

  return translatedMonths.map((month, index) => ({
    month,
    [previousYear]: previousYearMonthly[index],
    [currentYear]: currentYearMonthly[index]
  }))
}
