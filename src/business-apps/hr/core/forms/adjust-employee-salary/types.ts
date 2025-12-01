import type { Control } from 'react-hook-form'

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

export interface AdjustEmployeeSalaryContextData {
  employee: EmployeeDataResponse | null
  compensation: EmployeeCompensationResponse | null
  catalogs: CatalogsDataResponse | null
}

export interface EmployeeDataResponse {
  EmployeeByPk: {
    id: string
    code?: string
    firstName?: string
    lastName?: string
    displayName?: string
  } | null
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
  amountIncrease: number | null
  percentageIncrease: number | null
  adjustmentFrequency: 'annually' | 'monthly' | 'hourly'
  effectiveDate: string
  reason: string
  notes: string
}

export type TypedControl = Control<AdjustEmployeeSalaryFormValues>
