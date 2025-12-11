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
  employeeCurrency: EmployeeBankAccountCurrency | null
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

export interface EmployeeBankAccountCurrency {
  currencyRef: string | null
}

export interface CatalogsDataResponse {
  bonusType: CatalogEntry[]
}

export type GrantEmployeeBonusFormValues = {
  employeeBonusTypeRef: string
  amount: number | null
  currencyRef: string
  paymentMonth: number
  fiscalYear: number
  notes: string
}

export type TypedControl = Control<GrantEmployeeBonusFormValues>
