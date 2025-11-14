/**
 * Base Account Payload
 * Centralized payload generation for Account entities across CRM and IRM
 *
 * This file provides:
 * - Field name mappings between CRM and IRM
 * - Base interface for account form data
 * - Shared constants and utilities
 *
 * Usage:
 * - CRM: Use CustomerAccountPayload with buildCustomerAccountPayload()
 * - IRM: Use InvestmentAccountPayload with buildInvestmentAccountPayload()
 */

/**
 * Field name mapping between CRM and IRM modules
 *
 * CRM and IRM use different field names for the same semantic concepts.
 * This mapping documents these differences and is used by module-specific builders.
 */
export const AccountFieldMapping = {
  // Shared fields (identical names in both modules)
  shared: {
    name: 'name',
    code: 'code',
    legalFormRef: 'legalFormRef',
    website: 'website',
    foundationDate: 'foundationDate',
    liquidationDate: 'liquidationDate',
    ownerEmployee: 'ownerEmployee',
    timeZoneRef: 'timeZoneRef',
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
    industry: 'industryRef', // CRM uses industryRef
    companySize: 'numberOfEmployeesRef', // CRM uses numberOfEmployeesRef
    annualRevenue: 'annualRevenueRef' // CRM uses annualRevenueRef
  },

  // IRM-specific field names (Investment module)
  irm: {
    industry: 'industryClassRef', // IRM uses industryClassRef
    companySize: 'companySizeRef', // IRM uses companySizeRef
    annualRevenue: 'accountAnnualRevenueBandRef' // IRM uses accountAnnualRevenueBandRef
  }
} as const

/**
 * Base interface for account form data (semantic fields)
 *
 * This interface uses semantic field names that are module-agnostic.
 * Module-specific payload builders will map these to the correct field names.
 *
 * Example:
 * - formData.industry → industryRef (CRM) or industryClassRef (IRM)
 * - formData.companySize → numberOfEmployeesRef (CRM) or companySizeRef (IRM)
 */
export interface BaseAccountFormData {
  // Identity fields
  id?: string
  version?: number

  // Basic information
  accountName?: string // Maps to: name
  code?: string // Shared field
  legalForm?: string // Maps to: legalFormRef
  website?: string // Shared field

  // Contact information (shared fields)
  email?: string // Shared field
  phone?: string // Shared field
  businessKey?: string // Shared field (business key for external systems)

  // Financial/organizational information (semantic fields)
  industry?: string // Maps to: industryRef (CRM) or industryClassRef (IRM)
  companySize?: string // Maps to: numberOfEmployeesRef (CRM) or companySizeRef (IRM)
  annualRevenue?: string // Maps to: annualRevenueRef (CRM) or accountAnnualRevenueBandRef (IRM)

  // Dates
  foundationDate?: string
  liquidationDate?: string

  // Ownership
  owner?: string // Maps to: ownerEmployee
  ownerEmployeeId?: string // Alternative to owner

  // Additional information
  timeZone?: string // Maps to: timeZoneRef
  notesSummary?: string // Shared field
  specialty?: string // IRM field (optional)
  picture?: string // Both modules (optional, rarely used)
  pictureThumbnail?: string // Both modules (optional, rarely used)

  // Complex fields (arrays/objects)
  addresses?: any[] // Shared field
  communicationChannels?: any[] // Shared field
  documents?: any[] // Shared field
  notes?: any[] // Shared field
  tasks?: any[] // Shared field
  activities?: any[] // Shared field

  // Contact associations (IRM specific, but defined here for completeness)
  contactIds?: string[] // Used for account-contact associations
  accountContacts?: any[] // Full association objects (IRM)
}

/**
 * Type helper for field names
 */
export type AccountFieldName =
  | keyof typeof AccountFieldMapping.shared
  | keyof typeof AccountFieldMapping.crm
  | keyof typeof AccountFieldMapping.irm

/**
 * Helper function to convert value to string or undefined
 * Ensures empty values are not included in payload
 */
export const toStringOrUndefined = (value: any): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return String(value)
}

/**
 * Helper function to format date to ISO string
 */
export const toISODateFormat = (date: string | Date | undefined): string | undefined => {
  if (!date) return undefined

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toISOString().split('T')[0] // Returns YYYY-MM-DD
  } catch {
    return undefined
  }
}
