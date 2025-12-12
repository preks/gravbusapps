/**
 * Shared types for employee benefit review forms
 */

export interface BenefitDisplayItem {
  key: string
  label: string
  value: string
}

export interface EmployeeBenefitBaseData {
  employee: string
  benefitTypeRef: string | null
  benefitProviderRef: string | null
  yearlyAmount: number
  monthlyAmount: number
  period?: string | null
  currencyRef: string
  startDate: string | null
  notes?: string | null
  employeeYearlyContribution?: number
  employeeMonthlyContribution?: number
  status?: string
}

export interface BenefitReviewBasePayload {
  employeeId?: string
  initiatorEmployeeId?: string
}
