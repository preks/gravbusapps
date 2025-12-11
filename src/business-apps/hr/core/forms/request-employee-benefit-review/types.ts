export interface EmployeeBenefitData {
  employee: string
  benefitTypeRef: string | null
  benefitProviderRef: string | null
  yearlyAmount: number
  monthlyAmount: number
  period: string | null
  currencyRef: string
  startDate: string | null
  notes: string | null
  employeeYearlyContribution?: number
  employeeMonthlyContribution?: number
  status?: string
}

export interface BenefitReviewPayload {
  employeeBenefit: EmployeeBenefitData
  employeeId?: string
  initiatorEmployeeId?: string
}

export interface BenefitDisplayItem {
  key: string
  label: string
  value: string
}
