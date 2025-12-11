import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_COMPENSATION_HISTORY } from '../queries/compensationQueries'
import { CompensationHistoryData } from '../types/compensationTypes'
import { transformEmployeeSalaryToHistory, transformBonus, transformPayslip } from '../utils/compensationTransformers'

/**
 * Hook to fetch and manage employee compensation history
 *
 * Fetches:
 * - Historical salary records from EmployeeSalary
 * - All bonuses from EmployeeBonus
 * - All payslips from EmployeePayslip
 *
 * @param employeeId - The employee ID to fetch history for
 * @param accessToken - Access token for API authentication
 * @param locale - User locale for date formatting (e.g., 'en-US', 'de-DE')
 */
export const useCompensationHistory = (employeeId: string, accessToken: string, locale: string = 'en-US') => {
  const [data, setData] = useState<CompensationHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchData = useCallback(async () => {
    // Early validation
    if (!employeeId) {
      setError('No employee ID provided')
      setLoading(false)
      return
    }

    if (!accessToken) {
      setError('No access token provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch compensation history from GraphQL
      const result = await graphqlClient.request<any>(GET_EMPLOYEE_COMPENSATION_HISTORY, {
        employeeId
      })

      // Validate response
      if (!result) {
        throw new Error('No history data received from server')
      }

      // Transform employee salaries to compensation history
      const compensationHistory = (result?.AllEmployeeSalaries || []).map((salary: any) =>
        transformEmployeeSalaryToHistory(salary)
      )

      // Transform bonus history
      const bonusHistory = (result?.EmployeeBonus || []).map(transformBonus)

      // Transform payslip history
      const payslipHistory = (result?.EmployeePayslip || []).map((payslip: any) => transformPayslip(payslip, locale))

      // Set history data
      setData({
        compensationHistory,
        bonusHistory,
        payslipHistory
      })
    } catch (err) {
      console.error('Error fetching compensation history:', err)

      // Provide user-friendly error messages
      let errorMessage = 'Failed to load compensation history'

      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message.includes('No history data received')) {
          errorMessage = 'Unable to retrieve compensation history. Please try again later.'
        } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
          errorMessage = 'Your session has expired. Please refresh the page.'
        } else if (err.message) {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, locale, graphqlClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}
