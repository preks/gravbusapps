import { useState, useCallback, useRef, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { CatalogOption } from '../types'
import { GET_TRAVEL_REGIONS_WITH_COUNT } from '../queries/TravelRegionFormQueries'

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

const REGION_LIMIT = 5000

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

  const [isLoadingMoreRegions, setIsLoadingMoreRegions] = useState(false)
  const hasMoreRef = useRef(false)
  const initialLoadDoneRef = useRef(false)

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

  // Load all travel regions for the travel region set in a single request
  const loadTravelRegions = useCallback(async () => {
    if (!travelRegionSetId) {
      return
    }

    setIsLoadingMoreRegions(true)

    try {
      const query = GET_TRAVEL_REGIONS_WITH_COUNT()
      const result = await graphqlClient.request<{
        parent: Array<{ id: string; childEntriesAggregate: { aggregate: { count: number } } }>
        regions: any[]
      }>(query, { parentEntryId: travelRegionSetId, limit: REGION_LIMIT, offset: 0 })

      const regions = result.regions.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      }))

      setTravelRegions(regions)
      hasMoreRef.current = false
    } catch (err) {
      console.error('Error loading travel regions:', err)
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
  }, [travelRegionSetId, graphqlClient])

  const loadMoreTravelRegions = useCallback(async () => {
    // All regions are loaded in the initial request — nothing to do
  }, [])

  const resetPagination = useCallback(() => {
    setTravelRegions([])
    hasMoreRef.current = false
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
    isLoadingMoreRegions,
    hasMoreRef,
    loadTravelRegions,
    loadMoreTravelRegions,
    resetPagination,
    isLoadingMoreCountries,
    hasMoreCountriesRef,
    loadMoreCountries
  }
}
