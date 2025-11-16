// Investment Report Mappers - Transform base types to enhanced types with computed fields

import {
  BaseInvestmentReport,
  InvestmentReport,
  BaseInvestmentTransaction,
  InvestmentTransaction,
  BaseEquityInvestmentReport,
  EquityInvestmentReport,
  BaseEquityInvestmentRound,
  EquityInvestmentRound,
  BaseRealEstateInvestmentReport,
  RealEstateInvestmentReport,
  BaseRealEstateInvestmentRentalUnit,
  RealEstateInvestmentRentalUnit,
  BaseLiquidFundInvestmentReport,
  LiquidFundInvestmentReport,
  BaseInvestmentRoleReport,
  InvestmentRoleReport
} from '../types/investmentTypes'

/**
 * Transform BaseInvestmentReport (GraphQL response) to InvestmentReport (enhanced with computed fields)
 */
export function toInvestmentReport(base: BaseInvestmentReport): InvestmentReport {
  // Extract labels from catalog entries
  const currencyLabel = base.currency?.value || base.currency?.code
  const investmentStatusLabel = base.investmentStatus?.value || base.investmentStatus?.code

  // Create scope label
  const scopeLabel = base.scope || 'Unknown'

  // Investment relationship
  const investmentDisplayName = base.investment?.name || base.investment?.code

  // Create computed display name
  const displayName = `${investmentDisplayName || 'Investment'} - ${scopeLabel} Report (${base.date})`

  // Transform nested specific report relationships using their respective mappers
  const equityInvestmentReport = base.equityInvestmentReport?.map(report => toEquityInvestmentReport(report))
  const liquidFundInvestmentReport = base.liquidFundInvestmentReport?.map(report =>
    toLiquidFundInvestmentReport(report)
  )
  const realEstateInvestmentReport = base.realEstateInvestmentReport?.map(report =>
    toRealEstateInvestmentReport(report)
  )
  const investmentRoleReport = base.investmentRoleReport?.map(report => toInvestmentRoleReport(report))

  return {
    ...base,

    // Include enhanced nested reports
    equityInvestmentReport,
    liquidFundInvestmentReport,
    realEstateInvestmentReport,
    investmentRoleReport,

    // Only include fields defined in InvestmentReport interface
    displayName,
    scopeLabel,
    investmentStatusLabel,
    currencyLabel
  }
}

/**
 * Transform BaseInvestmentTransaction (GraphQL response) to InvestmentTransaction (enhanced with computed fields)
 */
export function toInvestmentTransaction(base: BaseInvestmentTransaction): InvestmentTransaction {
  // Extract labels from catalog entries
  const investmentTransactionTypeLabel = base.investmentTransactionType?.value || base.investmentTransactionType?.code
  const currencyLabel = base.currency?.value || base.currency?.code

  // Investment relationship
  const investmentDisplayName = base.investment?.name || base.investment?.code

  // Create computed display name
  const displayName = `${investmentTransactionTypeLabel || 'Transaction'} - ${investmentDisplayName || 'Investment'} (${base.date})`

  // Format amount
  const amount = base.amount || 0
  const amountFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyLabel?.split(':').pop() || 'EUR'
  }).format(amount)

  return {
    ...base,

    // Only include fields defined in InvestmentTransaction interface
    displayName,
    investmentTransactionTypeLabel,
    currencyLabel,
    amountFormatted
  }
}

/**
 * Transform BaseEquityInvestmentReport to EquityInvestmentReport (enhanced with computed fields)
 */
export function toEquityInvestmentReport(base: BaseEquityInvestmentReport): EquityInvestmentReport {
  const displayName = `Equity Report - ${base.scope} (${base.date})`
  const scopeLabel = base.scope || 'Unknown'

  return {
    ...base,
    displayName,
    scopeLabel
  }
}

/**
 * Transform BaseEquityInvestmentRound to EquityInvestmentRound (enhanced with computed fields)
 */
export function toEquityInvestmentRound(base: BaseEquityInvestmentRound): EquityInvestmentRound {
  const displayName = base.name || `Investment Round ${base.id}`
  const currencyLabel = base.currency?.value || base.currency?.code

  return {
    ...base,
    displayName,
    currencyLabel
  }
}

/**
 * Transform BaseRealEstateInvestmentReport to RealEstateInvestmentReport (enhanced with computed fields)
 */
export function toRealEstateInvestmentReport(base: BaseRealEstateInvestmentReport): RealEstateInvestmentReport {
  const displayName = `Real Estate Report - ${base.scope} (${base.date})`
  const scopeLabel = base.scope || 'Unknown'
  const sizeMeasurementUnitLabel = base.sizeMeasurementUnit?.value || base.sizeMeasurementUnit?.code

  return {
    ...base,
    displayName,
    scopeLabel,
    sizeMeasurementUnitLabel
  }
}

/**
 * Transform BaseRealEstateInvestmentRentalUnit to RealEstateInvestmentRentalUnit (enhanced with computed fields)
 */
export function toRealEstateInvestmentRentalUnit(
  base: BaseRealEstateInvestmentRentalUnit
): RealEstateInvestmentRentalUnit {
  const displayName = `Rental Unit ${base.id}`
  const investmentRentalUnitTypeLabel = base.investmentRentalUnitType?.value || base.investmentRentalUnitType?.code

  return {
    ...base,
    displayName,
    investmentRentalUnitTypeLabel
  }
}

/**
 * Transform BaseLiquidFundInvestmentReport to LiquidFundInvestmentReport (enhanced with computed fields)
 */
export function toLiquidFundInvestmentReport(base: BaseLiquidFundInvestmentReport): LiquidFundInvestmentReport {
  const displayName = `Liquid Fund Report - ${base.scope} (${base.date})`
  const scopeLabel = base.scope || 'Unknown'
  const investmentLiquidFundTypeLabel = base.investmentLiquidFundType?.value || base.investmentLiquidFundType?.code
  const interestPaymentFrequencyLabel = base.interestPaymentFrequency?.value || base.interestPaymentFrequency?.code

  return {
    ...base,
    displayName,
    scopeLabel,
    investmentLiquidFundTypeLabel,
    interestPaymentFrequencyLabel
  }
}

/**
 * Transform BaseInvestmentRoleReport to InvestmentRoleReport (enhanced with computed fields)
 */
export function toInvestmentRoleReport(base: BaseInvestmentRoleReport): InvestmentRoleReport {
  const displayName = `Role Report ${base.displayOrder || base.id}`
  const investmentRoleLabel = base.investmentRole?.value || base.investmentRole?.code

  return {
    ...base,
    displayName,
    investmentRoleLabel
  }
}
