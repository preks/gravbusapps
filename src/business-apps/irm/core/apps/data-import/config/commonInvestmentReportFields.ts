import { TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

const COMMON_REPORT_FIELDS: TargetFieldDefinition[] = [
  { value: 'investmentId', label: 'Investment', type: 'direct', required: true },
  { value: 'date', label: 'Report Date', type: 'direct', required: true },
  { value: 'scope', label: 'Report Scope', type: 'direct' },
  { value: 'investmentStakeTypeRef', label: 'Investment Stake Type', type: 'catalog', catalog: 'InvestmentStakeType' },
  { value: 'investmentPhaseRef', label: 'Investment Phase', type: 'catalog', catalog: 'InvestmentPhase' },
  { value: 'investmentStatusRef', label: 'Investment Status', type: 'catalog', catalog: 'InvestmentStatus' },
  { value: 'investmentRiskLevelRef', label: 'Investment Risk Level', type: 'catalog', catalog: 'InvestmentRiskLevel' },
  { value: 'currencyRef', label: 'Currency', type: 'catalog', catalog: 'Currency' },
  { value: 'plannedExitDate', label: 'Planned Exit Date', type: 'direct' },
  { value: 'initialInvestmentAmount', label: 'Initial Investment Amount', type: 'direct' },
  { value: 'totalInvestmentAmount', label: 'Total Investment Amount', type: 'direct' },
  { value: 'investmentMarketValue', label: 'Investment Market Value', type: 'direct' },
  { value: 'debtFinancingAmount', label: 'Debt Financing Amount', type: 'direct' },
  { value: 'requiredCapitalAmount', label: 'Required Capital Amount', type: 'direct' },
  { value: 'forecastedRevenueAmount', label: 'Forecasted Revenue Amount', type: 'direct' },
  { value: 'forecastedProfitAmount', label: 'Forecasted Profit Amount', type: 'direct' },
  { value: 'stakePercentage', label: 'Stake Percentage', type: 'direct' },
  { value: 'securityQuantity', label: 'Security Quantity', type: 'direct' },
  { value: 'timeWeightedPerformance', label: 'Time Weighted Performance', type: 'direct' },
  { value: 'loanRecipientName', label: 'Loan Recipient Name', type: 'direct' },
  { value: 'loanAmount', label: 'Loan Amount', type: 'direct' },
  { value: 'loanOpenCommitmentAmount', label: 'Loan Open Commitment Amount', type: 'direct' },
  { value: 'loanInterestRate', label: 'Loan Interest Rate', type: 'direct' },
  { value: 'loanStartDate', label: 'Loan Start Date', type: 'direct' },
  { value: 'loanEndDate', label: 'Loan End Date', type: 'direct' },
  { value: 'loanInterestClaim', label: 'Loan Interest Claim', type: 'direct' },
  { value: 'totalCommitmentAmount', label: 'Total Commitment Amount', type: 'direct' },
  { value: 'totalDistributionAmount', label: 'Total Distribution Amount', type: 'direct' },
  { value: 'fundManagerName', label: 'Fund Manager Name', type: 'direct' },
  { value: 'forecast', label: 'Forecast', type: 'direct' },
  { value: 'moic', label: 'MOIC', type: 'direct' },
  { value: 'irr', label: 'IRR', type: 'direct' }
]

const EQUITY_REPORT_FIELDS: TargetFieldDefinition[] = [
  { value: 'equityInvestmentReport.marketValue', label: 'Equity Market Value', type: 'direct' },
  { value: 'equityInvestmentReport.turnoverAmount', label: 'Turnover Amount', type: 'direct' },
  { value: 'equityInvestmentReport.ebitdaAmount', label: 'EBITDA Amount', type: 'direct' }
]

const REAL_ESTATE_REPORT_FIELDS: TargetFieldDefinition[] = [
  { value: 'realEstateInvestmentReport.size', label: 'Size', type: 'direct' },
  {
    value: 'realEstateInvestmentReport.sizeMeasurementUnitRef',
    label: 'Size Measurement Unit',
    type: 'catalog',
    catalog: 'SizeMeasurementUnit'
  },
  { value: 'realEstateInvestmentReport.numberOfUnits', label: 'Number of Units', type: 'direct' },
  { value: 'realEstateInvestmentReport.occupancyPercent', label: 'Occupancy Percent', type: 'direct' },
  { value: 'realEstateInvestmentReport.annualNetColdRent', label: 'Annual Net Cold Rent', type: 'direct' },
  { value: 'realEstateInvestmentReport.funding', label: 'Funding', type: 'direct' },
  { value: 'realEstateInvestmentReport.actualAnnualExpenses', label: 'Actual Annual Expenses', type: 'direct' },
  { value: 'realEstateInvestmentReport.targetAnnualExpenses', label: 'Target Annual Expenses', type: 'direct' },
  { value: 'realEstateInvestmentReport.liquidityForecast', label: 'Liquidity Forecast', type: 'direct' }
]

const LIQUID_FUND_REPORT_FIELDS: TargetFieldDefinition[] = [
  {
    value: 'liquidFundInvestmentReport.investmentLiquidFundTypeRef',
    label: 'Liquid Fund Type',
    type: 'catalog',
    catalog: 'InvestmentLiquidFundType'
  },
  { value: 'liquidFundInvestmentReport.proprietorName', label: 'Proprietor Name', type: 'direct' },
  { value: 'liquidFundInvestmentReport.bankName', label: 'Bank Name', type: 'direct' },
  { value: 'liquidFundInvestmentReport.bankAccountNumber', label: 'Bank Account Number', type: 'direct' },
  { value: 'liquidFundInvestmentReport.earlyTerminationAllowed', label: 'Early Termination Allowed', type: 'direct' },
  { value: 'liquidFundInvestmentReport.interestRate', label: 'Interest Rate', type: 'direct' },
  {
    value: 'liquidFundInvestmentReport.interestPaymentFrequencyRef',
    label: 'Interest Payment Frequency',
    type: 'catalog',
    catalog: 'InterestPaymentFrequency'
  },
  { value: 'liquidFundInvestmentReport.maturityDate', label: 'Maturity Date', type: 'direct' }
]

export const COMMON_INVESTMENT_REPORT_FIELDS: TargetFieldDefinition[] = COMMON_REPORT_FIELDS

export const EQUITY_INVESTMENT_REPORT_FIELDS: TargetFieldDefinition[] = [
  ...COMMON_REPORT_FIELDS,
  ...EQUITY_REPORT_FIELDS
]

export const REAL_ESTATE_INVESTMENT_REPORT_FIELDS: TargetFieldDefinition[] = [
  ...COMMON_REPORT_FIELDS,
  ...REAL_ESTATE_REPORT_FIELDS
]

export const LIQUID_FUND_INVESTMENT_REPORT_FIELDS: TargetFieldDefinition[] = [
  ...COMMON_REPORT_FIELDS,
  ...LIQUID_FUND_REPORT_FIELDS
]
