/**
 * Customer Account Payloads (CRM)
 * Payload generation for Account entities in the Customer Relations Management module
 *
 * This module provides:
 * - CustomerAccountFormData interface (extends BaseAccountFormData)
 * - buildCustomerAccountPayload() function
 * - CRM-specific field handling (salesCampaign, additionalProperties, tags)
 *
 * Usage:
 * ```typescript
 * import { buildCustomerAccountPayload } from '@/common/data/customer/payloads'
 *
 * const payload = buildCustomerAccountPayload(formData, { isUpdate: true })
 * dispatchProcessContinueEvent('pse_submit', payload)
 * ```
 */

import { BaseAccountFormData, AccountFieldMapping } from '@/common/data/relations/payloads'
import { toISOFormat } from '@/common/utils/dateFormatter'

/**
 * CRM-specific account form data interface
 * Extends base interface with Customer module exclusive fields
 */
export interface CustomerAccountFormData extends BaseAccountFormData {
  // CRM-exclusive fields
  salesCampaignId?: string // Sales campaign association
  additionalProperties?: Record<string, any> // Custom properties
  tags?: string[] // Tags for categorization

  // Alternative field names (for compatibility)
  tickerSymbol?: string // Alternative to code
  description?: string // General description
}

/**
 * Helper to convert value to string or undefined
 * Ensures empty values are not included in payload
 */
const toStringOrUndefined = (value: any): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return String(value)
}

/**
 * Build Customer Account payload for CRM module
 *
 * Automatically handles:
 * - Field name mapping (industry → industryRef, etc.)
 * - Empty value exclusion
 * - ID/version for updates
 * - CRM-specific fields (salesCampaign, tags, additionalProperties)
 *
 * @param formData - Account form data (semantic field names)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 *
 * @example
 * ```typescript
 * const payload = buildCustomerAccountPayload({
 *   accountName: 'ACME Corp',
 *   industry: 'Industry:v1:TECH',
 *   owner: 'employee-uuid'
 * })
 * // Result: { customerAccount: { sourceApp: 'CRM', name: 'ACME Corp', industryRef: '...', ... } }
 * ```
 */
export const buildCustomerAccountPayload = (
  formData: CustomerAccountFormData,
  options: { isUpdate?: boolean } = {}
) => {
  const payload: any = {
    sourceApp: 'CRM'
  }

  // Basic information (shared fields)
  if (formData.accountName !== undefined) {
    payload.name = toStringOrUndefined(formData.accountName)
  }
  if (formData.code !== undefined) {
    payload.code = toStringOrUndefined(formData.code)
  }
  if (formData.tickerSymbol !== undefined) {
    payload.code = toStringOrUndefined(formData.tickerSymbol)
  }
  if (formData.legalForm !== undefined) {
    payload.legalFormRef = toStringOrUndefined(formData.legalForm)
  }
  if (formData.website !== undefined) {
    payload.website = toStringOrUndefined(formData.website)
  }

  // Contact information (shared fields - FIXED: was missing!)
  if (formData.email !== undefined) {
    payload.email = toStringOrUndefined(formData.email)
  }
  if (formData.phone !== undefined) {
    payload.phone = toStringOrUndefined(formData.phone)
  }
  if (formData.businessKey !== undefined) {
    payload.businessKey = toStringOrUndefined(formData.businessKey)
  }

  // CRM-specific field mappings (using AccountFieldMapping)
  if (formData.industry !== undefined) {
    payload[AccountFieldMapping.crm.industry] = toStringOrUndefined(formData.industry)
  }
  if (formData.companySize !== undefined) {
    payload[AccountFieldMapping.crm.companySize] = toStringOrUndefined(formData.companySize)
  }
  if (formData.annualRevenue !== undefined) {
    payload[AccountFieldMapping.crm.annualRevenue] = toStringOrUndefined(formData.annualRevenue)
  }

  // Dates
  if (formData.foundationDate !== undefined) {
    payload.foundationDate = toISOFormat(formData.foundationDate)
  }
  if (formData.liquidationDate !== undefined) {
    payload.liquidationDate = toISOFormat(formData.liquidationDate)
  }

  // Ownership
  if (formData.owner !== undefined) {
    payload.ownerEmployee = toStringOrUndefined(formData.owner)
  }
  if (formData.ownerEmployeeId !== undefined) {
    payload.ownerEmployee = toStringOrUndefined(formData.ownerEmployeeId)
  }

  // Additional information
  if (formData.timeZone !== undefined) {
    payload.timeZoneRef = toStringOrUndefined(formData.timeZone)
  }
  if (formData.notesSummary !== undefined) {
    payload.notesSummary = toStringOrUndefined(formData.notesSummary)
  }
  if (formData.specialty !== undefined) {
    payload.specialty = toStringOrUndefined(formData.specialty)
  }
  if (formData.picture !== undefined) {
    payload.picture = toStringOrUndefined(formData.picture)
  }
  if (formData.pictureThumbnail !== undefined) {
    payload.pictureThumbnail = toStringOrUndefined(formData.pictureThumbnail)
  }

  // CRM-exclusive fields
  if (formData.salesCampaignId !== undefined) {
    payload.salesCampaign = toStringOrUndefined(formData.salesCampaignId)
  }
  if (formData.additionalProperties !== undefined && Object.keys(formData.additionalProperties).length > 0) {
    payload.additionalProperties = formData.additionalProperties
  }
  if (formData.tags !== undefined && formData.tags.length > 0) {
    payload.tags = formData.tags
  }

  // Complex fields (arrays) - only include if not empty
  if (formData.addresses !== undefined && formData.addresses.length > 0) {
    payload.addresses = formData.addresses
  }
  if (formData.communicationChannels !== undefined && formData.communicationChannels.length > 0) {
    payload.communicationChannels = formData.communicationChannels
  }
  if (formData.documents !== undefined && formData.documents.length > 0) {
    payload.documents = formData.documents
  }

  // Include id and version for updates
  if (options.isUpdate && formData.id) {
    payload.id = formData.id
    payload.version = formData.version || 0
  }

  return {
    customerAccount: payload
  }
}
