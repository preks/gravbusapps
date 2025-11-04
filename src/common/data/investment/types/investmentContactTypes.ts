/**
 * Investment Contact Types
 * BaseInvestmentContact and related reference types
 */

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { CommonContact } from '@/common/data/relations/types/commonContactTypes'
import type { ContactType } from './investmentEnums'

/**
 * Investment Contact Reference Type
 * Used in nested selections within queries
 */
export interface InvestmentContactRef {
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
  // Catalog references
  academicTitle?: CatalogEntry
  salutation?: CatalogEntry
}

/**
 * Base Investment Contact
 * Extends CommonContact with Investment-specific or not-yet-integrated fields
 */
export interface BaseInvestmentContact extends CommonContact {
  // Investment-specific fields
  type?: ContactType
  notesSummary?: string

  // Fields that DIFFER from CommonContact (need integration):

  // TODO Integration: Investment has email/phone directly (DEPRECATED)
  // CommonContact has: communicationChannels
  // Investment currently has:
  // @deprecated Use communicationChannels instead
  email?: string
  // @deprecated Use communicationChannels instead
  phone?: string

  // TODO Integration: Investment has investmentAccountContact (many-to-many join table)
  // CommonContact expects: accountContacts
  // Override with Investment-specific field name:
  investmentAccountContact?: Array<{
    id: string
    contactType?: string
    account?: {
      id: string
      name: string
      picture?: string
      pictureThumbnail?: string
    }
  }>

  // Note: firstName, lastName, fullName, birthDate, department, description, jobPosition already correct in CommonContact
  // Note: picture, pictureThumbnail already correct in CommonContact
  // Note: academicTitle, salutation, language already correct in CommonContact
  // Note: communicationChannels already correct in CommonContact
  // Note: ownerEmployee already correct in CommonContact
}

/**
 * Enhanced Investment Contact Type
 * Extends BaseInvestmentContact with computed UI fields
 */
export interface InvestmentContact extends BaseInvestmentContact {
  // Computed display fields only
  displayName: string
  fullName: string
  salutationLabel?: string
  academicTitleLabel?: string
  languageLabel?: string
  ownerDisplayName?: string
}
