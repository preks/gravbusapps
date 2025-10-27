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
      console.log('[useCompensationData] Missing employeeId or accessToken:', {
        employeeId,
        accessToken: !!accessToken
      })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('[useCompensationData] Fetching compensation data for employee:', employeeId)

      // ✅ FETCH REAL DATA from EmployeeWorkingCondition
      const result = await graphqlClient.request<any>(GET_EMPLOYEE_COMPENSATION_DATA, {
        employeeId
      })

      console.log('[useCompensationData] GraphQL Response:', JSON.stringify(result, null, 2))

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
      console.log('[useCompensationData] Raw EmployeeBonus data:', result?.EmployeeBonus)
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
      console.log('[useCompensationData] Processed bonuses:', bonuses.length, bonuses)

      // ✅ Extract benefits from GraphQL response
      console.log('[useCompensationData] Raw EmployeeBenefit data:', result?.EmployeeBenefit)
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
      console.log('[useCompensationData] Processed benefits:', benefits.length, benefits)

      // Calculate total bonuses for current year (YTD)
      // ✅ UPDATED: Now includes PENDING_COMPENSATION and APPROVED_COMPENSATION
      const currentYear = new Date().getFullYear()
      console.log('[useCompensationData] Current year:', currentYear)

      const ytdBonuses = bonuses.filter(bonus => {
        const bonusYear = new Date(bonus.paymentDate).getFullYear()
        const isActive = isCompensationStatusActive(bonus.status)
        console.log('[useCompensationData] Bonus filter check:', {
          bonusId: bonus.id,
          bonusYear,
          currentYear,
          status: bonus.status,
          isActive,
          amount: bonus.amount,
          included: bonusYear === currentYear && isActive
        })
        return bonusYear === currentYear && isActive
      })

      const totalBonusesYTD = ytdBonuses.reduce((sum, bonus) => sum + bonus.amount, 0)
      console.log('[useCompensationData] YTD bonuses:', ytdBonuses.length, 'Total amount:', totalBonusesYTD)

      // Count active benefits
      // ✅ UPDATED: Now uses ACTIVE_BENEFIT enum value
      const activeBenefitsCount = benefits.filter(benefit => isBenefitActive(benefit.benefitStatus)).length
      console.log('[useCompensationData] Active benefits count:', activeBenefitsCount)

      // Set current compensation data
      const finalCompensationData = {
        currentCompensation,
        totalBonusesYTD,
        activeBenefitsCount,
        bonuses,
        benefits
      }
      console.log('[useCompensationData] Final compensation data:', finalCompensationData)
      setCompensationData(finalCompensationData)

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
        // Compute monthName from payPeriod (format: "YYYY-MM")
        let monthName = ''
        if (payslip.payPeriod) {
          const [year, month] = payslip.payPeriod.split('-')
          const date = new Date(parseInt(year), parseInt(month) - 1, 1)
          monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
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
          monthName
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
      console.error('[useCompensationData] ERROR fetching compensation data:', err)
      console.error('[useCompensationData] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        errorObject: err
      })
      setError(err instanceof Error ? err.message : 'Failed to fetch compensation data')

      // Set empty data on error
      setCompensationData(null)
      setHistoryData(null)
    } finally {
      console.log('[useCompensationData] Fetch complete, loading set to false')
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
