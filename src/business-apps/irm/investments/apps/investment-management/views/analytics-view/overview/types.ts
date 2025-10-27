// Placeholder for investment summary data structure
export type InvestmentSummary = Record<string, unknown>

export interface InvestmentPortfolioKPIs {
  totalPortfolioValue: number
  totalInvestments: number
  totalAmountInvested: number
  activeInvestments: number
}

export interface InvestmentQueryVariables {
  limit?: number
  offset?: number
  search?: string
  orderBy?: any
}

// Placeholder for investment portfolio response structure
export type InvestmentPortfolioResponse = Record<string, unknown>
