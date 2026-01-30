/**
 * Account Import Types
 */

import { ConvertedEntity } from '@/common/components/common-relations/apps/data-import/types'

/**
 * Converted Account from import data
 * Extends ConvertedEntity with Account-specific fields
 */
export interface ConvertedAccount extends ConvertedEntity {
  // Company Information
  name?: string
  code?: string
  website?: string
  legalFormRef?: string
  companySizeRef?: string
  industryClassRef?: string
  accountAnnualRevenueBandRef?: string
  accountPriorityRef?: string
  foundationDate?: string
  liquidationDate?: string

  // Address/Location
  addressLine?: string
  city?: string
  postalCode?: string
  countryRef?: string
  regionRef?: string

  // Communication
  email?: string
  phoneNumber?: string
  mobileNumber?: string
  faxNumber?: string

  // Management
  ownerEmployeeId?: string
  timeZoneRef?: string

  // Additional
  notesSummary?: string
  picture?: string
  pictureThumbnail?: string
}
