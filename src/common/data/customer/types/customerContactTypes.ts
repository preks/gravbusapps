/**
 * Customer Contact Types
 * BaseCustomerContact and related reference types
 */

import type { CommonContact } from '@/common/data/relations/types/commonContactTypes'

/**
 * Customer Contact Reference Type
 * Used in nested selections within queries
 */
export interface CustomerContactRef {
  id: string
  code: string
  firstName?: string
  lastName?: string
  fullName?: string
  // Fields used in nested contact selection
  email?: string
  phone?: string
  department?: string
  jobPosition?: string
  picture?: string
  pictureThumbnail?: string
}

/**
 * Base Customer Contact
 * Extends CommonContact with Customer-specific or not-yet-integrated fields
 */
export interface BaseCustomerContact extends CommonContact {
  // Fields that DIFFER from CommonContact (need integration):

  // TODO Integration: Customer has email/phone directly (DEPRECATED)
  // CommonContact has: communicationChannels
  // Customer currently has:
  // @deprecated Use communicationChannels instead
  email?: string
  // @deprecated Use communicationChannels instead
  phone?: string

  // Note: firstName, lastName, fullName, birthDate, department, description, jobPosition already correct in CommonContact
  // Note: picture, pictureThumbnail already correct in CommonContact
  // Note: academicTitle, salutation, language already correct in CommonContact
  // Note: ownerEmployee already correct in CommonContact
}

/**
 * Enhanced Customer Contact Type
 * Extends BaseCustomerContact with computed UI fields
 */
export interface CustomerContact extends BaseCustomerContact {
  // Computed display fields only
  displayName: string
  fullName: string
  salutationLabel?: string
  academicTitleLabel?: string
  languageLabel?: string
  ownerDisplayName?: string
}

/**
 * Enhanced Customer Contact Type
 * Extends CommonContact with computed UI fields
 */
export interface CustomerContact extends CommonContact {
  // Computed display fields only
  displayName: string
  fullName: string
  salutationLabel?: string
  academicTitleLabel?: string
  languageLabel?: string
  ownerDisplayName?: string
}
