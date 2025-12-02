import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ContactsOverTimeData {
  date: string
  count: number
  cumulative: number
}

export interface ContactsOverTimeMetrics {
  total: number
  totalLastMonth: number
  thisMonth: number
  lastMonth: number
  growth: number
  totalGrowth: number
  data: ContactsOverTimeData[]
  totalAccounts: number // For calculating average contacts per account
}

export type TimeFilter = 'month' | 'quarter' | 'year' | 'historical'

export interface UseContactsOverTimeProps {
  accessToken: string
  timeFilter?: TimeFilter
}

export const useContactsOverTime = ({ accessToken, timeFilter = 'quarter' }: UseContactsOverTimeProps) => {
  const [data, setData] = useState<ContactsOverTimeMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchContactsOverTime = async () => {
      if (!accessToken) return

      try {
        setIsLoading(true)
        setError(null)

        // Calculate date range based on filter
        const endDate = new Date()
        const startDate = new Date()

        switch (timeFilter) {
          case 'month':
            startDate.setMonth(endDate.getMonth() - 1)
            break
          case 'quarter':
            startDate.setMonth(endDate.getMonth() - 3)
            break
          case 'year':
            startDate.setFullYear(endDate.getFullYear() - 1)
            break
          case 'historical':
            startDate.setFullYear(endDate.getFullYear() - 2)
            break
        }

        // Calculate this month and last month date ranges
        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

        const query = `
          query GetContactsOverTime(
            $startDate: timestamptz!, 
            $endDate: timestamptz!,
            $thisMonthStart: timestamptz!,
            $thisMonthEnd: timestamptz!,
            $lastMonthStart: timestamptz!,
            $lastMonthEnd: timestamptz!
          ) {
            contacts: Contact(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: $startDate, _lte: $endDate }
              }
              orderBy: [{ createdAt: ASC }]
            ) {
              id
              createdAt
              firstName
              lastName
              email
              accountId
              communicationChannels {
                id
              }
            }
            totalContacts: ContactAggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _lte: $endDate }
              }
            ) {
              aggregate {
                count
              }
            }
            totalNumberOfContacts: ContactAggregate(
              where: {
                isDeleted: { _eq: false }
              }
            ) {
              aggregate {
                count
              }
            }
            thisMonthContacts: ContactAggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: $thisMonthStart, _lte: $thisMonthEnd }
              }
            ) {
              aggregate {
                count
              }
            }
            lastMonthContacts: ContactAggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: $lastMonthStart, _lte: $lastMonthEnd }
              }
            ) {
              aggregate {
                count
              }
            }
            totalLastMonthContacts: ContactAggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _lte: $lastMonthEnd }
              }
            ) {
              aggregate {
                count
              }
            }
            # Account count for calculating average contacts per account
            totalAccounts: AccountAggregate(
              where: {
                isDeleted: { _eq: false }
              }
            ) {
              aggregate {
                count
              }
            }
          }
        `

        const variables = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          thisMonthStart: thisMonthStart.toISOString(),
          thisMonthEnd: thisMonthEnd.toISOString(),
          lastMonthStart: lastMonthStart.toISOString(),
          lastMonthEnd: lastMonthEnd.toISOString()
        }

        const result = await graphqlClient.request(query, variables)
        const contacts = result.contacts || []

        // Group contacts by month
        const monthlyData = new Map<string, number>()
        contacts.forEach((contact: any) => {
          const date = new Date(contact.createdAt)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
          monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1)
        })

        // Generate monthly time series data
        const timeSeriesData: ContactsOverTimeData[] = []
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
        let cumulative = 0

        while (currentDate <= endDate) {
          const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`
          const count = monthlyData.get(monthKey) || 0
          cumulative += count

          timeSeriesData.push({
            date: monthKey,
            count,
            cumulative
          })

          currentDate.setMonth(currentDate.getMonth() + 1)
        }

        // Calculate metrics using aggregate results
        const total = result.totalNumberOfContacts?.aggregate?.count || 0
        const totalLastMonth = result.totalLastMonthContacts?.aggregate?.count || 0
        const thisMonth = result.thisMonthContacts?.aggregate?.count || 0
        const lastMonth = result.lastMonthContacts?.aggregate?.count || 0

        const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0

        const totalGrowth = totalLastMonth > 0 ? Math.round(((total - totalLastMonth) / totalLastMonth) * 100) : 0
        const totalAccounts = result.totalAccounts?.aggregate?.count || 0

        setData({
          total,
          totalLastMonth,
          thisMonth,
          lastMonth,
          growth,
          totalGrowth,
          data: timeSeriesData,
          totalAccounts
        })
      } catch (err) {
        // console.error("Error fetching contacts over time:", err);
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContactsOverTime()
  }, [accessToken, timeFilter, graphqlClient])

  return { data, isLoading, error }
}
