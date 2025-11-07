import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_COMPENSATION_DATA } from '../queries/compensationQueries'
import { CompensationData, EmployeeBonus, EmployeeBenefit } from '../types/compensationTypes'
import { isCompensationStatusActive, isBenefitActive } from '../types/compensationEnums'
import {
  transformCompensationBand,
  transformWorkingConditionToCompensation,
  transformBonus,
  transformBenefit
} from '../utils/compensationTransformers'

/**
 * Hook to fetch and manage current employee compensation data
 *
 * Fetches:
 * - Current salary from EmployeeWorkingCondition
 * - Compensation band from CompensationBand via EmployeePosition
 * - Current year bonuses from EmployeeBonus
 * - Active benefits from EmployeeBenefit
 *
 * @param employeeId - The employee ID to fetch data for
 * @param accessToken - Access token for API authentication
 */
export const useCurrentCompensation = (employeeId: string, accessToken: string) => {
  const [data, setData] = useState<CompensationData | null>(null)
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

      // Fetch current compensation data from GraphQL
      const result = await graphqlClient.request<any>(GET_EMPLOYEE_COMPENSATION_DATA, {
        employeeId
      })

      // Validate response
      if (!result) {
        throw new Error('No data received from server')
      }

      // Extract and transform working condition
      const workingCondition = result?.EmployeeWorkingCondition?.[0]

      if (!workingCondition) {
        console.warn('No working condition found for employee:', employeeId)
      }

      // Extract and transform compensation band
      const employeePosition = result?.EmployeePosition?.[0]
      const jobLevel = employeePosition?.jobPosition?.jobLevel
      const compensationBandData = jobLevel?.compensationBand
      const compensationBand = transformCompensationBand(compensationBandData)

      // Transform working condition to current compensation
      const currentCompensation = transformWorkingConditionToCompensation(workingCondition, compensationBand)

      // Transform bonuses
      const bonuses = (result?.EmployeeBonus || []).map(transformBonus)

      // Transform benefits
      const benefits = (result?.EmployeeBenefit || []).map(transformBenefit)

      // Calculate total bonuses for current year (YTD)
      const currentYear = new Date().getFullYear()
      const totalBonusesYTD = bonuses
        .filter((bonus: EmployeeBonus) => {
          const bonusYear = new Date(bonus.paymentDate).getFullYear()
          return bonusYear === currentYear && isCompensationStatusActive(bonus.status)
        })
        .reduce((sum: number, bonus: EmployeeBonus) => sum + bonus.amount, 0)

      // Count active benefits
      const activeBenefitsCount = benefits.filter((benefit: EmployeeBenefit) =>
        isBenefitActive(benefit.benefitStatus)
      ).length

      // Set the data
      setData({
        currentCompensation,
        totalBonusesYTD,
        activeBenefitsCount,
        bonuses,
        benefits
      })
    } catch (err) {
      console.error('Error fetching current compensation data:', err)

      // Provide user-friendly error messages
      let errorMessage = 'Failed to load current compensation data'

      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message.includes('No data received')) {
          errorMessage = 'Unable to retrieve compensation data. Please try again later.'
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
  }, [employeeId, accessToken, graphqlClient])

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
