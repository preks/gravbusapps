import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isValidDate } from '@/common/utils/dateFormatter'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'

export interface RealEstateKPIData {
  totalInvestments: number
  totalAmountInvested: number
  totalMarketValue: number
  averageOccupancyRate: number
}

export interface RealEstateKPIComparison {
  current: RealEstateKPIData
  previous: RealEstateKPIData
}

interface RealEstateKPIQueryResult {
  query: string
  variables: Record<string, any>
}

const buildRealEstateKPIQuery = (
  comparisonDate: string,
  currencyFilter?: string,
  filters?: Record<string, any>
): RealEstateKPIQueryResult => {
  // Validate comparison date
  if (!isValidDate(comparisonDate)) {
    throw new Error('Invalid comparison date format')
  }

  const variables = { ...filters }

  // Build custom conditions for real estate investment type and currency
  const customConditions: Record<string, any>[] = [{ realEstateInvestment: {} }]

  if (currencyFilter) {
    customConditions.push({ currency: { code: { _eq: currencyFilter } } })
  }

  // Build where clauses for Investment entity
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

  // For RealEstateInvestment entity - need to build custom where
  // since we don't have descriptors for this entity yet
  const realEstateCustomConditions: any = {
    isDeleted: { _eq: false },
    occupancyPercent: { _gte: 0 },
    investment: { isDeleted: { _eq: false } }
  }

  // Apply filters to nested investment for real estate queries
  if (currencyFilter) {
    realEstateCustomConditions.investment.currency = { code: { _eq: currencyFilter } }
  }

  // Apply ID-based filters to nested investment
  if (filters?.ownerEmployeeIds && Array.isArray(filters.ownerEmployeeIds) && filters.ownerEmployeeIds.length > 0) {
    realEstateCustomConditions.investment.ownerEmployee = { id: { _in: filters.ownerEmployeeIds } }
  }
  if (filters?.investmentTypeIds && Array.isArray(filters.investmentTypeIds) && filters.investmentTypeIds.length > 0) {
    realEstateCustomConditions.investment.investmentType = { id: { _in: filters.investmentTypeIds } }
  }
  if (
    filters?.investmentStatusIds &&
    Array.isArray(filters.investmentStatusIds) &&
    filters.investmentStatusIds.length > 0
  ) {
    realEstateCustomConditions.investment.investmentStatus = { id: { _in: filters.investmentStatusIds } }
  }
  if (
    filters?.investmentAccountIds &&
    Array.isArray(filters.investmentAccountIds) &&
    filters.investmentAccountIds.length > 0
  ) {
    realEstateCustomConditions.investment.investmentAccounts = {
      investmentAccount: { id: { _in: filters.investmentAccountIds } }
    }
  }
  if (filters?.opportunityIds && Array.isArray(filters.opportunityIds) && filters.opportunityIds.length > 0) {
    realEstateCustomConditions.investment.investmentOpportunity = { id: { _in: filters.opportunityIds } }
  }

  // Date range filters for real estate queries
  if (filters?.acquisitionDateFrom && isValidDate(filters.acquisitionDateFrom)) {
    if (!realEstateCustomConditions.investment.acquisitionDate) {
      realEstateCustomConditions.investment.acquisitionDate = {}
    }
    realEstateCustomConditions.investment.acquisitionDate._gte = filters.acquisitionDateFrom
  }
  if (filters?.acquisitionDateTo && isValidDate(filters.acquisitionDateTo)) {
    if (!realEstateCustomConditions.investment.acquisitionDate) {
      realEstateCustomConditions.investment.acquisitionDate = {}
    }
    realEstateCustomConditions.investment.acquisitionDate._lte = filters.acquisitionDateTo
  }

  const currentRealEstateWhere = { ...realEstateCustomConditions }
  const previousRealEstateWhere = {
    ...realEstateCustomConditions,
    createdAt: { _lte: comparisonDate }
  }

  const query = `
    query GetRealEstateKPIsWithComparison(
      $currentWhere: InvestmentBoolExp,
      $previousWhere: InvestmentBoolExp,
      $currentRealEstateWhere: RealEstateInvestmentBoolExp,
      $previousRealEstateWhere: RealEstateInvestmentBoolExp
    ) {
      # Current data (real estate investments only)
      currentAggregate: InvestmentAggregate(where: $currentWhere) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }
      
      # Current real estate data for occupancy
      currentRealEstateAggregate: RealEstateInvestmentAggregate(where: $currentRealEstateWhere) {
        aggregate {
          count
          avg {
            occupancyPercent
          }
        }
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
      
      # Previous real estate data for occupancy
      previousRealEstateAggregate: RealEstateInvestmentAggregate(where: $previousRealEstateWhere) {
        aggregate {
          count
          avg {
            occupancyPercent
          }
        }
      }
    }
  `

  return {
    query,
    variables: {
      currentWhere,
      previousWhere,
      currentRealEstateWhere,
      previousRealEstateWhere
    }
  }
}

const AVERAGE_OCCUPANCY_FALLBACK = 0

/**
 * Hook to fetch real estate KPI data with period comparison
 * Uses standard descriptor-based filtering from common where applicable
 */
export const useGetRealEstateKPIs = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchRealEstateKPIs = useCallback(
    async (
      comparisonDate: string,
      currencyFilter?: string,
      filters?: Record<string, any>
    ): Promise<RealEstateKPIComparison> => {
      if (!context.accessToken) {
        throw new Error('[useGetRealEstateKPIs] Access token is required')
      }

      const { query, variables } = buildRealEstateKPIQuery(comparisonDate, currencyFilter, filters)

      try {
        const result = await graphqlClient.request<any>(query, variables)

        // Process current KPIs
        const currentData: RealEstateKPIData = {
          totalInvestments: result.currentAggregate.aggregate.count || 0,
          totalAmountInvested: result.currentAggregate.aggregate.sum?.totalInvestmentAmount || 0,
          totalMarketValue: result.currentAggregate.aggregate.sum?.investmentMarketValue || 0,
          averageOccupancyRate:
            result.currentRealEstateAggregate.aggregate.avg?.occupancyPercent || AVERAGE_OCCUPANCY_FALLBACK
        }

        // Process previous KPIs
        const previousData: RealEstateKPIData = {
          totalInvestments: result.previousAggregate.aggregate.count || 0,
          totalAmountInvested: result.previousAggregate.aggregate.sum?.totalInvestmentAmount || 0,
          totalMarketValue: result.previousAggregate.aggregate.sum?.investmentMarketValue || 0,
          averageOccupancyRate:
            result.previousRealEstateAggregate.aggregate.avg?.occupancyPercent || AVERAGE_OCCUPANCY_FALLBACK
        }

        return {
          current: currentData,
          previous: previousData
        }
      } catch (error) {
        console.error('[useGetRealEstateKPIs] Error fetching real estate KPIs:', error)
        throw error
      }
    },
    [context.accessToken, graphqlClient]
  )

  return { fetchRealEstateKPIs }
}
