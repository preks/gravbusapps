/**
 * Customer Lead Payloads (CRM)
 * Payload generation for Lead entities in the Customer Relations Management module
 *
 * This module provides:
 * - CustomerLeadFormData interface (extends BaseLeadFormData)
 * - buildCustomerLeadPayload() function
 * - CRM-specific field handling (salesCampaign, accountId, timeZone)
 *
 * Usage:
 * ```typescript
 * import { buildCustomerLeadPayload } from '@/common/data/customer/payloads'
 *
 * const payload = buildCustomerLeadPayload(formData, { isUpdate: true })
 * dispatchProcessContinueEvent('pse_submit', payload)
 * ```
 */

import { BaseLeadFormData, LeadFieldMapping } from '@/common/data/relations/payloads'
import { toISOFormat } from '@/common/utils/dateFormatter'

/**
 * CRM-specific lead form data interface
 * Extends base interface with Customer module exclusive fields
 */
export interface CustomerLeadFormData extends BaseLeadFormData {
  // CRM-exclusive fields
  accountId?: string // Account association
  salesCampaignId?: string // Sales campaign association
  timeZone?: string // Time zone reference
  additionalProperties?: Record<string, any> // Custom properties
  tags?: string[] // Tags for categorization
  communicationChannels?: any[] // Communication channels array
}

/**
 * Helper to convert value to string or undefined
 */
const toStringOrUndefined = (value: any): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return String(value)
}

/**
 * Build Customer Lead payload for CRM module
 *
 * Automatically handles:
 * - Field name mapping (industry → industryRef, etc.)
 * - Empty value exclusion
 * - ID/version for updates
 * - CRM-specific fields (salesCampaign, accountId, timeZone)
 * - Address line structure
 *
 * @param formData - Lead form data (semantic field names)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 */
export const buildCustomerLeadPayload = (formData: CustomerLeadFormData, options: { isUpdate?: boolean } = {}) => {
  const payload: any = {
    sourceApp: 'CRM'
  }

  // Code
  if (formData.code !== undefined) {
    payload.code = toStringOrUndefined(formData.code)
  }

  // Contact information
  if (formData.academicTitle !== undefined) {
    payload.academicTitleRef = toStringOrUndefined(formData.academicTitle)
  }
  if (formData.salutation !== undefined) {
    payload[LeadFieldMapping.crm.salutation] = toStringOrUndefined(formData.salutation)
  }
  if (formData.firstName !== undefined) {
    payload.firstName = toStringOrUndefined(formData.firstName)
  }
  if (formData.lastName !== undefined) {
    payload.lastName = toStringOrUndefined(formData.lastName)
  }
  if (formData.phone !== undefined || formData.phoneNumber !== undefined) {
    payload.phoneNumber = toStringOrUndefined(formData.phone || formData.phoneNumber)
  }
  if (formData.email !== undefined) {
    payload.email = toStringOrUndefined(formData.email)
  }
  if (formData.jobPosition !== undefined || formData.position !== undefined) {
    payload.position = toStringOrUndefined(formData.jobPosition || formData.position)
  }
  if (formData.sensitive !== undefined) {
    payload.sensitive = formData.sensitive
  }

  // Lead information
  if (formData.rating !== undefined || formData.leadRating !== undefined) {
    payload.leadRatingRef = toStringOrUndefined(formData.rating || formData.leadRating)
  }
  if (formData.leadStatus !== undefined) {
    payload.leadStatusRef = toStringOrUndefined(formData.leadStatus)
  }
  if (formData.leadSource !== undefined) {
    payload.leadSourceRef = toStringOrUndefined(formData.leadSource)
  }
  if (formData.description !== undefined) {
    payload.description = toStringOrUndefined(formData.description)
  }

  // Company information - CRM-specific field mappings
  if (formData.company !== undefined || formData.companyName !== undefined) {
    payload.companyName = toStringOrUndefined(formData.company || formData.companyName)
  }
  if (formData.companyEmail !== undefined) {
    payload.companyEmail = toStringOrUndefined(formData.companyEmail)
  }
  if (formData.companyPhone !== undefined) {
    payload.companyPhone = toStringOrUndefined(formData.companyPhone)
  }
  if (formData.website !== undefined || formData.companyWebsite !== undefined) {
    payload.companyWebsite = toStringOrUndefined(formData.website || formData.companyWebsite)
  }
  if (formData.legalForm !== undefined) {
    payload.legalFormRef = toStringOrUndefined(formData.legalForm)
  }

  // CRM-specific field mappings
  if (formData.industry !== undefined) {
    payload[LeadFieldMapping.crm.industry] = toStringOrUndefined(formData.industry)
  }
  if (formData.numberOfEmployees !== undefined || formData.companySize !== undefined) {
    payload[LeadFieldMapping.crm.companySize] = toStringOrUndefined(formData.numberOfEmployees || formData.companySize)
  }
  if (formData.annualRevenue !== undefined) {
    payload[LeadFieldMapping.crm.annualRevenue] = toStringOrUndefined(formData.annualRevenue)
  }

  // Address information
  if (formData.country !== undefined) {
    payload.countryRef = toStringOrUndefined(formData.country)
  }
  if (formData.region !== undefined) {
    payload.regionRef = toStringOrUndefined(formData.region)
  }
  if (formData.city !== undefined || formData.locality !== undefined) {
    payload[LeadFieldMapping.crm.city] = toStringOrUndefined(formData.city || formData.locality)
  }
  if (formData.postalCode !== undefined) {
    payload.postalCode = toStringOrUndefined(formData.postalCode)
  }

  // Address line structure (CRM format)
  if (formData.addressLine !== undefined) {
    payload.addressLine = formData.addressLine
  } else if (formData.addressLine1 || formData.addressLine2 || formData.addressLine3 || formData.addressLine4) {
    const lines = [formData.addressLine1, formData.addressLine2, formData.addressLine3, formData.addressLine4].filter(
      line => line && line.trim()
    )

    if (lines.length > 0) {
      payload.addressLine = { lines }
    }
  }

  // Ownership
  if (formData.owner !== undefined || formData.ownerEmployeeId !== undefined) {
    payload.ownerEmployee = toStringOrUndefined(formData.owner || formData.ownerEmployeeId)
  }

  // CRM-exclusive fields
  if (formData.accountId !== undefined) {
    payload.accountId = toStringOrUndefined(formData.accountId)
  }
  if (formData.salesCampaignId !== undefined) {
    payload.salesCampaign = toStringOrUndefined(formData.salesCampaignId)
  }
  if (formData.timeZone !== undefined) {
    payload.timeZoneRef = toStringOrUndefined(formData.timeZone)
  }
  if (formData.additionalProperties !== undefined && Object.keys(formData.additionalProperties).length > 0) {
    payload.additionalProperties = formData.additionalProperties
  }
  if (formData.tags !== undefined && formData.tags.length > 0) {
    payload.tags = formData.tags
  }

  // Conversion tracking
  if (formData.conversionDate !== undefined) {
    payload.conversionDate = toISOFormat(formData.conversionDate)
  }

  // Complex fields (arrays) - only include if not empty
  if (formData.addresses !== undefined && formData.addresses.length > 0) {
    payload.addresses = formData.addresses
  }
  if (formData.documents !== undefined && formData.documents.length > 0) {
    payload.documents = formData.documents
  }
  if (formData.communicationChannels !== undefined && formData.communicationChannels.length > 0) {
    payload.communicationChannels = formData.communicationChannels
  }

  // Include id and version for updates
  if (options.isUpdate && formData.id) {
    payload.id = formData.id
    payload.version = formData.version || 0
  }

  return {
    customerLead: payload
  }
}
