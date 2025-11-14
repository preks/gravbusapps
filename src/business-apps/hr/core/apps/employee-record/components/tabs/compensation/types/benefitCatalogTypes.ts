import { CatalogEntry } from './compensationTypes'
import { BenefitStatus } from './compensationEnums'

export interface ProviderEntry {
  id: string
  value: string
  code: string
  description?: string
  translations?: Array<{
    localeCode: string
    value: string
    additionalValue1?: string
    additionalValue2?: string
    additionalValue3?: string
  }>
}

export interface CatalogBenefitEntry {
  id: string
  value: string
  code: string
  description?: string
  displayOrder: number
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  translations?: Array<{
    localeCode: string
    value: string
    additionalValue1?: string
    additionalValue2?: string
    additionalValue3?: string
  }>
  childEntries?: ProviderEntry[]
}

/**
 * catalogEntry is the source of truth for all catalog data including translations.
 * Top-level fields are convenience fields duplicated from catalogEntry.
 */
export interface BenefitCatalogItem {
  catalogEntry: CatalogBenefitEntry
  catalogId: string
  benefitType: string
  code: string
  description?: string
  displayOrder: number
  availableProviders?: ProviderEntry[]
  isActive: boolean
  employeeBenefitId?: string
  provider?: CatalogEntry
  providerRef?: string
  yearlyAmount?: number
  monthlyAmount?: number
  currency?: CatalogEntry
  currencyRef?: string
  startDate?: string
  endDate?: string
  notes?: string
  benefitStatus?: BenefitStatus
  canRequest: boolean
  canDeactivate: boolean
  isPending?: boolean
}

export interface BenefitsCatalogData {
  catalogBenefits: BenefitCatalogItem[]
  activeBenefitsCount: number
  availableBenefitsCount: number
  totalBenefitsCount: number
}

export interface GraphQLCatalogEntryTranslation {
  id: string
  localeCode: string
  value: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  objectValue?: unknown
}

export interface GraphQLCatalogEntry {
  id: string
  code: string
  value: string
  alternativeCode?: string
  description?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  translations?: GraphQLCatalogEntryTranslation[]
  type?: string
  displayOrder?: number
  objectValue?: unknown
  activeFrom?: string
  activeTo?: string
  catalogId?: string
  parentEntryId?: string
  isDeleted?: boolean
  recordState?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  childEntries?: GraphQLCatalogEntry[]
}

export interface GraphQLBenefitTypesResponse {
  CatalogEntry: GraphQLCatalogEntry[]
}

export interface GraphQLEmployeeBenefitResponse {
  id: string
  employeeId: string
  benefitType: {
    id: string
    value: string
    code: string
  }
  benefitTypeRef: string
  benefitProvider: {
    id: string
    value: string
    code: string
  }
  benefitProviderRef: string
  yearlyAmount?: number
  monthlyAmount?: number
  employeeYearlyContribution?: number
  employeeMonthlyContribution?: number
  currency: {
    id: string
    code: string
    value: string
  }
  currencyRef: string
  startDate?: string
  endDate?: string | null
  status?: string
  benefitStatus?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface GraphQLEmployeeBenefitsResponse {
  EmployeeBenefit: GraphQLEmployeeBenefitResponse[]
}
