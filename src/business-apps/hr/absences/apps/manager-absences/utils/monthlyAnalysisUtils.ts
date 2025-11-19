import dayjs from 'dayjs'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

import 'dayjs/locale/ro'
import 'dayjs/locale/en'
import 'dayjs/locale/de'

export const analyzeSickAbsencesByMonth = (
  sickAbsences: any[]
): { month: string; monthNumber: number | null; count: number } => {
  const monthlySickAbsences: { [key: string]: { count: number; monthNumber: number } } = {}
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  sickAbsences.forEach(absence => {
    const date = dayjs(absence.startDate)
    const month = date.locale(userLocale).format('MMMM')
    const monthNumber = date.month()

    if (!monthlySickAbsences[month]) {
      monthlySickAbsences[month] = { count: 0, monthNumber }
    }
    monthlySickAbsences[month].count++
  })

  let maxSickMonth = 'None'
  let maxSickMonthNumber: number | null = null
  let maxSickCount = 0

  Object.entries(monthlySickAbsences).forEach(([month, data]) => {
    if (data.count > maxSickCount) {
      maxSickCount = data.count
      maxSickMonth = month
      maxSickMonthNumber = data.monthNumber
    }
  })

  return {
    month: maxSickMonth,
    monthNumber: maxSickMonthNumber,
    count: maxSickCount
  }
}
