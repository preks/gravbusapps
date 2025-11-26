import type { Investment, EquityInvestment } from '@/common/data/investment/types/investmentTypes'

// Re-export the centralized types for convenience
export type { Investment, EquityInvestment } from '@/common/data/investment/types/investmentTypes'

export interface EquityInvestmentSummary {
  id: string
  investment: Investment
  equityInvestment?: EquityInvestment
}

export interface EquityInvestmentKPIs {
  totalEquityValue: number
  averageCompanyValuation: number
  totalEbitda: number
  numberOfEquityInvestments: number
}

export interface EquityInvestmentQueryVariables {
  limit?: number
  offset?: number
  search?: string
  orderBy?: any
}

export interface EquityInvestmentResponse {
  EquityInvestment: EquityInvestmentSummary[]
  EquityInvestmentAggregate: {
    aggregate: {
      count: number
      sum: {
        marketValue: number | null
        ebitdaAmount: number | null
        turnoverAmount: number | null
      }
      avg: {
        marketValue: number | null
        ebitdaAmount: number | null
        turnoverAmount: number | null
      }
    }
  }
}
