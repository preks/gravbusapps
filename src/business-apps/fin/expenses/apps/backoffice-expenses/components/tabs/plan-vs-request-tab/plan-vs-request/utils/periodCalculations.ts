import dayjs from 'dayjs'

export interface PeriodBoundaries {
  currentStartDate: string
  currentEndDate: string
  previousStartDate: string
  previousEndDate: string
}

/**
 * Calculate period boundaries for current and previous periods
 * @param period - Selected period ('month', 'quarter', 'year')
 * @returns Period boundaries with start and end dates in ISO format
 */
export const calculatePeriodBoundaries = (period: 'month' | 'quarter' | 'year'): PeriodBoundaries => {
  const now = dayjs()
  const currentYear = now.year()
  const currentMonth = now.month()

  let currentStartDate: string
  let currentEndDate: string
  let previousStartDate: string
  let previousEndDate: string

  switch (period) {
    case 'month': {
      currentStartDate = now.startOf('month').format('YYYY-MM-DDTHH:mm:ss')
      currentEndDate = now.endOf('month').format('YYYY-MM-DDTHH:mm:ss')
      previousStartDate = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm:ss')
      previousEndDate = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DDTHH:mm:ss')
      break
    }
    case 'quarter': {
      const currentQuarter = Math.floor(currentMonth / 3)
      const startMonth = currentQuarter * 3
      const endMonth = startMonth + 2

      currentStartDate = dayjs().year(currentYear).month(startMonth).startOf('month').format('YYYY-MM-DDTHH:mm:ss')
      currentEndDate = dayjs().year(currentYear).month(endMonth).endOf('month').format('YYYY-MM-DDTHH:mm:ss')

      const prevQuarter = currentQuarter - 1
      if (prevQuarter < 0) {
        previousStartDate = dayjs()
          .year(currentYear - 1)
          .month(9)
          .startOf('month')
          .format('YYYY-MM-DDTHH:mm:ss')
        previousEndDate = dayjs()
          .year(currentYear - 1)
          .month(11)
          .endOf('month')
          .format('YYYY-MM-DDTHH:mm:ss')
      } else {
        const prevStartMonth = prevQuarter * 3
        const prevEndMonth = prevStartMonth + 2
        previousStartDate = dayjs()
          .year(currentYear)
          .month(prevStartMonth)
          .startOf('month')
          .format('YYYY-MM-DDTHH:mm:ss')
        previousEndDate = dayjs().year(currentYear).month(prevEndMonth).endOf('month').format('YYYY-MM-DDTHH:mm:ss')
      }
      break
    }
    case 'year': {
      currentStartDate = dayjs().year(currentYear).startOf('year').format('YYYY-MM-DDTHH:mm:ss')
      currentEndDate = now.endOf('month').format('YYYY-MM-DDTHH:mm:ss')
      previousStartDate = dayjs()
        .year(currentYear - 1)
        .startOf('year')
        .format('YYYY-MM-DDTHH:mm:ss')
      previousEndDate = dayjs()
        .year(currentYear - 1)
        .month(currentMonth)
        .endOf('month')
        .format('YYYY-MM-DDTHH:mm:ss')
      break
    }
  }

  return {
    currentStartDate,
    currentEndDate,
    previousStartDate,
    previousEndDate
  }
}
