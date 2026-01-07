import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface InvestmentKPIData {
  totalInvestments: number
  totalInvested: number
  averageStakePercentage: number
  totalMarketValue: number
}

export interface InvestmentStatisticsSection {
  current: InvestmentKPIData
  previous: InvestmentKPIData
}

export interface InvestmentStatisticsResult {
  overview: InvestmentStatisticsSection
  equity: InvestmentStatisticsSection
  liquidFund: InvestmentStatisticsSection
  realEstate: InvestmentStatisticsSection
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch investment statistics for all sections (Overview, Equity, LiquidFund, RealEstate)
 * in a single GraphQL request for optimal performance.
 */
export function useInvestmentStatistics(accessToken: string, currencyCode?: string): InvestmentStatisticsResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<InvestmentStatisticsResult, 'refetch'>>({
    overview: {
      current: { totalInvestments: 0, totalInvested: 0, averageStakePercentage: 0, totalMarketValue: 0 },
      previous: { totalInvestments: 0, totalInvested: 0, averageStakePercentage: 0, totalMarketValue: 0 }
    },
    equity: {
      current: { totalInvestments: 0, totalInvested: 0, averageStakePercentage: 0, totalMarketValue: 0 },
      previous: { totalInvestments: 0, totalInvested: 0, averageStakePercentage: 0, totalMarketValue: 0 }
    },
    liquidFund: {
      current: { totalInvestments: 0, totalInvested: 0, averageStakePercentage: 0, totalMarketValue: 0 },
      previous: { totalInvestments: 0, totalInvested: 0, averageStakePercentage: 0, totalMarketValue: 0 }
    },
    realEstate: {
      current: { totalInvestments: 0, totalInvested: 0, averageStakePercentage: 0, totalMarketValue: 0 },
      previous: { totalInvestments: 0, totalInvested: 0, averageStakePercentage: 0, totalMarketValue: 0 }
    },
    isLoading: true,
    error: null
  })

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Access token is required' }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Calculate date 91 days ago for comparison
      const ninetyOneDaysAgo = new Date()
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91)
      const comparisonDate = ninetyOneDaysAgo.toISOString()

      const currencyCondition = currencyCode ? `{ currency: { code: { _eq: "${currencyCode}" } } }` : ''

      // Single GraphQL request with all 4 sections (current + previous for each)
      const query = `
        query GetAllInvestmentStatistics {
          # Overview - Current
          overviewCurrent: InvestmentAggregate(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                ${currencyCondition}
              ]
            }
          ) {
            aggregate {
              count
              sum { totalInvestmentAmount investmentMarketValue }
              avg { stakePercentage }
            }
          }
          
          # Overview - Previous (91 days ago)
          overviewPrevious: InvestmentAggregate(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { createdAt: { _lte: "${comparisonDate}" } }
                ${currencyCondition}
              ]
            }
          ) {
            aggregate {
              count
              sum { totalInvestmentAmount investmentMarketValue }
              avg { stakePercentage }
            }
          }
          
          # Equity - Current
          equityCurrent: InvestmentAggregate(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { equityInvestment: { id: { _isNull: false } } }
                ${currencyCondition}
              ]
            }
          ) {
            aggregate {
              count
              sum { totalInvestmentAmount investmentMarketValue }
              avg { stakePercentage }
            }
          }
          
          # Equity - Previous
          equityPrevious: InvestmentAggregate(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { equityInvestment: { id: { _isNull: false } } }
                { createdAt: { _lte: "${comparisonDate}" } }
                ${currencyCondition}
              ]
            }
          ) {
            aggregate {
              count
              sum { totalInvestmentAmount investmentMarketValue }
              avg { stakePercentage }
            }
          }
          
          # Liquid Fund - Current
          liquidFundCurrent: InvestmentAggregate(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { liquidFundInvestment: { id: { _isNull: false } } }
                ${currencyCondition}
              ]
            }
          ) {
            aggregate {
              count
              sum { totalInvestmentAmount investmentMarketValue }
              avg { stakePercentage }
            }
          }
          
          # Liquid Fund - Previous
          liquidFundPrevious: InvestmentAggregate(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { liquidFundInvestment: { id: { _isNull: false } } }
                { createdAt: { _lte: "${comparisonDate}" } }
                ${currencyCondition}
              ]
            }
          ) {
            aggregate {
              count
              sum { totalInvestmentAmount investmentMarketValue }
              avg { stakePercentage }
            }
          }
          
          # Real Estate - Current
          realEstateCurrent: InvestmentAggregate(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { realEstateInvestment: { id: { _isNull: false } } }
                ${currencyCondition}
              ]
            }
          ) {
            aggregate {
              count
              sum { totalInvestmentAmount investmentMarketValue }
              avg { stakePercentage }
            }
          }
          
          # Real Estate - Previous
          realEstatePrevious: InvestmentAggregate(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { realEstateInvestment: { id: { _isNull: false } } }
                { createdAt: { _lte: "${comparisonDate}" } }
                ${currencyCondition}
              ]
            }
          ) {
            aggregate {
              count
              sum { totalInvestmentAmount investmentMarketValue }
              avg { stakePercentage }
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        overviewCurrent: {
          aggregate: {
            count: number
            sum: { totalInvestmentAmount: number | null; investmentMarketValue: number | null }
            avg: { stakePercentage: number | null }
          }
        }
        overviewPrevious: {
          aggregate: {
            count: number
            sum: { totalInvestmentAmount: number | null; investmentMarketValue: number | null }
            avg: { stakePercentage: number | null }
          }
        }
        equityCurrent: {
          aggregate: {
            count: number
            sum: { totalInvestmentAmount: number | null; investmentMarketValue: number | null }
            avg: { stakePercentage: number | null }
          }
        }
        equityPrevious: {
          aggregate: {
            count: number
            sum: { totalInvestmentAmount: number | null; investmentMarketValue: number | null }
            avg: { stakePercentage: number | null }
          }
        }
        liquidFundCurrent: {
          aggregate: {
            count: number
            sum: { totalInvestmentAmount: number | null; investmentMarketValue: number | null }
            avg: { stakePercentage: number | null }
          }
        }
        liquidFundPrevious: {
          aggregate: {
            count: number
            sum: { totalInvestmentAmount: number | null; investmentMarketValue: number | null }
            avg: { stakePercentage: number | null }
          }
        }
        realEstateCurrent: {
          aggregate: {
            count: number
            sum: { totalInvestmentAmount: number | null; investmentMarketValue: number | null }
            avg: { stakePercentage: number | null }
          }
        }
        realEstatePrevious: {
          aggregate: {
            count: number
            sum: { totalInvestmentAmount: number | null; investmentMarketValue: number | null }
            avg: { stakePercentage: number | null }
          }
        }
      }>(query)

      setState({
        overview: {
          current: {
            totalInvestments: result.overviewCurrent.aggregate.count,
            totalInvested: result.overviewCurrent.aggregate.sum.totalInvestmentAmount || 0,
            averageStakePercentage: result.overviewCurrent.aggregate.avg.stakePercentage || 0,
            totalMarketValue: result.overviewCurrent.aggregate.sum.investmentMarketValue || 0
          },
          previous: {
            totalInvestments: result.overviewPrevious.aggregate.count,
            totalInvested: result.overviewPrevious.aggregate.sum.totalInvestmentAmount || 0,
            averageStakePercentage: result.overviewPrevious.aggregate.avg.stakePercentage || 0,
            totalMarketValue: result.overviewPrevious.aggregate.sum.investmentMarketValue || 0
          }
        },
        equity: {
          current: {
            totalInvestments: result.equityCurrent.aggregate.count,
            totalInvested: result.equityCurrent.aggregate.sum.totalInvestmentAmount || 0,
            averageStakePercentage: result.equityCurrent.aggregate.avg.stakePercentage || 0,
            totalMarketValue: result.equityCurrent.aggregate.sum.investmentMarketValue || 0
          },
          previous: {
            totalInvestments: result.equityPrevious.aggregate.count,
            totalInvested: result.equityPrevious.aggregate.sum.totalInvestmentAmount || 0,
            averageStakePercentage: result.equityPrevious.aggregate.avg.stakePercentage || 0,
            totalMarketValue: result.equityPrevious.aggregate.sum.investmentMarketValue || 0
          }
        },
        liquidFund: {
          current: {
            totalInvestments: result.liquidFundCurrent.aggregate.count,
            totalInvested: result.liquidFundCurrent.aggregate.sum.totalInvestmentAmount || 0,
            averageStakePercentage: result.liquidFundCurrent.aggregate.avg.stakePercentage || 0,
            totalMarketValue: result.liquidFundCurrent.aggregate.sum.investmentMarketValue || 0
          },
          previous: {
            totalInvestments: result.liquidFundPrevious.aggregate.count,
            totalInvested: result.liquidFundPrevious.aggregate.sum.totalInvestmentAmount || 0,
            averageStakePercentage: result.liquidFundPrevious.aggregate.avg.stakePercentage || 0,
            totalMarketValue: result.liquidFundPrevious.aggregate.sum.investmentMarketValue || 0
          }
        },
        realEstate: {
          current: {
            totalInvestments: result.realEstateCurrent.aggregate.count,
            totalInvested: result.realEstateCurrent.aggregate.sum.totalInvestmentAmount || 0,
            averageStakePercentage: result.realEstateCurrent.aggregate.avg.stakePercentage || 0,
            totalMarketValue: result.realEstateCurrent.aggregate.sum.investmentMarketValue || 0
          },
          previous: {
            totalInvestments: result.realEstatePrevious.aggregate.count,
            totalInvested: result.realEstatePrevious.aggregate.sum.totalInvestmentAmount || 0,
            averageStakePercentage: result.realEstatePrevious.aggregate.avg.stakePercentage || 0,
            totalMarketValue: result.realEstatePrevious.aggregate.sum.investmentMarketValue || 0
          }
        },
        isLoading: false,
        error: null
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
      console.error('Error loading investment statistics:', err)
    }
  }, [accessToken, currencyCode, graphqlClient])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    ...state,
    refetch: loadData
  }
}
