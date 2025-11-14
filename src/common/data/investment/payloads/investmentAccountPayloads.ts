/**
 * Investment Account Payloads (IRM)
 * Payload generation for Account entities in the Investment Relations Management module
 *
 * This module provides:
 * - InvestmentAccountFormData interface (extends BaseAccountFormData)
 * - buildInvestmentAccountPayload() function
 * - IRM-specific field handling (mission, geographicPresence, accountContacts)
 *
 * Usage:
 * ```typescript
 * import { buildInvestmentAccountPayload } from '@/common/data/investment/payloads'
 *
 * const payload = buildInvestmentAccountPayload(formData, { isUpdate: true })
 * dispatchProcessContinueEvent('pse_submit', payload)
 * ```
 */

import { BaseAccountFormData, AccountFieldMapping } from '@/common/data/relations/payloads'
import { toISOFormat } from '@/common/utils/dateFormatter'

/**
 * IRM-specific account form data interface
 * Extends base interface with Investment module exclusive fields
 */
export interface InvestmentAccountFormData extends BaseAccountFormData {
  // IRM-exclusive fields
  mission?: string // Company mission statement
  description?: string // Alternative/maps to mission
  geographicPresence?: string // Geographic presence description
  parentAccount?: string // Parent account ID
  accountContacts?: any[] // Full account-contact association objects

  // Alternative field names (for compatibility)
  tickerSymbol?: string // Alternative to code
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
 * Build Investment Account payload for IRM module
 *
 * Automatically handles:
 * - Field name mapping (industry → industryClassRef, etc.)
 * - Empty value exclusion
 * - ID/version for updates
 * - IRM-specific fields (mission, geographicPresence, accountContacts)
 *
 * @param formData - Account form data (semantic field names)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 *
 * @example
 * ```typescript
 * const payload = buildInvestmentAccountPayload({
 *   accountName: 'ACME Corp',
 *   industry: 'Industry:v1:TECH',
 *   mission: 'Transform the world',
 *   owner: 'employee-uuid'
 * })
 * // Result: { investmentAccount: { sourceApp: 'IRM', name: 'ACME Corp', industryClassRef: '...', ... } }
 * ```
 */
export const buildInvestmentAccountPayload = (
  formData: InvestmentAccountFormData,
  options: { isUpdate?: boolean } = {}
) => {
  const payload: any = {
    sourceApp: 'IRM'
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

  // IRM-specific field mappings (using AccountFieldMapping)
  if (formData.industry !== undefined) {
    payload[AccountFieldMapping.irm.industry] = toStringOrUndefined(formData.industry)
  }
  if (formData.companySize !== undefined) {
    payload[AccountFieldMapping.irm.companySize] = toStringOrUndefined(formData.companySize)
  }
  if (formData.annualRevenue !== undefined) {
    payload[AccountFieldMapping.irm.annualRevenue] = toStringOrUndefined(formData.annualRevenue)
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

  // IRM-exclusive fields
  if (formData.mission !== undefined) {
    payload.mission = toStringOrUndefined(formData.mission)
  } else if (formData.description !== undefined) {
    // Map description to mission if mission is not provided
    payload.mission = toStringOrUndefined(formData.description)
  }
  if (formData.geographicPresence !== undefined) {
    payload.geographicPresence = toStringOrUndefined(formData.geographicPresence)
  }
  if (formData.parentAccount !== undefined) {
    payload.parentAccount = toStringOrUndefined(formData.parentAccount)
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

  // Account contacts (IRM-specific association)
  if (formData.accountContacts !== undefined && formData.accountContacts.length > 0) {
    payload.accountContacts = formData.accountContacts
  } else if (formData.contactIds !== undefined && formData.contactIds.length > 0) {
    // Build accountContacts from contactIds
    payload.accountContacts = formData.contactIds.map(contactId => {
      if (typeof contactId === 'object' && (contactId as any).id) {
        // Existing association with metadata
        const contact = contactId as any
        const association: any = {
          contactType: contact.contactType || null,
          account: formData.id,
          contact: contact.id
        }

        // Include association ID and version if it exists (for updates)
        if (contact.associationId) {
          association.id = contact.associationId
          if (contact.associationVersion !== undefined) {
            association.version = contact.associationVersion
          }
        }

        return association
      }

      // New association - simple format
      return {
        contactType: null,
        account: formData.id,
        contact: contactId
      }
    })
  }

  // Include id and version for updates
  if (options.isUpdate && formData.id) {
    payload.id = formData.id
    payload.version = formData.version || 0
  }

  return {
    investmentAccount: payload
  }
}
