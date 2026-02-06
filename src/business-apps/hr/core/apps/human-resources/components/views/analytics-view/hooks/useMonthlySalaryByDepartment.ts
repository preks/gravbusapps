import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import dayjs from 'dayjs'

/**
 * Dataset response type for monthly salary by department query
 */
type DatasetRow = {
  category?: string // month (YYYY-MM)
  department_name?: string
  department_id?: string
  value?: number // salary amount
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
  month: string // e.g. '2026-01'
  totalSalary: number
  departments: DepartmentSalary[]
  change: number // month-over-month change in total salary
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
 * Hook to fetch monthly salary by department from dataset API
 * Uses the monthlySalarybyDepartment query
 *
 * @param accessToken - Access token for API authentication
 * @param startDate - Start date for the range (YYYY-MM-DD)
 * @param endDate - End date for the range (YYYY-MM-DD)
 * @returns Object containing monthly department salary data, loading state, error, and refetch function
 */
export const useMonthlySalaryByDepartment = (accessToken: string, startDate: string, endDate: string) => {
  const [data, setData] = useState<MonthlyDepartmentSalaryStack[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useMonthlySalaryByDepartment] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Execute the dataset query with date parameters
      const params = {
        startDate: startDate || dayjs().startOf('year').format('YYYY-MM-DD'),
        endDate: endDate || dayjs().endOf('year').format('YYYY-MM-DD')
      }

      const ds = await datasetClient.executeQuery('monthlySalarybyDepartment', QueryType.DATASET, params)

      if (!ds?.data || !Array.isArray(ds.data)) {
        throw new Error('[useMonthlySalaryByDepartment] Invalid response structure from dataset API')
      }

      const rows: DatasetRow[] = ds.data

      // Group data by month and department
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
          // Sum salaries if department appears multiple times in same month
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

      // Transform to MonthlyDepartmentSalaryStack format
      const monthlyStacks: MonthlyDepartmentSalaryStack[] = Array.from(monthlyDataMap.entries())
        .map(([month, departmentMap]) => {
          const departments = Array.from(departmentMap.values())
          const totalSalary = departments.reduce((sum, dept) => sum + dept.salary, 0)

          // Assign colors and calculate percentages
          const departmentsWithMetadata: DepartmentSalary[] = departments.map((dept, index) => ({
            ...dept,
            color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
            percent: totalSalary > 0 ? (dept.salary / totalSalary) * 100 : 0,
            change: 0 // Will be calculated later
          }))

          return {
            month,
            totalSalary,
            departments: departmentsWithMetadata.sort((a, b) => b.salary - a.salary), // Sort by salary descending
            change: 0 // Will be calculated later
          }
        })
        .sort((a, b) => a.month.localeCompare(b.month)) // Sort by month

      // Calculate month-over-month changes
      for (let i = 0; i < monthlyStacks.length; i++) {
        const current = monthlyStacks[i]
        const previous = i > 0 ? monthlyStacks[i - 1] : null

        // Calculate total change
        current.change = previous ? current.totalSalary - previous.totalSalary : 0

        // Calculate department changes
        current.departments.forEach(dept => {
          const prevDept = previous?.departments.find(pd => pd.id === dept.id)
          dept.change = prevDept ? dept.salary - prevDept.salary : 0
        })
      }

      if (isMounted.current) {
        setData(monthlyStacks)
        setError(null)
      }
    } catch (err) {
      console.error('[useMonthlySalaryByDepartment] Error fetching monthly salary by department:', err)

      if (isMounted.current) {
        setError(
          err instanceof Error
            ? err
            : new Error('[useMonthlySalaryByDepartment] Failed to fetch monthly salary by department')
        )
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient, startDate, endDate])

  useEffect(() => {
    isMounted.current = true
    fetchData()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchData])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch
  }
}
