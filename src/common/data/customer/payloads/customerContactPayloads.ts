/**
 * Customer Contact Payloads (CRM)
 * Payload generation for Contact entities in the Customer Relations Management module
 *
 * This module provides:
 * - CustomerContactFormData interface (extends BaseContactFormData)
 * - buildCustomerContactPayload() function
 * - CRM-specific field handling (salesCampaign, linkedinUrl, xingUrl)
 *
 * Usage:
 * ```typescript
 * import { buildCustomerContactPayload } from '@/common/data/customer/payloads'
 *
 * const payload = buildCustomerContactPayload(formData, { isUpdate: true })
 * dispatchProcessContinueEvent('pse_submit', payload)
 * ```
 */

import { BaseContactFormData, generateFullName } from '@/common/data/relations/payloads'
import { toISOFormat } from '@/common/utils/dateFormatter'

/**
 * CRM-specific contact form data interface
 * Extends base interface with Customer module exclusive fields
 */
export interface CustomerContactFormData extends BaseContactFormData {
  // CRM-exclusive fields
  salesCampaignId?: string // Sales campaign association
  linkedinUrl?: string // LinkedIn profile URL
  xingUrl?: string // Xing profile URL
  additionalProperties?: Record<string, any> // Custom properties
  tags?: string[] // Tags for categorization
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
 * Build Customer Contact payload for CRM module
 *
 * Automatically handles:
 * - Full name generation from first + last names
 * - Empty value exclusion
 * - ID/version for updates
 * - CRM-specific fields (salesCampaign, linkedinUrl, xingUrl)
 *
 * @param formData - Contact form data (semantic field names)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 */
export const buildCustomerContactPayload = (
  formData: CustomerContactFormData,
  options: { isUpdate?: boolean } = {}
) => {
  const payload: any = {
    sourceApp: 'CRM'
  }

  // Basic information
  if (formData.firstName !== undefined) {
    payload.firstName = toStringOrUndefined(formData.firstName)
  }
  if (formData.lastName !== undefined) {
    payload.lastName = toStringOrUndefined(formData.lastName)
  }

  // Full name - generate if not provided
  if (formData.fullName !== undefined) {
    payload.fullName = toStringOrUndefined(formData.fullName)
  } else if (formData.firstName || formData.lastName) {
    payload.fullName = generateFullName(formData.firstName, formData.lastName)
  }

  if (formData.type !== undefined || formData.contactType !== undefined) {
    payload.contactType = toStringOrUndefined(formData.type || formData.contactType)
  }
  if (formData.birthDate !== undefined) {
    payload.birthDate = toISOFormat(formData.birthDate)
  }
  if (formData.description !== undefined) {
    payload.description = toStringOrUndefined(formData.description)
  }
  if (formData.code !== undefined) {
    payload.code = toStringOrUndefined(formData.code)
  }
  if (formData.businessKey !== undefined) {
    payload.businessKey = toStringOrUndefined(formData.businessKey)
  }

  // Professional information
  // ✅ FIXED: CRM uses jobTitle, not jobPosition!
  if (formData.jobTitle !== undefined || formData.jobPosition !== undefined) {
    payload.jobTitle = toStringOrUndefined(formData.jobTitle || formData.jobPosition)
  }
  if (formData.department !== undefined) {
    payload.department = toStringOrUndefined(formData.department)
  }
  if (formData.bio !== undefined) {
    payload.bio = toStringOrUndefined(formData.bio)
  }
  if (formData.workExperienceYears !== undefined) {
    const val =
      typeof formData.workExperienceYears === 'string'
        ? parseFloat(formData.workExperienceYears)
        : formData.workExperienceYears
    payload.workExperienceYears = !isNaN(val as number) ? val : undefined
  }

  // Titles
  if (formData.academicTitle !== undefined || formData.academicTitleRef !== undefined) {
    payload.academicTitleRef = toStringOrUndefined(formData.academicTitle || formData.academicTitleRef)
  }
  if (formData.professionalTitle !== undefined || formData.professionalTitleRef !== undefined) {
    payload.professionalTitleRef = toStringOrUndefined(formData.professionalTitle || formData.professionalTitleRef)
  }
  if (formData.salutation !== undefined || formData.salutationRef !== undefined) {
    payload.salutationRef = toStringOrUndefined(formData.salutation || formData.salutationRef)
  }
  if (formData.language !== undefined || formData.languageRef !== undefined) {
    payload.languageRef = toStringOrUndefined(formData.language || formData.languageRef)
  }

  // Contact information
  if (formData.email !== undefined) {
    payload.email = toStringOrUndefined(formData.email)
  }
  if (formData.phone !== undefined || formData.phoneNumber !== undefined) {
    payload.phone = toStringOrUndefined(formData.phone || formData.phoneNumber)
  }
  if (formData.fax !== undefined) {
    payload.fax = toStringOrUndefined(formData.fax)
  }

  // Picture fields (CRM specific)
  if (formData.pictureUrl !== undefined) {
    payload.pictureUrl = toStringOrUndefined(formData.pictureUrl)
  }
  if (formData.pictureThumbnailUrl !== undefined) {
    payload.pictureThumbnailUrl = toStringOrUndefined(formData.pictureThumbnailUrl)
  }

  // Ownership
  if (formData.owner !== undefined || formData.ownerEmployeeId !== undefined) {
    payload.ownerEmployee = toStringOrUndefined(formData.owner || formData.ownerEmployeeId)
  }

  // Additional information
  if (formData.notesSummary !== undefined) {
    payload.notesSummary = toStringOrUndefined(formData.notesSummary)
  }

  // Association fields
  if (formData.accountId !== undefined || formData.account !== undefined) {
    payload.account = toStringOrUndefined(formData.accountId || formData.account)
  }

  // CRM-exclusive fields
  if (formData.salesCampaignId !== undefined) {
    payload.salesCampaign = toStringOrUndefined(formData.salesCampaignId)
  }
  if (formData.linkedinUrl !== undefined) {
    payload.linkedinUrl = toStringOrUndefined(formData.linkedinUrl)
  }
  if (formData.xingUrl !== undefined) {
    payload.xingUrl = toStringOrUndefined(formData.xingUrl)
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
    customerContact: payload
  }
}
