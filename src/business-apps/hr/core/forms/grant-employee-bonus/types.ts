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
  /** Currency from employee's employment region country; used as default when set */
  countryCurrencyRef: string | null
  /** Whether the employee has an employment region set; undefined until region has been resolved */
  hasEmploymentRegion?: boolean
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
