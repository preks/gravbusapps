/**
 * Common Account Types
 * Defines the CORRECT, target Account structure
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'
import type { CommonAccountContact } from './commonContactTypes'

/**
 * Common Account Interface
 * The CORRECT target structure - how ALL Accounts SHOULD be structured after integration
 * Extended by BaseCustomerAccount and BaseInvestmentAccount
 */
export interface CommonAccount extends BaseEntity {
  id: string
  code?: string
  name?: string
  website?: string
  foundationDate?: string
  liquidationDate?: string
  mission?: string
  specialty?: string

  // Pictures (base64 strings - CORRECT)
  picture?: string
  pictureThumbnail?: string

  // Addresses (standardized with "locality" - CORRECT)
  addresses?: Address[]

  // Communication Channels (CORRECT)
  communicationChannels?: CommunicationChannel[]

  // Catalog References (CORRECT naming)
  legalForm?: CatalogEntry
  legalFormRef?: string
  industryClass?: CatalogEntry
  industryClassRef?: string
  companySize?: CatalogEntry
  companySizeRef?: string
  annualRevenueBand?: CatalogEntry
  annualRevenueBandRef?: string

  // Employee Reference (CORRECT)
  ownerEmployee?: EmployeeRef
  ownerEmployeeId?: string

  // Contacts (CORRECT - many-to-many relationship via join table)
  contacts?: CommonAccountContact[]
}

/**
 * Filter Option Interface
 */
interface FilterOption {
  id: string
  label: string
}

/**
 * Common Account Filters Interface
 * Base filter options shared across Customer and Investment Accounts
 */
export interface CommonAccountFilters {
  // Standard catalog-based filters
  owners: FilterOption[]
  industries: FilterOption[]
  legalForms: FilterOption[]
  companySizes: FilterOption[]
  revenueBands: FilterOption[]

  // Geography filters
  countries: FilterOption[]

  // Loading state
  isLoading: boolean

  // Total counts for pagination
  totalCounts?: {
    owners?: number
    industries?: number
    legalForms?: number
    companySizes?: number
    revenueBands?: number
    countries?: number
  }

  // Lifecycle functions
  prefetchFilters?: () => Promise<void>

  // Search functions (individual per filter group)
  searchOwners?: (query: string) => Promise<FilterOption[]>
  searchIndustries?: (query: string) => Promise<FilterOption[]>
  searchLegalForms?: (query: string) => Promise<FilterOption[]>
  searchCompanySizes?: (query: string) => Promise<FilterOption[]>
  searchRevenueBands?: (query: string) => Promise<FilterOption[]>
  searchCountries?: (query: string) => Promise<FilterOption[]>

  // Load more functions (pagination)
  loadMoreOwners?: () => Promise<void>
  loadMoreIndustries?: () => Promise<void>
  loadMoreLegalForms?: () => Promise<void>
  loadMoreCompanySizes?: () => Promise<void>
  loadMoreRevenueBands?: () => Promise<void>
  loadMoreCountries?: () => Promise<void>
}
