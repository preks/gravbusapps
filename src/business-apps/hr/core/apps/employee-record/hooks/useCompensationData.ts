import { useEffect, useCallback, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_COMPENSATION_DATA,
  GET_EMPLOYEE_COMPENSATION_HISTORY,
  getMockGrowthData
} from '../queries/compensationQueries'
import {
  CompensationData,
  CompensationHistoryData,
  EmployeeCompensation,
  EmployeeBonus,
  EmployeeBenefit,
  EmployeePayslip
} from '../types/compensationTypes'
import { isCompensationStatusActive, isBenefitActive } from '../types/compensationEnums'

/**
 * Custom hook to fetch and manage employee compensation data
 *
 * ✅ CONNECTED TO REAL DATABASE:
 * - Fetches salary data from EmployeeWorkingCondition table
 * - Fetches compensation bands from CompensationBand table
 * - Fetches bonuses from EmployeeBonus table (with CompensationStatus enum)
 * - Fetches benefits from EmployeeBenefit table (with BenefitStatus enum)
 * - Fetches payslips from EmployeePayslip table (with PayslipStatus enum)
 *
 * ✅ STATUS HANDLING:
 * - Bonuses: PENDING_COMPENSATION, APPROVED_COMPENSATION (counted in YTD)
 * - Benefits: ACTIVE_BENEFIT (counted as active)
 * - Payslips: All valid status values displayed
 *
 * 🔄 USING MOCK DATA FOR:
 * - Growth timeline (until EmployeeCareerMilestone table is created)
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

      // ✅ Extract bonuses from GraphQL response
      const bonuses: EmployeeBonus[] = (result?.EmployeeBonus || []).map((bonus: any) => ({
        id: bonus.id,
        employeeId: bonus.employeeId,
        bonusType: bonus.employeeBonusType || { id: '', value: 'Unknown' },
        employeeBonusTypeRef: bonus.employeeBonusTypeRef,
        amount: bonus.amount,
        currency: bonus.currency || { id: 'EUR', code: 'EUR', value: 'Euro' },
        currencyRef: bonus.currencyRef,
        paymentDate: bonus.paymentDate,
        fiscalYear: bonus.fiscalYear,
        status: bonus.status,
        description: bonus.description || '',
        notes: bonus.notes || ''
      }))

      // ✅ Extract benefits from GraphQL response
      const benefits: EmployeeBenefit[] = (result?.EmployeeBenefit || []).map((benefit: any) => ({
        id: benefit.id,
        employeeId: benefit.employeeId,
        benefitType: benefit.benefitType || { id: '', value: 'Unknown' },
        benefitTypeRef: benefit.benefitTypeRef,
        benefitProvider: benefit.benefitProvider || { id: '', value: 'Unknown' },
        benefitProviderRef: benefit.benefitProviderRef,
        yearlyAmount: benefit.yearlyAmount,
        monthlyAmount: benefit.monthlyAmount,
        employeeYearlyContribution: benefit.employeeYearlyContribution,
        employeeMonthlyContribution: benefit.employeeMonthlyContribution,
        currency: benefit.currency || { id: 'EUR', code: 'EUR', value: 'Euro' },
        currencyRef: benefit.currencyRef,
        startDate: benefit.startDate,
        endDate: benefit.endDate,
        status: benefit.status,
        benefitStatus: benefit.benefitStatus,
        notes: benefit.notes || ''
      }))

      // Calculate total bonuses for current year (YTD)
      // ✅ UPDATED: Now includes PENDING_COMPENSATION and APPROVED_COMPENSATION
      const currentYear = new Date().getFullYear()
      const totalBonusesYTD = bonuses
        .filter(bonus => {
          const bonusYear = new Date(bonus.paymentDate).getFullYear()
          return bonusYear === currentYear && isCompensationStatusActive(bonus.status)
        })
        .reduce((sum, bonus) => sum + bonus.amount, 0)

      // Count active benefits
      // ✅ UPDATED: Now uses ACTIVE_BENEFIT enum value
      const activeBenefitsCount = benefits.filter(benefit => isBenefitActive(benefit.benefitStatus)).length

      // Set current compensation data
      setCompensationData({
        currentCompensation,
        totalBonusesYTD,
        activeBenefitsCount,
        bonuses,
        benefits
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

      // ✅ REAL DATA: Extract bonus history from GraphQL response
      const bonusHistory: EmployeeBonus[] = (historyResult?.EmployeeBonus || []).map((bonus: any) => ({
        id: bonus.id,
        employeeId: bonus.employeeId,
        bonusType: bonus.employeeBonusType || { id: '', value: 'Unknown' },
        employeeBonusTypeRef: bonus.employeeBonusTypeRef,
        amount: bonus.amount,
        currency: bonus.currency || { id: 'EUR', code: 'EUR', value: 'Euro' },
        currencyRef: bonus.currencyRef,
        paymentDate: bonus.paymentDate,
        fiscalYear: bonus.fiscalYear,
        status: bonus.status,
        description: bonus.description || '',
        notes: bonus.notes || ''
      }))

      // ✅ REAL DATA: Extract payslip history from GraphQL response with computed monthName
      const payslipHistory: EmployeePayslip[] = (historyResult?.EmployeePayslip || []).map((payslip: any) => {
        // Compute monthName from payPeriod (format: "YYYY-MM") or paymentDate as fallback
        let monthName = ''
        if (payslip.payPeriod) {
          const [year, month] = payslip.payPeriod.split('-')
          const yearNum = parseInt(year)
          const monthNum = parseInt(month)
          if (!isNaN(yearNum) && !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            const date = new Date(yearNum, monthNum - 1, 1)
            monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }
        }

        // Fallback to paymentDate if payPeriod is invalid
        if (!monthName && payslip.paymentDate) {
          const date = new Date(payslip.paymentDate)
          if (!isNaN(date.getTime())) {
            monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }
        }

        // Final fallback to fiscal year if available
        if (!monthName && payslip.fiscalYear) {
          monthName = `Year ${payslip.fiscalYear}`
        }

        return {
          id: payslip.id,
          employeeId: payslip.employeeId,
          payPeriod: payslip.payPeriod,
          paymentDate: payslip.paymentDate,
          grossAmount: payslip.grossAmount,
          netAmount: payslip.netAmount,
          currency: payslip.currency || { id: 'EUR', code: 'EUR', value: 'Euro' },
          currencyRef: payslip.currencyRef,
          status: payslip.status,
          documentUrl: payslip.documentUrl,
          fiscalYear: payslip.fiscalYear,
          monthName: monthName || 'Unknown Period'
        }
      })

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
