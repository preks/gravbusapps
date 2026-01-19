import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetCrmDashboardStats } from '../queries/CrmDashboardQueries'

export interface CrmDashboardStats {
  // CRM Stats (filtered by sourceApp and excluding deleted records)
  activeOpportunities: number
  pipelineValue: number
  totalLeads: number
  totalOpportunities: number
  totalAccounts: number
  totalContacts: number
}

export const useCrmDashboardStats = (context: BusinessAppContextProps) => {
  const { fetchCrmDashboardStats } = useGetCrmDashboardStats(context)
  const [stats, setStats] = useState<CrmDashboardStats>({
    activeOpportunities: 0,
    pipelineValue: 0,
    totalLeads: 0,
    totalOpportunities: 0,
    totalAccounts: 0,
    totalContacts: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!context.accessToken) {
      setError('No access token available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchCrmDashboardStats()

      // Extract CRM data (filtered by sourceApp and excluding deleted records)
      const dashboardStats: CrmDashboardStats = {
        activeOpportunities: result.activeOpportunities?.aggregate?.count || 0,
        pipelineValue: result.pipelineValue?.aggregate?.sum?.estimatedAmount || 0,
        totalLeads: result.totalLeads?.aggregate?.count || 0,
        totalOpportunities: result.totalOpportunities?.aggregate?.count || 0,
        totalAccounts: result.totalAccounts?.aggregate?.count || 0,
        totalContacts: result.totalContacts?.aggregate?.count || 0
      }

      setStats(dashboardStats)
    } catch (err) {
      console.error('Error fetching CRM dashboard stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard statistics')
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = async () => {
    await fetchData()
  }

  // Auto-fetch on mount when access token is available
  useEffect(() => {
    if (context.accessToken) {
      fetchData()
    }
  }, [context.accessToken])

  return {
    stats,
    isLoading,
    error,
    refetch
  }
}
