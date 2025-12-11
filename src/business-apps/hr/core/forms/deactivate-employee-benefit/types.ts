import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

export interface DeactivateEmployeeBenefitContextData {
  employee: EmployeeDataResponse | null
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

export interface DeactivateEmployeeBenefitFormValues {
  endDate: string
  reason: string
  additionalDetails: string
}
