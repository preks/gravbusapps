/**
 * Investment Opportunity Payloads (IRM)
 * Payload generation for Opportunity entities in the Investment Relations Management module
 *
 * This module provides:
 * - InvestmentOpportunityFormData interface (extends BaseOpportunityFormData)
 * - buildInvestmentOpportunityPayload() function
 * - IRM-specific field handling (dealType, investmentName, opportunityPipelineRef)
 * - Contact association helpers
 *
 * Usage:
 * ```typescript
 * import { buildInvestmentOpportunityPayload } from '@/common/data/investment/payloads'
 *
 * const payload = buildInvestmentOpportunityPayload(formData, { isUpdate: true })
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
 * IRM-specific opportunity form data interface
 * Extends base interface with Investment module exclusive fields
 */
export interface InvestmentOpportunityFormData extends BaseOpportunityFormData {
  // IRM-exclusive fields
  dealType?: string // Deal type classification
  investmentName?: string // Investment name (separate from opportunity name)
  investmentId?: string // Investment association
  investment?: string // Alternative to investmentId
  description?: string // Opportunity description
  additionalProperties?: Record<string, any> // Custom properties (jsonb)
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
 * Build Investment Opportunity payload for IRM module
 *
 * Automatically handles:
 * - Field name mapping (pipeline → opportunityPipelineRef, etc.)
 * - Empty value exclusion
 * - ID/version for updates
 * - IRM-specific fields (dealType, investmentName)
 * - Contact associations
 *
 * @param formData - Opportunity form data (semantic field names)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 */
export const buildInvestmentOpportunityPayload = (
  formData: InvestmentOpportunityFormData,
  options: { isUpdate?: boolean } = {}
) => {
  const payload: any = {
    sourceApp: 'IRM'
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

  // IRM-specific pipeline field mappings
  if (formData.pipeline !== undefined) {
    payload[OpportunityFieldMapping.irm.pipeline] = toStringOrUndefined(formData.pipeline)
  }
  if (formData.pipelineStage !== undefined || formData.salesPipelineStage !== undefined) {
    payload[OpportunityFieldMapping.irm.pipelineStage] = toStringOrUndefined(
      formData.pipelineStage || formData.salesPipelineStage
    )
  }
  if (formData.opportunityStatus !== undefined) {
    payload.opportunityStatusRef = toStringOrUndefined(formData.opportunityStatus)
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

  // IRM-exclusive fields
  if (formData.dealType !== undefined) {
    payload.dealType = toStringOrUndefined(formData.dealType)
  }
  if (formData.investmentName !== undefined) {
    payload.investmentName = toStringOrUndefined(formData.investmentName)
  }
  if (formData.investmentId !== undefined || formData.investment !== undefined) {
    payload.investment = toStringOrUndefined(formData.investmentId || formData.investment)
  }
  if (formData.description !== undefined) {
    payload.description = toStringOrUndefined(formData.description)
  }
  if (formData.additionalProperties !== undefined && Object.keys(formData.additionalProperties).length > 0) {
    payload.additionalProperties = formData.additionalProperties
  }

  // FIXED: Investment financial fields (was missing!)
  if (formData.forecastedProfitAmount !== undefined) {
    payload.forecastedProfitAmount = toNumberOrUndefined(formData.forecastedProfitAmount)
  }
  if (formData.initialInvestmentAmount !== undefined) {
    payload.initialInvestmentAmount = toNumberOrUndefined(formData.initialInvestmentAmount)
  }
  if (formData.stakePercentage !== undefined) {
    payload.stakePercentage = toNumberOrUndefined(formData.stakePercentage)
  }
  if (formData.marketValue !== undefined) {
    payload.marketValue = toNumberOrUndefined(formData.marketValue)
  }
  if (formData.loanAmount !== undefined) {
    payload.loanAmount = toNumberOrUndefined(formData.loanAmount)
  }
  if (formData.loanInterestRate !== undefined) {
    payload.loanInterestRate = toNumberOrUndefined(formData.loanInterestRate)
  }
  if (formData.requiredCapitalAmount !== undefined) {
    payload.requiredCapitalAmount = toNumberOrUndefined(formData.requiredCapitalAmount)
  }
  if (formData.annualNetColdRent !== undefined) {
    payload.annualNetColdRent = toNumberOrUndefined(formData.annualNetColdRent)
  }

  // FIXED: Investment classification fields (was missing!)
  if (formData.investmentGroupRef !== undefined) {
    payload.investmentGroupRef = toStringOrUndefined(formData.investmentGroupRef)
  }
  if (formData.investmentTypeRef !== undefined) {
    payload.investmentTypeRef = toStringOrUndefined(formData.investmentTypeRef)
  }
  if (formData.investmentRoleRef !== undefined) {
    payload.investmentRoleRef = toStringOrUndefined(formData.investmentRoleRef)
  }
  if (formData.investmentStakeTypeRef !== undefined) {
    payload.investmentStakeTypeRef = toStringOrUndefined(formData.investmentStakeTypeRef)
  }

  // FIXED: Real estate specific fields (was missing!)
  if (formData.buildingYear !== undefined) {
    payload.buildingYear = toStringOrUndefined(formData.buildingYear)
  }
  if (formData.size !== undefined) {
    payload.size = toNumberOrUndefined(formData.size)
  }
  if (formData.sizeMeasurementUnitRef !== undefined || formData.measurementUnit !== undefined) {
    payload.sizeMeasurementUnitRef = toStringOrUndefined(formData.sizeMeasurementUnitRef || formData.measurementUnit)
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
    investmentOpportunity: payload
  }
}

/**
 * Build opportunity contacts array for IRM
 * Used in convert lead flow and form submissions
 *
 * @param contactIds - Array of contact IDs or contact objects with metadata
 * @param opportunityId - Opportunity ID (for associations)
 * @returns Array of opportunity contact association objects
 */
export const buildInvestmentOpportunityContacts = (contactIds: string[] = [], opportunityId?: string): any[] => {
  return buildOpportunityContactAssociations(contactIds, opportunityId)
}
