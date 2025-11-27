import { useState, useCallback, useRef, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { CatalogOption } from '../types'
import { GET_TRAVEL_REGIONS_WITH_COUNT, GET_TRAVEL_REGIONS_BY_PARENT } from '../queries/TravelRegionFormQueries'

const TRAVEL_REGIONS_FALLBACK = [
  { id: 'western-europe', name: 'Western Europe' },
  { id: 'eastern-europe', name: 'Eastern Europe' },
  { id: 'north-america', name: 'North America' },
  { id: 'south-america', name: 'South America' },
  { id: 'asia-pacific', name: 'Asia Pacific' },
  { id: 'middle-east', name: 'Middle East' },
  { id: 'africa', name: 'Africa' },
  { id: 'oceania', name: 'Oceania' },
  { id: 'domestic', name: 'Domestic' },
  { id: 'international', name: 'International' }
]

const REGION_LIMIT = 50

interface UseCatalogDataProps {
  accessToken: string
  travelRegionSetId?: string
}

export const useCatalogData = ({ accessToken, travelRegionSetId }: UseCatalogDataProps) => {
  const [countries, setCountries] = useState<CatalogOption[]>([])
  const [currencies, setCurrencies] = useState<CatalogOption[]>([])
  const [travelRegions, setTravelRegions] = useState<CatalogOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state for travel regions
  const [isLoadingMoreRegions, setIsLoadingMoreRegions] = useState(false)
  const offsetRef = useRef(0)
  const hasMoreRef = useRef(true)
  const totalRegionsRef = useRef(0)
  const isLoadingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const selectedCountryCodeRef = useRef<string | undefined>(undefined) // Track selected country for pagination

  // Pagination state for countries
  const [isLoadingMoreCountries, setIsLoadingMoreCountries] = useState(false)
  const countryOffsetRef = useRef(0)
  const hasMoreCountriesRef = useRef(true)
  const totalCountriesRef = useRef(0)
  const isLoadingCountriesRef = useRef(false)

  const catalogClient = useCatalogManagerClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)

  // Load catalog data (countries and currencies only - travel regions loaded separately)
  const loadCatalogData = useCallback(async () => {
    setCatalogsLoading(true)
    try {
      // Load ALL countries at once (500 limit is enough for ~253 countries)
      // We need all countries to sort them alphabetically
      const [countriesRes, currenciesRes] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          {
            limit: 500, // Load all countries at once
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Currency', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )
      ])

      // Map and sort ALL countries alphabetically by value (country name)
      const countriesList = countriesRes.data
        .map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
        .sort((a, b) => a.value.localeCompare(b.value)) // Sort alphabetically by country name

      setCountries(countriesList)
      totalCountriesRef.current = countriesList.length
      countryOffsetRef.current = countriesList.length
      hasMoreCountriesRef.current = false // All countries loaded
      isLoadingCountriesRef.current = false

      setCurrencies(
        currenciesRes.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
      )
    } catch (err) {
      console.error('Error loading catalog data:', err)
      setError('Failed to load catalog data')
    } finally {
      setCatalogsLoading(false)
    }
  }, [catalogClient])

  // Load more countries (for infinite scroll)
  const loadMoreCountries = useCallback(async () => {
    if (isLoadingCountriesRef.current || !hasMoreCountriesRef.current) {
      return
    }

    isLoadingCountriesRef.current = true
    setIsLoadingMoreCountries(true)

    try {
      const countriesRes = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'Country', version: 'v1' },
        {
          limit: 50,
          offset: countryOffsetRef.current,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const newCountries = countriesRes.data
        .map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
        .sort((a, b) => a.value.localeCompare(b.value)) // Sort alphabetically by country name

      setCountries(prev => [...prev, ...newCountries].sort((a, b) => a.value.localeCompare(b.value))) // Re-sort entire list
      countryOffsetRef.current += newCountries.length
      hasMoreCountriesRef.current = newCountries.length >= 50 // If we got 50, assume there may be more
    } catch (err) {
      console.error('❌ Error loading more countries:', err)
    } finally {
      isLoadingCountriesRef.current = false
      setIsLoadingMoreCountries(false)
    }
  }, [catalogClient])

  // Load travel regions for the travel region set (called when country is selected or on init)
  const loadTravelRegions = useCallback(
    async (_countryCode?: string) => {
      if (!travelRegionSetId) {
        return
      }

      // Store country code for pagination (not used for filtering anymore)
      selectedCountryCodeRef.current = _countryCode

      setIsLoadingMoreRegions(true)

      try {
        // Load ALL regions for the travel region set without country filter
        // The country field is separate from travel region and shouldn't filter the region list
        const query = GET_TRAVEL_REGIONS_WITH_COUNT() // No country filter
        const result = await graphqlClient.request<{
          parent: Array<{ id: string; childEntriesAggregate: { aggregate: { count: number } } }>
          regions: any[]
        }>(query, { parentEntryId: travelRegionSetId, limit: REGION_LIMIT, offset: 0 })

        totalRegionsRef.current = result.parent[0]?.childEntriesAggregate.aggregate.count || 0

        const regions = result.regions.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))

        setTravelRegions(regions)
        offsetRef.current = regions.length
        hasMoreRef.current = offsetRef.current < totalRegionsRef.current
        isLoadingRef.current = false
      } catch (err) {
        console.error('❌ Error loading travel regions:', err)
        setError('Failed to load travel regions')
        setTravelRegions(
          TRAVEL_REGIONS_FALLBACK.map(region => ({
            id: region.id,
            value: region.name,
            code: region.id
          }))
        )
      } finally {
        setIsLoadingMoreRegions(false)
      }
    },
    [travelRegionSetId, graphqlClient]
  )

  // Load more travel regions (for infinite scroll)
  const loadMoreTravelRegions = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current || !travelRegionSetId) {
      return
    }

    isLoadingRef.current = true
    setIsLoadingMoreRegions(true)

    try {
      // Load ALL regions without country filter
      const query = GET_TRAVEL_REGIONS_BY_PARENT() // No country filter
      const result = await graphqlClient.request<{ CatalogEntry: any[] }>(query, {
        parentEntryId: travelRegionSetId,
        limit: REGION_LIMIT,
        offset: offsetRef.current
      })

      const newRegions = result.CatalogEntry.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      }))

      setTravelRegions(prev => [...prev, ...newRegions])
      offsetRef.current += newRegions.length
      hasMoreRef.current = offsetRef.current < totalRegionsRef.current
    } catch (err) {
      console.error('❌ Error loading more travel regions:', err)
    } finally {
      isLoadingRef.current = false
      setIsLoadingMoreRegions(false)
    }
  }, [travelRegionSetId, graphqlClient])

  // Reset pagination when country changes (don't reload, just reset state)
  const resetPagination = useCallback(() => {
    offsetRef.current = 0
    hasMoreRef.current = true
    totalRegionsRef.current = 0
    setTravelRegions([])
  }, [])

  // Initial load
  useEffect(() => {
    if (accessToken && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true
      loadCatalogData()
      // Also load travel regions if travelRegionSetId is available
      if (travelRegionSetId) {
        loadTravelRegions()
      }
    }
  }, [accessToken, loadCatalogData, travelRegionSetId, loadTravelRegions])

  return {
    countries,
    currencies,
    travelRegions,
    catalogsLoading,
    error,
    // Travel regions pagination
    isLoadingMoreRegions,
    hasMoreRef,
    offsetRef,
    totalRegionsRef,
    loadTravelRegions, // Load regions for selected country
    loadMoreTravelRegions, // Load more regions for pagination
    resetPagination, // Reset pagination state
    // Countries pagination
    isLoadingMoreCountries,
    hasMoreCountriesRef,
    loadMoreCountries // Load more countries for pagination
  }
}
