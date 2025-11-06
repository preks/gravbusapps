import { extractCurrencyCode } from '@/common/utils/numberFormatter'
import {
  CompensationBand,
  EmployeeCompensation,
  EmployeeBonus,
  EmployeeBenefit,
  EmployeePayslip,
  CatalogEntry
} from '../types/compensationTypes'

/**
 * Utility functions for transforming raw GraphQL data into typed compensation data
 * These functions handle currency extraction and data normalization
 */

/**
 * Normalize currency data from GraphQL response
 * If currency object exists, return it; otherwise extract from currencyRef
 */
export const normalizeCurrency = (currency: any, currencyRef: string): CatalogEntry => {
  if (currency) {
    return currency
  }
  const code = extractCurrencyCode(currencyRef)
  return {
    id: code,
    code,
    value: code
  }
}

/**
 * Transform compensation band data from GraphQL response
 */
export const transformCompensationBand = (compensationBandData: any): CompensationBand | null => {
  if (!compensationBandData) {
    return null
  }

  const bandCurrencyCode = extractCurrencyCode(compensationBandData.currencyRef)

  return {
    id: compensationBandData.id,
    name: compensationBandData.name,
    payGrade: compensationBandData.payGrade,
    minSalary: compensationBandData.minSalary,
    maxSalary: compensationBandData.maxSalary,
    currencyRef: compensationBandData.currencyRef,
    currency: compensationBandData.currency || {
      id: bandCurrencyCode,
      code: bandCurrencyCode,
      value: bandCurrencyCode
    }
  }
}

/**
 * Transform working condition to employee compensation
 */
export const transformWorkingConditionToCompensation = (
  workingCondition: any,
  compensationBand: CompensationBand | null
): EmployeeCompensation | null => {
  if (!workingCondition) {
    return null
  }

  // Extract currency code - no fallback to avoid incorrect display
  const currencyCode = compensationBand?.currency?.code || extractCurrencyCode(workingCondition.currencyRef)

  // Validate currency exists
  if (!currencyCode) {
    console.warn('No valid currency found for working condition', workingCondition.id)
    return null
  }

  return {
    id: workingCondition.id,
    employeeId: workingCondition.employeeId,
    baseSalary: workingCondition.annualGrossSalary || 0,
    currency: {
      id: currencyCode,
      code: currencyCode,
      value: compensationBand?.currency?.value || currencyCode
    },
    payFrequency: {
      id: 'annual',
      value: 'Annually'
    },
    compensationBand,
    effectiveDate: workingCondition.hireDate,
    endDate: workingCondition.exitDate,
    monthlyGrossSalary: workingCondition.monthlyGrossSalary
  }
}

/**
 * Transform bonus data from GraphQL response
 */
export const transformBonus = (bonus: any): EmployeeBonus => {
  const bonusCurrencyCode = extractCurrencyCode(bonus.currencyRef)

  return {
    id: bonus.id,
    employeeId: bonus.employeeId,
    bonusType: bonus.employeeBonusType || { id: '', value: 'Unknown' },
    employeeBonusTypeRef: bonus.employeeBonusTypeRef,
    amount: bonus.amount,
    currency: bonus.currency || {
      id: bonusCurrencyCode,
      code: bonusCurrencyCode,
      value: bonusCurrencyCode
    },
    currencyRef: bonus.currencyRef,
    paymentDate: bonus.paymentDate,
    fiscalYear: bonus.fiscalYear,
    status: bonus.status,
    description: bonus.description || '',
    notes: bonus.notes || ''
  }
}

/**
 * Transform benefit data from GraphQL response
 */
export const transformBenefit = (benefit: any): EmployeeBenefit => {
  const benefitCurrencyCode = extractCurrencyCode(benefit.currencyRef)

  return {
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
    currency: benefit.currency || {
      id: benefitCurrencyCode,
      code: benefitCurrencyCode,
      value: benefitCurrencyCode
    },
    currencyRef: benefit.currencyRef,
    startDate: benefit.startDate,
    endDate: benefit.endDate,
    status: benefit.status,
    benefitStatus: benefit.benefitStatus,
    notes: benefit.notes || ''
  }
}

/**
 * Transform payslip data from GraphQL response with computed monthName
 */
export const transformPayslip = (payslip: any, locale: string): EmployeePayslip => {
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

  const payslipCurrencyCode = extractCurrencyCode(payslip.currencyRef)

  return {
    id: payslip.id,
    employeeId: payslip.employeeId,
    payPeriod: payslip.payPeriod,
    paymentDate: payslip.paymentDate,
    grossAmount: payslip.grossAmount,
    netAmount: payslip.netAmount,
    currency: payslip.currency || {
      id: payslipCurrencyCode,
      code: payslipCurrencyCode,
      value: payslipCurrencyCode
    },
    currencyRef: payslip.currencyRef,
    status: payslip.status,
    documentUrl: payslip.documentUrl,
    fiscalYear: payslip.fiscalYear,
    monthName: monthName || 'Unknown Period'
  }
}

/**
 * Transform working condition to compensation history record
 */
export const transformWorkingConditionToHistory = (wc: any, locale: string) => {
  // Extract currency code from catalog reference format
  const currencyCode = wc.currency?.code || extractCurrencyCode(wc.currencyRef)

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
    currency: wc.currency || { id: currencyCode, code: currencyCode, value: currencyCode },
    compensationBand: null,
    effectiveDate: wc.hireDate,
    endDate: wc.exitDate,
    changeReason: 'Salary Record',
    notes: `Monthly: ${formattedMonthlySalary}`,
    monthlyGrossSalary: wc.monthlyGrossSalary
  }
}
