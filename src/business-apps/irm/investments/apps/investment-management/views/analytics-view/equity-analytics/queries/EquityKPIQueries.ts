import { createKPIQueryHook } from '@/common/data/investment/queries/GenericKPIQueries'

export interface EquityKPIData {
  totalInvestments: number
  totalAmountInvested: number
  portfolioMoic: number
  averageDuration: number
}

export interface EquityKPIComparison {
  current: EquityKPIData
  previous: EquityKPIData
}

/**
 * Calculate Portfolio MOIC from aggregate data
 */
const calculatePortfolioMoic = (marketValue: number | null, totalInvestment: number | null): number => {
  const MOIC_FALLBACK = 0

  if (!totalInvestment || totalInvestment === 0) return MOIC_FALLBACK
  if (!marketValue) return MOIC_FALLBACK

  return marketValue / totalInvestment
}

/**
 * Calculate Average Investment Duration in days
 */
const calculateAverageDuration = (investments: Array<{ acquisitionDate?: string | null }>): number => {
  const DURATION_FALLBACK = 0

  if (!investments || investments.length === 0) return DURATION_FALLBACK

  const currentDate = new Date()
  let totalDays = 0
  let validCount = 0

  for (const investment of investments) {
    if (investment.acquisitionDate) {
      const acquisitionDate = new Date(investment.acquisitionDate)
      if (!Number.isNaN(acquisitionDate.getTime())) {
        const durationMs = currentDate.getTime() - acquisitionDate.getTime()
        const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24))
        totalDays += durationDays
        validCount++
      }
    }
  }

  if (validCount === 0) return DURATION_FALLBACK
  return Math.floor(totalDays / validCount)
}

/**
 * Hook to fetch equity KPI data with period comparison
 * Uses generic KPI query factory with Equity specific configuration
 */
const useGetEquityKPIsBase = createKPIQueryHook<EquityKPIData>({
  groupName: 'Equity',
  groupFilterCondition: { equityInvestment: { id: { _isNull: false } } },
  additionalWhereClauses: [
    {
      name: 'investmentsWhere',
      conditions: [{ acquisitionDate: { _isNull: false } }]
    }
  ],
  queryFields: `
    # Current data (equity investments only)
    currentAggregate: InvestmentAggregate(where: $currentWhere) {
      aggregate {
        count
        sum {
          totalInvestmentAmount
          investmentMarketValue
        }
      }
    }
    
    # Current investments for duration calculation
    currentInvestments: Investment(where: $currentInvestmentsWhere, limit: 1000) {
      id
      acquisitionDate
    }
    
    # Previous period data
    previousAggregate: InvestmentAggregate(where: $previousWhere) {
      aggregate {
        count
        sum {
          totalInvestmentAmount
          investmentMarketValue
        }
      }
    }
    
    # Previous investments for duration calculation
    previousInvestments: Investment(where: $previousInvestmentsWhere, limit: 1000) {
      id
      acquisitionDate
    }
  `,
  transformResult: data => ({
    current: {
      totalInvestments: data.currentAggregate?.aggregate?.count || 0,
      totalAmountInvested: data.currentAggregate?.aggregate?.sum?.totalInvestmentAmount || 0,
      portfolioMoic: calculatePortfolioMoic(
        data.currentAggregate?.aggregate?.sum?.investmentMarketValue,
        data.currentAggregate?.aggregate?.sum?.totalInvestmentAmount
      ),
      averageDuration: calculateAverageDuration(data.currentInvestments)
    },
    previous: {
      totalInvestments: data.previousAggregate?.aggregate?.count || 0,
      totalAmountInvested: data.previousAggregate?.aggregate?.sum?.totalInvestmentAmount || 0,
      portfolioMoic: calculatePortfolioMoic(
        data.previousAggregate?.aggregate?.sum?.investmentMarketValue,
        data.previousAggregate?.aggregate?.sum?.totalInvestmentAmount
      ),
      averageDuration: calculateAverageDuration(data.previousInvestments)
    }
  })
})

// Export with consistent API
export const useGetEquityKPIs = (context: any) => {
  const hook = useGetEquityKPIsBase(context)
  return { fetchEquityKPIs: hook.fetchEquityKPIs }
}
