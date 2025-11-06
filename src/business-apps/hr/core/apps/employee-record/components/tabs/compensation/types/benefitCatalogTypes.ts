import { CatalogEntry } from './compensationTypes'
import { BenefitStatus } from './compensationEnums'

/**
 * Provider entry
 */
export interface ProviderEntry {
  id: string // "BenefitProvider:v1:ALLIANZ"
  value: string // "Allianz"
  code: string // "ALLIANZ"
  description?: string
}

/**
 * Catalog benefit from BenefitType catalog
 */
export interface CatalogBenefitEntry {
  id: string // "BenefitType:v1:CAR"
  value: string // "Car"
  code: string // "CAR"
  description?: string
  displayOrder: number
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  childEntries?: ProviderEntry[] // Available providers for this benefit type
}

/**
 * Enhanced benefit item combining catalog data with employee benefit data
 * This shows all available benefits with indicators for which ones the employee has
 */
export interface BenefitCatalogItem {
  // From catalog
  catalogId: string // "BenefitType:v1:CAR"
  benefitType: string // "Car"
  code: string // "CAR"
  description?: string
  displayOrder: number
  availableProviders?: ProviderEntry[] // Available providers for this benefit type

  // From employee data (if active)
  isActive: boolean // True if employee has this benefit
  employeeBenefitId?: string // ID from EmployeeBenefit table
  provider?: CatalogEntry // Current provider if assigned
  providerRef?: string
  yearlyAmount?: number // Value if assigned
  monthlyAmount?: number
  currency?: CatalogEntry // Currency if assigned
  currencyRef?: string
  startDate?: string
  endDate?: string
  notes?: string
  benefitStatus?: BenefitStatus // ACTIVE_BENEFIT, INACTIVE_BENEFIT

  // UI state
  canRequest: boolean // Can request activation
  canDeactivate: boolean // Can deactivate
  isPending?: boolean // Has pending request
}

/**
 * Result from useBenefitsCatalog hook
 */
export interface BenefitsCatalogData {
  catalogBenefits: BenefitCatalogItem[]
  activeBenefitsCount: number
  availableBenefitsCount: number
  totalBenefitsCount: number
}
