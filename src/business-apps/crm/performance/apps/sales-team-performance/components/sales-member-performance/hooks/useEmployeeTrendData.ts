import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeTrendData {
  currentValue: number
  previousValue: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
}

export interface EmployeePerformanceTrends {
  leadsWorked: EmployeeTrendData
  contactsWorked: EmployeeTrendData
  opportunitiesManaged: EmployeeTrendData
  activitiesCompleted: EmployeeTrendData
  isLoading: boolean
  error: string | null
}

export const useEmployeeTrendData = (accessToken: string, employeeId: string) => {
  const [trends, setTrends] = useState<EmployeePerformanceTrends>({
    leadsWorked: {
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      trendPercentage: 0
    },
    contactsWorked: {
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      trendPercentage: 0
    },
    opportunitiesManaged: {
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      trendPercentage: 0
    },
    activitiesCompleted: {
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      trendPercentage: 0
    },
    isLoading: true,
    error: null
  })

  const graphqlClient = useGraphQLClient(accessToken)

  const calculateTrend = (
    current: number,
    previous: number
  ): { trend: 'up' | 'down' | 'stable'; percentage: number } => {
    if (previous === 0 && current > 0) return { trend: 'up', percentage: 100 }
    if (previous === 0 && current === 0) return { trend: 'stable', percentage: 0 }

    const percentage = ((current - previous) / previous) * 100
    const trend = percentage > 3 ? 'up' : percentage < -3 ? 'down' : 'stable'

    return { trend, percentage: Math.abs(percentage) }
  }

  const getCurrentAndPreviousMonthDates = () => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    return {
      currentStart: currentMonth.toISOString(),
      previousStart: previousMonth.toISOString(),
      previousEnd: previousMonthEnd.toISOString()
    }
  }

  const fetchLeadsTrends = async () => {
    const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousMonthDates()

    const currentLeadsQuery = `
      query GetCurrentMonthLeads($employeeId: uuid!) {
        Lead(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            createdAt: { _gte: "${currentStart}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    const previousLeadsQuery = `
      query GetPreviousMonthLeads($employeeId: uuid!) {
        Lead(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            createdAt: { _gte: "${previousStart}", _lte: "${previousEnd}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    try {
      const [currentResult, previousResult] = await Promise.all([
        graphqlClient.request(currentLeadsQuery, { employeeId }),
        graphqlClient.request(previousLeadsQuery, { employeeId })
      ])

      const currentLeads = (currentResult as any).Lead.length
      const previousLeads = (previousResult as any).Lead.length

      const { trend, percentage } = calculateTrend(currentLeads, previousLeads)

      return {
        currentValue: currentLeads,
        previousValue: previousLeads,
        trend,
        trendPercentage: percentage
      }
    } catch (error) {
      console.error('Error fetching leads trends:', error)
      throw error
    }
  }

  const fetchContactsTrends = async () => {
    const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousMonthDates()

    const currentContactsQuery = `
      query GetCurrentMonthContacts($employeeId: uuid!) {
        Contact(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            createdAt: { _gte: "${currentStart}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    const previousContactsQuery = `
      query GetPreviousMonthContacts($employeeId: uuid!) {
        Contact(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            createdAt: { _gte: "${previousStart}", _lte: "${previousEnd}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    try {
      const [currentResult, previousResult] = await Promise.all([
        graphqlClient.request(currentContactsQuery, { employeeId }),
        graphqlClient.request(previousContactsQuery, { employeeId })
      ])

      const currentContacts = (currentResult as any).Contact.length
      const previousContacts = (previousResult as any).Contact.length

      const { trend, percentage } = calculateTrend(currentContacts, previousContacts)

      return {
        currentValue: currentContacts,
        previousValue: previousContacts,
        trend,
        trendPercentage: percentage
      }
    } catch (error) {
      console.error('Error fetching contacts trends:', error)
      throw error
    }
  }

  const fetchOpportunitiesTrends = async () => {
    const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousMonthDates()

    const currentOpportunitiesQuery = `
      query GetCurrentMonthOpportunities($employeeId: uuid!) {
        Opportunity(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            createdAt: { _gte: "${currentStart}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    const previousOpportunitiesQuery = `
      query GetPreviousMonthOpportunities($employeeId: uuid!) {
        Opportunity(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            createdAt: { _gte: "${previousStart}", _lte: "${previousEnd}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    try {
      const [currentResult, previousResult] = await Promise.all([
        graphqlClient.request(currentOpportunitiesQuery, { employeeId }),
        graphqlClient.request(previousOpportunitiesQuery, { employeeId })
      ])

      const currentOpportunities = (currentResult as any).Opportunity.length
      const previousOpportunities = (previousResult as any).Opportunity.length

      const { trend, percentage } = calculateTrend(currentOpportunities, previousOpportunities)

      return {
        currentValue: currentOpportunities,
        previousValue: previousOpportunities,
        trend,
        trendPercentage: percentage
      }
    } catch (error) {
      console.error('Error fetching opportunities trends:', error)
      throw error
    }
  }

  const fetchActivitiesTrends = async () => {
    const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousMonthDates()

    const currentActivitiesQuery = `
      query GetCurrentMonthActivities($employeeId: uuid!) {
        SalesActivity(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            completedAt: { _gte: "${currentStart}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    const previousActivitiesQuery = `
      query GetPreviousMonthActivities($employeeId: uuid!) {
        SalesActivity(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            completedAt: { _gte: "${previousStart}", _lte: "${previousEnd}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    try {
      const [currentResult, previousResult] = await Promise.all([
        graphqlClient.request(currentActivitiesQuery, { employeeId }),
        graphqlClient.request(previousActivitiesQuery, { employeeId })
      ])

      const currentActivities = (currentResult as any).SalesActivity.length
      const previousActivities = (previousResult as any).SalesActivity.length

      const { trend, percentage } = calculateTrend(currentActivities, previousActivities)

      return {
        currentValue: currentActivities,
        previousValue: previousActivities,
        trend,
        trendPercentage: percentage
      }
    } catch (error) {
      console.error('Error fetching activities trends:', error)
      throw error
    }
  }

  const fetchAllEmployeeTrends = useCallback(async () => {
    if (!accessToken || !employeeId) return

    setTrends(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const [leadsTrend, contactsTrend, opportunitiesTrend, activitiesTrend] = await Promise.all([
        fetchLeadsTrends(),
        fetchContactsTrends(),
        fetchOpportunitiesTrends(),
        fetchActivitiesTrends()
      ])

      setTrends({
        leadsWorked: leadsTrend,
        contactsWorked: contactsTrend,
        opportunitiesManaged: opportunitiesTrend,
        activitiesCompleted: activitiesTrend,
        isLoading: false,
        error: null
      })
    } catch (error) {
      setTrends(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch employee trend data'
      }))
    }
  }, [accessToken, employeeId])

  useEffect(() => {
    fetchAllEmployeeTrends()
  }, [fetchAllEmployeeTrends])

  return {
    trends,
    refetch: fetchAllEmployeeTrends
  }
}
