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

export interface GrantEmployeeBonusContextData {
  employee: EmployeeDataResponse | null
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

export interface CatalogsDataResponse {
  bonusType: CatalogEntry[]
  currency: CatalogEntry[]
}

export type GrantEmployeeBonusFormValues = {
  employeeBonusTypeRef: string
  amount: number | null
  currencyRef: string
  paymentDate: string
  fiscalYear: number
  description: string
  notes: string
}

export type TypedControl = Control<GrantEmployeeBonusFormValues>
