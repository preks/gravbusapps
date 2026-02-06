import { useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import { useKPIIntegration } from '@/business-apps/irm/investments/apps/investment-management/views/analytics-view/shared/hooks/useKPIIntegration'

/**
 * Generic KPI data structure (4 basic metrics)
 */
export interface GenericKPIData {
  totalInvestments: number
  totalAmountInvested: number
  averageInvestmentValue: number
  activeInvestments: number
}

/**
 * @interface GenericGroupKPIIntegration
 * @description Return type for generic group KPI integration hook
 */
export interface GenericGroupKPIIntegration {
  current: GenericKPIData
  previous: GenericKPIData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const AVERAGE_FALLBACK = 0

/**
 * @function useGenericGroupKPIIntegration
 * @description Custom hook for managing KPI data for any investment group.
 * Fetches the 4 basic KPI metrics: Total Investments, Total Amount Invested, Average Investment Value, Active Investments
 * Works by dynamically building GraphQL queries based on the group code parameter.
 *
 * @param {BusinessAppContextProps} context - Business application context with access token
 * @param {string} groupCode - Investment group code (e.g., 'EQUITY', 'PRIVATE_EQUITY', any new group)
 * @param {string} [currency] - Optional currency filter for KPI calculations
 * @param {Record<string, any>} [filters] - Optional additional filters
 * @param {boolean} [enabled] - Whether to fetch data (default: true)
 * @returns {GenericGroupKPIIntegration} Generic KPI data with loading and error states
 *
 * @example
 * const { current, previous, isLoading, error, refetch } = useGenericGroupKPIIntegration(context, 'NEW_GROUP', 'USD')
 */
export const useGenericGroupKPIIntegration = (
  context: BusinessAppContextProps,
  groupCode: string,
  currency?: string,
  filters?: Record<string, any>,
  enabled: boolean = true
): GenericGroupKPIIntegration => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Calculate comparison date (91 days ago)
  const comparisonDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 91)
    return date.toISOString()
  }, [])

  // Build the fetcher function that creates GraphQL queries dynamically based on group code
  const fetchKPIs = useCallback(
    async (compDate: string, curr?: string, filts?: Record<string, any>) => {
      if (!context.accessToken || !groupCode) {
        return {
          current: {
            totalInvestments: 0,
            totalAmountInvested: 0,
            averageInvestmentValue: 0,
            activeInvestments: 0
          },
          previous: {
            totalInvestments: 0,
            totalAmountInvested: 0,
            averageInvestmentValue: 0,
            activeInvestments: 0
          }
        }
      }

      // Build base custom conditions for this group
      const baseCustomConditions: Record<string, any>[] = [
        { investmentGroup: { id: { _eq: `InvestmentGroup:v1:${groupCode}` } } }
      ]

      if (curr) {
        baseCustomConditions.push({ currency: { code: { _eq: curr } } })
      }

      // Build where clauses using buildWhere helper (same as factory pattern)
      const currentWhere = buildWhere({
        variables: filts || {},
        descriptors: INVESTMENT_DESCRIPTORS,
        customConditions: baseCustomConditions,
        isDeleted: true
      })

      const currentActiveWhere = buildWhere({
        variables: filts || {},
        descriptors: INVESTMENT_DESCRIPTORS,
        customConditions: [...baseCustomConditions, { investmentStatus: { value: { _eq: 'Active' } } }],
        isDeleted: true
      })

      const previousWhere = buildWhere({
        variables: filts || {},
        descriptors: INVESTMENT_DESCRIPTORS,
        customConditions: [...baseCustomConditions, { createdAt: { _lte: compDate } }],
        isDeleted: true
      })

      const previousActiveWhere = buildWhere({
        variables: filts || {},
        descriptors: INVESTMENT_DESCRIPTORS,
        customConditions: [
          ...baseCustomConditions,
          { investmentStatus: { value: { _eq: 'Active' } } },
          { createdAt: { _lte: compDate } }
        ],
        isDeleted: true
      })

      // Build GraphQL query with proper variable syntax
      const query = `
        query GetGenericGroupKPIs(
          $currentWhere: InvestmentBoolExp,
          $currentActiveWhere: InvestmentBoolExp,
          $previousWhere: InvestmentBoolExp,
          $previousActiveWhere: InvestmentBoolExp
        ) {
          currentAggregate: InvestmentAggregate(where: $currentWhere) {
            aggregate {
              count
              sum {
                totalInvestmentAmount
              }
            }
          }
          
          currentActiveAggregate: InvestmentAggregate(where: $currentActiveWhere) {
            aggregate {
              count
            }
          }
          
          previousAggregate: InvestmentAggregate(where: $previousWhere) {
            aggregate {
              count
              sum {
                totalInvestmentAmount
              }
            }
          }
          
          previousActiveAggregate: InvestmentAggregate(where: $previousActiveWhere) {
            aggregate {
              count
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        currentAggregate: { aggregate: { count: number; sum: { totalInvestmentAmount: number } } }
        currentActiveAggregate: { aggregate: { count: number } }
        previousAggregate: { aggregate: { count: number; sum: { totalInvestmentAmount: number } } }
        previousActiveAggregate: { aggregate: { count: number } }
      }>(query, {
        currentWhere,
        currentActiveWhere,
        previousWhere,
        previousActiveWhere
      })

      const currentTotal = result.currentAggregate?.aggregate?.count || 0
      const currentAmount = result.currentAggregate?.aggregate?.sum?.totalInvestmentAmount || 0
      const currentActive = result.currentActiveAggregate?.aggregate?.count || 0
      const currentAverage = currentTotal > 0 ? currentAmount / currentTotal : AVERAGE_FALLBACK

      const previousTotal = result.previousAggregate?.aggregate?.count || 0
      const previousAmount = result.previousAggregate?.aggregate?.sum?.totalInvestmentAmount || 0
      const previousActive = result.previousActiveAggregate?.aggregate?.count || 0
      const previousAverage = previousTotal > 0 ? previousAmount / previousTotal : AVERAGE_FALLBACK

      return {
        current: {
          totalInvestments: currentTotal,
          totalAmountInvested: currentAmount,
          averageInvestmentValue: currentAverage,
          activeInvestments: currentActive
        },
        previous: {
          totalInvestments: previousTotal,
          totalAmountInvested: previousAmount,
          averageInvestmentValue: previousAverage,
          activeInvestments: previousActive
        }
      }
    },
    [context.accessToken, graphqlClient, groupCode]
  )

  // Wrapper that calls fetchKPIs with the right parameters
  const fetcher = useCallback(async () => {
    return await fetchKPIs(comparisonDate, currency, filters)
  }, [fetchKPIs, comparisonDate, currency, filters])

  return useKPIIntegration<GenericKPIData>(
    context,
    fetcher,
    {
      totalInvestments: 0,
      totalAmountInvested: 0,
      averageInvestmentValue: 0,
      activeInvestments: 0
    },
    [groupCode, currency, filters],
    enabled
  )
}
