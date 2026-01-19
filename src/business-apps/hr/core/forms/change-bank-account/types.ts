import type { UseFormReturn } from 'react-hook-form'

export interface BankAccountFormValues {
  countryId?: string | null
  currencyId?: string | null
  bankName?: string
  accountType?: 'CHECKINGS' | 'SAVINGS' | ''
  accountHolder?: string
  // Non-US fields
  iban?: string
  swift?: string
  // US-specific fields
  routingNumberTypeId?: string | null
  accountNumber?: string
  routingNumber?: string
  employeeAddressId?: string | null
  // Common
  comment?: string
}

export interface CatalogEntry {
  id: string
  code?: string
  value?: string
  objectValue?: unknown
}

export interface RegionRef {
  alternativeCode?: string | null
  id?: string | null
}

export interface CountryRef {
  id?: string | null
}

export interface EmployeeAddress {
  id: string
  type?: string
  addressLine?: string[]
  region?: RegionRef | null
  locality?: string | null
  postalCode?: string | null
  country?: CountryRef | null
}

export type BankAccountForm = UseFormReturn<BankAccountFormValues>
