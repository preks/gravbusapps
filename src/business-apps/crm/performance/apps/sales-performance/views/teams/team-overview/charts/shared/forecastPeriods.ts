export interface ForecastPeriod {
  start: string
  end: string
  label: string
}

export const generateForecastPeriods = (): ForecastPeriod[] => {
  const currentDate = new Date()
  const periods: ForecastPeriod[] = []

  for (let index = 0; index < 3; index += 1) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + index, 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1)

    periods.push({
      start: date.toISOString(),
      end: monthEnd.toISOString(),
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    })
  }

  return periods
}
