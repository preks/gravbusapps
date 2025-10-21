import { useEffect, useCallback, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_COMPENSATION_DATA,
  GET_EMPLOYEE_COMPENSATION_HISTORY,
  getMockBonuses,
  getMockBenefits,
  getMockPayslips,
  getMockGrowthData
} from '../queries/compensationQueries'
import { CompensationData, CompensationHistoryData, EmployeeCompensation } from '../types/compensationTypes'

/**
 * Custom hook to fetch and manage employee compensation data
 *
 * ✅ CONNECTED TO REAL DATABASE:
 * - Fetches salary data from EmployeeWorkingCondition table
 * - Fetches compensation bands from CompensationBand table
 *
 * 🔄 USING MOCK DATA FOR:
 * - Bonuses (until EmployeeBonus table is created)
 * - Benefits (until EmployeeBenefit table is created)
 * - Payslips (until EmployeePayslip table is created)
 *
 * @param employeeId - The employee ID to fetch compensation data for
 * @param accessToken - Access token for API authentication
 */
export const useCompensationData = (employeeId: string, accessToken: string) => {
  const [compensationData, setCompensationData] = useState<CompensationData | null>(null)
  const [historyData, setHistoryData] = useState<CompensationHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)

  const fetchCompensationData = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // ✅ FETCH REAL DATA from EmployeeWorkingCondition
      const result = await graphqlClient.request<any>(GET_EMPLOYEE_COMPENSATION_DATA, {
        employeeId
      })

      // Extract working condition data
      const workingCondition = result?.EmployeeWorkingCondition?.[0]

      if (!workingCondition) {
        console.warn('No working condition found for employee:', employeeId)
      }

      // ✅ Extract compensation band from employee position
      const employeePosition = result?.EmployeePosition?.[0]
      const jobLevel = employeePosition?.jobPosition?.jobLevel
      const compensationBandData = jobLevel?.compensationBand

      // Transform compensation band data if available
      const compensationBand = compensationBandData
        ? {
            id: compensationBandData.id,
            name: compensationBandData.name,
            payGrade: compensationBandData.payGrade,
            minSalary: compensationBandData.minSalary,
            maxSalary: compensationBandData.maxSalary,
            currencyRef: compensationBandData.currencyRef,
            currency: compensationBandData.currency || {
              id: 'EUR',
              code: 'EUR',
              value: 'Euro'
            }
          }
        : null

      // Transform working condition to compensation format
      const currentCompensation: EmployeeCompensation | null = workingCondition
        ? {
            id: workingCondition.id,
            employeeId: workingCondition.employeeId,
            // Use annualGrossSalary as base salary (this is the primary compensation)
            baseSalary: workingCondition.annualGrossSalary || 0,
            currency: {
              id: 'EUR',
              code: 'EUR',
              value: 'Euro'
            },
            payFrequency: {
              id: 'annual',
              value: 'Annually'
            },
            compensationBand, // ✅ Now populated from EmployeePosition → JobLevel → CompensationBand
            effectiveDate: workingCondition.hireDate, // Using hireDate as the effective date
            endDate: workingCondition.exitDate, // Using exitDate as end date
            // Additional fields from working condition
            monthlyGrossSalary: workingCondition.monthlyGrossSalary
          }
        : null

      // 🔄 TODO: Replace with real data when EmployeeBonus table is created
      // For now, use mock bonuses
      const mockBonuses = getMockBonuses()

      // 🔄 TODO: Replace with real data when EmployeeBenefit table is created
      // For now, use mock benefits
      const mockBenefits = getMockBenefits()

      // Calculate total bonuses for current year (YTD)
      const currentYear = new Date().getFullYear()
      const totalBonusesYTD = mockBonuses
        .filter(bonus => {
          const bonusYear = new Date(bonus.paymentDate).getFullYear()
          return bonusYear === currentYear && (bonus.status === 'Paid' || bonus.status === 'Approved')
        })
        .reduce((sum, bonus) => sum + bonus.amount, 0)

      // Count active benefits
      const activeBenefitsCount = mockBenefits.filter(benefit => benefit.status === 'Active').length

      // Set current compensation data
      setCompensationData({
        currentCompensation,
        totalBonusesYTD,
        activeBenefitsCount,
        bonuses: mockBonuses,
        benefits: mockBenefits
      })

      // ✅ FETCH COMPENSATION HISTORY from EmployeeWorkingCondition
      const historyResult = await graphqlClient.request<any>(GET_EMPLOYEE_COMPENSATION_HISTORY, {
        employeeId
      })

      // Transform working conditions to compensation history
      const compensationHistory = (historyResult?.EmployeeWorkingCondition || []).map((wc: any) => ({
        id: wc.id,
        employeeId: wc.employeeId,
        baseSalary: wc.annualGrossSalary || 0,
        currency: { id: 'EUR', code: 'EUR', value: 'Euro' },
        compensationBand: null, // TODO: Query CompensationBand separately if needed
        effectiveDate: wc.hireDate, // Using hireDate as the effective date
        endDate: wc.exitDate, // Using exitDate as end date
        changeReason: 'Salary Record',
        notes: `Monthly: €${wc.monthlyGrossSalary || 0}`,
        monthlyGrossSalary: wc.monthlyGrossSalary
      }))

      // 🔄 TODO: Replace with real bonus history when EmployeeBonus table is created
      const bonusHistory = mockBonuses

      // 🔄 TODO: Replace with real payslip history when EmployeePayslip table is created
      const payslipHistory = getMockPayslips()

      // 🔄 TODO: Replace with real growth data when EmployeeCareerMilestone table is created
      const growthData = getMockGrowthData()

      // Set history data
      setHistoryData({
        compensationHistory,
        bonusHistory,
        payslipHistory,
        growthData
      })
    } catch (err) {
      console.error('Error fetching compensation data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch compensation data')

      // Set empty data on error
      setCompensationData(null)
      setHistoryData(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, graphqlClient])

  useEffect(() => {
    fetchCompensationData()
  }, [fetchCompensationData])

  return {
    loading,
    error,
    compensationData,
    historyData,
    refetch: fetchCompensationData
  }
}
