// Enhanced types that extend base types and add computed fields for core investment entities

import {
  BaseInvestment,
  BaseEquityInvestment,
  BaseRealEstateInvestment,
  BaseLiquidFundInvestment,
  BaseInvestmentRole,
  BaseInvestmentReport,
  BaseInvestmentRoleReport,
  BaseInvestmentTransaction,
  BaseEquityInvestmentReport,
  BaseEquityInvestmentRound,
  BaseRealEstateInvestmentRentalUnit,
  BaseRealEstateInvestmentReport,
  BaseRealEstateInvestmentRentalUnitReport,
  BaseLiquidFundInvestmentReport
} from './investmentBaseTypes'

// Enhanced Investment type with computed fields
export interface Investment extends BaseInvestment {
  // Computed display fields only
  displayName: string
  investmentGroupLabel?: string
  investmentTypeLabel?: string
  investmentStatusLabel?: string
  currencyLabel?: string
  ownerDisplayName?: string
}

// Enhanced Equity Investment type with computed fields
export interface EquityInvestment extends BaseEquityInvestment {
  // Computed display fields only
  displayName: string
}

// Enhanced Real Estate Investment type with computed fields
export interface RealEstateInvestment extends BaseRealEstateInvestment {
  // Computed display fields only
  displayName: string
  countryLabel?: string
  regionLabel?: string
}

// Enhanced Liquid Fund Investment type with computed fields
export interface LiquidFundInvestment extends BaseLiquidFundInvestment {
  // Computed display fields only
  displayName: string
  investmentLiquidFundTypeLabel?: string
  interestPaymentFrequencyLabel?: string
}

// Note: Enhanced interfaces have been removed in favor of utility functions
// Use liquidFundUtils for computed properties instead

// Enhanced Investment Role type with computed fields
export interface InvestmentRole extends BaseInvestmentRole {
  // Computed display fields only
  displayName: string
  investmentRoleLabel?: string
}

// Enhanced Investment Report type with computed fields
export interface InvestmentReport extends BaseInvestmentReport {
  // Computed display fields only
  displayName: string
  scopeLabel?: string
  investmentStatusLabel?: string
  currencyLabel?: string

  id: string
  // Add specific fields as needed from GraphQL schema
  reportType?: string
  reportDate?: string
  content?: any

  // Entity references
  investment?: any // Investment
  investmentId?: string
}

// Enhanced Investment Role Report type with computed fields
export interface InvestmentRoleReport extends BaseInvestmentRoleReport {
  // Computed display fields only
  displayName: string
  investmentRoleLabel?: string
}

// Enhanced Investment Transaction type with computed fields
export interface InvestmentTransaction extends BaseInvestmentTransaction {
  // Computed display fields only
  displayName: string
  investmentTransactionTypeLabel?: string
  currencyLabel?: string
  amountFormatted?: string
}

// Enhanced Equity Investment Report type with computed fields
export interface EquityInvestmentReport extends BaseEquityInvestmentReport {
  // Computed display fields only
  displayName: string
  scopeLabel?: string
}

// Enhanced Equity Investment Round type with computed fields
export interface EquityInvestmentRound extends BaseEquityInvestmentRound {
  // Computed display fields only
  displayName: string
  currencyLabel?: string
}

// Enhanced Real Estate Investment Rental Unit type with computed fields
export interface RealEstateInvestmentRentalUnit extends BaseRealEstateInvestmentRentalUnit {
  // Computed display fields only
  displayName: string
  investmentRentalUnitTypeLabel?: string
}

// Enhanced Real Estate Investment Report type with computed fields
export interface RealEstateInvestmentReport extends BaseRealEstateInvestmentReport {
  // Computed display fields only
  displayName: string
  scopeLabel?: string
  sizeMeasurementUnitLabel?: string
}

// Enhanced Real Estate Investment Rental Unit Report type with computed fields
export interface RealEstateInvestmentRentalUnitReport extends BaseRealEstateInvestmentRentalUnitReport {
  // Computed display fields only
  displayName: string
  investmentRentalUnitTypeLabel?: string
}

// Enhanced Liquid Fund Investment Report type with computed fields
export interface LiquidFundInvestmentReport extends BaseLiquidFundInvestmentReport {
  // Computed display fields only
  displayName: string
  scopeLabel?: string
  investmentLiquidFundTypeLabel?: string
  interestPaymentFrequencyLabel?: string
}

// Re-export base types for convenience
export type {
  BaseInvestment,
  BaseEquityInvestment,
  BaseRealEstateInvestment,
  BaseLiquidFundInvestment,
  BaseInvestmentRole,
  BaseInvestmentReport,
  BaseInvestmentRoleReport,
  BaseInvestmentTransaction,
  BaseEquityInvestmentReport,
  BaseEquityInvestmentRound,
  BaseRealEstateInvestmentRentalUnit,
  BaseRealEstateInvestmentReport,
  BaseRealEstateInvestmentRentalUnitReport,
  BaseLiquidFundInvestmentReport
}
