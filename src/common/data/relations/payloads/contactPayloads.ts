/**
 * Base Contact Payload
 * Centralized payload generation for Contact entities across CRM and IRM
 *
 * This file provides:
 * - Field name mappings between CRM and IRM
 * - Base interface for contact form data
 * - Shared constants and utilities
 *
 * Usage:
 * - CRM: Use CustomerContactPayload with buildCustomerContactPayload()
 * - IRM: Use InvestmentContactPayload with buildInvestmentContactPayload()
 */

/**
 * Field name mapping between CRM and IRM modules
 *
 * Contacts share almost all field names between CRM and IRM.
 * The main differences are in module-exclusive fields (salesCampaign, sensitive, etc.)
 */
export const ContactFieldMapping = {
  // Shared fields (identical names in both modules)
  shared: {
    firstName: 'firstName',
    lastName: 'lastName',
    fullName: 'fullName',
    type: 'type',
    contactType: 'contactType',
    birthDate: 'birthDate',
    description: 'description',
    jobPosition: 'jobPosition',
    department: 'department',
    code: 'code',
    businessKey: 'businessKey',
    email: 'email',
    phone: 'phone',
    ownerEmployee: 'ownerEmployee',
    academicTitleRef: 'academicTitleRef',
    professionalTitleRef: 'professionalTitleRef',
    salutationRef: 'salutationRef',
    notesSummary: 'notesSummary',
    addresses: 'addresses',
    communicationChannels: 'communicationChannels',
    documents: 'documents',
    notes: 'notes',
    tasks: 'tasks',
    activities: 'activities'
  },

  // CRM-specific field names (Customer module)
  crm: {
    // CRM and IRM use the same field names for contacts
    // CRM has exclusive fields but no different naming
  },

  // IRM-specific field names (Investment module)
  irm: {
    // CRM and IRM use the same field names for contacts
    // IRM has exclusive fields but no different naming
  }
} as const

/**
 * Base interface for contact form data (semantic fields)
 *
 * Contacts have minimal field name differences between CRM and IRM.
 * Most differences are in module-exclusive fields, not field names.
 */
export interface BaseContactFormData {
  // Identity fields
  id?: string
  version?: number
  code?: string
  businessKey?: string

  // Basic information
  firstName?: string // Shared field
  lastName?: string // Shared field
  fullName?: string // Shared field (auto-generated from first + last)
  type?: string // Maps to: type
  contactType?: string // Alternative to type
  birthDate?: string // Shared field
  description?: string // Shared field

  // Professional information
  jobPosition?: string // Shared field
  department?: string // Shared field

  // Titles
  academicTitle?: string // Maps to: academicTitleRef
  academicTitleRef?: string // Alternative to academicTitle
  professionalTitle?: string // Maps to: professionalTitleRef
  professionalTitleRef?: string // Alternative to professionalTitle
  salutation?: string // Maps to: salutationRef
  salutationRef?: string // Alternative to salutation
  language?: string // Maps to: languageRef (optional)
  languageRef?: string // Alternative to language

  // Contact information
  email?: string // Shared field
  phone?: string // Shared field
  phoneNumber?: string // Alternative to phone

  // Ownership
  owner?: string // Maps to: ownerEmployee
  ownerEmployeeId?: string // Alternative to owner

  // Additional information
  notesSummary?: string // Shared field

  // Complex fields (arrays/objects)
  addresses?: any[] // Shared field
  communicationChannels?: any[] // Shared field
  documents?: any[] // Shared field
  notes?: any[] // Shared field
  tasks?: any[] // Shared field
  activities?: any[] // Shared field

  // Association fields
  accountId?: string // Account association (both CRM and IRM)
  account?: string // Alternative to accountId

  // CRM-exclusive fields (used only in Customer module)
  bio?: string // CRM only - Contact biography/description
  fax?: string // CRM only - Fax number
  workExperienceYears?: number | string // CRM only - Years of work experience (numeric)
  pictureUrl?: string // CRM only - Profile picture URL
  pictureThumbnailUrl?: string // CRM only - Profile picture thumbnail URL
  jobTitle?: string // CRM uses jobTitle (not jobPosition!)

  // IRM-exclusive fields (used only in Investment module)
  picture?: string // IRM only - Picture data/reference
  pictureThumbnail?: string // IRM only - Picture thumbnail data/reference
  userId?: string // IRM only - External user ID
}

/**
 * Type helper for field names
 */
export type ContactFieldName =
  | keyof typeof ContactFieldMapping.shared
  | keyof typeof ContactFieldMapping.crm
  | keyof typeof ContactFieldMapping.irm

/**
 * Helper function to convert value to string or undefined
 */
export const toStringOrUndefined = (value: any): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return String(value)
}

/**
 * Helper function to generate full name from first and last names
 */
export const generateFullName = (firstName?: string, lastName?: string): string => {
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()
  return `${first} ${last}`.trim()
}
