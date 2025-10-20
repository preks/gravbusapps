'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface LeadStatusOption {
  id: string
  name: string
}

export interface UseGetLeadStatusesReturn {
  leadStatusOptions: LeadStatusOption[]
  isLoading: boolean
  error: string | null
}

export const useGetLeadStatuses = (
  context: BusinessAppContextProps,
  searchRegex: string = '',
  offset: number = 0
): UseGetLeadStatusesReturn => {
  const [leadStatusOptions, setLeadStatusOptions] = useState<LeadStatusOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const loadLeadStatuses = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const requestParams = {
        limit: 5,
        offset,
        returnTotalRecords: true,
        localeCode: userLocale,
        ...(searchRegex ? { searchCriteria: searchRegex } : {})
      }

      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'SalesLeadStatus',
          version: 'v1'
        },
        requestParams
      )

      if (response?.data) {
        const processedOptions = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || entry.id
        }))

        // Enforce frontend limit of 5 items since API doesn't respect limit with search criteria
        const limitedOptions = processedOptions.slice(0, 5)

        setLeadStatusOptions(limitedOptions)
      } else {
        setLeadStatusOptions([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lead statuses'
      setError(errorMessage)
      console.error('Error loading lead statuses:', err)
      setLeadStatusOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, context.accessToken, searchRegex, offset, userLocale])

  useEffect(() => {
    loadLeadStatuses()
  }, [loadLeadStatuses])

  return {
    leadStatusOptions,
    isLoading,
    error
  }
}
