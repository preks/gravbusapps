import { useState, useCallback, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface AccountType {
  id: string
  name: string
  value: string
}

export interface UseGetAccountTypesReturn {
  typeOptions: AccountType[]
  isLoading: boolean
  error: any
}

export const LEGAL_FORM_CATALOG = 'LegalForm'
export const CATALOG_VERSION = 'v1'

export const useGetAccountTypes = (context: BusinessAppContextProps, search: string = ''): UseGetAccountTypesReturn => {
  const [typeOptions, setTypeOptions] = useState<AccountType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchAccountTypes = useCallback(
    async (searchTerm: string = '') => {
      if (!context.accessToken) {
        console.warn('No access token provided to useGetAccountTypes')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const params: any = {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }

        // Add search criteria if provided
        if (searchTerm && searchTerm.trim().length >= 2) {
          params.searchCriteria = searchTerm.trim()
        }

        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: LEGAL_FORM_CATALOG,
            version: CATALOG_VERSION
          },
          params
        )

        const mappedTypes: AccountType[] = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.label || entry.name || 'Unknown',
          value: entry.value || entry.label || entry.name || 'Unknown'
        }))

        setTypeOptions(mappedTypes)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch account types')
        setError(error)
        console.error('Error fetching account types:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, catalogClient]
  )

  useEffect(() => {
    if (context.accessToken) {
      fetchAccountTypes(search)
    }
  }, [context.accessToken, search, fetchAccountTypes])

  return {
    typeOptions,
    isLoading,
    error
  }
}
