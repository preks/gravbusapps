// Investment Mappers - Transform base types to enhanced types with computed fields

import {
  BaseInvestment,
  Investment,
  BaseEquityInvestment,
  EquityInvestment,
  BaseRealEstateInvestment,
  RealEstateInvestment,
  BaseLiquidFundInvestment,
  LiquidFundInvestment
} from '../types/investmentTypes'

/**
 * Transform BaseInvestment (GraphQL response) to Investment (enhanced with computed fields)
 */
export function toInvestment(base: BaseInvestment): Investment {
  // Extract labels from catalog entries (only using fields that exist in BaseInvestment)
  const investmentGroupLabel = base.investmentGroup?.value || base.investmentGroup?.code
  const investmentTypeLabel = base.investmentType?.value || base.investmentType?.code
  const investmentStatusLabel = base.investmentStatus?.value || base.investmentStatus?.code
  const currencyLabel = base.currency?.value || base.currency?.code

  // Employee label
  const ownerDisplayName =
    base.ownerEmployee?.displayName ||
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim()

  // Create computed display name
  const displayName = base.name || base.code || `Investment ${base.id}`

  return {
    ...base,

    // Only include fields defined in Investment interface
    displayName,
    investmentGroupLabel,
    investmentTypeLabel,
    investmentStatusLabel,
    currencyLabel,
    ownerDisplayName
  }
}

/**
 * Transform BaseEquityInvestment to EquityInvestment (enhanced with computed fields)
 */
export function toEquityInvestment(base: BaseEquityInvestment): EquityInvestment {
  // Basic enhancement
  const displayName = base.investment?.name || `Equity Investment ${base.id}`

  return {
    ...base,
    displayName
  }
}

/**
 * Transform BaseRealEstateInvestment to RealEstateInvestment (enhanced with computed fields)
 */
export function toRealEstateInvestment(base: BaseRealEstateInvestment): RealEstateInvestment {
  const displayName = base.investment?.name || `Real Estate Investment ${base.id}`

  // Location labels (using fields that exist in BaseRealEstateInvestment)
  const countryLabel = base.country?.value || base.country?.code
  const regionLabel = base.region?.value || base.region?.code

  return {
    ...base,
    displayName,
    countryLabel,
    regionLabel
  }
}

/**
 * Transform BaseLiquidFundInvestment to LiquidFundInvestment (enhanced with computed fields)
 */
export function toLiquidFundInvestment(base: BaseLiquidFundInvestment): LiquidFundInvestment {
  const displayName = base.investment?.name || `Liquid Fund Investment ${base.id}`

  // Fund type and payment frequency labels
  const investmentLiquidFundTypeLabel = base.investmentLiquidFundType?.value || base.investmentLiquidFundType?.code
  const interestPaymentFrequencyLabel = base.interestPaymentFrequency?.value || base.interestPaymentFrequency?.code

  return {
    ...base,
    displayName,
    investmentLiquidFundTypeLabel,
    interestPaymentFrequencyLabel
  }
}

// Note: Enhanced mapper removed - use base toLiquidFundInvestment instead

/**
 * Transform array of liquid fund investments
 */
export function toLiquidFundInvestments(baseLiquidFunds: BaseLiquidFundInvestment[]): LiquidFundInvestment[] {
  return baseLiquidFunds.map(toLiquidFundInvestment)
}

// Note: Enhanced array mapper removed - use base toLiquidFundInvestments instead
