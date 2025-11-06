import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetCountriesAndRegions, FullCountryDetails, RegionDetails } from '../queries/CountriesRegionsQueries'

export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  code?: string
}

export interface UseCountriesRegionsReturn {
  // Countries
  countries: SelectOption[]
  countriesLoading: boolean
  countriesError: string | null
  countriesHasMore: boolean
  searchCountries: (searchTerm: string) => void
  loadMoreCountries: () => void

  // Regions for selected country
  regions: SelectOption[]
  regionsLoading: boolean
  regionsError: string | null
  searchRegions: (searchTerm: string) => void

  // Selected country info
  selectedCountryCode: string | null
  setSelectedCountry: (countryId: string) => void

  // Refresh
  refreshData: () => void
}

// Cache for countries and regions data to prevent continuous queries
// Using a Map to avoid module-level mutable state
const countryCache = new Map<string, { data: FullCountryDetails[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache
const CACHE_KEY = 'countries_regions_data'

export const useCountriesRegions = (context: BusinessAppContextProps): UseCountriesRegionsReturn => {
  const [fullCountriesData, setFullCountriesData] = useState<FullCountryDetails[]>([])
  const [displayedCountries, setDisplayedCountries] = useState<SelectOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCountryCode, setSelectedCountryCodeState] = useState<string | null>(null)
  const [countrySearchTerm, setCountrySearchTerm] = useState('')
  const [regionSearchTerm, setRegionSearchTerm] = useState('')
  const [countriesOffset, setCountriesOffset] = useState(0)
  const [hasMoreCountries, setHasMoreCountries] = useState(false)

  // Use refs to prevent infinite loops
  const hasInitializedRef = useRef(false)
  const isLoadingRef = useRef(false)

  const { fetchCountriesAndRegions } = useGetCountriesAndRegions(context)

  const COUNTRIES_PAGE_SIZE = 20

  const isCacheValid = useCallback(() => {
    const cached = countryCache.get(CACHE_KEY)
    if (!cached) return false
    return Date.now() - cached.timestamp < CACHE_DURATION
  }, [])

  const loadAllData = useCallback(async () => {
    if (!context.accessToken || hasInitializedRef.current || isLoadingRef.current) return

    isLoadingRef.current = true

    // Check if we have valid cached data
    const cached = countryCache.get(CACHE_KEY)
    if (isCacheValid() && cached) {
      setFullCountriesData(cached.data)
      hasInitializedRef.current = true
      isLoadingRef.current = false
      return
    }

    try {
      const data = await fetchCountriesAndRegions()
      setFullCountriesData(data)

      // Update cache
      countryCache.set(CACHE_KEY, { data, timestamp: Date.now() })
      hasInitializedRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load countries and regions')
    } finally {
      isLoadingRef.current = false
    }
  }, [context.accessToken, fetchCountriesAndRegions, isCacheValid])

  // Load initial countries page
  const loadCountriesPage = useCallback(
    (searchTerm: string = '', offset: number = 0, isLoadMore: boolean = false, selectedCountryId?: string) => {
      if (!fullCountriesData.length) return

      setIsLoading(!isLoadMore) // Only show loading on initial load

      // Filter countries based on search term
      let filteredCountries = fullCountriesData.map(item => ({
        id: item.country.id,
        value: item.country.id,
        label: item.country.displayValue,
        name: item.country.displayValue,
        code: item.country.code
      }))

      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase()
        filteredCountries = filteredCountries.filter(
          country =>
            country.label.toLowerCase().includes(searchLower) || country.code?.toLowerCase().includes(searchLower)
        )
      }

      // Apply pagination
      const startIndex = offset
      const endIndex = offset + COUNTRIES_PAGE_SIZE
      let pageCountries = filteredCountries.slice(startIndex, endIndex)
      const hasMore = endIndex < filteredCountries.length

      // ✅ CRITICAL: Ensure selected country is always in the displayed options
      if (selectedCountryId && !isLoadMore && !searchTerm.trim()) {
        const selectedCountry = filteredCountries.find(c => c.id === selectedCountryId)
        const isSelectedInPage = pageCountries.some(c => c.id === selectedCountryId)

        if (selectedCountry && !isSelectedInPage) {
          // Add selected country at the beginning
          pageCountries = [selectedCountry, ...pageCountries].slice(0, COUNTRIES_PAGE_SIZE)
        }
      }

      if (isLoadMore) {
        setDisplayedCountries(prev => [...prev, ...pageCountries])
      } else {
        setDisplayedCountries(pageCountries)
      }

      setHasMoreCountries(hasMore)
      setCountriesOffset(endIndex)
      setIsLoading(false)
    },
    [fullCountriesData]
  )

  // Initialize data loading - only once when accessToken is available
  useEffect(() => {
    if (context.accessToken && !hasInitializedRef.current && !isLoadingRef.current) {
      loadAllData()
    }
  }, [context.accessToken, loadAllData])

  // Load initial countries page when data is ready - only once
  useEffect(() => {
    if (fullCountriesData.length > 0 && displayedCountries.length === 0 && !isLoadingRef.current) {
      // ✅ Pass selected country to ensure it's included in initial options
      loadCountriesPage('', 0, false, selectedCountryCode || undefined)
    }
  }, [fullCountriesData.length, displayedCountries.length, loadCountriesPage, selectedCountryCode])

  // ✅ CRITICAL: Reload countries when selected country changes (for prefill scenarios)
  useEffect(() => {
    if (fullCountriesData.length > 0 && displayedCountries.length > 0 && selectedCountryCode) {
      const isSelectedInDisplayed = displayedCountries.some(c => c.id === selectedCountryCode)

      if (!isSelectedInDisplayed) {
        console.log('⚠️ Lead Form - Selected country not in displayed options, reloading...', {
          selectedCountryCode,
          displayedCount: displayedCountries.length
        })
        // Reload countries to include the selected one
        loadCountriesPage('', 0, false, selectedCountryCode)
      }
    }
  }, [selectedCountryCode, fullCountriesData.length, displayedCountries, loadCountriesPage])

  // Use displayed countries from pagination
  const countries = displayedCountries

  // Get regions for selected country
  const selectedCountryData = useMemo(() => {
    if (!selectedCountryCode) return null
    return fullCountriesData.find(item => item.country.id === selectedCountryCode)
  }, [fullCountriesData, selectedCountryCode])

  // Transform regions to SelectOptions with search filtering
  const regions = useMemo((): SelectOption[] => {
    if (!selectedCountryData) return []

    // Get all regions for the selected country
    const allRegions: RegionDetails[] = [
      ...(selectedCountryData.states || []),
      ...(selectedCountryData.regions || []),
      ...(selectedCountryData.counties || [])
    ]

    let filteredRegions = allRegions.map(region => ({
      id: region.id,
      value: region.id,
      label: region.displayValue,
      name: region.displayValue,
      code: region.code
    }))

    if (regionSearchTerm.trim()) {
      const searchLower = regionSearchTerm.toLowerCase()
      filteredRegions = filteredRegions.filter(
        region => region.label.toLowerCase().includes(searchLower) || region.code?.toLowerCase().includes(searchLower)
      )
    }

    return filteredRegions.slice(0, 50) // Limit to 50 for performance
  }, [selectedCountryData, regionSearchTerm])

  const searchCountries = useCallback(
    (searchTerm: string) => {
      setCountrySearchTerm(searchTerm)
      setCountriesOffset(0)
      loadCountriesPage(searchTerm, 0, false)
    },
    [loadCountriesPage]
  )

  const loadMoreCountries = useCallback(() => {
    if (hasMoreCountries && !isLoading) {
      loadCountriesPage(countrySearchTerm, countriesOffset, true)
    }
  }, [hasMoreCountries, isLoading, loadCountriesPage, countrySearchTerm, countriesOffset])

  const searchRegions = useCallback((searchTerm: string) => {
    setRegionSearchTerm(searchTerm)
  }, [])

  const setSelectedCountry = useCallback(
    (countryId: string) => {
      // Store the full country ID, not just the code
      setSelectedCountryCodeState(countryId)
      // Reset region search when country changes
      setRegionSearchTerm('')

      // Get the country data for debug logging
      const selectedCountry = fullCountriesData.find(item => item.country.id === countryId)
      if (selectedCountry) {
        // Optional: Debug logging (remove in production)
        // console.log("Selected country:", selectedCountry.country.value, "with",
        //   (selectedCountry.states?.length || 0) + (selectedCountry.regions?.length || 0) + (selectedCountry.counties?.length || 0), "regions");
      }
    },
    [fullCountriesData]
  )

  const refreshData = useCallback(async () => {
    // Clear cache to force refresh
    countryCache.delete(CACHE_KEY)
    hasInitializedRef.current = false
    isLoadingRef.current = false
    await loadAllData()
  }, [loadAllData])

  return {
    countries,
    countriesLoading: isLoading,
    countriesError: error,
    countriesHasMore: hasMoreCountries,
    searchCountries,
    loadMoreCountries,

    regions,
    regionsLoading: false, // Regions are derived from already loaded data
    regionsError: null,
    searchRegions,

    selectedCountryCode,
    setSelectedCountry,

    refreshData
  }
}
