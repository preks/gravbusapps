import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface OpportunityStatusOption {
  id: string
  value: string
  label: string
  name: string
}

export interface UseOpportunityStatusCatalogReturn {
  opportunityStatusOptions: OpportunityStatusOption[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useOpportunityStatusCatalog = (context: BusinessAppContextProps): UseOpportunityStatusCatalogReturn => {
  const [opportunityStatusOptions, setOpportunityStatusOptions] = useState<OpportunityStatusOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const loadOpportunityStatuses = useCallback(async () => {
    if (!context.accessToken) {
      console.log('No access token available for opportunity statuses')
      setIsLoading(false)
      return
    }

    console.log('Loading opportunity statuses from catalog...')
    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'SalesOpportunityStatus',
          version: 'v1'
        },
        {
          limit: 50,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true,
          localeCode: userLocale
        }
      )

      if (response?.data) {
        // Use only id and value fields since label and name don't exist in database
        const mappedOptions: OpportunityStatusOption[] = response.data.map((entry: any) => ({
          id: entry.id,
          value: entry.id, // Send the full catalog reference as value for API
          label: entry.value, // Display the human-readable value from database
          name: entry.value // Same as label
        }))

        setOpportunityStatusOptions(mappedOptions)
      } else {
        console.log('No opportunity status data received')
        setOpportunityStatusOptions([])
      }
    } catch (err) {
      console.error('Error fetching opportunity statuses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load opportunity statuses')
      setOpportunityStatusOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, context.accessToken, userLocale])

  useEffect(() => {
    // Only load once when accessToken becomes available
    if (context.accessToken && opportunityStatusOptions.length === 0) {
      loadOpportunityStatuses()
    }
  }, [context.accessToken, opportunityStatusOptions.length, loadOpportunityStatuses])

  return {
    opportunityStatusOptions,
    isLoading,
    error,
    refetch: loadOpportunityStatuses
  }
}
