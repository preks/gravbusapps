/**
 * Common Lead Types
 * Standardized lead interface shared between Customer and Investment modules
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'

/**
 * Common Lead Interface
 * The CORRECT target structure - how ALL Leads SHOULD be structured after integration
 * Extended by BaseCustomerLead and BaseInvestmentLead
 */
export interface CommonLead extends BaseEntity {
  id: string
  code?: string
  description?: string

  // Source information
  leadSourceType?: string
  sourceIndividualName?: string
  sourceCompanyName?: string

  // Dates
  conversionDate?: string

  // Personal information
  firstName?: string
  lastName?: string
  fullName?: string
  jobPosition?: string
  department?: string
  companyName?: string
  companyEmail?: string
  companyPhone?: string
  companyWebsite?: string
  sensitive?: boolean

  // Contact information (direct fields from GraphQL)
  email?: string
  phoneNumber?: string

  // Address fields (both domains have these)
  addressLine?: string | { lines: string[] } | any // CRM: String, IRM: jsonb
  postalCode?: string
  locality?: string // IRM uses "locality", CRM uses "city" - normalized to "locality"

  // Catalog References (using IRM naming as standard)
  salutation?: CatalogEntry
  salutationRef?: string
  academicTitle?: CatalogEntry
  academicTitleRef?: string
  timeZone?: CatalogEntry
  timeZoneRef?: string
  leadSource?: CatalogEntry
  leadSourceRef?: string
  leadStatus?: CatalogEntry
  leadStatusRef?: string
  leadRating?: CatalogEntry
  leadRatingRef?: string
  industryClass?: CatalogEntry // IRM uses "industryClass", CRM uses "industry"
  industryClassRef?: string
  legalForm?: CatalogEntry
  legalFormRef?: string
  companySize?: CatalogEntry // IRM uses "companySize", CRM uses "numberOfEmployees"
  companySizeRef?: string
  accountAnnualRevenueBand?: CatalogEntry // IRM uses "accountAnnualRevenueBand", CRM uses "annualRevenue"
  accountAnnualRevenueBandRef?: string
  country?: CatalogEntry
  countryRef?: string
  region?: CatalogEntry
  regionRef?: string

  // Employee Reference
  ownerEmployee?: Employee
  ownerEmployeeId?: string

  // Related entities - forward declarations to avoid circular imports
  activities?: any[] // CommonActivity[]
  notes?: any[] // CommonNote[]
  documents?: any[] // CommonDocument[]
  tasks?: any[] // CommonTask[]

  // Conversion references
  convertedAccountId?: string
  convertedAccount?: any // CommonAccount
  convertedContactId?: string
  convertedContact?: any // CommonContact
  convertedOpportunityId?: string
  convertedOpportunity?: any // CommonOpportunity

  // Computed fields
  address?: Address
  communicationChannels?: CommunicationChannel[]
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
