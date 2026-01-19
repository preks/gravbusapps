import dayjs from 'dayjs'
import { Employee } from '../hooks/useGetEmployeesReport'

const getLocalizedAbbreviations = () => {
  const userLocale = window?.lowcoder?.i18n?.selectedLocale || 'en-US'

  const abbreviations: Record<string, { year: string; month: string }> = {
    'ro-RO': { year: 'a', month: 'l' },
    'de-DE': { year: 'J', month: 'M' },
    'en-US': { year: 'y', month: 'm' }
  }

  return abbreviations[userLocale] || abbreviations['en-US']
}

export const getEmployeeTenureInMonths = (employee: Employee): number => {
  if (!employee.startDate) return 0
  const start = dayjs(employee.startDate)
  const end = employee.exitDate ? dayjs(employee.exitDate) : dayjs()
  return end.diff(start, 'month', true)
}

export const calculateAverageTenure = (employees: Employee[]): { average: number; formatted: string } => {
  const employeesWithTenure = employees.filter(e => e.startDate)
  if (employeesWithTenure.length === 0) {
    const abbreviations = getLocalizedAbbreviations()
    return { average: 0, formatted: `0${abbreviations.year} 0${abbreviations.month}` }
  }

  const totalTenureInMonths = employeesWithTenure.reduce((acc, employee) => {
    return acc + getEmployeeTenureInMonths(employee)
  }, 0)

  const averageTenureInMonths = totalTenureInMonths / employeesWithTenure.length

  const years = Math.floor(averageTenureInMonths / 12)
  const months = Math.round(averageTenureInMonths % 12)

  const abbreviations = getLocalizedAbbreviations()
  const formatted = `${years}${abbreviations.year} ${months}${abbreviations.month}`

  return {
    average: averageTenureInMonths,
    formatted
  }
}
