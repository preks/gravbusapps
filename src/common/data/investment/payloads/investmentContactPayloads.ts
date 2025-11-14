/**
 * Investment Contact Payloads (IRM)
 * Payload generation for Contact entities in the Investment Relations Management module
 *
 * This module provides:
 * - InvestmentContactFormData interface (extends BaseContactFormData)
 * - buildInvestmentContactPayload() function
 * - IRM-specific field handling (sensitive flag, description)
 *
 * Usage:
 * ```typescript
 * import { buildInvestmentContactPayload } from '@/common/data/investment/payloads'
 *
 * const payload = buildInvestmentContactPayload(formData, { isUpdate: true })
 * dispatchProcessContinueEvent('pse_submit', payload)
 * ```
 */

import { BaseContactFormData, generateFullName } from '@/common/data/relations/payloads'
import { toISOFormat } from '@/common/utils/dateFormatter'

/**
 * IRM-specific contact form data interface
 * Extends base interface with Investment module exclusive fields
 */
export interface InvestmentContactFormData extends BaseContactFormData {
  // IRM-exclusive fields
  sensitive?: boolean // Sensitive contact flag
  additionalProperties?: Record<string, any> // Custom properties (jsonb)
  tags?: string[] // Tags for categorization
  // Note: description is already in BaseContactFormData
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
 * Build Investment Contact payload for IRM module
 *
 * Automatically handles:
 * - Full name generation from first + last names
 * - Empty value exclusion
 * - ID/version for updates
 * - IRM-specific fields (sensitive flag, description)
 *
 * @param formData - Contact form data (semantic field names)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 */
export const buildInvestmentContactPayload = (
  formData: InvestmentContactFormData,
  options: { isUpdate?: boolean } = {}
) => {
  const payload: any = {
    sourceApp: 'IRM'
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
    payload.type = toStringOrUndefined(formData.type || formData.contactType)
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
  if (formData.jobPosition !== undefined) {
    payload.jobPosition = toStringOrUndefined(formData.jobPosition)
  }
  if (formData.department !== undefined) {
    payload.department = toStringOrUndefined(formData.department)
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

  // Picture fields (IRM specific - not URLs like CRM)
  if (formData.picture !== undefined) {
    payload.picture = toStringOrUndefined(formData.picture)
  }
  if (formData.pictureThumbnail !== undefined) {
    payload.pictureThumbnail = toStringOrUndefined(formData.pictureThumbnail)
  }
  if (formData.userId !== undefined) {
    payload.userId = toStringOrUndefined(formData.userId)
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

  // IRM-exclusive fields
  if (formData.sensitive !== undefined) {
    payload.sensitive = formData.sensitive
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
    investmentContact: payload
  }
}
