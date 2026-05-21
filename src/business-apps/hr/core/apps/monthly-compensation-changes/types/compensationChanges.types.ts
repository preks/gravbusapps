export type ChangeCategory = 'salary' | 'bonus' | 'benefit'

interface CurrencyRef {
  id: string
  code: string
  value: string
}

interface CatalogRef {
  id: string
  code: string
  value: string
}

interface EmployeeRef {
  id: string
  fullName: string
  displayName: string
  pictureThumbnail?: string | null
  employeePositions?: Array<{
    organizationalUnit?: { name: string } | null
  }>
}

export interface SalaryChangeRecord {
  id: string
  employeeId: string
  employee: EmployeeRef
  monthlyGrossSalary: number | null
  annualGrossSalary: number | null
  hourlyGrossSalary: number | null
  currency: CurrencyRef | null
  startDate: string | null
  endDate: string | null
  requestStatus: string | null
  requestDate: string | null
  decisionDate: string | null
  requestedPercent: number | null
  requestedAmount: number | null
  salaryAdjustReasonRef: string | null
  notes: string | null
  createdAt: string
}

export interface BonusRecord {
  id: string
  employeeId: string
  employee: EmployeeRef
  employeeBonusType: CatalogRef | null
  amount: number | null
  currency: CurrencyRef | null
  paymentDate: string | null
  fiscalYear: number | null
  status: string | null
  description: string | null
  notes: string | null
  createdAt: string
}

export interface BenefitChangeRecord {
  id: string
  employeeId: string
  employee: EmployeeRef
  benefitType: CatalogRef | null
  benefitProvider: CatalogRef | null
  benefitStatus: string | null
  monthlyAmount: number | null
  yearlyAmount: number | null
  employeeMonthlyContribution: number | null
  currency: CurrencyRef | null
  startDate: string | null
  endDate: string | null
  status: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

export interface CompensationChangeRow {
  id: string
  category: ChangeCategory
  employeeId: string
  employeeName: string
  employeePicture?: string | null
  date: string
  description: string
  detail: string
  amount: string
  status: string
  raw: SalaryChangeRecord | BonusRecord | BenefitChangeRecord
}

export interface ActiveBenefitRow {
  id: string
  employeeId: string
  employeeName: string
  employeePicture?: string | null
  benefitType: string
  provider: string
  status: string
  monthlyAmount: number | null
  yearlyAmount: number | null
  employeeContribution: number | null
  currency: string
  startDate: string | null
  endDate: string | null
  raw: BenefitChangeRecord
}
