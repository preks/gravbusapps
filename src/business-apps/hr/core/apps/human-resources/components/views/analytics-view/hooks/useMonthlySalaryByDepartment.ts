import { useMemo } from 'react'
import { QueryType } from '@/common/network/dataset'
import { useDatasetQuery } from './useDatasetQuery'
import dayjs from 'dayjs'

/**
 * Dataset response type for monthly salary by department query
 */
type DatasetRow = {
  category?: string
  department_name?: string
  department_id?: string
  value?: number
  [key: string]: any
}

/**
 * Department salary data structure
 */
export interface DepartmentSalary {
  id: string
  name: string
  color: string
  salary: number
  percent: number
  change: number
}

/**
 * Monthly department salary stack data structure
 */
export interface MonthlyDepartmentSalaryStack {
  month: string
  totalSalary: number
  departments: DepartmentSalary[]
  change: number
}

/**
 * Department color palette
 */
const DEPARTMENT_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)'
]

/**
 * Group dataset rows by month and department
 */
const groupDataByMonthAndDepartment = (
  rows: DatasetRow[]
): Map<string, Map<string, { id: string; name: string; salary: number }>> => {
  const monthlyDataMap = new Map<string, Map<string, { id: string; name: string; salary: number }>>()

  rows.forEach((row: DatasetRow) => {
    const month = String(row.category || '')
    const departmentId = String(row.department_id || 'unknown')
    const departmentName = String(row.department_name || 'Unknown')
    const salary = Number(row.value ?? 0)

    if (!month || salary <= 0) return

    if (!monthlyDataMap.has(month)) {
      monthlyDataMap.set(month, new Map())
    }

    const departmentMap = monthlyDataMap.get(month)!
    if (departmentMap.has(departmentId)) {
      const existing = departmentMap.get(departmentId)!
      existing.salary += salary
    } else {
      departmentMap.set(departmentId, {
        id: departmentId,
        name: departmentName,
        salary
      })
    }
  })

  return monthlyDataMap
}

/**
 * Transform grouped data to MonthlyDepartmentSalaryStack format
 */
const transformToMonthlyStacks = (
  monthlyDataMap: Map<string, Map<string, { id: string; name: string; salary: number }>>
): MonthlyDepartmentSalaryStack[] => {
  const transformMonthData = (
    month: string,
    departmentMap: Map<string, { id: string; name: string; salary: number }>
  ) => {
    const departments = Array.from(departmentMap.values())
    const totalSalary = departments.reduce((sum, dept) => sum + dept.salary, 0)

    const departmentsWithMetadata: DepartmentSalary[] = departments.map((dept, index) => ({
      ...dept,
      color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
      percent: totalSalary > 0 ? (dept.salary / totalSalary) * 100 : 0,
      change: 0
    }))

    const sortedDepartments = [...departmentsWithMetadata].sort((a, b) => b.salary - a.salary)

    return {
      month,
      totalSalary,
      departments: sortedDepartments,
      change: 0
    }
  }

  const result = Array.from(monthlyDataMap.entries()).map(([month, departmentMap]) =>
    transformMonthData(month, departmentMap)
  )
  return [...result].sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Calculate month-over-month changes for total and department salaries
 */
const calculateMonthlyChanges = (monthlyStacks: MonthlyDepartmentSalaryStack[]): void => {
  for (let i = 0; i < monthlyStacks.length; i++) {
    const current = monthlyStacks[i]
    const previous = i > 0 ? monthlyStacks[i - 1] : null

    current.change = previous ? current.totalSalary - previous.totalSalary : 0

    current.departments.forEach(dept => {
      const prevDept = previous?.departments.find(pd => pd.id === dept.id)
      dept.change = prevDept ? dept.salary - prevDept.salary : 0
    })
  }
}

/**
 * Transform dataset rows to MonthlyDepartmentSalaryStack format
 */
const transformMonthlySalaryByDepartment = (rows: DatasetRow[]): MonthlyDepartmentSalaryStack[] => {
  const monthlyDataMap = groupDataByMonthAndDepartment(rows)
  const monthlyStacks = transformToMonthlyStacks(monthlyDataMap)
  calculateMonthlyChanges(monthlyStacks)
  return monthlyStacks
}

/**
 * Hook to fetch monthly salary by department from dataset API
 * Uses the monthlySalarybyDepartment query
 *
 * @param accessToken - Access token for API authentication
 * @param startDate - Start date for the range (YYYY-MM-DD)
 * @param endDate - End date for the range (YYYY-MM-DD)
 * @returns Object containing monthly department salary data, loading state, error, and refetch function
 */
export const useMonthlySalaryByDepartment = (accessToken: string, startDate: string, endDate: string) => {
  const params = useMemo(
    () => ({
      startDate: startDate || dayjs().startOf('year').format('YYYY-MM-DD'),
      endDate: endDate || dayjs().endOf('year').format('YYYY-MM-DD')
    }),
    [startDate, endDate]
  )

  return useDatasetQuery<MonthlyDepartmentSalaryStack>(
    accessToken,
    'monthlySalarybyDepartment',
    QueryType.DATASET,
    params,
    transformMonthlySalaryByDepartment,
    'useMonthlySalaryByDepartment'
  )
}
