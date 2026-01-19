import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignRecordQueries } from '../queries'
import { CampaignKPIs, CampaignKPIWithTrend, UseCampaignKPIsReturn } from '../types'

export const useCampaignKPIs = (context: BusinessAppContextProps, campaignId: string): UseCampaignKPIsReturn => {
  const [kpis, setKpis] = useState<CampaignKPIs | null>(null)
  const [kpisWithTrends, setKpisWithTrends] = useState<{
    totalLeads: CampaignKPIWithTrend
    totalAccounts: CampaignKPIWithTrend
    totalContacts: CampaignKPIWithTrend
    totalOpportunities: CampaignKPIWithTrend
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCampaignKPIs } = useCampaignRecordQueries(context)

  const loadCampaignKPIs = useCallback(async () => {
    if (!context.accessToken || !campaignId) {
      setError('No access token or campaign ID available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchCampaignKPIs({ campaignId })

      const totalLeads = result.totalLeads?.aggregate?.count || 0
      const convertedLeads = result.convertedLeads?.aggregate?.count || 0
      const totalAccounts = result.totalAccounts?.aggregate?.count || 0
      const totalContacts = result.totalContacts?.aggregate?.count || 0
      const totalOpportunities = result.totalOpportunities?.aggregate?.count || 0
      const wonOpportunities = result.wonOpportunities?.aggregate?.count || 0

      const convertedLeadsPercentage = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
      const wonOpportunitiesPercentage = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0

      const kpisData: CampaignKPIs = {
        totalLeads,
        convertedLeads,
        convertedLeadsPercentage,
        totalAccounts,
        totalContacts,
        totalOpportunities,
        wonOpportunities,
        wonOpportunitiesPercentage
      }

      const kpisWithTrendsData = {
        totalLeads: {
          current: totalLeads,
          percentage: convertedLeadsPercentage,
          trend: {
            value: '',
            positive: true,
            description: ''
          }
        },
        totalAccounts: {
          current: totalAccounts,
          trend: {
            value: '',
            positive: true,
            description: ''
          }
        },
        totalContacts: {
          current: totalContacts,
          trend: {
            value: '',
            positive: true,
            description: ''
          }
        },
        totalOpportunities: {
          current: totalOpportunities,
          percentage: wonOpportunitiesPercentage,
          trend: {
            value: '',
            positive: true,
            description: ''
          }
        }
      }

      setKpis(kpisData)
      setKpisWithTrends(kpisWithTrendsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setKpis(null)
      setKpisWithTrends(null)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, campaignId, fetchCampaignKPIs])

  const refetch = useCallback(() => {
    loadCampaignKPIs()
  }, [loadCampaignKPIs])

  useEffect(() => {
    if (context.accessToken && campaignId) {
      loadCampaignKPIs()
    }
  }, [context.accessToken, campaignId, loadCampaignKPIs])

  return {
    kpis,
    kpisWithTrends,
    isLoading,
    error,
    refetch
  }
}
