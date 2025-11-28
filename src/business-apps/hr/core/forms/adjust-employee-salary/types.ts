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

export interface EmployeeCompensationResponse {
  EmployeeWorkingCondition: Array<{
    id: string
    employeeId: string
    annualGrossSalary: number
    monthlyGrossSalary: number | null
    hourlyGrossSalary: number | null
    currencyRef: string
    currency: CatalogEntry
  }>
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
