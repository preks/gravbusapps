import { useEffect, useCallback, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_COMPENSATION_DATA, GET_EMPLOYEE_COMPENSATION_HISTORY } from '../queries/compensationQueries'
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
 * @param employeeId - The employee ID to fetch compensation data for
 * @param accessToken - Access token for API authentication
 * @param locale - User locale for date formatting (e.g., 'en-US', 'de-DE', 'fr-FR')
 */
export const useCompensationData = (employeeId: string, accessToken: string, locale: string = 'en-US') => {
  const [compensationData, setCompensationData] = useState<CompensationData | null>(null)
  const [historyData, setHistoryData] = useState<CompensationHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchCompensationData = useCallback(async () => {
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

      // Fetch data from GraphQL
      const result = await graphqlClient.request<any>(GET_EMPLOYEE_COMPENSATION_DATA, {
        employeeId
      })

      // Validate response
      if (!result) {
        throw new Error('No data received from server')
      }

      // Extract working condition data
      const workingCondition = result?.EmployeeWorkingCondition?.[0]

      if (!workingCondition) {
        console.warn('No working condition found for employee:', employeeId)
      }

      // Extract compensation band from employee position
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
            compensationBand, // Now populated from EmployeePosition → JobLevel → CompensationBand
            effectiveDate: workingCondition.hireDate,
            endDate: workingCondition.exitDate,

            monthlyGrossSalary: workingCondition.monthlyGrossSalary
          }
        : null

      // Extract bonuses from GraphQL response
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

      // Extract benefits from GraphQL response
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
      const currentYear = new Date().getFullYear()
      const totalBonusesYTD = bonuses
        .filter(bonus => {
          const bonusYear = new Date(bonus.paymentDate).getFullYear()
          return bonusYear === currentYear && isCompensationStatusActive(bonus.status)
        })
        .reduce((sum, bonus) => sum + bonus.amount, 0)

      // Count active benefits
      const activeBenefitsCount = benefits.filter(benefit => isBenefitActive(benefit.benefitStatus)).length

      // Set current compensation data
      setCompensationData({
        currentCompensation,
        totalBonusesYTD,
        activeBenefitsCount,
        bonuses,
        benefits
      })

      // FETCH COMPENSATION HISTORY from EmployeeWorkingCondition
      const historyResult = await graphqlClient.request<any>(GET_EMPLOYEE_COMPENSATION_HISTORY, {
        employeeId
      })

      // Transform working conditions to compensation history
      const compensationHistory = (historyResult?.EmployeeWorkingCondition || []).map((wc: any) => {
        // Derive currency from working condition data, fallback to EUR
        const currencyCode = wc.currency?.code || wc.currencyRef || 'EUR'

        // Format monthly salary with proper locale and currency
        const monthlySalary = wc.monthlyGrossSalary || 0
        const formattedMonthlySalary = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(monthlySalary)

        return {
          id: wc.id,
          employeeId: wc.employeeId,
          baseSalary: wc.annualGrossSalary || 0,
          currency: wc.currency || { id: currencyCode, code: currencyCode, value: 'Euro' },
          compensationBand: null, // Note: CompensationBand could be queried from EmployeePosition if historical band data is needed
          effectiveDate: wc.hireDate, // Using hireDate as the effective date
          endDate: wc.exitDate, // Using exitDate as end date
          changeReason: 'Salary Record',
          notes: `Monthly: ${formattedMonthlySalary}`,
          monthlyGrossSalary: wc.monthlyGrossSalary
        }
      })

      // Extract bonus history from GraphQL response
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

      // Extract payslip history from GraphQL response with computed monthName
      const payslipHistory: EmployeePayslip[] = (historyResult?.EmployeePayslip || []).map((payslip: any) => {
        // Compute monthName from payPeriod (format: "YYYY-MM") or paymentDate as fallback
        let monthName = ''
        if (payslip.payPeriod) {
          const [year, month] = payslip.payPeriod.split('-')
          const yearNum = Number.parseInt(year)
          const monthNum = Number.parseInt(month)
          if (!Number.isNaN(yearNum) && !Number.isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            const date = new Date(yearNum, monthNum - 1, 1)
            monthName = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
          }
        }

        // Fallback to paymentDate if payPeriod is invalid
        if (!monthName && payslip.paymentDate) {
          const date = new Date(payslip.paymentDate)
          if (!Number.isNaN(date.getTime())) {
            monthName = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
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

      // Set history data with placeholder growthData
      // Note: growthData calculation could be implemented based on compensationHistory
      const now = new Date()
      const startDate =
        compensationHistory.length > 0
          ? compensationHistory[compensationHistory.length - 1].effectiveDate
          : now.toISOString()
      const currentSalary = currentCompensation?.baseSalary || 0
      const initialSalary =
        compensationHistory.length > 0 ? compensationHistory[compensationHistory.length - 1].baseSalary : currentSalary

      setHistoryData({
        compensationHistory,
        bonusHistory,
        payslipHistory,
        growthData: {
          startDate,
          endDate: now.toISOString(),
          dataPoints: [],
          milestones: [],
          totalGrowth: {
            startAmount: initialSalary,
            currentAmount: currentSalary,
            changeAmount: currentSalary - initialSalary,
            changePercentage: initialSalary > 0 ? ((currentSalary - initialSalary) / initialSalary) * 100 : 0
          },
          averageAnnualIncrease: 0,
          totalMilestonesCount: 0
        }
      })
    } catch (err) {
      console.error('Error fetching compensation data:', err)

      // Provide user-friendly error messages
      let errorMessage = 'Failed to load compensation data'

      if (err instanceof Error) {
        // Check for specific error types
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

      // Clear data on error
      setCompensationData(null)
      setHistoryData(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, locale, graphqlClient])

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
