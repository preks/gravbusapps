// Customer Lead Filters hook
import { useEffect, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FilterOption {
  id: string
  label: string
}

export interface UseCustomerLeadFiltersReturn {
  statuses: FilterOption[]
  ratings: FilterOption[]
  sources: FilterOption[]
  owners: FilterOption[]
  countries: FilterOption[]
  regions: FilterOption[]
  cities: FilterOption[]
  isLoading: boolean
}

export const useCustomerLeadFilters = (context: BusinessAppContextProps): UseCustomerLeadFiltersReturn => {
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(context.accessToken)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const [statuses, setStatuses] = useState<FilterOption[]>([])
  const [ratings, setRatings] = useState<FilterOption[]>([])
  const [sources, setSources] = useState<FilterOption[]>([])
  const [owners, setOwners] = useState<FilterOption[]>([])
  const [countries, setCountries] = useState<FilterOption[]>([])
  const [regions, setRegions] = useState<FilterOption[]>([])
  const [cities, setCities] = useState<FilterOption[]>([])

  const loadFilters = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)

    try {
      const [statusesResp, ratingsResp, sourcesResp, countriesResp] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'CustomerLeadStatus', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'CustomerLeadRating', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'CustomerLeadSource', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 300, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        )
      ])

      // Load owners from GraphQL
      const ownerQuery = `
        query GetLeadOwners {
          Lead(
            where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } } }
            distinctOn: [ownerEmployeeId]
            limit: 50
          ) {
            ownerEmployee {
              id
              firstName
              lastName
              displayName
            }
          }
        }
      `
      const ownersRes = await graphqlClient.request<{
        Lead: Array<{
          ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
        }>
      }>(ownerQuery)

      setStatuses((statusesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setRatings((ratingsResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setSources((sourcesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setCountries((countriesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))

      const ownerItems = (ownersRes.Lead || [])
        .filter(r => r.ownerEmployee)
        .map(r => {
          const emp = r.ownerEmployee!
          const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
          return { id: emp.id, label: name }
        })
      setOwners(ownerItems)

      setRegions([])
      setCities([])
    } catch (error) {
      console.error('Error loading lead filters:', error)
      setStatuses([])
      setRatings([])
      setSources([])
      setOwners([])
      setCountries([])
      setRegions([])
      setCities([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, catalogClient, graphqlClient])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  return {
    statuses,
    ratings,
    sources,
    owners,
    countries,
    regions,
    cities,
    isLoading
  }
}
