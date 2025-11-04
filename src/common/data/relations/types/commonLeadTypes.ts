/**
 * Common Lead Types
 * Standardized lead interface shared between Customer and Investment modules
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'

/**
 * Common Lead Interface
 * The CORRECT target structure - how ALL Leads SHOULD be structured after integration
 * Extended by BaseCustomerLead and BaseInvestmentLead
 */
export interface CommonLead extends BaseEntity {
  id: string
  code?: string
  firstName?: string
  lastName?: string
  fullName?: string
  companyName?: string
  jobPosition?: string
  department?: string
  description?: string

  // Pictures (base64 strings)
  picture?: string
  pictureThumbnail?: string

  // Addresses (standardized with "locality")
  addresses?: Address[]

  // Communication Channels
  communicationChannels?: CommunicationChannel[]

  // Catalog References
  salutation?: CatalogEntry
  salutationRef?: string
  source?: CatalogEntry
  sourceRef?: string
  status?: CatalogEntry
  statusRef?: string
  rating?: CatalogEntry
  ratingRef?: string
  industry?: CatalogEntry
  industryRef?: string

  // Employee Reference
  ownerEmployee?: EmployeeRef
  ownerEmployeeId?: string
}

/**
 * Filter Option Interface
 */
interface FilterOption {
  id: string
  label: string
}

/**
 * Common Lead Filters Interface
 * Base filter options shared across Customer and Investment Leads
 */
export interface CommonLeadFilters {
  // Standard catalog-based filters
  owners: FilterOption[]
  salutations: FilterOption[]
  sources: FilterOption[]
  statuses: FilterOption[]
  ratings: FilterOption[]
  industries: FilterOption[]

  // Loading state
  isLoading: boolean

  // Total counts for pagination
  totalCounts?: {
    owners?: number
    salutations?: number
    sources?: number
    statuses?: number
    ratings?: number
    industries?: number
  }

  // Lifecycle functions
  prefetchFilters?: () => Promise<void>

  // Search functions (individual per filter group)
  searchOwners?: (query: string) => Promise<FilterOption[]>
  searchSalutations?: (query: string) => Promise<FilterOption[]>
  searchSources?: (query: string) => Promise<FilterOption[]>
  searchStatuses?: (query: string) => Promise<FilterOption[]>
  searchRatings?: (query: string) => Promise<FilterOption[]>
  searchIndustries?: (query: string) => Promise<FilterOption[]>

  // Load more functions (pagination)
  loadMoreOwners?: () => Promise<void>
  loadMoreSalutations?: () => Promise<void>
  loadMoreSources?: () => Promise<void>
  loadMoreStatuses?: () => Promise<void>
  loadMoreRatings?: () => Promise<void>
  loadMoreIndustries?: () => Promise<void>
}
