// Investment Lead Mappers - Transform base type to enhanced type with computed fields

import { BaseInvestmentLead, InvestmentLead } from '../types'

/**
 * Transform BaseInvestmentLead (GraphQL response) to InvestmentLead (enhanced with computed fields)
 */
export function toInvestmentLead(base: BaseInvestmentLead): InvestmentLead {
  // Extract labels from catalog entries (only using fields that exist in BaseInvestmentLead)
  const salutationLabel = base.salutation?.value || base.salutation?.code
  const academicTitleLabel = base.academicTitle?.value || base.academicTitle?.code
  const legalFormLabel = base.legalForm?.value || base.legalForm?.code
  const companySizeLabel = base.companySize?.value || base.companySize?.code
  const industryClassLabel = base.industryClass?.value || base.industryClass?.code
  const accountAnnualRevenueBandLabel = base.accountAnnualRevenueBand?.value || base.accountAnnualRevenueBand?.code
  const countryLabel = base.country?.value || base.country?.code
  const regionLabel = base.region?.value || base.region?.code
  const timeZoneLabel = base.timeZone?.value || base.timeZone?.code
  const leadRatingLabel = base.leadRating?.value || base.leadRating?.code
  const leadStatusLabel = base.leadStatus?.value || base.leadStatus?.code
  const leadSourceLabel = base.leadSource?.value || base.leadSource?.code

  // Investment-related labels
  const investmentGroupLabel = base.investmentGroup?.value || base.investmentGroup?.code
  const investmentTypeLabel = base.investmentType?.value || base.investmentType?.code
  const investmentRoleLabel = base.investmentRole?.value || base.investmentRole?.code
  const investmentStakeTypeLabel = base.investmentStakeType?.value || base.investmentStakeType?.code

  // Employee label
  const ownerDisplayName =
    base.ownerEmployee?.displayName ||
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim()

  // Create computed fields (only using fields that exist in BaseInvestmentLead)
  const fullName = [salutationLabel, academicTitleLabel, base.firstName, base.lastName].filter(Boolean).join(' ').trim()

  const companyName = base.companyName || ''
  const displayName = fullName || companyName || base.email || `Lead ${base.id}`

  return {
    ...base,

    // Only include fields defined in InvestmentLead interface
    displayName,
    fullName,
    salutationLabel,
    academicTitleLabel,
    legalFormLabel,
    companySizeLabel,
    industryClassLabel,
    accountAnnualRevenueBandLabel,
    countryLabel,
    regionLabel,
    timeZoneLabel,
    leadRatingLabel,
    leadStatusLabel,
    leadSourceLabel,
    investmentGroupLabel,
    investmentTypeLabel,
    investmentRoleLabel,
    investmentStakeTypeLabel,
    ownerDisplayName
  }
}
