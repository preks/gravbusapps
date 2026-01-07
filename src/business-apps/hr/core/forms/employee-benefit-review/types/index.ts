/**
 * Shared types for employee benefit review forms
 */

export interface CatalogEntry {
  id: string
  code: string
  value: string
  translations?: Array<{
    localeCode: string
    value: string
  }>
}

export interface CatalogBenefitEntry {
  id: string
  value: string
  code: string
  objectValue?: unknown
  translations?: Array<{
    localeCode: string
    value: string
  }>
}

/**
 * Simplified benefit data interface for summary display
 * Used by BenefitSummaryCard component
 */
export interface BenefitSummaryData {
  catalogEntry: CatalogBenefitEntry
  benefitType: string
  code: string
  provider?: CatalogEntry
  yearlyAmount?: number
  monthlyAmount?: number
  period?: string // 'monthly' | 'yearly' | 'daily' - from catalog objectValue
  startDate?: string
  employeeBenefitId?: string
}

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
