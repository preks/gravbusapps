/**
 * Liquid Fund Investment Import Configuration
 * Combines common investment fields with liquid fund base fields and additional properties
 */

import { TargetFieldDefinition, ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { COMMON_INVESTMENT_FIELDS } from '../../../config/commonInvestmentFields'

export const LIQUID_FUND_BASE_FIELDS: TargetFieldDefinition[] = [
  {
    value: 'liquidFundInvestment.investmentLiquidFundTypeRef',
    label: 'Liquid Fund Type',
    type: 'catalog',
    catalog: 'InvestmentLiquidFundType'
  },
  { value: 'liquidFundInvestment.proprietorName', label: 'Proprietor Name', type: 'direct' },
  { value: 'liquidFundInvestment.bankName', label: 'Bank Name', type: 'direct' },
  { value: 'liquidFundInvestment.bankAccountNumber', label: 'Bank Account Number', type: 'direct' },
  { value: 'liquidFundInvestment.earlyTerminationAllowed', label: 'Early Termination Allowed', type: 'direct' },
  { value: 'liquidFundInvestment.interestRate', label: 'Interest Rate', type: 'direct' },
  {
    value: 'liquidFundInvestment.interestPaymentFrequencyRef',
    label: 'Interest Payment Frequency',
    type: 'catalog',
    catalog: 'InterestPaymentFrequency'
  },
  { value: 'liquidFundInvestment.maturityDate', label: 'Maturity Date', type: 'direct' }
]

export const LIQUID_FUND_ADDITIONAL_PROPERTIES_FIELDS: TargetFieldDefinition[] = [
  // Text fields
  { value: 'liquidFundInvestment.additionalProperties.name', label: 'Additional: Name', type: 'direct' },
  { value: 'liquidFundInvestment.additionalProperties.proprietor', label: 'Additional: Proprietor', type: 'direct' },
  { value: 'liquidFundInvestment.additionalProperties.bank', label: 'Additional: Bank', type: 'direct' },
  { value: 'liquidFundInvestment.additionalProperties.isin', label: 'Additional: ISIN', type: 'direct' },
  { value: 'liquidFundInvestment.additionalProperties.currency', label: 'Additional: Currency', type: 'direct' },

  // Date field
  {
    value: 'liquidFundInvestment.additionalProperties.maturityDate',
    label: 'Additional: Maturity Date',
    type: 'direct'
  },

  // Numeric fields (amounts and percentages)
  {
    value: 'liquidFundInvestment.additionalProperties.interestRate',
    label: 'Additional: Interest Rate',
    type: 'direct'
  },
  { value: 'liquidFundInvestment.additionalProperties.quantity', label: 'Additional: Quantity', type: 'direct' },
  {
    value: 'liquidFundInvestment.additionalProperties.openingBalance',
    label: 'Additional: Opening Balance',
    type: 'direct'
  },
  { value: 'liquidFundInvestment.additionalProperties.incoming', label: 'Additional: Incoming', type: 'direct' },
  { value: 'liquidFundInvestment.additionalProperties.outgoing', label: 'Additional: Outgoing', type: 'direct' },
  { value: 'liquidFundInvestment.additionalProperties.netIncome', label: 'Additional: Net Income', type: 'direct' },
  {
    value: 'liquidFundInvestment.additionalProperties.incomeInterest',
    label: 'Additional: Income (Interest)',
    type: 'direct'
  },
  {
    value: 'liquidFundInvestment.additionalProperties.realizedGainsLosses',
    label: 'Additional: Realized Gains/Losses',
    type: 'direct'
  },
  {
    value: 'liquidFundInvestment.additionalProperties.unrealizedGainsLosses',
    label: 'Additional: Unrealized Gains/Losses',
    type: 'direct'
  },
  {
    value: 'liquidFundInvestment.additionalProperties.realizedGainsLossesCurrency',
    label: 'Additional: Realized Gains/Losses Currency',
    type: 'direct'
  },
  {
    value: 'liquidFundInvestment.additionalProperties.unrealizedGainsLossesCurrency',
    label: 'Additional: Unrealized Gains/Losses Currency',
    type: 'direct'
  },
  {
    value: 'liquidFundInvestment.additionalProperties.realizedGainsLossesSharePrice',
    label: 'Additional: Realized Gains/Losses Share Price',
    type: 'direct'
  },
  {
    value: 'liquidFundInvestment.additionalProperties.unrealizedGainsLossesSharePrice',
    label: 'Additional: Unrealized Gains/Losses Share Price',
    type: 'direct'
  },
  {
    value: 'liquidFundInvestment.additionalProperties.timeWeightedPerformance',
    label: 'Additional: Time-Weighted Performance',
    type: 'direct'
  }
]

export const liquidFundInvestmentTargetFields: TargetFieldDefinition[] = [
  ...COMMON_INVESTMENT_FIELDS,
  ...LIQUID_FUND_BASE_FIELDS,
  ...LIQUID_FUND_ADDITIONAL_PROPERTIES_FIELDS
]

export const liquidFundInvestmentImportConfig: ImportConfig = {
  entityType: 'liquid-fund-investment',
  domain: 'investment',
  aiAgentName: 'LiquidFundInvestmentImportAnalyzer',
  targetFields: liquidFundInvestmentTargetFields,
  requiredCatalogs: [
    'InvestmentGroup',
    'InvestmentType',
    'InvestmentPhase',
    'InvestmentStatus',
    'InvestmentStakeType',
    'InvestmentRiskLevel',
    'Currency',
    'InvestmentLiquidFundType',
    'InterestPaymentFrequency'
  ]
}
