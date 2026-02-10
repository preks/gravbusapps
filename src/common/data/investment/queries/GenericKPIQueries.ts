import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isValidDate } from '@/common/utils/dateFormatter'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'

/**
 * Configuration for building KPI queries
 */
export interface KPIQueryConfig<TKPIData> {
  /** Name of the investment group (used in GraphQL query name) */
  groupName: string
  /** Custom filter conditions specific to this investment group */
  groupFilterCondition: Record<string, any>
  /** Additional where clauses needed for this group (e.g., for active investments) */
  additionalWhereClauses?: {
    /** Name of the where clause variable */
    name: string
    /** Additional conditions to merge */
    conditions: Record<string, any>[]
  }[]
  /** GraphQL query fields to include in the query */
  queryFields: string
  /** Function to transform GraphQL result into typed KPI data */
  transformResult: (data: any) => { current: TKPIData; previous: TKPIData }
}

/**
 * Builds a generic KPI query with comparison period support
 */
const buildGenericKPIQuery = <TKPIData>(
  config: KPIQueryConfig<TKPIData>,
  comparisonDate: string,
  currencyFilter?: string,
  filters?: Record<string, any>
): { query: string; variables: Record<string, any> } => {
  // Validate comparison date
  if (!isValidDate(comparisonDate)) {
    throw new Error('Invalid comparison date format')
  }

  const variables = { ...filters }

  // Build custom conditions for this investment group and currency
  const customConditions: Record<string, any>[] = [config.groupFilterCondition]

  if (currencyFilter) {
    customConditions.push({ currency: { code: { _eq: currencyFilter } } })
  }

  // Build base where clauses using standard buildWhere from common
  const currentWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions,
    isDeleted: true
  })

  const previousWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions: [...customConditions, { createdAt: { _lte: comparisonDate } }],
    isDeleted: true
  })

  // Build additional where clauses if specified
  const additionalVariables: Record<string, any> = {}
  if (config.additionalWhereClauses) {
    for (const clause of config.additionalWhereClauses) {
      const currentClauseName = `current${clause.name.charAt(0).toUpperCase() + clause.name.slice(1)}`
      const previousClauseName = `previous${clause.name.charAt(0).toUpperCase() + clause.name.slice(1)}`

      additionalVariables[currentClauseName] = buildWhere({
        variables,
        descriptors: INVESTMENT_DESCRIPTORS,
        customConditions: [...customConditions, ...clause.conditions],
        isDeleted: true
      })

      additionalVariables[previousClauseName] = buildWhere({
        variables,
        descriptors: INVESTMENT_DESCRIPTORS,
        customConditions: [...customConditions, { createdAt: { _lte: comparisonDate } }, ...clause.conditions],
        isDeleted: true
      })
    }
  }

  // Build GraphQL query parameter list
  const paramList = ['$currentWhere: InvestmentBoolExp', '$previousWhere: InvestmentBoolExp']
  if (config.additionalWhereClauses) {
    for (const clause of config.additionalWhereClauses) {
      const currentName = `current${clause.name.charAt(0).toUpperCase() + clause.name.slice(1)}`
      const previousName = `previous${clause.name.charAt(0).toUpperCase() + clause.name.slice(1)}`
      paramList.push(`$${currentName}: InvestmentBoolExp`, `$${previousName}: InvestmentBoolExp`)
    }
  }

  const query = `
    query Get${config.groupName}KPIsWithComparison(
      ${paramList.join(',\n      ')}
    ) {
      ${config.queryFields}
    }
  `

  return {
    query,
    variables: {
      currentWhere,
      previousWhere,
      ...additionalVariables
    }
  }
}

/**
 * Factory function to create a KPI query hook for a specific investment group
 *
 * @param config Configuration object specifying group-specific query details
 * @returns A hook that fetches KPI data with period comparison
 *
 * @example
 * ```typescript
 * export const useGetTestGroupKPIs = createKPIQueryHook<TestGroupKPIData>({
 *   groupName: 'TestGroup',
 *   groupFilterCondition: {
 *     investmentGroup: { id: { _eq: 'InvestmentGroup:v1:TEST' } }
 *   },
 *   additionalWhereClauses: [
 *     {
 *       name: 'activeWhere',
 *       conditions: [{ investmentStatus: { value: { _eq: 'Active' } } }]
 *     }
 *   ],
 *   queryFields: `
 *     currentAggregate: InvestmentAggregate(where: $currentWhere) {
 *       aggregate { count sum { totalInvestmentAmount } }
 *     }
 *     currentActiveWhere: InvestmentAggregate(where: $currentActiveWhere) {
 *       aggregate { count }
 *     }
 *     previousAggregate: InvestmentAggregate(where: $previousWhere) {
 *       aggregate { count sum { totalInvestmentAmount } }
 *     }
 *     previousActiveWhere: InvestmentAggregate(where: $previousActiveWhere) {
 *       aggregate { count }
 *     }
 *   `,
 *   transformResult: (data) => ({
 *     current: {
 *       totalInvestments: data.currentAggregate?.aggregate?.count || 0,
 *       totalAmountInvested: data.currentAggregate?.aggregate?.sum?.totalInvestmentAmount || 0,
 *       activeInvestments: data.currentActiveWhere?.aggregate?.count || 0,
 *       averageInvestmentValue: // ... calculation
 *     },
 *     previous: { // ... same pattern }
 *   })
 * })
 * ```
 */
export const createKPIQueryHook = <TKPIData>(config: KPIQueryConfig<TKPIData>) => {
  return (context: BusinessAppContextProps) => {
    const graphqlClient = useGraphQLClient(context.accessToken)

    const fetchKPIs = useCallback(
      async (
        comparisonDate: string,
        currencyFilter?: string,
        filters?: Record<string, any>
      ): Promise<{ current: TKPIData; previous: TKPIData }> => {
        if (!context.accessToken) {
          throw new Error(`[useGet${config.groupName}KPIs] Access token is required`)
        }

        const { query, variables } = buildGenericKPIQuery(config, comparisonDate, currencyFilter, filters)

        try {
          const result = await graphqlClient.request<any>(query, variables)
          return config.transformResult(result)
        } catch (error) {
          console.error(`[useGet${config.groupName}KPIs] Error fetching ${config.groupName} KPIs:`, error)
          throw error
        }
      },
      [context.accessToken, graphqlClient, config]
    )

    return { [`fetch${config.groupName}KPIs`]: fetchKPIs }
  }
}
