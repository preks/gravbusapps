'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface CompanySizeOption {
  id: string
  name: string
}

export interface UseGetCompanySizesReturn {
  companySizeOptions: CompanySizeOption[]
  isLoading: boolean
  error: string | null
}

export const useGetCompanySizes = (
  context: BusinessAppContextProps,
  searchRegex: string = '',
  offset: number = 0
): UseGetCompanySizesReturn => {
  const [companySizeOptions, setCompanySizeOptions] = useState<CompanySizeOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const loadCompanySizes = useCallback(async () => {
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
          catalogIdentifier: 'EmployeeSize',
          version: 'v1'
        },
        requestParams
      )

      if (response?.data) {
        const processedOptions = response.data.map((entry: any) => {
          let displayName = entry.value || entry.code || entry.id

          // Format company size display name (remove leading zeros)
          if (displayName && typeof displayName === 'string') {
            displayName = displayName.replace(/^0+(\d)/, '$1')
          }

          return {
            id: entry.id,
            name: displayName
          }
        })

        // Enforce frontend limit of 5 items since API doesn't respect limit with search criteria
        const limitedOptions = processedOptions.slice(0, 5)

        setCompanySizeOptions(limitedOptions)
      } else {
        setCompanySizeOptions([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load company sizes'
      setError(errorMessage)
      console.error('Error loading company sizes:', err)
      setCompanySizeOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, context.accessToken, searchRegex, offset, userLocale])

  useEffect(() => {
    loadCompanySizes()
  }, [loadCompanySizes])

  return {
    companySizeOptions,
    isLoading,
    error
  }
}
