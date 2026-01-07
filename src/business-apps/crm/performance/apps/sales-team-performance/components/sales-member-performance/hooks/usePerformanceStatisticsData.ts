import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ALL_PERFORMANCE_STATISTICS } from '../queries/PerformanceStatisticsQueries'
import { PerformanceStatistics } from '../types/performanceTypes'

// Response type for the GraphQL query
interface PerformanceStatisticsResponse {
  totalLeads: { aggregate: { count: number } }
  convertedLeads: { aggregate: { count: number } }
  totalContacts: { aggregate: { count: number } }
  contactsWithSalesActivity: { aggregate: { count: number } }
  totalOpportunities: { aggregate: { count: number } }
  wonOpportunities: { aggregate: { count: number } }
  totalAccounts: { aggregate: { count: number } }
  accountsRevenue: { aggregate: { sum: { estimatedAmount: number | null } } }
  sampleOpportunity: Array<{
    currencyRef: string | null
    currency: { value: string; code: string } | null
  }>
}

export interface UsePerformanceStatisticsDataReturn {
  statistics: PerformanceStatistics
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const usePerformanceStatisticsData = (
  context: BusinessAppContextProps,
  employeeId: string,
  currencyCode?: string
): UsePerformanceStatisticsDataReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [statistics, setStatistics] = useState<PerformanceStatistics>({
    leadsWorked: {
      total: 0,
      converted: 0,
      conversionRate: 0
    },
    contactsWorked: {
      total: 0,
      salesRelated: 0,
      percentage: 0
    },
    opportunitiesManaged: {
      total: 0,
      won: 0,
      winRate: 0
    },
    accountsManaged: {
      total: 0,
      revenue: 0,
      currencyId: 'EUR' // Default fallback
    }
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to extract currency code from currency reference
  const extractCurrencyCode = useCallback((currencyRef: string | null, currencyObj: any): string => {
    if (currencyObj?.code) {
      return currencyObj.code
    }
    if (currencyRef) {
      return currencyRef.split(':').pop() || 'EUR'
    }
    return 'EUR'
  }, [])

  // Helper function to calculate percentages safely
  const calculatePercentage = useCallback((part: number, total: number): number => {
    return total > 0 ? Math.round((part / total) * 100) : 0
  }, [])

  const fetchStatistics = useCallback(async () => {
    if (!context.accessToken || !employeeId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_ALL_PERFORMANCE_STATISTICS(currencyCode)
      const response = await graphqlClient.request<PerformanceStatisticsResponse>(query, {
        employeeId
      })

      // Extract counts from response - handle both possible response structures
      const totalLeads = response.totalLeads?.aggregate?.count ?? 0
      const convertedLeads = response.convertedLeads?.aggregate?.count ?? 0
      const totalContacts = response.totalContacts?.aggregate?.count ?? 0
      const contactsWithSalesActivity = response.contactsWithSalesActivity?.aggregate?.count ?? 0
      const totalOpportunities = response.totalOpportunities?.aggregate?.count ?? 0
      const wonOpportunities = response.wonOpportunities?.aggregate?.count ?? 0
      const totalAccounts = response.totalAccounts?.aggregate?.count ?? 0
      const accountsRevenue = response.accountsRevenue?.aggregate?.sum?.estimatedAmount ?? 0

      // Get currency from sample opportunity
      const sampleOpp = response.sampleOpportunity?.[0]
      const detectedCurrencyCode = extractCurrencyCode(sampleOpp?.currencyRef, sampleOpp?.currency)

      // Calculate percentages
      const leadsConversionRate = calculatePercentage(convertedLeads, totalLeads)
      const contactsPercentage = calculatePercentage(contactsWithSalesActivity, totalContacts)
      const opportunitiesWinRate = calculatePercentage(wonOpportunities, totalOpportunities)

      // Build statistics object
      const newStatistics: PerformanceStatistics = {
        leadsWorked: {
          total: totalLeads,
          converted: convertedLeads,
          conversionRate: leadsConversionRate
        },
        contactsWorked: {
          total: totalContacts,
          salesRelated: contactsWithSalesActivity,
          percentage: contactsPercentage
        },
        opportunitiesManaged: {
          total: totalOpportunities,
          won: wonOpportunities,
          winRate: opportunitiesWinRate
        },
        accountsManaged: {
          total: totalAccounts,
          revenue: accountsRevenue,
          currencyId: detectedCurrencyCode
        }
      }

      setStatistics(newStatistics)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch performance statistics'
      console.error('Error fetching performance statistics:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, employeeId, currencyCode, graphqlClient, extractCurrencyCode, calculatePercentage])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics
  }
}
