import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_COMPENSATION_DATA } from '../queries/compensationQueries'
import {
  CompensationData,
  EmployeeBonus,
  EmployeeBenefit,
  EmployeeSalary,
  EmployeeSalaryResponse
} from '../types/compensationTypes'
import { isCompensationStatusActive, isBenefitActive } from '../types/compensationEnums'
import {
  transformCompensationBand,
  transformEmployeeSalaryToCompensation,
  transformBonus,
  transformBenefit
} from '../utils/compensationTransformers'

/**
 * Hook to fetch and manage current employee compensation data
 *
 * Fetches:
 * - Current salary from EmployeeSalary (APPROVED active salary based on startDate/endDate)
 * - Compensation band from CompensationBand via EmployeePosition
 * - Current year bonuses from EmployeeBonus
 * - Active benefits from EmployeeBenefit
 *
 * Salary selection logic (SERVER-SIDE):
 * 1. Filters by requestStatus = "APPROVED_SALARY_ADJUSTMENT" (only approved salaries)
 * 2. Filters out deleted records (isDeleted = false)
 * 3. Filters by date: startDate <= today AND (endDate IS NULL OR endDate >= today)
 * 4. Orders by startDate DESC, returns most recent (limit: 1)
 * 5. Returns null if no approved active salary exists (UI shows "No active salary configured")
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

      // Get today's date in ISO format (YYYY-MM-DD) for server-side filtering
      const today = new Date().toISOString().split('T')[0]

      // Fetch current compensation data from GraphQL
      // Server-side filtering ensures we only get APPROVED active salary
      const result = await graphqlClient.request<EmployeeSalaryResponse>(GET_EMPLOYEE_COMPENSATION_DATA, {
        employeeId,
        today
      })

      // Validate response
      if (!result) {
        throw new Error('No data received from server')
      }

      // Get employee salary from EmployeeSalary table
      // Query already filtered and limited to 1 record (most recent approved active salary)
      const allEmployeeSalaries: EmployeeSalary[] = result?.AllEmployeeSalaries || []

      // Take the first (and only) result - server already filtered for:
      // - requestStatus = "APPROVED_SALARY_ADJUSTMENT"
      // - isDeleted = false
      // - startDate <= today AND (endDate IS NULL OR endDate >= today)
      // - Ordered by startDate DESC (most recent first)
      const employeeSalary: EmployeeSalary | null = allEmployeeSalaries[0] || null

      // Extract and transform compensation band
      const employeePosition = result?.EmployeePosition?.[0]
      const jobLevel = employeePosition?.jobPosition?.jobLevel
      const compensationBandData = jobLevel?.compensationBand
      const compensationBand = transformCompensationBand(compensationBandData)

      // Transform employee salary to current compensation
      const currentCompensation = transformEmployeeSalaryToCompensation(employeeSalary, compensationBand)

      // Transform bonuses
      const bonuses = (result?.EmployeeBonus || []).map(transformBonus)

      // Transform benefits
      const benefits = (result?.EmployeeBenefit || []).map(transformBenefit)

      // Calculate total bonuses for current year (YTD)
      const currentYear = new Date().getFullYear()
      const activeBonuses = bonuses.filter((bonus: EmployeeBonus) => {
        const bonusYear = new Date(bonus.paymentDate).getFullYear()
        return bonusYear === currentYear && isCompensationStatusActive(bonus.status)
      })
      const totalBonusesYTD = activeBonuses.reduce((sum: number, bonus: EmployeeBonus) => sum + bonus.amount, 0)
      const activeBonusesCount = activeBonuses.length

      // Count active benefits - deduplicate by benefitTypeRef to match catalog display
      // Group benefits by type and keep only the most recent active one per type
      const benefitsByType = benefits.reduce(
        (acc, benefit) => {
          const typeRef = benefit.benefitTypeRef
          if (!acc[typeRef]) {
            acc[typeRef] = []
          }
          acc[typeRef].push(benefit)
          return acc
        },
        {} as Record<string, EmployeeBenefit[]>
      )

      const uniqueActiveBenefits = Object.values(benefitsByType).map(typeBenefits => {
        // Sort by: active first, then by creation date (newest first)
        // Creating a copy with spread operator before sorting to avoid mutating typeBenefits
        const sorted = [...typeBenefits].sort((a, b) => {
          const aActive = isBenefitActive(a)
          const bActive = isBenefitActive(b)
          if (aActive && !bActive) return -1
          if (!aActive && bActive) return 1

          const aDate = new Date(a.createdAt || 0).getTime()
          const bDate = new Date(b.createdAt || 0).getTime()
          return bDate - aDate
        })
        return sorted[0]
      })

      const activeBenefitsCount = uniqueActiveBenefits.filter((benefit: EmployeeBenefit) =>
        isBenefitActive(benefit)
      ).length

      // Set the data
      setData({
        currentCompensation,
        totalBonusesYTD,
        activeBonusesCount,
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
