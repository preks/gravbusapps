import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Distribution data interfaces
 */
export interface InvestmentTypeDistribution {
  type: string
  count: number
  totalAmount: number
}

export interface InvestmentTypeDistributionResult {
  distinctTypes: string[]
  countByType: Map<string, number>
  amountByType: Map<string, number>
}

/**
 * Query to fetch distinct investment types
 * Note: distinctOn only works with scalar fields, not nested relationships
 * So we use investmentTypeRef (the scalar reference field) and then fetch the type details
 */
const GET_DISTINCT_INVESTMENT_TYPES_QUERY = `
  query GetDistinctInvestmentTypes {
    Investment(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } }
          { investmentTypeRef: { _isNull: false } }
        ]
      }
      distinctOn: [investmentTypeRef]
    ) {
      investmentTypeRef
      investmentType {
        id
        code
        value
      }
    }
  }
`

/**
 * Build combined aggregate query for all investment types (count + amount)
 * Uses GraphQL aliases to fetch all data in ONE query (solves N+1 problem)
 */
const buildCombinedInvestmentTypeQuery = (types: string[], currency: string | null): string => {
  const typeAliases = types
    .map((type, index) => {
      // Sanitize type name for GraphQL alias (remove spaces, special chars)
      const aliasName = `type_${index}_${type.toLowerCase().replaceAll(/[^a-z0-9]/g, '_')}`

      const currencyCondition = currency ? `{ currency: { code: { _eq: "${currency}" } } }` : ''

      const conditions = [
        '{ isDeleted: { _eq: false } }',
        '{ investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } }',
        `{ investmentType: { value: { _eq: "${type}" } } }`,
        currencyCondition
      ]
        .filter(Boolean)
        .join('\n          ')

      return `
      ${aliasName}_count: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } }
            { investmentType: { value: { _eq: "${type}" } } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      
      ${aliasName}_amount: InvestmentAggregate(
        where: {
          _and: [
            ${conditions}
          ]
        }
      ) {
        aggregate {
          sum {
            investmentMarketValue
            totalInvestmentAmount
          }
        }
      }`
    })
    .join('\n')

  return `
    query GetInvestmentTypeDistributionCombined {
      ${typeAliases}
    }
  `
}

/**
 * Hook to fetch combined investment type distribution data
 */
export const useGetLiquidFundInvestmentTypeDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTypeDistribution = useCallback(
    async (currency: string | null = null): Promise<InvestmentTypeDistributionResult> => {
      // Step 1: Fetch distinct investment types
      const distinctResult = await graphqlClient.request<{
        Investment: Array<{
          investmentTypeRef: string | null
          investmentType: {
            id: string
            code: string | null
            value: string | null
          } | null
        }>
      }>(GET_DISTINCT_INVESTMENT_TYPES_QUERY)

      const distinctTypes = distinctResult.Investment.map(inv => inv.investmentType?.value).filter(
        (type): type is string => !!type
      )

      if (distinctTypes.length === 0) {
        return {
          distinctTypes: [],
          countByType: new Map(),
          amountByType: new Map()
        }
      }

      // Step 2: Fetch combined count + amount data for all types in ONE query
      const combinedQuery = buildCombinedInvestmentTypeQuery(distinctTypes, currency)

      const aggregateResult = await graphqlClient.request<Record<string, any>>(combinedQuery)

      // Step 3: Parse results and build maps
      const countByType = new Map<string, number>()
      const amountByType = new Map<string, number>()

      for (const [index, type] of distinctTypes.entries()) {
        const aliasName = `type_${index}_${type.toLowerCase().replaceAll(/[^a-z0-9]/g, '_')}`

        // Extract count
        const countData = aggregateResult[`${aliasName}_count`]
        const count = countData?.aggregate?.count || 0
        countByType.set(type, count)

        // Extract amount (prioritize investmentMarketValue, fallback to totalInvestmentAmount)
        const amountData = aggregateResult[`${aliasName}_amount`]
        const marketValue = amountData?.aggregate?.sum?.investmentMarketValue || 0
        const investmentAmount = amountData?.aggregate?.sum?.totalInvestmentAmount || 0
        const totalAmount = marketValue || investmentAmount
        amountByType.set(type, totalAmount)
      }
      return {
        distinctTypes,
        countByType,
        amountByType
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentTypeDistribution }
}
