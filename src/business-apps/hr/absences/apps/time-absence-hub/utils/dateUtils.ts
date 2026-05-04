export const parseMonthAndYear = (monthInput: string, defaultYear: number = new Date().getFullYear()) => {
  let monthName = monthInput
  let actualYear = defaultYear

  const monthParts = monthInput
    .trim()
    .split(' ')
    .filter(part => part.length > 0)

  if (monthParts.length >= 2) {
    const [candidateMonth, candidateYear] = monthParts
    const parsedYear = Number.parseInt(candidateYear, 10)
    const hasValidYear = candidateYear.length === 4 && Number.isInteger(parsedYear)

    if (hasValidYear) {
      monthName = candidateMonth
      actualYear = parsedYear
    }
  }

  // Find month index
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

  const monthIndex = monthNames.findIndex(m => m.startsWith(monthName.substring(0, 3)))

  if (monthIndex === -1) {
    console.error('❌ Month not found:', { monthInput, monthName })
    return null
  }

  return {
    monthIndex,
    monthName: monthNames[monthIndex],
    shortMonth: monthName.substring(0, 3),
    year: actualYear
  }
}

export const generateMonthDateRange = (monthInput: string, defaultYear: number = new Date().getFullYear()) => {
  const parsed = parseMonthAndYear(monthInput, defaultYear)

  if (!parsed) {
    return null
  }

  const { monthIndex, shortMonth, year } = parsed
  const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0)
  const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`

  return {
    startDate,
    endDate,
    shortMonth,
    year
  }
}

export const toUtcDayRangeISO = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const startIso = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0)
  ).toISOString()

  const endIso = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999)
  ).toISOString()

  return {
    startIso,
    endIso
  }
}
