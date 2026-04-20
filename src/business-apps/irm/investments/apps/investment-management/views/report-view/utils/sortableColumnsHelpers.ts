/**
 * Sortable column definitions for investment reports
 * These define which columns can be sorted in the DataTable component
 */

/**
 * Base sortable columns that are common across all investment groups
 * These fields exist at the InvestmentReport root level
 */
export const BASE_SORTABLE_COLUMNS = [
  { id: 'investment', label: 'Investment' },
  { id: 'date', label: 'Date' },
  { id: 'totalInvestmentAmount', label: 'Total Investment Amount' },
  { id: 'investmentMarketValue', label: 'Market Value' },
  { id: 'debtFinancingAmount', label: 'Debt Financing' },
  { id: 'requiredCapitalAmount', label: 'Required Capital' },
  { id: 'forecastedRevenueAmount', label: 'Forecasted Revenue' },
  { id: 'forecastedProfitAmount', label: 'Forecasted Profit' },
  { id: 'stakePercentage', label: 'Stake %' },
  { id: 'irr', label: 'IRR' },
  { id: 'moic', label: 'MOIC' }
]

/**
 * Equity-specific sortable columns
 * Includes base columns plus equity-specific fields from equityInvestmentReport
 */
export const EQUITY_SORTABLE_COLUMNS = [
  ...BASE_SORTABLE_COLUMNS,
  // Fund fields
  { id: 'totalCommitmentAmount', label: 'Total Commitment' },
  { id: 'totalDistributionAmount', label: 'Total Distribution' },
  { id: 'fundManagerName', label: 'Fund Manager' },
  // Equity specific sortable fields (catalog uses equityInvestment.*, maps to equityInvestmentReport.*)
  { id: 'equityInvestment_marketValue', label: 'Equity Market Value' },
  { id: 'equityInvestment_turnoverAmount', label: 'Turnover' },
  { id: 'equityInvestment_ebitdaAmount', label: 'EBITDA' }
]

/**
 * Real Estate-specific sortable columns
 * Includes base columns plus real estate-specific fields from realEstateInvestmentReport
 */
export const REAL_ESTATE_SORTABLE_COLUMNS = [
  ...BASE_SORTABLE_COLUMNS,
  // Loan fields
  { id: 'loanRecipientName', label: 'Loan Recipient' },
  { id: 'loanAmount', label: 'Loan Amount' },
  { id: 'loanOpenCommitmentAmount', label: 'Open Commitment' },
  { id: 'loanInterestRate', label: 'Loan Interest Rate' },
  { id: 'loanStartDate', label: 'Loan Start Date' },
  { id: 'loanEndDate', label: 'Loan End Date' },
  { id: 'loanInterestClaim', label: 'Interest Claim' },
  // Real Estate specific sortable fields (catalog uses realEstateInvestment.*, maps to realEstateInvestmentReport.*)
  { id: 'realEstateInvestment_size', label: 'Size' },
  { id: 'realEstateInvestment_numberOfUnits', label: 'Number of Units' },
  { id: 'realEstateInvestment_occupancyPercent', label: 'Occupancy %' },
  { id: 'realEstateInvestment_annualNetColdRent', label: 'Annual Net Cold Rent' },
  { id: 'realEstateInvestment_funding', label: 'Funding' },
  { id: 'realEstateInvestment_actualAnnualExpenses', label: 'Actual Annual Expenses' },
  { id: 'realEstateInvestment_targetAnnualExpenses', label: 'Target Annual Expenses' },
  { id: 'realEstateLocality', label: 'Locality' },
  { id: 'realEstatePostalCode', label: 'Postal Code' }
]

/**
 * Liquid Fund sortable columns
 * Very minimal - most fields are in additionalProperties (JSONB) and not sortable
 */
export const LIQUID_FUND_SORTABLE_COLUMNS = [
  { id: 'investment', label: 'Investment' },
  { id: 'date', label: 'Date' },
  { id: 'investment_totalInvestmentAmount', label: 'Total Investment Amount' }
  // Note: Most liquid fund fields (name, proprietor, bank, currency, etc.) are stored in additionalProperties
  // and cannot be sorted due to JSONB database limitations
]

/**
 * Get sortable columns for a specific investment group
 *
 * @param groupCode - Investment group code (e.g., 'EQUITY', 'REAL_ESTATE', 'LIQUID_FUND')
 * @returns Array of sortable column definitions
 */
export const getSortableColumnsForGroup = (groupCode: string): Array<{ id: string; label: string }> => {
  switch (groupCode) {
    case 'EQUITY':
      return EQUITY_SORTABLE_COLUMNS
    case 'REAL_ESTATE':
      return REAL_ESTATE_SORTABLE_COLUMNS
    case 'LIQUID_FUND':
      return LIQUID_FUND_SORTABLE_COLUMNS
    default:
      // Default for unknown groups - use base sortable columns
      return BASE_SORTABLE_COLUMNS
  }
}
