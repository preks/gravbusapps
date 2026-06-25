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

const REGION_PAGE_SIZE = 100

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

  const [isLoadingRegions, setIsLoadingRegions] = useState(false)
  const hasMoreRegionsRef = useRef(false)
  const regionOffsetRef = useRef(0)
  const regionTotalRef = useRef(0)
  const isLoadingRegionsRef = useRef(false)
  const currentCountryCodeRef = useRef<string | undefined>(undefined)
  const initialLoadDoneRef = useRef(false)
  // Stores the full unfiltered list so client-side search can filter without re-fetching
  const allTravelRegionsRef = useRef<CatalogOption[]>([])

  // Pagination state for countries
  const [isLoadingMoreCountries, setIsLoadingMoreCountries] = useState(false)
  const countryOffsetRef = useRef(0)
  const hasMoreCountriesRef = useRef(true)
  const totalCountriesRef = useRef(0)
  const isLoadingCountriesRef = useRef(false)

  const catalogClient = useCatalogManagerClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)

  const loadCatalogData = useCallback(async () => {
    setCatalogsLoading(true)
    try {
      const [countriesRes, currenciesRes] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          {
            limit: 500,
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

      const countriesList = countriesRes.data
        .map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
        .sort((a: CatalogOption, b: CatalogOption) => a.value.localeCompare(b.value))

      setCountries(countriesList)
      totalCountriesRef.current = countriesList.length
      countryOffsetRef.current = countriesList.length
      hasMoreCountriesRef.current = false
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
        .sort((a: CatalogOption, b: CatalogOption) => a.value.localeCompare(b.value))

      setCountries(prev => [...prev, ...newCountries].sort((a, b) => a.value.localeCompare(b.value)))
      countryOffsetRef.current += newCountries.length
      hasMoreCountriesRef.current = newCountries.length >= 50
    } catch (err) {
      console.error('Error loading more countries:', err)
    } finally {
      isLoadingCountriesRef.current = false
      setIsLoadingMoreCountries(false)
    }
  }, [catalogClient])

  const fetchRegionsPage = useCallback(
    async (countryCode?: string, offset = 0, searchTerm?: string) => {
      if (!travelRegionSetId) return null

      const query = GET_TRAVEL_REGIONS_WITH_COUNT(countryCode, searchTerm)
      return graphqlClient.request<{
        parent: Array<{ id: string; childEntriesAggregate: { aggregate: { count: number } } }>
        regions: any[]
      }>(query, {
        parentEntryId: travelRegionSetId,
        limit: REGION_PAGE_SIZE,
        offset
      })
    },
    [travelRegionSetId, graphqlClient]
  )

  const loadTravelRegions = useCallback(
    async (countryCode?: string) => {
      if (!travelRegionSetId || isLoadingRegionsRef.current) return

      isLoadingRegionsRef.current = true
      setIsLoadingRegions(true)
      currentCountryCodeRef.current = countryCode
      regionOffsetRef.current = 0

      try {
        const result = await fetchRegionsPage(countryCode, 0)
        if (!result) return

        const totalCount = result.parent[0]?.childEntriesAggregate?.aggregate?.count ?? 0
        regionTotalRef.current = totalCount

        let regions = result.regions.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))

        // If the country-code filter returned no results, fall back to all regions in the set
        if (regions.length === 0 && countryCode) {
          const fallbackResult = await fetchRegionsPage(undefined, 0)
          if (fallbackResult) {
            regions = fallbackResult.regions.map((item: any) => ({
              id: item.id,
              value: item.value,
              code: item.code
            }))
            regionTotalRef.current = fallbackResult.parent[0]?.childEntriesAggregate?.aggregate?.count ?? 0
          }
        }

        setTravelRegions(regions)
        allTravelRegionsRef.current = regions
        regionOffsetRef.current = regions.length
        hasMoreRegionsRef.current = regions.length < regionTotalRef.current
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
        hasMoreRegionsRef.current = false
      } finally {
        isLoadingRegionsRef.current = false
        setIsLoadingRegions(false)
      }
    },
    [travelRegionSetId, fetchRegionsPage]
  )

  const loadMoreTravelRegions = useCallback(async () => {
    if (!travelRegionSetId || isLoadingRegionsRef.current || !hasMoreRegionsRef.current) return

    isLoadingRegionsRef.current = true
    setIsLoadingRegions(true)

    try {
      const result = await fetchRegionsPage(currentCountryCodeRef.current, regionOffsetRef.current)
      if (!result) return

      const newRegions = result.regions.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      }))

      setTravelRegions(prev => [...prev, ...newRegions])
      allTravelRegionsRef.current = [...allTravelRegionsRef.current, ...newRegions]
      regionOffsetRef.current += newRegions.length
      hasMoreRegionsRef.current = regionOffsetRef.current < regionTotalRef.current
    } catch (err) {
      console.error('Error loading more travel regions:', err)
    } finally {
      isLoadingRegionsRef.current = false
      setIsLoadingRegions(false)
    }
  }, [travelRegionSetId, fetchRegionsPage])

  const searchTravelRegions = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        // Restore full list when search is cleared
        setTravelRegions(allTravelRegionsRef.current)
        return
      }

      if (hasMoreRegionsRef.current) {
        // More pages exist — do a server-side search so all regions are covered
        if (isLoadingRegionsRef.current) return
        isLoadingRegionsRef.current = true
        setIsLoadingRegions(true)
        try {
          const result = await fetchRegionsPage(currentCountryCodeRef.current, 0, searchTerm)
          if (result) {
            const regions = result.regions.map((item: any) => ({
              id: item.id,
              value: item.value,
              code: item.code
            }))
            setTravelRegions(regions)
          }
        } catch (err) {
          console.error('Error searching travel regions:', err)
        } finally {
          isLoadingRegionsRef.current = false
          setIsLoadingRegions(false)
        }
        return
      }

      // All regions are already loaded — filter client-side instantly
      const lower = searchTerm.toLowerCase()
      const filtered = allTravelRegionsRef.current.filter(
        region =>
          region.value.toLowerCase().includes(lower) || (region.code && region.code.toLowerCase().includes(lower))
      )
      setTravelRegions(filtered)
    },
    [fetchRegionsPage]
  )

  const resetPagination = useCallback(() => {
    setTravelRegions([])
    allTravelRegionsRef.current = []
    hasMoreRegionsRef.current = false
    regionOffsetRef.current = 0
    regionTotalRef.current = 0
    currentCountryCodeRef.current = undefined
  }, [])

  useEffect(() => {
    if (accessToken && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true
      loadCatalogData()
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
    isLoadingRegions,
    hasMoreRegions: hasMoreRegionsRef,
    loadTravelRegions,
    loadMoreTravelRegions,
    searchTravelRegions,
    resetPagination,
    isLoadingMoreCountries,
    hasMoreCountriesRef,
    loadMoreCountries
  }
}
