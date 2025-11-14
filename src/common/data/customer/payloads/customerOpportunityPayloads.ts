/**
 * Customer Opportunity Payloads (CRM)
 * Payload generation for Opportunity entities in the Customer Relations Management module
 *
 * This module provides:
 * - CustomerOpportunityFormData interface (extends BaseOpportunityFormData)
 * - buildCustomerOpportunityPayload() function
 * - CRM-specific field handling (salesCampaign, salesPipelineRef)
 * - Contact association helpers
 *
 * Usage:
 * ```typescript
 * import { buildCustomerOpportunityPayload } from '@/common/data/customer/payloads'
 *
 * const payload = buildCustomerOpportunityPayload(formData, { isUpdate: true })
 * dispatchProcessContinueEvent('pse_submit', payload)
 * ```
 */

import {
  BaseOpportunityFormData,
  OpportunityFieldMapping,
  buildOpportunityContactAssociations
} from '@/common/data/relations/payloads'
import { toISOFormat } from '@/common/utils/dateFormatter'

/**
 * CRM-specific opportunity form data interface
 * Extends base interface with Customer module exclusive fields
 */
export interface CustomerOpportunityFormData extends BaseOpportunityFormData {
  // CRM-exclusive fields
  salesCampaignId?: string // Sales campaign association
  additionalProperties?: Record<string, any> // Custom properties
  tags?: string[] // Tags for categorization
  express1?: any // Express field 1 (custom data)
  express2?: any // Express field 2 (custom data)
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
 * Helper to convert value to number or undefined
 */
const toNumberOrUndefined = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? undefined : num
}

/**
 * Build Customer Opportunity payload for CRM module
 *
 * Automatically handles:
 * - Field name mapping (pipeline → salesPipelineRef, etc.)
 * - Empty value exclusion
 * - ID/version for updates
 * - CRM-specific fields (salesCampaign, tags, additionalProperties)
 * - Contact associations
 *
 * @param formData - Opportunity form data (semantic field names)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 */
export const buildCustomerOpportunityPayload = (
  formData: CustomerOpportunityFormData,
  options: { isUpdate?: boolean } = {}
) => {
  const payload: any = {
    sourceApp: 'CRM'
  }

  // Basic information
  if (formData.name !== undefined) {
    payload.name = toStringOrUndefined(formData.name)
  }
  if (formData.code !== undefined) {
    payload.code = toStringOrUndefined(formData.code)
  }
  if (formData.businessKey !== undefined) {
    payload.businessKey = toStringOrUndefined(formData.businessKey)
  }
  if (formData.notesSummary !== undefined) {
    payload.notesSummary = toStringOrUndefined(formData.notesSummary)
  }

  // Financial information
  if (formData.estimatedAmount !== undefined) {
    payload.estimatedAmount = toNumberOrUndefined(formData.estimatedAmount)
  }
  if (formData.currency !== undefined || formData.currencyRef !== undefined) {
    payload.currencyRef = toStringOrUndefined(formData.currency || formData.currencyRef)
  }
  if (formData.closeDate !== undefined) {
    payload.closeDate = toISOFormat(formData.closeDate)
  }
  if (formData.winningChance !== undefined) {
    payload.winningChance = toNumberOrUndefined(formData.winningChance)
  }

  // CRM-specific pipeline field mappings
  if (formData.pipeline !== undefined) {
    payload[OpportunityFieldMapping.crm.pipeline] = toStringOrUndefined(formData.pipeline)
  }
  if (formData.pipelineStage !== undefined || formData.salesPipelineStage !== undefined) {
    payload[OpportunityFieldMapping.crm.pipelineStage] = toStringOrUndefined(
      formData.pipelineStage || formData.salesPipelineStage
    )
  }
  if (formData.opportunityStatus !== undefined) {
    payload.opportunityStatusRef = toStringOrUndefined(formData.opportunityStatus)
  }

  // FIXED: CRM-specific stage/status fields (was missing!)
  if (formData.stage !== undefined) {
    payload.stage = toStringOrUndefined(formData.stage)
  }
  if (formData.status !== undefined) {
    payload.status = toStringOrUndefined(formData.status)
  }
  if (formData.lastInteraction !== undefined) {
    payload.lastInteraction = toISOFormat(formData.lastInteraction)
  }

  // Type/classification
  if (formData.personal !== undefined) {
    payload.personal = formData.personal
  }

  // Relationships
  if (formData.accountId !== undefined || formData.account !== undefined) {
    payload.account = toStringOrUndefined(formData.accountId || formData.account)
  }
  if (formData.leadId !== undefined || formData.lead !== undefined) {
    payload.lead = toStringOrUndefined(formData.leadId || formData.lead)
  }

  // Ownership
  if (formData.owner !== undefined || formData.ownerEmployeeId !== undefined) {
    payload.ownerEmployee = toStringOrUndefined(formData.owner || formData.ownerEmployeeId)
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
  if (formData.express1 !== undefined && Object.keys(formData.express1 || {}).length > 0) {
    payload.express1 = formData.express1
  }
  if (formData.express2 !== undefined && Object.keys(formData.express2 || {}).length > 0) {
    payload.express2 = formData.express2
  }

  // Additional metadata
  if (formData.recordState !== undefined) {
    payload.recordState = formData.recordState
  }
  if (formData.processInstanceId !== undefined) {
    payload.processInstanceId = formData.processInstanceId
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

  // Contact associations - include opportunityContacts for updates
  if (options.isUpdate && formData.contactIds && formData.contactIds.length > 0) {
    payload.opportunityContacts = buildOpportunityContactAssociations(formData.contactIds, formData.id)
  }

  // Include id and version for updates
  if (options.isUpdate && formData.id) {
    payload.id = formData.id
    payload.version = formData.version || 0
  }

  return {
    customerOpportunity: payload
  }
}

/**
 * Build opportunity contacts array for CRM
 * Used in convert lead flow and form submissions
 *
 * @param contactIds - Array of contact IDs or contact objects with metadata
 * @param opportunityId - Opportunity ID (for associations)
 * @returns Array of opportunity contact association objects
 */
export const buildCustomerOpportunityContacts = (contactIds: string[] = [], opportunityId?: string): any[] => {
  return buildOpportunityContactAssociations(contactIds, opportunityId)
}
