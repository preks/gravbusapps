/**
 * GraphQL queries for Portfolio Concentration by Group
 *
 * This query calculates investment concentration metrics (count, total value, average value)
 * grouped by investment type (Equity, Liquid Fund, Real Estate, etc.).
 */

import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'

export interface ConcentrationData {
  group: string
  count: number
  totalValue: number
  averageValue: number
}

export interface ConcentrationQueryResult {
  concentrationData: ConcentrationData[]
}

/**
 * Query to get distinct investment groups
 */
export const GET_DISTINCT_GROUPS_QUERY = `
  query GetDistinctInvestmentGroups {
    Investment(
      where: { 
        isDeleted: { _eq: false }
      }
      distinctOn: investmentGroupRef
    ) {
      investmentGroup {
        id
        value
      }
    }
  }
`

/**
 * Build a query to aggregate investment values per group
 */
export const BUILD_CONCENTRATION_QUERY = (groupIds: string[], currency?: string) => {
  const aliases = groupIds
    .map(groupId => {
      const sanitizedId = groupId.replaceAll(/\W/g, '_')

      // Build where conditions
      const conditions = ['isDeleted: { _eq: false }', `investmentGroup: { id: { _eq: "${groupId}" } }`]

      if (currency && currency !== 'ALL') {
        conditions.push(`currency: { code: { _eq: "${currency}" } }`)
      }

      return `
      group_${sanitizedId}: InvestmentAggregate(
        where: {
          ${conditions.join('\n          ')}
        }
      ) {
        aggregate {
          count
          sum {
            investmentMarketValue
            totalInvestmentAmount
          }
        }
      }
    `
    })
    .join('\n')

  return `
    query GetConcentrationAggregates {
      ${aliases}
    }
  `
}

interface GroupInfo {
  groupId: string
  groupValue: string
}

interface AggregateResult {
  aggregate: {
    count: number
    sum: {
      investmentMarketValue: number | null
      totalInvestmentAmount: number | null
    } | null
  }
}

/**
 * Fetch portfolio concentration data with optional currency filter
 */
export const fetchConcentrationData = async (
  graphqlClient: GraphQLClient,
  currency?: string
): Promise<ConcentrationQueryResult> => {
  // Step 1: Get all distinct investment groups
  const distinctResult = await graphqlClient.request<{
    Investment: Array<{
      investmentGroup: {
        id: string
        value: string
      }
    }>
  }>(GET_DISTINCT_GROUPS_QUERY)

  const groups: GroupInfo[] = distinctResult.Investment.filter(inv => inv.investmentGroup).map(inv => ({
    groupId: inv.investmentGroup.id,
    groupValue: inv.investmentGroup.value || 'Unknown'
  }))

  if (groups.length === 0) {
    return { concentrationData: [] }
  }

  // Step 2: Build and execute aggregate query for all groups
  const aggregateQuery = BUILD_CONCENTRATION_QUERY(
    groups.map(g => g.groupId),
    currency
  )

  const aggregateResult = await graphqlClient.request<Record<string, AggregateResult>>(aggregateQuery)

  // Step 3: Process results and calculate metrics
  const concentrationData: ConcentrationData[] = groups.map(group => {
    const sanitizedId = group.groupId.replaceAll(/\W/g, '_')
    const key = `group_${sanitizedId}`
    const aggregate = aggregateResult[key]

    const marketValue = aggregate?.aggregate?.sum?.investmentMarketValue || 0
    const investmentAmount = aggregate?.aggregate?.sum?.totalInvestmentAmount || 0
    const totalValue = marketValue || investmentAmount
    const count = aggregate?.aggregate?.count || 0
    const averageValue = count > 0 ? totalValue / count : 0

    return {
      group: group.groupValue,
      count,
      totalValue,
      averageValue
    }
  })

  // Step 4: Sort by total value descending
  const sortedData = concentrationData
    .filter(d => d.count > 0) // Only include groups with investments
    .sort((a, b) => b.totalValue - a.totalValue)

  return { concentrationData: sortedData }
}
