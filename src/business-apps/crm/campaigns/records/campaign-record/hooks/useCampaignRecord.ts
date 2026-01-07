import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignRecordQueries } from '../queries'
import { CampaignRecord, UseCampaignRecordReturn } from '../types'

// Helper function to parse catalog reference
const parseCatalogReference = (typeRef?: string) => {
  if (!typeRef) {
    return {
      id: '',
      code: '',
      value: 'Unknown'
    }
  }

  // Parse format like "SalesCampaignType:v1:SEASONAL_PROMOTION"
  const parts = typeRef.split(':')
  if (parts.length >= 3) {
    const code = parts[2]
    // Convert code to readable value
    const value = code
      .replace(/_/g, ' ') // NOSONAR: replaceAll not available in current TypeScript lib
      .toLowerCase()
      .replace(/\b\w/g, (l: string) => l.toUpperCase()) // NOSONAR: replaceAll not available in current TypeScript lib
    return {
      id: typeRef,
      code: code,
      value: value
    }
  }

  return {
    id: typeRef,
    code: typeRef,
    value: typeRef
  }
}

export const useCampaignRecord = (context: BusinessAppContextProps, campaignId: string): UseCampaignRecordReturn => {
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCampaignRecord } = useCampaignRecordQueries(context)

  const loadCampaignRecord = useCallback(async () => {
    if (!context.accessToken || !campaignId) {
      setError('No access token or campaign ID available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchCampaignRecord({ campaignId })

      if (result.SalesCampaign && result.SalesCampaign.length > 0) {
        const campaignData = result.SalesCampaign[0]
        setCampaign({
          id: campaignData.id,
          name: campaignData.name,
          description: campaignData.description,
          startDate: campaignData.startDate,
          endDate: campaignData.endDate,
          createdAt: campaignData.createdAt,
          updatedAt: campaignData.updatedAt,
          isDeleted: campaignData.isDeleted,
          type: parseCatalogReference(campaignData.typeRef)
        })
      } else {
        setError('Campaign not found')
        setCampaign(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setCampaign(null)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, campaignId, fetchCampaignRecord])

  const refetch = useCallback(() => {
    loadCampaignRecord()
  }, [loadCampaignRecord])

  useEffect(() => {
    if (context.accessToken && campaignId) {
      loadCampaignRecord()
    }
  }, [context.accessToken, campaignId, loadCampaignRecord])

  return {
    campaign,
    isLoading,
    error,
    refetch
  }
}
