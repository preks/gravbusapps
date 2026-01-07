import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface CatalogEntryData {
  id: string
  value: string
}

const CONTRACT_TYPE_CATALOG = 'ContractType'
const EMPLOYMENT_TYPE_CATALOG = 'EmploymentType'
const CATALOG_VERSION = 'v1'

export const useCatalogEntries = (accessToken: string) => {
  const [contractTypes, setContractTypes] = useState<CatalogEntryData[]>([])
  const [employmentTypes, setEmploymentTypes] = useState<CatalogEntryData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = getCurrentActiveUserLocale() || 'en-US'

  const fetchCatalogEntries = useCallback(async () => {
    if (!accessToken || !catalogClient) return

    setLoading(true)
    setError(null)

    try {
      const [contractTypesResponse, employmentTypesResponse] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: CONTRACT_TYPE_CATALOG,
            version: CATALOG_VERSION
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            localeCode: userLocale
          }
        ),
        catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: EMPLOYMENT_TYPE_CATALOG,
            version: CATALOG_VERSION
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            localeCode: userLocale
          }
        )
      ])

      const contractTypesData: CatalogEntryData[] = (contractTypesResponse.data || []).map((entry: any) => ({
        id: entry.id,
        value: entry.value || entry.code || ''
      }))

      const employmentTypesData: CatalogEntryData[] = (employmentTypesResponse.data || []).map((entry: any) => ({
        id: entry.id,
        value: entry.value || entry.code || ''
      }))

      setContractTypes(contractTypesData)
      setEmploymentTypes(employmentTypesData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch catalog entries'
      setError(new Error(errorMessage))
      console.error('Error fetching catalog entries:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, catalogClient, userLocale])

  useEffect(() => {
    if (accessToken) {
      fetchCatalogEntries()
    }
  }, [accessToken, fetchCatalogEntries])

  return {
    contractTypes,
    employmentTypes,
    loading,
    error,
    refetch: fetchCatalogEntries
  }
}
