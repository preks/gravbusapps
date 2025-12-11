import type {
  BenefitCatalogItem,
  ProviderEntry
} from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

export interface RequestEmployeeBenefitContextData {
  employee: EmployeeDataResponse | null
  benefitProviders: ProviderEntry[]
  countryCurrency: {
    currencyRef: string | null
    currencyCode: string
  }
  selectedBenefit: BenefitCatalogItem | null
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

export type RequestEmployeeBenefitFormValues = {
  benefitTypeRef: string
  benefitProviderRef: string | null
  startDate: string
  notes: string
  period?: string | null
  yearlyAmount?: number
  monthlyAmount?: number
  currencyRef?: string
  employeeYearlyContribution?: number
  employeeMonthlyContribution?: number
}
