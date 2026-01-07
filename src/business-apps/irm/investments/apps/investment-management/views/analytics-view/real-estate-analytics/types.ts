import type { Investment, RealEstateInvestment } from '@/common/data/investment/types/investmentTypes'

// Re-export the centralized types for convenience
export type { Investment, RealEstateInvestment } from '@/common/data/investment/types/investmentTypes'

export interface RealEstateInvestmentSummary {
  id: string
  investment: Investment
  realEstateInvestment?: RealEstateInvestment
}

export interface RealEstateInvestmentKPIs {
  totalPropertyValue: number
  averageOccupancyRate: number
  totalUnits: number
  totalAnnualExpenses: number
}

export interface RealEstateInvestmentQueryVariables {
  limit?: number
  offset?: number
  search?: string
  orderBy?: any
}

export interface RealEstateInvestmentResponse {
  RealEstateInvestment: RealEstateInvestmentSummary[]
  RealEstateInvestmentAggregate: {
    aggregate: {
      count: number
      sum: {
        numberOfUnits: number | null
        occupancyPercent: number | null
        annualExpenses: number | null
      }
      avg: {
        numberOfUnits: number | null
        occupancyPercent: number | null
        annualExpenses: number | null
      }
    }
  }
}
