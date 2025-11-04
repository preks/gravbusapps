/**
 * Common Contact Types
 * Defines the CORRECT, target Contact structure
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { CommunicationChannel } from '@/common/data/common/types/commonTypes'

/**
 * Common Account Contact (Many-to-Many Join Table)
 * Used in both CommonAccount and CommonContact
 */
export interface CommonAccountContact extends BaseEntity {
  id: string
  contactType?: string
  accountId: string
  contactId: string

  // When used in CommonContact.accountContacts - has account details
  account?: {
    id: string
    name: string
    picture?: string
    pictureThumbnail?: string
  }

  // When used in CommonAccount.contacts - has contact details
  contact?: {
    id: string
    firstName?: string
    lastName?: string
    fullName?: string
    jobPosition?: string
    picture?: string
    pictureThumbnail?: string
  }
}

/**
 * Common Contact Interface
 * The CORRECT target structure - how ALL Contacts SHOULD be structured after integration
 * Extended by BaseCustomerContact and BaseInvestmentContact
 */
export interface CommonContact extends BaseEntity {
  id: string
  code?: string
  firstName?: string
  lastName?: string
  fullName?: string
  jobPosition?: string
  department?: string
  birthDate?: string
  description?: string

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
  ownerEmployee?: EmployeeRef
  ownerEmployeeId?: string

  // Account Contacts (CORRECT - many-to-many relationship via join table)
  accountContacts?: CommonAccountContact[]
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
