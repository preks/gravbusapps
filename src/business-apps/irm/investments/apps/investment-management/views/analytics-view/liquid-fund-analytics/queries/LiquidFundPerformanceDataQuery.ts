import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface InterestRateCorrelationData {
  interestRate: number
  investmentAmount: number
  fundName: string
  fundType: string
}

export interface PerformanceByTypeData {
  fundType: string
  averageInterestRate: number
  averageInvestmentAmount: number
  count: number
  name: string
}

/**
 * Query for Interest Rate vs Investment Amount Correlation
 * Fetches liquid fund investments with interest rate and amount data
 */
const BUILD_CORRELATION_QUERY = (currency: string): string => {
  return `
    query GetLiquidFundCorrelation {
      Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { totalInvestmentAmount: { _isNull: false, _gt: 0 } }
            { liquidFundInvestment: { interestRate: { _isNull: false } } }
          ]
        }
      ) {
        id
        name
        code
        totalInvestmentAmount
        liquidFundInvestment {
          interestRate
          investmentLiquidFundType {
            value
          }
        }
      }
    }
  `
}

/**
 * Query for Performance by Fund Type
 * Uses aggregates to calculate average interest rate and investment amount per type
 */
const BUILD_PERFORMANCE_BY_TYPE_QUERY = (currency: string, types: string[]): string => {
  const typeAggregates = types
    .map((type, index) => {
      const aliasName = `type_${index}_${type.toLowerCase().replaceAll(/[^a-z0-9]/g, '_')}`

      return `
      ${aliasName}: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { liquidFundInvestment: { investmentLiquidFundType: { value: { _eq: "${type}" } } } }
          ]
        }
      ) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
          }
        }
      }
      
      ${aliasName}_interest: LiquidFundInvestmentAggregate(
        where: {
          _and: [
            { investment: { isDeleted: { _eq: false } } }
            { investment: { investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } } }
            { investment: { currency: { code: { _eq: "${currency}" } } } }
            { investmentLiquidFundType: { value: { _eq: "${type}" } } }
          ]
        }
      ) {
        aggregate {
          avg {
            interestRate
          }
        }
      }`
    })
    .join('\n')

  return `
    query GetPerformanceByType {
      ${typeAggregates}
    }
  `
}

/**
 * Get distinct liquid fund types
 */
const GET_DISTINCT_LIQUID_FUND_TYPES_QUERY = `
  query GetDistinctLiquidFundTypes {
    LiquidFundInvestment(
      where: {
        investment: { isDeleted: { _eq: false } }
        investmentLiquidFundTypeRef: { _isNull: false }
      }
      distinctOn: investmentLiquidFundTypeRef
    ) {
      investmentLiquidFundTypeRef
      investmentLiquidFundType {
        id
        code
        value
      }
    }
  }
`

/**
 * Fetch correlation data (for scatter chart)
 */
export const fetchCorrelationData = async (
  graphqlClient: any,
  currency: string
): Promise<InterestRateCorrelationData[]> => {
  const query = BUILD_CORRELATION_QUERY(currency)

  interface InvestmentResponse {
    Investment: Array<{
      id: string
      name: string
      code: string | null
      totalInvestmentAmount: number
      liquidFundInvestment: Array<{
        interestRate: number
        investmentLiquidFundType: {
          value: string
        } | null
      }>
    }>
  }

  const result = (await graphqlClient.request(query)) as InvestmentResponse

  const correlationData: InterestRateCorrelationData[] = result.Investment.filter(
    (inv: (typeof result.Investment)[0]) => inv.liquidFundInvestment && inv.liquidFundInvestment.length > 0
  ).map((inv: (typeof result.Investment)[0]) => {
    const liquidFund = inv.liquidFundInvestment[0]
    return {
      interestRate: liquidFund.interestRate,
      investmentAmount: inv.totalInvestmentAmount,
      fundName: inv.name || inv.code || 'Unknown',
      fundType: liquidFund.investmentLiquidFundType?.value || 'Unknown'
    }
  })

  return correlationData
}

/**
 * Fetch performance by type data (for bar chart)
 */
export const fetchPerformanceByType = async (
  graphqlClient: any,
  currency: string
): Promise<PerformanceByTypeData[]> => {
  // Step 1: Get distinct fund types
  interface DistinctTypesResponse {
    LiquidFundInvestment: Array<{
      investmentLiquidFundTypeRef: string | null
      investmentLiquidFundType: {
        id: string
        code: string | null
        value: string | null
      } | null
    }>
  }

  const distinctResult = (await graphqlClient.request(GET_DISTINCT_LIQUID_FUND_TYPES_QUERY)) as DistinctTypesResponse

  const types = distinctResult.LiquidFundInvestment.filter(
    (item: (typeof distinctResult.LiquidFundInvestment)[0]) => item.investmentLiquidFundType?.value
  ).map((item: (typeof distinctResult.LiquidFundInvestment)[0]) => item.investmentLiquidFundType!.value!)

  if (types.length === 0) {
    return []
  }

  // Step 2: Build and execute combined aggregate query
  const query = BUILD_PERFORMANCE_BY_TYPE_QUERY(currency, types)
  const result = await graphqlClient.request(query)

  // Step 3: Parse results
  const performanceData: PerformanceByTypeData[] = []

  for (const [index, type] of types.entries()) {
    const aliasName = `type_${index}_${type.toLowerCase().replaceAll(/[^a-z0-9]/g, '_')}`
    const investmentAggregate = result[aliasName]
    const interestAggregate = result[`${aliasName}_interest`]

    const count = investmentAggregate?.aggregate?.count || 0
    const totalAmount = investmentAggregate?.aggregate?.sum?.totalInvestmentAmount || 0
    const avgInterestRate = interestAggregate?.aggregate?.avg?.interestRate || 0

    if (count > 0) {
      performanceData.push({
        fundType: type,
        averageInterestRate: avgInterestRate,
        averageInvestmentAmount: totalAmount / count,
        count,
        name: type.toLowerCase().replaceAll(/\s+/g, '')
      })
    }
  }

  return performanceData
}

/**
 * Hook to use Liquid Fund Performance aggregate queries
 * Exposes separate fetch functions for independent data loading
 */
export const useGetLiquidFundPerformanceData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCorrelationDataWithClient = useCallback(
    async (currency: string) => {
      return await fetchCorrelationData(graphqlClient, currency)
    },
    [graphqlClient]
  )

  const fetchPerformanceByTypeData = useCallback(
    async (currency: string) => {
      return await fetchPerformanceByType(graphqlClient, currency)
    },
    [graphqlClient]
  )

  return {
    fetchCorrelationData: fetchCorrelationDataWithClient,
    fetchPerformanceByTypeData
  }
}
