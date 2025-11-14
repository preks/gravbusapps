/**
 * Base Lead Payload
 * Centralized payload generation for Lead entities across CRM and IRM
 *
 * This file provides:
 * - Field name mappings between CRM and IRM
 * - Base interface for lead form data
 * - Shared constants and utilities
 *
 * Usage:
 * - CRM: Use CustomerLeadPayload with buildCustomerLeadPayload()
 * - IRM: Use InvestmentLeadPayload with buildInvestmentLeadPayload()
 */

/**
 * Field name mapping between CRM and IRM modules
 *
 * Leads share most field names, but differ in company-related fields
 */
export const LeadFieldMapping = {
  // Shared fields (identical names in both modules)
  shared: {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    phoneNumber: 'phoneNumber',
    position: 'position',
    academicTitleRef: 'academicTitleRef',
    salutationRef: 'salutationRef',
    leadRatingRef: 'leadRatingRef',
    leadStatusRef: 'leadStatusRef',
    leadSourceRef: 'leadSourceRef',
    companyName: 'companyName',
    companyEmail: 'companyEmail',
    companyPhone: 'companyPhone',
    companyWebsite: 'companyWebsite',
    legalFormRef: 'legalFormRef',
    ownerEmployee: 'ownerEmployee',
    countryRef: 'countryRef',
    regionRef: 'regionRef',
    postalCode: 'postalCode',
    locality: 'locality',
    addressLine: 'addressLine',
    description: 'description',
    sensitive: 'sensitive'
  },

  // CRM-specific field names (Customer module)
  crm: {
    industry: 'industryRef', // CRM uses industryRef
    companySize: 'numberOfEmployeesRef', // CRM uses numberOfEmployeesRef
    annualRevenue: 'annualRevenueRef', // CRM uses annualRevenueRef
    salutation: 'salutation', // CRM uses salutation (not Ref)
    city: 'city' // CRM uses city
  },

  // IRM-specific field names (Investment module)
  irm: {
    industry: 'industryClassRef', // IRM uses industryClassRef
    companySize: 'companySizeRef', // IRM uses companySizeRef
    annualRevenue: 'accountAnnualRevenueBandRef', // IRM uses accountAnnualRevenueBandRef
    jobPosition: 'position' // IRM uses position
  }
} as const

/**
 * Base interface for lead form data (semantic fields)
 *
 * This interface uses semantic field names that are module-agnostic.
 * Module-specific payload builders will map these to the correct field names.
 */
export interface BaseLeadFormData {
  // Identity fields
  id?: string
  version?: number
  code?: string

  // Contact information
  academicTitle?: string // Maps to: academicTitleRef
  salutation?: string // Maps to: salutation (CRM) or salutationRef (IRM)
  firstName?: string // Shared field
  lastName?: string // Shared field
  phone?: string // Maps to: phoneNumber
  phoneNumber?: string // Alternative to phone
  email?: string // Shared field
  jobPosition?: string // Maps to: position
  position?: string // Alternative to jobPosition

  // Lead information
  rating?: string // Maps to: leadRatingRef
  leadRating?: string // Alternative to rating
  leadStatus?: string // Maps to: leadStatusRef
  leadSource?: string // Maps to: leadSourceRef
  description?: string // Shared field
  sensitive?: boolean // Shared field (IRM has this, CRM doesn't use it much)

  // Company information (semantic fields)
  company?: string // Maps to: companyName
  companyName?: string // Alternative to company
  companyEmail?: string // Shared field
  companyPhone?: string // Shared field
  website?: string // Maps to: companyWebsite
  companyWebsite?: string // Alternative to website
  legalForm?: string // Maps to: legalFormRef
  industry?: string // Maps to: industryRef (CRM) or industryClassRef (IRM)
  numberOfEmployees?: string // Maps to: numberOfEmployeesRef (CRM) or companySizeRef (IRM)
  companySize?: string // Alternative to numberOfEmployees
  annualRevenue?: string // Maps to: annualRevenueRef (CRM) or accountAnnualRevenueBandRef (IRM)

  // Address information
  country?: string // Maps to: countryRef
  region?: string // Maps to: regionRef
  city?: string // Maps to: city (CRM) or locality (IRM)
  locality?: string // Alternative to city
  postalCode?: string // Shared field
  addressLine1?: string // Part of addressLine
  addressLine2?: string // Part of addressLine
  addressLine3?: string // Part of addressLine
  addressLine4?: string // Part of addressLine
  addressLine?: string | { lines: string[] } // Structured address
  addresses?: any[] // Full address objects

  // Ownership
  owner?: string // Maps to: ownerEmployee
  ownerEmployeeId?: string // Alternative to owner

  // Conversion tracking
  conversionDate?: string
  convertedAccountId?: string
  convertedContactId?: string
  convertedOpportunityId?: string

  // Investment-specific fields (IRM only)
  investmentName?: string // Investment name
  investmentGroup?: string // Maps to: investmentGroupRef
  investmentGroupRef?: string // Alternative
  investmentType?: string // Maps to: investmentTypeRef
  investmentTypeRef?: string // Alternative
  investmentRole?: string // Maps to: investmentRoleRef
  investmentRoleRef?: string // Alternative
  investmentStakeType?: string // Maps to: investmentStakeTypeRef
  investmentStakeTypeRef?: string // Alternative
  stakePercentage?: string | number // Numeric field
  marketValue?: string | number // Numeric field
  initialInvestmentAmount?: string | number // Numeric field
  loanAmount?: string | number // Numeric field
  loanInterestRate?: string | number // Numeric field
  requiredCapitalAmount?: string | number // Numeric field
  forecastedProfitAmount?: string | number // Numeric field
  annualNetColdRent?: string | number // Numeric field
  buildingYear?: string | number // Numeric field
  size?: string | number // Numeric field
  measurementUnit?: string // Maps to: sizeMeasurementUnitRef
  sizeMeasurementUnitRef?: string // Alternative

  // Complex fields
  documents?: any[]
  notes?: any[]
  tasks?: any[]
  activities?: any[]
  communicationChannels?: any[] // Communication channels array
  tags?: string[] // Tags array
}

/**
 * Type helper for field names
 */
export type LeadFieldName =
  | keyof typeof LeadFieldMapping.shared
  | keyof typeof LeadFieldMapping.crm
  | keyof typeof LeadFieldMapping.irm

/**
 * Helper function to convert value to string or undefined
 */
export const toStringOrUndefined = (value: any): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return String(value)
}
