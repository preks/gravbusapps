/**
 * Common Contact Types
 * Defines the CORRECT, target Contact structure
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { CommunicationChannel } from '@/common/data/common/types/commonTypes'
import type { CommonAccountContact } from './commonRelationTypes'

/**
 * Common Contact Interface
 * The CORRECT target structure - how ALL Contacts SHOULD be structured after integration
 * Extended by BaseCustomerContact and BaseInvestmentContact
 */
export interface CommonContact extends BaseEntity {
  id: string
  code?: string
  type?: string
  firstName?: string
  lastName?: string
  fullName?: string
  jobPosition?: string
  department?: string
  birthDate?: string
  description?: string
  notesSummary?: string
  userId?: string

  // Pictures (base64 strings - CORRECT)
  picture?: string
  pictureThumbnail?: string

  // Communication Channels (CORRECT)
  communicationChannels?: CommunicationChannel[]

  // Catalog References (CORRECT)
  academicTitle?: CatalogEntry
  academicTitleRef?: string
  salutation?: CatalogEntry
  salutationRef?: string
  language?: CatalogEntry
  languageRef?: string

  // Employee Reference (CORRECT)
  ownerEmployee?: Employee
  ownerEmployeeId?: string

  // Account Contacts (CORRECT - many-to-many relationship via join table)
  accountContacts?: CommonAccountContact[]

  // Related entities - forward declarations to avoid circular imports
  activities?: any[] // CommonActivity[]
  notes?: any[] // CommonNote[]
  documents?: any[] // CommonDocument[]
  tasks?: any[] // CommonTask[]
  opportunityContacts?: any[] // CommonOpportunityContact[]
  leads?: any[] // CommonLead[]
}

/**
 * Filter Option Interface
 */
interface FilterOption {
  id: string
  label: string
}

/**
 * Common Contact Filters Interface
 * Base filter options shared across Customer and Investment Contacts
 */
export interface CommonContactFilters {
  // Standard catalog-based filters
  owners: FilterOption[]
  academicTitles: FilterOption[]
  salutations: FilterOption[]
  languages: FilterOption[]
  departments: FilterOption[]
  jobPositions: FilterOption[]

  // Loading state
  isLoading: boolean

  // Total counts for pagination
  totalCounts?: {
    owners?: number
    academicTitles?: number
    salutations?: number
    languages?: number
    departments?: number
    jobPositions?: number
  }

  // Lifecycle functions
  prefetchFilters?: () => Promise<void>

  // Search functions (individual per filter group)
  searchOwners?: (query: string) => Promise<FilterOption[]>
  searchAcademicTitles?: (query: string) => Promise<FilterOption[]>
  searchSalutations?: (query: string) => Promise<FilterOption[]>
  searchLanguages?: (query: string) => Promise<FilterOption[]>
  searchDepartments?: (query: string) => Promise<FilterOption[]>
  searchJobPositions?: (query: string) => Promise<FilterOption[]>

  // Load more functions (pagination)
  loadMoreOwners?: () => Promise<void>
  loadMoreAcademicTitles?: () => Promise<void>
  loadMoreSalutations?: () => Promise<void>
  loadMoreLanguages?: () => Promise<void>
  loadMoreDepartments?: () => Promise<void>
  loadMoreJobPositions?: () => Promise<void>
}
