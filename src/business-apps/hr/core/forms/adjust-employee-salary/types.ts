import type { Control } from 'react-hook-form'

export interface CatalogEntry {
  id: string
  value: string
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
    currencyRef: string
    currency: CatalogEntry
    payFrequencyRef: string | null
    payFrequency: CatalogEntry | null
  }>
}

export interface CatalogsDataResponse {
  currency: CatalogEntry[]
}

export type AdjustEmployeeSalaryFormValues = {
  amountIncrease: number | null
  percentageIncrease: number | null
  currencyRef: string
  effectiveDate: string
  reason: string
  description: string
  notes: string
}

export type TypedControl = Control<AdjustEmployeeSalaryFormValues>
