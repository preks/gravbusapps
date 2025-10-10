import dayjs from 'dayjs'
import { Employee } from '../hooks/useGetEmployeesReport'

/**
 * Calculates the tenure of a single employee in months.
 * @param employee The employee object.
 * @returns The employee's tenure in months, as a floating-point number.
 */
export const getEmployeeTenureInMonths = (employee: Employee): number => {
  if (!employee.startDate) return 0
  const start = dayjs(employee.startDate)
  const end = employee.exitDate ? dayjs(employee.exitDate) : dayjs()
  return end.diff(start, 'month', true)
}

/**
 * Calculates the average tenure for a list of employees and provides a formatted string representation.
 * @param employees The list of employees.
 * @returns An object containing the average tenure in months and a formatted string (e.g., '1y 5m').
 */
export const calculateAverageTenure = (employees: Employee[]): { average: number; formatted: string } => {
  const employeesWithTenure = employees.filter(e => e.startDate)
  if (employeesWithTenure.length === 0) {
    return { average: 0, formatted: '0y 0m' }
  }

  const totalTenureInMonths = employeesWithTenure.reduce((acc, employee) => {
    return acc + getEmployeeTenureInMonths(employee)
  }, 0)

  const averageTenureInMonths = totalTenureInMonths / employeesWithTenure.length

  const years = Math.floor(averageTenureInMonths / 12)
  const months = Math.round(averageTenureInMonths % 12)

  const formatted = `${years}y ${months}m`

  return {
    average: averageTenureInMonths,
    formatted
  }
}
