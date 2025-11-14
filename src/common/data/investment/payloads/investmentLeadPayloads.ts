/**
 * Investment Lead Payloads (IRM)
 * Payload generation for Lead entities in the Investment Relations Management module
 *
 * This module provides:
 * - InvestmentLeadFormData interface (extends BaseLeadFormData)
 * - buildInvestmentLeadPayload() function
 * - IRM-specific field handling (sensitive flag, position field)
 *
 * Usage:
 * ```typescript
 * import { buildInvestmentLeadPayload } from '@/common/data/investment/payloads'
 *
 * const payload = buildInvestmentLeadPayload(formData, { isUpdate: true })
 * dispatchProcessContinueEvent('pse_submit', payload)
 * ```
 */

import { BaseLeadFormData, LeadFieldMapping } from '@/common/data/relations/payloads'
import { toISOFormat } from '@/common/utils/dateFormatter'

/**
 * IRM-specific lead form data type
 * Uses base interface fields - IRM Lead doesn't have additional exclusive fields
 * All investment-specific fields are already defined in BaseLeadFormData
 */
export type InvestmentLeadFormData = BaseLeadFormData

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
 * Build Investment Lead payload for IRM module
 *
 * Automatically handles:
 * - Field name mapping (industry → industryClassRef, etc.)
 * - Empty value exclusion
 * - ID/version for updates
 * - IRM-specific fields (sensitive flag)
 * - Address line structure
 *
 * @param formData - Lead form data (semantic field names)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 */
export const buildInvestmentLeadPayload = (formData: InvestmentLeadFormData, options: { isUpdate?: boolean } = {}) => {
  const payload: any = {
    sourceApp: 'IRM'
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
    payload.salutationRef = toStringOrUndefined(formData.salutation)
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

  // Company information - IRM-specific field mappings
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

  // IRM-specific field mappings
  if (formData.industry !== undefined) {
    payload[LeadFieldMapping.irm.industry] = toStringOrUndefined(formData.industry)
  }
  if (formData.numberOfEmployees !== undefined || formData.companySize !== undefined) {
    payload[LeadFieldMapping.irm.companySize] = toStringOrUndefined(formData.numberOfEmployees || formData.companySize)
  }
  if (formData.annualRevenue !== undefined) {
    payload[LeadFieldMapping.irm.annualRevenue] = toStringOrUndefined(formData.annualRevenue)
  }

  // Address information
  if (formData.country !== undefined) {
    payload.countryRef = toStringOrUndefined(formData.country)
  }
  if (formData.region !== undefined) {
    payload.regionRef = toStringOrUndefined(formData.region)
  }
  if (formData.city !== undefined || formData.locality !== undefined) {
    payload.locality = toStringOrUndefined(formData.city || formData.locality)
  }
  if (formData.postalCode !== undefined) {
    payload.postalCode = toStringOrUndefined(formData.postalCode)
  }

  // Address line structure (IRM format)
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

  // Conversion tracking
  if (formData.conversionDate !== undefined) {
    payload.conversionDate = toISOFormat(formData.conversionDate)
  }

  // Investment-specific fields (IRM only)
  if (formData.investmentName !== undefined) {
    payload.investmentName = toStringOrUndefined(formData.investmentName)
  }
  if (formData.investmentGroup !== undefined || formData.investmentGroupRef !== undefined) {
    payload.investmentGroupRef = toStringOrUndefined(formData.investmentGroup || formData.investmentGroupRef)
  }
  if (formData.investmentType !== undefined || formData.investmentTypeRef !== undefined) {
    payload.investmentTypeRef = toStringOrUndefined(formData.investmentType || formData.investmentTypeRef)
  }
  if (formData.investmentRole !== undefined || formData.investmentRoleRef !== undefined) {
    payload.investmentRoleRef = toStringOrUndefined(formData.investmentRole || formData.investmentRoleRef)
  }
  if (formData.investmentStakeType !== undefined || formData.investmentStakeTypeRef !== undefined) {
    payload.investmentStakeTypeRef = toStringOrUndefined(
      formData.investmentStakeType || formData.investmentStakeTypeRef
    )
  }

  // Numeric investment fields
  if (formData.stakePercentage !== undefined) {
    const val =
      typeof formData.stakePercentage === 'string' ? parseFloat(formData.stakePercentage) : formData.stakePercentage
    payload.stakePercentage = !isNaN(val as number) ? val : undefined
  }
  if (formData.marketValue !== undefined) {
    const val = typeof formData.marketValue === 'string' ? parseFloat(formData.marketValue) : formData.marketValue
    payload.marketValue = !isNaN(val as number) ? val : undefined
  }
  if (formData.initialInvestmentAmount !== undefined) {
    const val =
      typeof formData.initialInvestmentAmount === 'string'
        ? parseFloat(formData.initialInvestmentAmount)
        : formData.initialInvestmentAmount
    payload.initialInvestmentAmount = !isNaN(val as number) ? val : undefined
  }
  if (formData.loanAmount !== undefined) {
    const val = typeof formData.loanAmount === 'string' ? parseFloat(formData.loanAmount) : formData.loanAmount
    payload.loanAmount = !isNaN(val as number) ? val : undefined
  }
  if (formData.loanInterestRate !== undefined) {
    const val =
      typeof formData.loanInterestRate === 'string' ? parseFloat(formData.loanInterestRate) : formData.loanInterestRate
    payload.loanInterestRate = !isNaN(val as number) ? val : undefined
  }
  if (formData.requiredCapitalAmount !== undefined) {
    const val =
      typeof formData.requiredCapitalAmount === 'string'
        ? parseFloat(formData.requiredCapitalAmount)
        : formData.requiredCapitalAmount
    payload.requiredCapitalAmount = !isNaN(val as number) ? val : undefined
  }
  if (formData.forecastedProfitAmount !== undefined) {
    const val =
      typeof formData.forecastedProfitAmount === 'string'
        ? parseFloat(formData.forecastedProfitAmount)
        : formData.forecastedProfitAmount
    payload.forecastedProfitAmount = !isNaN(val as number) ? val : undefined
  }
  if (formData.annualNetColdRent !== undefined) {
    const val =
      typeof formData.annualNetColdRent === 'string'
        ? parseFloat(formData.annualNetColdRent)
        : formData.annualNetColdRent
    payload.annualNetColdRent = !isNaN(val as number) ? val : undefined
  }

  // Real Estate specific fields
  if (formData.buildingYear !== undefined) {
    const val = typeof formData.buildingYear === 'string' ? parseInt(formData.buildingYear) : formData.buildingYear
    payload.buildingYear = !isNaN(val as number) ? val : undefined
  }
  if (formData.size !== undefined) {
    const val = typeof formData.size === 'string' ? parseFloat(formData.size) : formData.size
    payload.size = !isNaN(val as number) ? val : undefined
  }
  if (formData.measurementUnit !== undefined || formData.sizeMeasurementUnitRef !== undefined) {
    payload.sizeMeasurementUnitRef = toStringOrUndefined(formData.measurementUnit || formData.sizeMeasurementUnitRef)
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
  if (formData.tags !== undefined && formData.tags.length > 0) {
    payload.tags = formData.tags
  }

  // Include id and version for updates
  if (options.isUpdate && formData.id) {
    payload.id = formData.id
    payload.version = formData.version || 0
  }

  return {
    investmentLead: payload
  }
}
