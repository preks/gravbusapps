export const getDateFilters = (timeFilter: string) => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1
  const currentMonth = now.getMonth()

  switch (timeFilter) {
    case 'current-year':
      return {
        startDate: new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0)).toISOString(),
        endDate: new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999)).toISOString()
      }

    case 'quarter': {
      const quarterStartMonth = (currentQuarter - 1) * 3
      const quarterEndMonth = quarterStartMonth + 2

      return {
        startDate: new Date(Date.UTC(currentYear, quarterStartMonth, 1, 0, 0, 0, 0)).toISOString(),
        endDate: new Date(Date.UTC(currentYear, quarterEndMonth + 1, 0, 23, 59, 59, 999)).toISOString()
      }
    }

    case 'month':
      return {
        startDate: new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0)).toISOString(),
        endDate: new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)).toISOString()
      }

    case 'everything': {
      const everythingFilters = {
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: new Date(currentYear + 1, 11, 31, 23, 59, 59, 999).toISOString()
      }
      return everythingFilters
    }

    default:
      return null
  }
}
