'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface LeadSourceOption {
  id: string
  name: string
}

export interface UseGetLeadSourcesReturn {
  leadSourceOptions: LeadSourceOption[]
  isLoading: boolean
  error: string | null
}

export const useGetLeadSources = (
  context: BusinessAppContextProps,
  searchRegex: string = '',
  offset: number = 0
): UseGetLeadSourcesReturn => {
  const [leadSourceOptions, setLeadSourceOptions] = useState<LeadSourceOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const loadLeadSources = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'SalesLeadSource',
          version: 'v1'
        },
        {
          limit: 5,
          offset,
          returnTotalRecords: true,
          localeCode: userLocale,
          value: searchRegex
        }
      )

      if (response?.data) {
        const processedOptions = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || entry.id
        }))

        setLeadSourceOptions(processedOptions)
      } else {
        setLeadSourceOptions([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lead sources'
      setError(errorMessage)
      console.error('Error loading lead sources:', err)
      setLeadSourceOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, context.accessToken, searchRegex, offset, userLocale])

  useEffect(() => {
    loadLeadSources()
  }, [loadLeadSources])

  return {
    leadSourceOptions,
    isLoading,
    error
  }
}
