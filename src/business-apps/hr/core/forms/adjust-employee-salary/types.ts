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
    hourlyGrossSalary: number | null
    currencyRef: string
    currency: CatalogEntry
  }>
}

// No catalogs needed - pay frequency is determined from employee data
export type CatalogsDataResponse = Record<string, never>

export type AdjustEmployeeSalaryFormValues = {
  amountIncrease: number | null
  percentageIncrease: number | null
  adjustmentFrequency: 'annually' | 'monthly' | 'hourly'
  effectiveDate: string
  reason: string
  notes: string
}

export type TypedControl = Control<AdjustEmployeeSalaryFormValues>
