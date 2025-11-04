/**
 * Customer Account Types
 * BaseCustomerAccount and related reference types
 */

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { CommonAccount, CommonAccountFilters } from '@/common/data/relations/types/commonAccountTypes'

/**
 * Customer Account Reference Type
 * Used in nested selections within queries
 */
export interface CustomerAccountRef {
  id: string
  code: string
  name: string
  // Fields used in customer queries (inline account selection)
  email?: string
  phone?: string
  website?: string
  picture?: string
  pictureThumbnail?: string
  annualRevenue?: CatalogEntry
  // Employee reference (inline selections)
  ownerEmployee?: EmployeeRef
}

/**
 * Base Customer Account
 * Extends CommonAccount with Customer-specific or not-yet-integrated fields
 */
export interface BaseCustomerAccount extends CommonAccount {
  // Fields that DIFFER from CommonAccount (need integration):

  // TODO Integration: Customer uses URLs instead of base64
  // CommonAccount has: picture, pictureThumbnail
  // Customer currently uses:
  pictureThumbnailUrl?: string
  pictureUrl?: string

  // TODO Integration: Customer uses different catalog naming
  // CommonAccount has: industryClass, companySize, annualRevenueBand
  // Customer currently uses:
  industry?: CatalogEntry
  industryRef?: string
  numberOfEmployees?: CatalogEntry
  numberOfEmployeesRef?: string
  annualRevenue?: CatalogEntry
  annualRevenueRef?: string

  // Note: communicationChannels is already correct in CommonAccount
  // Note: addresses is already correct in CommonAccount (though GraphQL alias is "crmAddress")
}

/**
 * Enhanced Customer Account Type
 * Extends BaseCustomerAccount with computed UI fields
 */
export interface CustomerAccount extends BaseCustomerAccount {
  // Computed display fields only
  displayName: string
  legalFormLabel?: string
  companySizeLabel?: string
  industryClassLabel?: string
  annualRevenueLabel?: string
  ownerDisplayName?: string
}

/**
 * Customer Account Filters Interface
 * Extends common filters with CRM-specific filters
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CustomerAccountFilters extends CommonAccountFilters {
  // Customer-specific filters can be added here
  // Example: campaigns, salesTeams, etc.
  // Currently no Customer-specific filters beyond common ones
  // Reserved for future CRM-specific filter requirements
}
