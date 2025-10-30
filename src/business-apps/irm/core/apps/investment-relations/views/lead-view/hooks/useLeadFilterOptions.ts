import { useEffect, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildFilterGroups } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_LEAD_DESCRIPTORS } from '@/common/data/investment/queries/investmentLeadQueries'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FilterOption {
  id: string
  value: string
}

interface UseLeadFilterOptionsReturn {
  statuses: FilterOption[]
  ratings: FilterOption[]
  sources: FilterOption[]
  owners: FilterOption[]
  countries: FilterOption[]
  regions: FilterOption[]
  cities: FilterOption[]
  isLoading: boolean
}

export const useLeadFilterOptions = (context: BusinessAppContextProps): UseLeadFilterOptionsReturn => {
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

  // Load statuses from catalog
  const loadStatuses = useCallback(async () => {
    try {
      const resp = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'InvestmentLeadStatus', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
      )
      const items = (resp?.data || []).map((e: any) => ({ id: e.id, value: e.value || e.code }))
      setStatuses(items)
    } catch {
      setStatuses([])
    }
  }, [catalogClient])

  // Load ratings from catalog
  const loadRatings = useCallback(async () => {
    try {
      const resp = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'InvestmentLeadRating', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
      )
      const items = (resp?.data || []).map((e: any) => ({ id: e.id, value: e.value || e.code }))
      setRatings(items)
    } catch {
      setRatings([])
    }
  }, [catalogClient])

  // Load sources from catalog
  const loadSources = useCallback(async () => {
    try {
      const resp = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'InvestmentLeadSource', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
      )
      const items = (resp?.data || []).map((e: any) => ({ id: e.id, value: e.value || e.code }))
      setSources(items)
    } catch {
      setSources([])
    }
  }, [catalogClient])

  // Load owners from GraphQL
  const loadOwners = useCallback(async () => {
    try {
      const queries = buildFilterGroups({
        entityName: 'InvestmentLead',
        descriptors: INVESTMENT_LEAD_DESCRIPTORS,
        searchByKey: { ownerEmployeeIds: '' },
        limit: 50
      })
      const query = queries['ownerEmployeeIds']
      const res = await graphqlClient.request<{
        InvestmentLead: Array<{
          ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
        }>
      }>(query)
      const items = (res.InvestmentLead || [])
        .filter(r => r.ownerEmployee)
        .map(r => {
          const emp = r.ownerEmployee!
          const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
          return { id: emp.id, value: name }
        })
      setOwners(items)
    } catch {
      setOwners([])
    }
  }, [graphqlClient])

  // Load countries from catalog
  const loadCountries = useCallback(async () => {
    try {
      const resp = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'Country', version: 'v1' },
        { limit: 300, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
      )
      const items = (resp?.data || []).map((e: any) => ({ id: e.id, value: e.value || e.code }))
      setCountries(items)
    } catch {
      setCountries([])
    }
  }, [catalogClient])

  // Load regions and cities from distinct values (simplified for now)
  const loadGeography = useCallback(async () => {
    try {
      // For now, leave these empty - they can be populated from GraphQL distinct queries if needed
      setRegions([])
      setCities([])
    } catch {
      setRegions([])
      setCities([])
    }
  }, [])

  useEffect(() => {
    if (context.accessToken) {
      Promise.all([loadStatuses(), loadRatings(), loadSources(), loadOwners(), loadCountries(), loadGeography()]).then(
        () => {
          setIsLoading(false)
        }
      )
    }
  }, [context.accessToken, loadStatuses, loadRatings, loadSources, loadOwners, loadCountries, loadGeography])

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
