import { CatalogEntry } from '@/common/data/catalog'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { JSONObject } from '@/common/types/i18nTypes'
import { BenefitPeriod, EligibilityGroup } from '../constants/benefitsMaintenanceConstants'

export type BenefitsTranslationFn = (key: string, params?: Record<string, unknown>) => string
export type BenefitsFilterConfiguration = FilterConfiguration
export type BenefitCatalogObjectValue = JSONObject

export interface BenefitObjectValue {
  value?: string
  period?: BenefitPeriod
  currency?: string
  groups?: EligibilityGroup[]
  employeeYearlyContribution?: string
  employeeMonthlyContribution?: string
  icon?: string
  legalEntityId?: string
  legalEntityName?: string
  countryRef?: string
}

export interface CatalogMutationSource {
  code?: string
  value?: string
  parentEntryId?: string
  objectValue?: BenefitCatalogObjectValue
}

export interface BenefitTypeEntry extends CatalogEntry {
  parsedObjectValue?: BenefitObjectValue
  providersCount: number
}

export interface BenefitTypeFormData {
  code: string
  value: string
  description: string
  parentEntryId: string
  displayOrder: number
  objectValue: BenefitObjectValue
}

export interface BenefitProviderFormData {
  code: string
  value: string
  description: string
  parentEntryId: string
  displayOrder: number
}

export interface LegalEntityOption {
  id: string
  name: string
  code: string
  countryCode: string
  countryRef: string
  countryName: string
  currency: string
}
