import { extractCurrencyCode } from '@/common/utils/numberFormatter'
import {
  CompensationBand,
  EmployeeCompensation,
  EmployeeSalary,
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
 * Transform EmployeeSalary to EmployeeCompensation
 * Handles both active and recent (expired) salary records
 */
export const transformEmployeeSalaryToCompensation = (
  employeeSalary: EmployeeSalary | null | undefined,
  compensationBand: CompensationBand | null
): EmployeeCompensation | null => {
  if (!employeeSalary) {
    return null
  }

  // Extract currency code - prefer currency object, fallback to currencyRef
  const currencyCode = employeeSalary.currency?.code || extractCurrencyCode(employeeSalary.currencyRef)

  // Validate currency exists
  if (!currencyCode) {
    console.warn('No valid currency found for employee salary', employeeSalary.id)
    return null
  }

  // Determine effective date: prefer startDate (used in approval flow), fallback to activeFrom, then createdAt
  const effectiveDate = employeeSalary.startDate || employeeSalary.activeFrom || employeeSalary.createdAt || null

  // Determine end date: prefer endDate (used in approval flow), fallback to activeTo
  const endDate = employeeSalary.endDate || employeeSalary.activeTo || null

  return {
    id: employeeSalary.id,
    employeeId: employeeSalary.employeeId,
    // Preserve null values - don't convert null to 0
    baseSalary: employeeSalary.annualGrossSalary ?? null,
    currency: employeeSalary.currency || {
      id: currencyCode,
      code: currencyCode,
      value: currencyCode
    },
    payFrequency: {
      id: 'annual',
      value: 'Annually'
    },
    compensationBand,
    effectiveDate,
    endDate,
    monthlyGrossSalary: employeeSalary.monthlyGrossSalary ?? null,
    hourlyGrossSalary: employeeSalary.hourlyGrossSalary ?? null,
    stockOptions: employeeSalary.stockOptions ?? null
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
    notes: benefit.notes || '',
    createdAt: benefit.createdAt,
    updatedAt: benefit.updatedAt
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
 * Transform EmployeeSalary to compensation history record
 * Note: Formatting (currency, dates) is handled in the view component
 */
export const transformEmployeeSalaryToHistory = (salary: EmployeeSalary) => {
  // Extract currency code from catalog reference format
  const currencyCode = salary.currency?.code || extractCurrencyCode(salary.currencyRef)

  // Determine effective date: prefer startDate (used in approval flow), fallback to activeFrom, then createdAt
  let effectiveDate = salary.startDate || salary.activeFrom || salary.createdAt || null

  // Validate and normalize effectiveDate
  if (effectiveDate && Number.isNaN(new Date(effectiveDate).getTime())) {
    effectiveDate = null
  }

  // Determine end date: prefer endDate (used in approval flow), fallback to activeTo
  let endDate = salary.endDate || salary.activeTo || null

  // Validate and normalize endDate
  if (endDate && Number.isNaN(new Date(endDate).getTime())) {
    endDate = null
  }

  return {
    id: salary.id,
    employeeId: salary.employeeId,
    // Preserve null values - don't convert null to 0 (consistent with transformEmployeeSalaryToCompensation)
    baseSalary: salary.annualGrossSalary ?? null,
    currency: salary.currency || { id: currencyCode, code: currencyCode, value: currencyCode },
    compensationBand: null,
    effectiveDate: effectiveDate,
    endDate: endDate,
    changeReason: 'Salary Record',
    notes: null,
    monthlyGrossSalary: salary.monthlyGrossSalary ?? null,
    stockOptions: salary.stockOptions ?? null
  }
}
