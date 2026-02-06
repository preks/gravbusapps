/**
 * Common Investment Import Types
 * Shared type definitions for investment imports across all investment types
 */

/**
 * Common Investment Data Structure
 * Represents the investment table fields used in CSV imports
 * Uses string references (Refs) instead of full catalog objects
 */
export interface CommonInvestmentImportData {
  // Identity
  name: string
  code?: string
  isin?: string

  // Catalog References (string refs, not full objects)
  investmentGroupRef?: string
  investmentTypeRef?: string
  investmentPhaseRef?: string
  investmentStatusRef?: string
  investmentStakeTypeRef?: string
  investmentRiskLevelRef?: string
  currencyRef?: string

  // Financial Fields
  stakePercentage?: number
  initialInvestmentAmount?: number
  totalInvestmentAmount?: number
  investmentMarketValue?: number
  debtFinancingAmount?: number
  requiredCapitalAmount?: number
  forecastedRevenueAmount?: number
  forecastedProfitAmount?: number

  // Dates
  acquisitionDate?: string
  planedExit?: string | boolean
  plannedExitDate?: string
  exitDate?: string

  // Loan Information
  loanRecipientName?: string
  loanAmount?: number
  loanOpenCommitmentAmount?: number
  loanInterestRate?: number
  loanStartDate?: string
  loanEndDate?: string
  loanInterestClaim?: number

  // Fund Information
  totalCommitmentAmount?: number
  totalDistributionAmount?: number
  fundManagerName?: string

  // Performance Metrics
  irr?: number
  moic?: number

  // Relationships
  ownerEmployeeId?: string
  investmentAccountId?: string
}
