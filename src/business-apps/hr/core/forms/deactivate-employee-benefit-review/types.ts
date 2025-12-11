export interface EmployeeBenefitDeactivationData {
  id: string
  employee: string
  benefitTypeRef: string | null
  benefitProviderRef: string | null
  yearlyAmount: number
  monthlyAmount: number
  period?: string | null
  currencyRef: string
  startDate: string | null
  endDate: string
  notes: string
  status?: string
  employeeYearlyContribution?: number
  employeeMonthlyContribution?: number
}

export interface DeactivateBenefitReviewPayload {
  employeeBenefit: EmployeeBenefitDeactivationData
  employeeId?: string
  initiatorEmployeeId?: string
}

export interface BenefitDisplayItem {
  key: string
  label: string
  value: string
}

export interface DeactivationDetails {
  requestedEndDate: string
  deactivationReason: string
}
