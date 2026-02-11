import { createKPIQueryHook } from '@/common/data/investment/queries/GenericKPIQueries'

export interface LiquidFundKPIData {
  totalInvestments: number
  totalAmountInvested: number
  averageInvestmentValue: number
  activeInvestments: number
}

export interface LiquidFundKPIComparison {
  current: LiquidFundKPIData
  previous: LiquidFundKPIData
}

const AVERAGE_FALLBACK = 0

/**
 * Hook to fetch liquid fund KPI data with period comparison
 * Uses generic KPI query factory with Liquid Fund specific configuration
 */
const useGetLiquidFundKPIsBase = createKPIQueryHook<LiquidFundKPIData>({
  groupName: 'LiquidFund',
  groupFilterCondition: { liquidFundInvestment: { id: { _isNull: false } } },
  additionalWhereClauses: [
    {
      name: 'activeWhere',
      conditions: [{ investmentStatus: { value: { _eq: 'Active' } } }]
    }
  ],
  queryFields: `
    # Current data (liquid fund investments only)
    currentAggregate: InvestmentAggregate(where: $currentWhere) {
      aggregate {
        count
        sum {
          totalInvestmentAmount
        }
      }
    }
    
    # Current active investments count
    currentActiveAggregate: InvestmentAggregate(where: $currentActiveWhere) {
      aggregate {
        count
      }
    }
    
    # Previous period data
    previousAggregate: InvestmentAggregate(where: $previousWhere) {
      aggregate {
        count
        sum {
          totalInvestmentAmount
        }
      }
    }
    
    # Previous active investments count
    previousActiveAggregate: InvestmentAggregate(where: $previousActiveWhere) {
      aggregate {
        count
      }
    }
  `,
  transformResult: data => ({
    current: {
      totalInvestments: data.currentAggregate?.aggregate?.count || 0,
      totalAmountInvested: data.currentAggregate?.aggregate?.sum?.totalInvestmentAmount || 0,
      activeInvestments: data.currentActiveAggregate?.aggregate?.count || 0,
      averageInvestmentValue:
        data.currentAggregate?.aggregate?.count > 0
          ? (data.currentAggregate.aggregate.sum?.totalInvestmentAmount || 0) / data.currentAggregate.aggregate.count
          : AVERAGE_FALLBACK
    },
    previous: {
      totalInvestments: data.previousAggregate?.aggregate?.count || 0,
      totalAmountInvested: data.previousAggregate?.aggregate?.sum?.totalInvestmentAmount || 0,
      activeInvestments: data.previousActiveAggregate?.aggregate?.count || 0,
      averageInvestmentValue:
        data.previousAggregate?.aggregate?.count > 0
          ? (data.previousAggregate.aggregate.sum?.totalInvestmentAmount || 0) / data.previousAggregate.aggregate.count
          : AVERAGE_FALLBACK
    }
  })
})

// Export with consistent API
export const useGetLiquidFundKPIs = (context: any) => {
  const hook = useGetLiquidFundKPIsBase(context)
  return { fetchLiquidFundKPIs: hook.fetchLiquidFundKPIs }
}
