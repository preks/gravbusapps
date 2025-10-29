import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Timeline aggregate data structure
 */
export interface TimelineYearData {
  year: string
  investmentType: string
  totalAmount: number
}

export interface TimelineAggregateResult {
  yearlyData: TimelineYearData[]
}

/**
 * Get the last N years including current year
 */
const getLastNYears = (n: number): string[] => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    years.push((currentYear - i).toString())
  }
  return years
}

/**
 * Build optimized aggregate query for timeline data
 * Uses GraphQL aliases to fetch all year+type combinations in a single query
 */
const BUILD_TIMELINE_AGGREGATE_QUERY = (years: string[], investmentTypes: string[], currency?: string): string => {
  // Build where conditions for each year+type combination
  const buildConditions = (year: string, investmentTypeRef: string) => {
    // Combine all conditions into _and array to avoid duplicate field issues
    const conditions = [
      '{ isDeleted: { _eq: false } }',
      '{ investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }',
      currency ? `{ currency: { code: { _eq: "${currency}" } } }` : '',
      `{ acquisitionDate: { _gte: "${year}-01-01", _lt: "${Number.parseInt(year) + 1}-01-01" } }`,
      `{ investmentTypeRef: { _eq: "${investmentTypeRef}" } }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return `_and: [
          ${conditions}
        ]`
  }

  // Create alias name that's GraphQL-safe
  const createAlias = (year: string, investmentTypeRef: string) => {
    return `year_${year}_type_${investmentTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}`
  }

  // Generate aggregate queries for each year+type combination
  const aggregates = years
    .flatMap(year =>
      investmentTypes.map(investmentTypeRef => {
        const alias = createAlias(year, investmentTypeRef)
        return `
      ${alias}: InvestmentAggregate(
        where: {
          ${buildConditions(year, investmentTypeRef)}
        }
      ) {
        aggregate {
          sum {
            totalInvestmentAmount
          }
        }
      }`
      })
    )
    .join('\n')

  return `
    query GetTimelineAggregates {
      ${aggregates}
    }
  `
}

/**
 * Fetch distinct investment types for equity investments
 */
const GET_DISTINCT_INVESTMENT_TYPES_QUERY = `
  query GetDistinctInvestmentTypes {
    Investment(
      distinctOn: investmentTypeRef
      orderBy: [{ investmentTypeRef: ASC }]
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
          { investmentTypeRef: { _isNull: false } }
        ]
      }
    ) {
      investmentTypeRef
      investmentType {
        value
      }
    }
  }
`

interface InvestmentTypeInfo {
  investmentTypeRef: string
  investmentTypeValue: string
}

/**
 * Hook to fetch timeline aggregate data with optimized GraphQL query
 */
export const useGetEquityTimelineAggregate = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTimelineAggregate = useCallback(
    async (yearsCount: number = 5, currency?: string): Promise<TimelineAggregateResult> => {
      // Step 1: Fetch distinct investment types
      const investmentTypesResult = await graphqlClient.request<{
        Investment: Array<{
          investmentTypeRef: string
          investmentType: { value: string } | null
        }>
      }>(GET_DISTINCT_INVESTMENT_TYPES_QUERY)

      const investmentTypes: InvestmentTypeInfo[] = investmentTypesResult.Investment.filter(
        inv => inv.investmentType?.value && inv.investmentTypeRef
      ).map(inv => ({
        investmentTypeRef: inv.investmentTypeRef,
        investmentTypeValue: inv.investmentType!.value
      }))

      if (investmentTypes.length === 0) {
        return { yearlyData: [] }
      }

      // Step 2: Get last N years
      const years = getLastNYears(yearsCount)

      // Step 3: Build and execute optimized aggregate query
      const query = BUILD_TIMELINE_AGGREGATE_QUERY(
        years,
        investmentTypes.map(t => t.investmentTypeRef),
        currency
      )

      const aggregateResult = await graphqlClient.request<Record<string, any>>(query)

      // Step 4: Parse results and build timeline data
      const yearlyData: TimelineYearData[] = []

      for (const year of years) {
        for (const type of investmentTypes) {
          const alias = `year_${year}_type_${type.investmentTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}`
          const aggregateData = aggregateResult[alias]
          const totalAmount = aggregateData?.aggregate?.sum?.totalInvestmentAmount || 0

          // Only add if there's data
          if (totalAmount > 0) {
            yearlyData.push({
              year,
              investmentType: type.investmentTypeValue,
              totalAmount
            })
          }
        }
      }

      return { yearlyData }
    },
    [graphqlClient]
  )

  return { fetchTimelineAggregate }
}
