import type { Control } from 'react-hook-form'

/**
 * Form mode determines the UI and behavior of the salary form
 * - 'adjust': Employee has existing salary records - show adjustment UI
 * - 'assign': Employee has no salary records - show direct assignment UI
 */
export type FormMode = 'adjust' | 'assign'

/**
 * Salary type for assign mode - either yearly/monthly fixed OR hourly
 */
export type SalaryType = 'yearlyMonthly' | 'hourly'

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

export interface CurrencyOption {
  id: string
  code: string
  value: string
}

export interface EmployeeWorkingConditionResponse {
  EmployeeWorkingCondition: Array<{
    id: string
    hireDate: string | null
    activeFrom: string | null
    activeTo: string | null
    region?: {
      id: string
    } | null
  }>
}

export interface EmployeeWorkingHoursResponse {
  EmployeeWorkingHours: Array<{
    id: string
    weeklyHours: number | null
  }>
}

export interface EmployeeBankAccountCurrencyResponse {
  EmployeeBankAccount: Array<{
    currencyRef: string | null
  }>
}

export interface AdjustEmployeeSalaryContextData {
  employee: EmployeeDataResponse | null
  compensation: EmployeeCompensationResponse | null
  catalogs: CatalogsDataResponse | null
  currencies: CurrencyOption[]
  formMode: FormMode
  /** Employee's hire date from working condition - used as default start date in assign mode */
  hireDate: string | null
  /** Employee's weekly working hours - used to calculate expected monthly wage for hourly workers */
  weeklyHours: number | null
  /** Employee's bank account currency - prefilled if exists, otherwise user selects */
  bankAccountCurrency: string | null
  /** Currency from employee's employment region country - used to preset currency in assign mode */
  countryCurrencyRef: string | null
  /** Whether the employee has an employment region set (from working condition) */
  hasEmploymentRegion: boolean
}

export interface EmployeeDataResponse {
  EmployeeByPk: {
    id: string
    code?: string
    firstName?: string
    lastName?: string
    displayName?: string
    pictureThumbnail?: string
  } | null
  EmployeePosition?: Array<{
    jobPosition?: {
      name?: string
    }
  }>
}

/**
 * Employee salary record from EmployeeSalary GraphQL entity.
 *
 * Currency fields: `currencyRef` is the authoritative ID for API payloads,
 * `currency` is the expanded CatalogEntry for display. Invariant: currency.id === currencyRef
 */
export interface EmployeeSalaryRecord {
  id: string
  employeeId: string
  annualGrossSalary: number | null
  monthlyGrossSalary: number | null
  hourlyGrossSalary: number | null
  /** Authoritative currency ID - use for API payloads */
  currencyRef: string
  activeFrom: string | null
  activeTo: string | null
  startDate: string | null
  endDate: string | null
  requestStatus: string | null
  requestDate: string | null
  decisionDate: string | null
  requestedPercent: number | null
  requestedAmount: number | null
  stockOptions: boolean | null
  notes: string | null
  salaryAdjustReasonRef: string | null
  decisionEmployeeId: string | null
  createdAt: string
  isDeleted: boolean
  /** Expanded CatalogEntry - use for display (code, value, translations) */
  currency: CatalogEntry
}

export interface EmployeeCompensationResponse {
  AllEmployeeSalaries: EmployeeSalaryRecord[]
}

export interface SalaryAdjustReasonCatalogResponse {
  CatalogEntry: Array<{
    id: string
    code: string
    value: string
    displayOrder: number | null
    translations: Array<{
      localeCode: string
      value: string
    }>
    catalog: {
      identifier: string
      version: string
      defaultLocale: string
    }
  }>
}

export interface CatalogsDataResponse {
  salaryAdjustReason: SalaryAdjustReasonCatalogResponse | null
}

export type AdjustEmployeeSalaryFormValues = {
  // ===== Adjust Mode Fields =====
  /** Amount increase for salary adjustment */
  amountIncrease: number | null
  /** Percentage increase for salary adjustment */
  percentageIncrease: number | null
  /** Frequency for adjustment calculations */
  adjustmentFrequency: 'annually' | 'monthly' | 'hourly'
  /** Reason for adjustment (catalog ref) */
  reason: string

  // ===== Assign Mode Fields =====
  /** Salary type for new assignment: yearlyMonthly or hourly */
  salaryType: SalaryType
  /** Monthly salary for monthly assignments (annual is calculated as monthly × 12) */
  monthlySalary: number | null
  /** Hourly salary for hourly assignments */
  hourlySalary: number | null
  /** Currency reference (e.g., "Currency:v1:EUR") */
  currency: string

  // ===== Shared Fields =====
  /** Effective/start date for the salary */
  effectiveDate: string
  /** Additional notes */
  notes: string
}

export type TypedControl = Control<AdjustEmployeeSalaryFormValues>
