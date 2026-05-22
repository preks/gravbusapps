/**
 * Common Investment Field Configuration
 * Shared field definitions for the investment table across all investment types
 */

import { TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

export const COMMON_INVESTMENT_FIELDS: TargetFieldDefinition[] = [
  // Identity
  { value: 'investment.name', label: 'Investment Name', type: 'direct', required: true },
  { value: 'investment.code', label: 'Investment Code', type: 'direct' },
  { value: 'investment.isin', label: 'ISIN', type: 'direct' },

  // Catalog References
  { value: 'investment.investmentGroupRef', label: 'Investment Group', type: 'catalog', catalog: 'InvestmentGroup' },
  { value: 'investment.investmentTypeRef', label: 'Investment Type', type: 'catalog', catalog: 'InvestmentType' },
  { value: 'investment.investmentPhaseRef', label: 'Investment Phase', type: 'catalog', catalog: 'InvestmentPhase' },
  {
    value: 'investment.investmentStatusRef',
    label: 'Investment Status',
    type: 'catalog',
    catalog: 'InvestmentStatus'
  },
  {
    value: 'investment.investmentStakeTypeRef',
    label: 'Stake Type',
    type: 'catalog',
    catalog: 'InvestmentStakeType'
  },
  {
    value: 'investment.investmentRiskLevelRef',
    label: 'Risk Level',
    type: 'catalog',
    catalog: 'InvestmentRiskLevel'
  },
  { value: 'investment.currencyRef', label: 'Currency', type: 'catalog', catalog: 'Currency' },

  // Financial Fields
  { value: 'investment.stakePercentage', label: 'Stake Percentage', type: 'direct' },
  { value: 'investment.initialInvestmentAmount', label: 'Initial Investment Amount', type: 'direct' },
  { value: 'investment.totalInvestmentAmount', label: 'Total Investment Amount', type: 'direct' },
  { value: 'investment.investmentMarketValue', label: 'Investment Market Value', type: 'direct' },
  { value: 'investment.debtFinancingAmount', label: 'Debt Financing Amount', type: 'direct' },
  { value: 'investment.requiredCapitalAmount', label: 'Required Capital Amount', type: 'direct' },
  { value: 'investment.forecastedRevenueAmount', label: 'Forecasted Revenue Amount', type: 'direct' },
  { value: 'investment.forecastedProfitAmount', label: 'Forecasted Profit Amount', type: 'direct' },

  // Dates
  { value: 'investment.acquisitionDate', label: 'Acquisition Date', type: 'direct' },
  { value: 'investment.planedExit', label: 'Planned Exit (Yes/No)', type: 'direct' },
  { value: 'investment.plannedExitDate', label: 'Planned Exit Date', type: 'direct' },
  { value: 'investment.exitDate', label: 'Exit Date', type: 'direct' },

  // Loan Information
  { value: 'investment.loanRecipientName', label: 'Loan Recipient Name', type: 'direct' },
  { value: 'investment.loanAmount', label: 'Loan Amount', type: 'direct' },
  { value: 'investment.loanOpenCommitmentAmount', label: 'Loan Open Commitment Amount', type: 'direct' },
  { value: 'investment.loanInterestRate', label: 'Loan Interest Rate', type: 'direct' },
  { value: 'investment.loanStartDate', label: 'Loan Start Date', type: 'direct' },
  { value: 'investment.loanEndDate', label: 'Loan End Date', type: 'direct' },
  { value: 'investment.loanInterestClaim', label: 'Loan Interest Claim', type: 'direct' },

  // Fund Information
  { value: 'investment.totalCommitmentAmount', label: 'Total Commitment Amount', type: 'direct' },
  { value: 'investment.totalDistributionAmount', label: 'Total Distribution Amount', type: 'direct' },
  { value: 'investment.fundManagerName', label: 'Fund Manager Name', type: 'direct' },

  // Performance Metrics
  { value: 'investment.irr', label: 'IRR (Internal Rate of Return)', type: 'direct' },
  { value: 'investment.moic', label: 'MOIC (Multiple on Invested Capital)', type: 'direct' },

  // Owner
  { value: 'investment.ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' },

  // Relationships
  { value: 'investment.investmentCompanyId', label: 'Investment Company ID', type: 'direct' },
  { value: 'investment.investmentAccountId', label: 'Investment Account ID', type: 'direct' }
]
