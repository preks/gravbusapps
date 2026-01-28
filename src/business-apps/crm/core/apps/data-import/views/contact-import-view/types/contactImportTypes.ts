/**
 * Contact-specific import types
 */

import { ConvertedEntity } from '@/common/data/customer/agents/types'

// Converted contact structure ready for API
export interface ConvertedContact extends ConvertedEntity {
  // Personal Information
  salutationRef?: string | null
  academicTitleRef?: string | null
  firstName?: string | null
  lastName?: string | null
  birthDate?: string | null
  jobPosition?: string | null
  department?: string | null

  // Contact Information
  email?: string | null
  phoneNumber?: string | null

  // Language
  languageRef?: string | null

  // Address/Location
  addressLine?: string | null
  city?: string | null
  postalCode?: string | null
  countryRef?: string | null
  regionRef?: string | null

  // Owner
  ownerEmployeeId?: string | null

  // Additional
  type?: string | null
  code?: string | null
  description?: string | null
  notesSummary?: string | null
}
