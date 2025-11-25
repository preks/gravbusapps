export interface CatalogEntry {
  id: string
  value: string
  code?: string
  translations?: Array<{
    localeCode: string
    value: string
  }>
  catalog?: {
    defaultLocale: string
  }
}

export interface OldEmployeeCompensation {
  annualGrossSalary: number
  monthlyGrossSalary: number | null
  hourlyGrossSalary: number | null
  currencyRef: string
  currency: CatalogEntry
}

export interface EmployeeSalaryData {
  employee: string
  adjustmentType: 'amount' | 'percentage'
  adjustmentValue: number
  amountIncrease: number | null
  percentageIncrease: number | null
  adjustmentFrequency: 'annually' | 'monthly' | 'hourly'
  newAnnualSalary: number
  newMonthlySalary: number | null
  newHourlySalary: number | null
  effectiveDate: string
  reason: string
  notes: string
}

export interface SalaryChangePayload {
  employeeSalary: EmployeeSalaryData
  oldEmployeeCompensation: OldEmployeeCompensation
  employeeId?: string
  initiatorEmployeeId?: string
}
