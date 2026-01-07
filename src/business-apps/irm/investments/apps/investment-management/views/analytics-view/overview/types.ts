// Placeholder type for legacy compatibility - actual implementation uses EnhancedInvestmentSummary
export type InvestmentSummary = Record<string, never>

export interface InvestmentPortfolioKPIs {
  totalPortfolioValue: number
  totalInvestments: number
  totalAmountInvested: number
  activeInvestments: number
  averageInvestmentValue: number // Calculated from aggregates
  averageMarketValue: number // Calculated from aggregates
}

export interface InvestmentQueryVariables {
  limit?: number
  offset?: number
  search?: string
  orderBy?: any
}

// Placeholder type for legacy compatibility - not actively used
export type InvestmentPortfolioResponse = Record<string, never>
