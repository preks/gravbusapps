/**
 * Investment Account Types
 * BaseInvestmentAccount and related reference types
 */

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { CommonAccount, CommonAccountFilters } from '@/common/data/relations/types/commonAccountTypes'
import type { ContactType } from './investmentEnums'

// Forward declaration to avoid circular dependency
export interface InvestmentContactRef {
  id: string
  code: string
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
  phone?: string
  department?: string
  jobPosition?: string
  picture?: string
  pictureThumbnail?: string
  academicTitle?: CatalogEntry
  salutation?: CatalogEntry
}

// Forward declaration for BaseInvestmentAddress (defined in investmentRelationBaseTypes)
export interface BaseInvestmentAddress {
  id: string
  addressType?: string
  addressLine?: any
  postalCode?: string
  locality?: string
  region?: CatalogEntry
  country?: CatalogEntry
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
  isDeleted?: boolean
  version?: number
}

/**
 * Investment Account Reference Type
 * Used in nested selections within queries
 */
export interface InvestmentAccountRef {
  id: string
  code: string
  name: string
  // Fields used in investment queries (inline account selection)
  email?: string
  phone?: string
  website?: string
  foundationDate?: string
  geographicPresence?: string
  picture?: string
  pictureThumbnail?: string
  // Address information
  addresses?: Array<{
    id: string
    addressType?: string
    addressLine?: any
    postalCode?: string
    locality?: string
    region?: CatalogEntry
    country?: CatalogEntry
  }>
  // Catalog references (inline)
  legalForm?: CatalogEntry
  companySize?: CatalogEntry
  accountAnnualRevenueBand?: CatalogEntry
  industryClass?: CatalogEntry
  // Employee reference (inline selections)
  ownerEmployee?: EmployeeRef
  // Inline relation selection used in queries
  investmentAccountContact?: Array<{
    contactType?: ContactType
    contact?: InvestmentContactRef
  }>
}

/**
 * Base Investment Account
 * Extends CommonAccount with Investment-specific or not-yet-integrated fields
 */
export interface BaseInvestmentAccount extends CommonAccount {
  // Investment-specific fields
  notesSummary?: string
  additionalProperties?: any
  synchronizedAt?: string
  timeZone?: CatalogEntry
  timeZoneRef?: string

  // Fields that DIFFER from CommonAccount (need integration):

  // TODO Integration: Investment uses "investmentAddress" instead of "addresses"
  // CommonAccount has: addresses
  // Investment currently uses:
  investmentAddress?: BaseInvestmentAddress[]

  // TODO Integration: Investment uses "accountAnnualRevenueBand" instead of "annualRevenueBand"
  // CommonAccount has: annualRevenueBand
  // Investment currently uses:
  accountAnnualRevenueBand?: CatalogEntry
  accountAnnualRevenueBandRef?: string

  // DEPRECATED - Still in database but should not be used
  // @deprecated Use communicationChannels instead
  email?: string
  // @deprecated Use communicationChannels instead
  phone?: string
  // @deprecated Use investmentAddress instead
  geographicPresence?: string

  // Note: picture, pictureThumbnail already correct in CommonAccount
  // Note: industryClass, companySize already correct in CommonAccount
  // Note: communicationChannels already correct in CommonAccount
}

/**
 * Enhanced Investment Account Type
 * Extends BaseInvestmentAccount with computed UI fields
 */
export interface InvestmentAccount extends BaseInvestmentAccount {
  // Computed display fields only
  displayName: string
  legalFormLabel?: string
  companySizeLabel?: string
  industryClassLabel?: string
  accountAnnualRevenueBandLabel?: string
  timeZoneLabel?: string
  ownerDisplayName?: string
}

/**
 * Investment Account Filters Interface
 * Extends common filters with Investment-specific filters
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InvestmentAccountFilters extends CommonAccountFilters {
  // Investment-specific filters
  // TODO Integration: Add investment-related filters
  // investments?: Array<{ id: string; label: string }>
  // investmentTypes?: Array<{ id: string; label: string }>
  // investmentGroups?: Array<{ id: string; label: string }>
  // Search functions for investment-specific filters
  // searchInvestments?: (query: string) => Promise<Array<{ id: string; label: string }>>
  // loadMoreInvestments?: () => Promise<void>
}
