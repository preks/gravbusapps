import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

interface ContactStatisticsTrendData {
  recentContacts: TrendData
  activeContacts: TrendData
  emailEngagements: TrendData
  contactsThisYear: TrendData
}

export interface UseContactStatisticsWithTrendReturn {
  trendData: ContactStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const GET_ALL_CUSTOMER_CONTACT_STATISTICS_WITH_TREND = `
  query GetAllCustomerContactStatisticsWithTrend(
    $currentStart: timestamptz!,
    $previousStart: timestamptz!,
    $previousEnd: timestamptz!,
    $lastMonth: timestamptz!,
    $thisYearStart: timestamptz!,
    $lastYearStart: timestamptz!,
    $lastYearEnd: timestamptz!
  ) {
    recentContactsCurrent: ContactAggregate(where: {
      createdAt: {_gte: $currentStart},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    recentContactsPrevious: ContactAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    activeContactsCurrent: ContactAggregate(where: {
      isDeleted: {_eq: false},
      activeTo: {_isNull: true}
    }) {
      aggregate {
        count
      }
    }
    activeContactsPrevious: ContactAggregate(where: {
      isDeleted: {_eq: false},
      activeTo: {_isNull: true},
      createdAt: {_lt: $lastMonth}
    }) {
      aggregate {
        count
      }
    }
    emailEngagementsCurrent: ContactAggregate(where: {
      isDeleted: {_eq: false},
      email: {_isNull: false}
    }) {
      aggregate {
        count
      }
    }
    emailEngagementsPrevious: ContactAggregate(where: {
      isDeleted: {_eq: false},
      email: {_isNull: false},
      createdAt: {_lt: $lastMonth}
    }) {
      aggregate {
        count
      }
    }
    contactsThisYearCurrent: ContactAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    contactsThisYearPrevious: ContactAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
  }
`

// Helper function outside component to prevent recreation
const calculateTrend = (current: number, previous: number): TrendData => {
  const change = current - previous
  let changePercent: number
  if (previous > 0) {
    changePercent = (change / previous) * 100
  } else if (current > 0) {
    changePercent = 100
  } else {
    changePercent = 0
  }
  return {
    current,
    previous,
    change,
    changePercent,
    isPositive: change >= 0
  }
}

export const useCustomerContactStatistics = (props: BusinessAppContextProps): UseContactStatisticsWithTrendReturn => {
  const [trendData, setTrendData] = useState<ContactStatisticsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken)

  const refetch = useCallback(async () => {
    if (!props.accessToken) {
      console.warn('No access token provided for contact statistics with trend loading')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const previousEnd = currentStart
      const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      const thisYearStart = new Date(now.getFullYear(), 0, 1)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

      const result = await graphqlClient.request<{
        recentContactsCurrent: { aggregate: { count: number } }
        recentContactsPrevious: { aggregate: { count: number } }
        activeContactsCurrent: { aggregate: { count: number } }
        activeContactsPrevious: { aggregate: { count: number } }
        emailEngagementsCurrent: { aggregate: { count: number } }
        emailEngagementsPrevious: { aggregate: { count: number } }
        contactsThisYearCurrent: { aggregate: { count: number } }
        contactsThisYearPrevious: { aggregate: { count: number } }
      }>(GET_ALL_CUSTOMER_CONTACT_STATISTICS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastMonth: lastMonth.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString()
      })

      setTrendData({
        recentContacts: calculateTrend(
          result.recentContactsCurrent.aggregate.count,
          result.recentContactsPrevious.aggregate.count
        ),
        activeContacts: calculateTrend(
          result.activeContactsCurrent.aggregate.count,
          result.activeContactsPrevious.aggregate.count
        ),
        emailEngagements: calculateTrend(
          result.emailEngagementsCurrent.aggregate.count,
          result.emailEngagementsPrevious.aggregate.count
        ),
        contactsThisYear: calculateTrend(
          result.contactsThisYearCurrent.aggregate.count,
          result.contactsThisYearPrevious.aggregate.count
        )
      })
    } catch (err) {
      console.error('Error fetching contact statistics with trend:', err)
      setError(err instanceof Error ? err : new Error('Failed to load contact statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [props.accessToken, graphqlClient])

  // Fetch statistics on mount and when access token changes
  useEffect(() => {
    if (props.accessToken) {
      refetch()
    }
  }, [props.accessToken, refetch])

  return {
    trendData,
    isLoading,
    error,
    refetch
  }
}
