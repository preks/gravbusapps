// Hook for fetching counts for each tab within a report group
// Executes when group changes to populate tab counts
// Uses NEW pattern with proper GraphQL variables

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'

interface ReportTabCountsConfig {
  investmentGroup: 'EQUITY' | 'REAL_ESTATE' | 'LIQUID_FUND'
  investmentTypes?: Array<{ code: string; value: string }> // For Equity and Real Estate
  accessToken: string
  filters: {
    startDate?: string
    endDate?: string
    currencyIds?: string[]
    search?: string
  }
  enabled?: boolean
}

interface ReportTabCountsReturn {
  counts: Record<string, number>
  isLoading: boolean
  error: Error | null
}

/**
 * Fetches counts for all tabs within a report group
 * Uses different filtering logic for LIQUID_FUND vs EQUITY/REAL_ESTATE
 * Uses proper GraphQL variables instead of string templates
 */
export const useReportTabCounts = (config: ReportTabCountsConfig): ReportTabCountsReturn => {
  const { investmentGroup, investmentTypes, accessToken, filters, enabled = true } = config

  const [counts, setCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  // Create stable filter key
  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  const fetchCounts = useCallback(async () => {
    if (!enabled || !accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (investmentGroup === 'LIQUID_FUND') {
        // LIQUID_FUND: Three separate queries with different liquid fund type filters

        // Build base custom conditions for all three queries
        const baseCustomConditions: Record<string, any>[] = [
          {
            investment: {
              investmentGroup: { id: { _eq: 'InvestmentGroup:v1:LIQUID_FUND' } }
            }
          }
        ]

        // Bank Deposits
        const bankDepositWhere = buildWhere({
          variables: filters,
          descriptors: INVESTMENT_REPORT_DESCRIPTORS,
          isDeleted: true,
          customConditions: [
            ...baseCustomConditions,
            {
              liquidFundInvestmentReport: {
                investmentLiquidFundType: { id: { _eq: 'InvestmentLiquidFundType:v1:BANK_DEPOSITE' } }
              }
            }
          ]
        })

        // Fixed-Term Deposits
        const fixedTermWhere = buildWhere({
          variables: filters,
          descriptors: INVESTMENT_REPORT_DESCRIPTORS,
          isDeleted: true,
          customConditions: [
            ...baseCustomConditions,
            {
              liquidFundInvestmentReport: {
                investmentLiquidFundType: { id: { _eq: 'InvestmentLiquidFundType:v1:FIXED_TERM_DEPOSIT' } }
              }
            }
          ]
        })

        // Multiple Types (exclude Bank Deposit and Fixed-Term)
        const multipleTypesWhere = buildWhere({
          variables: filters,
          descriptors: INVESTMENT_REPORT_DESCRIPTORS,
          isDeleted: true,
          customConditions: [
            ...baseCustomConditions,
            {
              _and: [
                {
                  liquidFundInvestmentReport: {
                    investmentLiquidFundType: {
                      id: {
                        _isNull: false
                      }
                    }
                  }
                },
                {
                  liquidFundInvestmentReport: {
                    investmentLiquidFundType: {
                      id: {
                        _nin: [
                          'InvestmentLiquidFundType:v1:BANK_DEPOSITE',
                          'InvestmentLiquidFundType:v1:FIXED_TERM_DEPOSIT'
                        ]
                      }
                    }
                  }
                }
              ]
            }
          ]
        })

        const query = `
          query GetLiquidFundReportCounts(
            $bankDepositWhere: InvestmentReportBoolExp
            $fixedTermWhere: InvestmentReportBoolExp
            $multipleTypesWhere: InvestmentReportBoolExp
          ) {
            bankDeposits: InvestmentReportAggregate(where: $bankDepositWhere) {
              aggregate { count }
            }
            fixedTermDeposits: InvestmentReportAggregate(where: $fixedTermWhere) {
              aggregate { count }
            }
            multipleTypes: InvestmentReportAggregate(where: $multipleTypesWhere) {
              aggregate { count }
            }
          }
        `

        const response = await graphqlClient.request<{
          bankDeposits: { aggregate: { count: number } }
          fixedTermDeposits: { aggregate: { count: number } }
          multipleTypes: { aggregate: { count: number } }
        }>(query, {
          bankDepositWhere,
          fixedTermWhere,
          multipleTypesWhere
        })

        setCounts({
          'bank-deposits': response.bankDeposits?.aggregate?.count || 0,
          'fixed-term-deposits': response.fixedTermDeposits?.aggregate?.count || 0,
          'multiple-types': response.multipleTypes?.aggregate?.count || 0
        })
      } else {
        // EQUITY and REAL_ESTATE: Query by investment.investmentType
        if (!investmentTypes || investmentTypes.length === 0) {
          setCounts({})
          setIsLoading(false)
          return
        }

        // Build where condition for each investment type
        const whereVariables: Record<string, any> = {}
        const queryFields: string[] = []

        investmentTypes.forEach(type => {
          const alias = type.code.toLowerCase().replaceAll(/[^a-z0-9]/g, '_')
          const whereCondition = buildWhere({
            variables: filters,
            descriptors: INVESTMENT_REPORT_DESCRIPTORS,
            isDeleted: true,
            customConditions: [
              {
                investment: {
                  investmentGroup: { id: { _eq: `InvestmentGroup:v1:${investmentGroup}` } },
                  investmentType: { id: { _eq: `InvestmentType:v1:${type.code}` } }
                }
              }
            ]
          })

          whereVariables[`${alias}Where`] = whereCondition
          queryFields.push(`
            ${alias}: InvestmentReportAggregate(where: $${alias}Where) {
              aggregate { count }
            }
          `)
        })

        const query = `
          query GetReportCounts(
            ${investmentTypes
              .map(type => {
                const alias = type.code.toLowerCase().replaceAll(/[^a-z0-9]/g, '_')
                return `$${alias}Where: InvestmentReportBoolExp`
              })
              .join(', ')}
          ) {
            ${queryFields.join('\n')}
          }
        `

        const response = await graphqlClient.request<Record<string, { aggregate: { count: number } }>>(
          query,
          whereVariables
        )

        const newCounts: Record<string, number> = {}
        investmentTypes.forEach(type => {
          const alias = type.code.toLowerCase().replaceAll(/[^a-z0-9]/g, '_')
          newCounts[type.code] = response[alias]?.aggregate?.count || 0
        })

        setCounts(newCounts)
      }
    } catch (err) {
      console.error('Error fetching report tab counts:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch tab counts'))
      setCounts({})
    } finally {
      setIsLoading(false)
    }
  }, [enabled, accessToken, graphqlClient, investmentGroup, investmentTypes, filterKey])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  return {
    counts,
    isLoading,
    error
  }
}
