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
  employee: string
  annualGrossSalary: number
  monthlyGrossSalary: number | null
  hourlyGrossSalary: number | null
  currencyRef: string
  startDate: string | null
  endDate: string | null
  stockOptions: boolean
  notes: string | null
  requestStatus: string | null
  requestDate: string | null
  decisionDate: string | null
  requestedPercent: number | null
  requestedAmount: number | null
  salaryAdjustReason: string | null
  decisionEmployee: string | null
}

export interface EmployeeSalaryData {
  employee: string
  annualGrossSalary: number
  monthlyGrossSalary: number | null
  hourlyGrossSalary: number | null
  currencyRef: string
  salaryAdjustReason: string | null
  startDate: string | null
  notes: string | null
  stockOptions: boolean
  endDate: string | null
  requestStatus: string | null
  requestDate: string | null
  decisionDate: string | null
  requestedPercent: number | null
  requestedAmount: number | null
  decisionEmployee: string | null
}

/**
 * Review mode determines the UI and behavior of the review form
 * - 'adjust': Employee has existing salary - show comparison
 * - 'assign': Employee has no existing salary - show new salary only
 */
export type ReviewMode = 'adjust' | 'assign'

export interface SalaryChangePayload {
  employeeSalary: EmployeeSalaryData
  /** Can be null for assign mode (new employee without existing salary) */
  oldEmployeeSalary: OldEmployeeCompensation | null
  employeeId?: string
  initiatorEmployeeId?: string
}
