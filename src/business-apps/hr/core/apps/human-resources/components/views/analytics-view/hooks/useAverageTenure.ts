import { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getEmployeeTenureDataQuery } from '../queries/getEmployeeTenureData'

/**
 * GraphQL response type for employee tenure data query
 */
interface EmployeeTenureDataResponse {
  Employee: Array<{
    id: string
  }>
  EmployeeWorkingCondition: Array<{
    employeeId: string
    hireDate: string | null
  }>
}

/**
 * Tenure representation with years and months
 */
interface Tenure {
  years: number
  months: number
}

/**
 * Hook to calculate the average tenure of all employees
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing average tenure data, loading state, and error
 */
export const useAverageTenure = (accessToken: string) => {
  const [averageTenure, setAverageTenure] = useState<Tenure>({ years: 0, months: 0 })
  const [formattedTenure, setFormattedTenure] = useState<string>('-')
  const [employeeCount, setEmployeeCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Get GraphQL client using the project's pattern
  const graphQLClient = useGraphqlClient(accessToken)

  /**
   * Calculate tenure between hire date and today
   * Using the same calculation logic as in ProfileHeader component
   */
  const calculateTenure = (hireDate: string): Tenure => {
    const hireDateObj = dayjs(hireDate)
    const now = dayjs()

    const years = now.diff(hireDateObj, 'year')
    const months = now.diff(hireDateObj, 'month') % 12

    return { years, months }
  }

  /**
   * Format tenure into a string representation (e.g., "3.2 yrs")
   */
  const formatTenure = (tenure: Tenure): string => {
    const { years, months } = tenure

    // If less than a year, show months only
    if (years === 0) {
      return `${months} ${months === 1 ? 'month' : 'months'}`
    }

    // For more than a year, show years with decimal point
    const decimalMonths = Math.round((months / 12) * 10) / 10
    return `${years + decimalMonths} yrs`
  }

  /**
   * Fetch employee tenure data from GraphQL API and calculate average
   */
  const fetchAverageTenure = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useAverageTenure] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      console.log('[useAverageTenure] Fetching employee tenure data')

      // Execute the GraphQL query
      const response = await graphQLClient.request<EmployeeTenureDataResponse>(getEmployeeTenureDataQuery)

      // Validate response structure
      if (!response || !response.EmployeeWorkingCondition || !response.Employee) {
        throw new Error('[useAverageTenure] Invalid response structure from GraphQL API')
      }

      const allEmployees = response.Employee
      const workingConditions = response.EmployeeWorkingCondition

      // Get the total number of employees
      const totalEmployeeCount = allEmployees.length

      // Handle case when no employees are found
      if (totalEmployeeCount === 0) {
        console.warn('[useAverageTenure] No employees found')

        if (isMounted.current) {
          setAverageTenure({ years: 0, months: 0 })
          setFormattedTenure('0 months')
          setEmployeeCount(0)
          setError(null)
          setLoading(false)
        }
        return
      }

      // Create a map of employeeId -> hireDate for quick lookup
      const employeeHireDates = new Map<string, string>()

      // Only keep the earliest hire date for each employee
      workingConditions.forEach(condition => {
        if (!condition.employeeId || !condition.hireDate) return

        const existingDate = employeeHireDates.get(condition.employeeId)

        if (!existingDate || dayjs(condition.hireDate).isBefore(dayjs(existingDate))) {
          employeeHireDates.set(condition.employeeId, condition.hireDate)
        }
      })

      console.log(
        `[useAverageTenure] Found ${employeeHireDates.size} employees with hire dates out of ${totalEmployeeCount} total employees`
      )

      // Calculate total tenure across all employees
      let totalMonths = 0

      // For each employee in our total count, either use their hire date if available or count as 0 months
      allEmployees.forEach(employee => {
        const hireDate = employeeHireDates.get(employee.id)

        if (hireDate) {
          const tenure = calculateTenure(hireDate)
          const tenureInMonths = tenure.years * 12 + tenure.months
          totalMonths += tenureInMonths
        }
        // If no hire date is found, this employee contributes 0 months to the average
      })

      // Calculate average tenure based on ALL employees
      const avgMonths = Math.round(totalMonths / totalEmployeeCount)
      const avgYears = Math.floor(avgMonths / 12)
      const avgRemainingMonths = avgMonths % 12

      const avgTenure = { years: avgYears, months: avgRemainingMonths }

      console.log(
        `[useAverageTenure] Calculated average tenure: ${avgYears} years, ${avgRemainingMonths} months for ${totalEmployeeCount} employees`
      )

      // Update state if component is still mounted
      if (isMounted.current) {
        setAverageTenure(avgTenure)
        setFormattedTenure(formatTenure(avgTenure))
        setEmployeeCount(totalEmployeeCount) // Use the total employee count
        setError(null)
        setLoading(false)
      }
    } catch (err) {
      console.error('[useAverageTenure] Error calculating average tenure:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('[useAverageTenure] Failed to calculate average tenure'))
        setLoading(false)
      }
    }
  }, [accessToken, graphQLClient])

  // Set up effect to fetch data and handle cleanup
  useEffect(() => {
    isMounted.current = true
    fetchAverageTenure()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchAverageTenure])

  return {
    averageTenure,
    formattedTenure,
    employeeCount,
    loading,
    error
  }
}
