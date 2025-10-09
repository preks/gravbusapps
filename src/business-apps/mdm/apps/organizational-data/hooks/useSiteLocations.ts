import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import {
  SiteLocationData,
  SiteLocation,
  PaginatedSiteLocations,
  SiteLocationCountry,
  SiteLocationRegion
} from '../types'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

// Cache for resolved countries and regions to avoid duplicate API calls
interface CountryRegionCache {
  countries: Map<string, SiteLocationCountry>
  regions: Map<string, SiteLocationRegion[]>
}

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

export const useSiteLocations = (context: BusinessAppContextProps, initialPageSize: number = 10) => {
  const [siteLocations, setSiteLocations] = useState<SiteLocation[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const structureId = useRef<string>(context.additionalData?.structureId || 'active')

  // Cache for countries and regions to avoid duplicate API calls
  const cache = useRef<CountryRegionCache>({
    countries: new Map(),
    regions: new Map()
  })

  const restClient = useRestClient(ORGCHART_BASE_URL)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  // Helper function to extract country code from country_ref
  const extractCountryCode = (countryRef: string): string => {
    return countryRef.split(':').pop() || ''
  }

  // Helper function to extract region code from region_ref
  const extractRegionCode = (regionRef: string): string => {
    return regionRef.split(':').pop() || ''
  }

  // Helper function to resolve country name from code
  const resolveCountryName = (countryCode: string): string => {
    const country = cache.current.countries.get(countryCode)
    return country?.value || countryCode
  }

  // Helper function to resolve region name from code and country
  const resolveRegionName = (regionCode: string, countryCode: string): string => {
    const countryRegions = cache.current.regions.get(countryCode)
    if (countryRegions) {
      const region = countryRegions.find(r => r.code === regionCode)
      return region?.value || regionCode
    }
    return regionCode
  }

  // Transform API site location data to UI-friendly SiteLocation interface
  const transformSiteLocation = useCallback(
    (locationData: SiteLocationData): SiteLocation => {
      // Build full address string
      const addressParts = []
      if (locationData.addressLine?.streetAddress) {
        addressParts.push(locationData.addressLine.streetAddress)
      }
      if (locationData.postalCode) {
        addressParts.push(locationData.postalCode)
      }
      if (locationData.locality) {
        addressParts.push(locationData.locality)
      }

      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No address provided'

      // Extract and resolve country and region names from refs
      const countryCode = locationData.country_ref ? extractCountryCode(locationData.country_ref) : undefined
      const regionCode = locationData.region_ref ? extractRegionCode(locationData.region_ref) : undefined

      // Resolve actual names from cached data
      const country = countryCode ? resolveCountryName(countryCode) : undefined
      const region = regionCode && countryCode ? resolveRegionName(regionCode, countryCode) : undefined

      // Determine status based on having employees or cost centers
      const status: 'Active' | 'Inactive' =
        locationData.employees.length > 0 || locationData.costCenters.length > 0 ? 'Active' : 'Inactive'

      return {
        id: locationData.id,
        structureId: locationData.structureId,
        name: locationData.name,
        code: locationData.code,
        address: locationData.addressLine?.streetAddress,
        postalCode: locationData.postalCode,
        locality: locationData.locality,
        region,
        country,
        employeeCount: locationData.employees.length,
        costCenterCount: locationData.costCenters.length,
        employees: locationData.employees,
        costCenters: locationData.costCenters,
        fullAddress,
        status,
        ...(locationData.addressLine ? { addressLine: locationData.addressLine } : {})
      }
    },
    [resolveCountryName, resolveRegionName]
  )

  // Fetch raw site locations data from orgchart API
  const fetchRawSiteLocations = useCallback(
    async (page: number = 1, limit: number = 10): Promise<SiteLocationData[]> => {
      const offset = (page - 1) * limit
      try {
        if (!structureId) {
          throw new Error('Structure ID is required to fetch site locations')
        }

        const getStructureResponse = await restClient.get(`/structures/${structureId.current}`, {
          params: {
            nodeType: 'cost_center'
          },
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })
        structureId.current = getStructureResponse.structure.structureId

        const response = await restClient.get<PaginatedSiteLocations>('/site-locations', {
          params: {
            structureId: structureId.current,
            offset
          },
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })

        // Handle both the new paginated format and the old format for backward compatibility
        if (response.data && response.paging) {
          // New paginated response format
          setTotalCount(response.paging.totalRecords)
          return response.data
        } else {
          // Old format (backward compatibility)
          setTotalCount((response as unknown as SiteLocationData[]).length || 0)
          return response as unknown as SiteLocationData[]
        }
      } catch (error) {
        console.error('Error fetching site locations:', error)
        throw new Error('Failed to fetch site locations from orgchart API')
      }
    },
    [context.accessToken, restClient]
  )

  const fetchCountriesAndRegions = useCallback(async (): Promise<SiteLocationCountry[]> => {
    try {
      // Check if countries are already cached
      if (cache.current.countries.size > 0) {
        return Array.from(cache.current.countries.values())
      }

      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'Country',
          version: 'v1'
        },
        {
          limit: 1000,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: false
        }
      )

      const catalogEntries = response.data as SiteLocationCountry[]

      // Populate cache with countries indexed by code
      catalogEntries.forEach(country => {
        cache.current.countries.set(country.code, country)
      })

      return catalogEntries
    } catch (error) {
      console.error('Error fetching countries:', error)
      throw new Error('Failed to fetch countries from catalog')
    }
  }, [catalogClient])

  // Fetch regions for specific countries only (optimized for performance)
  const fetchRegionsForCountries = useCallback(
    async (countryCodes: string[]): Promise<void> => {
      try {
        // Filter out countries that already have regions cached
        const countriesToFetch = countryCodes.filter(countryCode => !cache.current.regions.has(countryCode))

        if (countriesToFetch.length === 0) {
          return // All regions already cached
        }

        // Fetch regions for all needed countries in parallel
        const regionPromises = countriesToFetch.map(async countryCode => {
          try {
            // Get the country ID from cache to use as parentEntryId
            const country = cache.current.countries.get(countryCode)
            if (!country) {
              console.warn(`Country not found in cache for code: ${countryCode}`)
              return []
            }

            const response = await catalogClient.getCatalogEntriesList(
              {
                catalogIdentifier: 'CountryRegion',
                version: 'v1'
              },
              {
                limit: 1000,
                offset: 0,
                returnTotalRecords: true,
                includeChildCatalogEntries: true,
                parentEntryId: country.id // Use country ID as parentEntryId
              }
            )

            const regions = response.data as unknown as SiteLocationRegion[]

            // Cache regions for this country
            cache.current.regions.set(countryCode, regions)

            return regions
          } catch (error) {
            console.error(`Error fetching regions for country ${countryCode}:`, error)
            // Don't throw here, just log and continue with other countries
            return []
          }
        })

        await Promise.all(regionPromises)
      } catch (error) {
        console.error('Error fetching regions for countries:', error)
        throw new Error('Failed to fetch regions from catalog')
      }
    },
    [catalogClient]
  )

  // Change page or page size
  const changePage = useCallback(
    async (page: number, size?: number) => {
      setIsLoading(true)
      setError(null)

      try {
        const newPageSize = size !== undefined ? size : pageSize
        if (size !== undefined) setPageSize(size)
        setCurrentPage(page)

        // Fetch raw data first
        const rawLocationsData = await fetchRawSiteLocations(page, newPageSize)

        // Extract unique country codes from raw site locations data
        const countryCodes = Array.from(
          new Set(
            rawLocationsData
              .map(location => {
                if (location.country_ref) {
                  return extractCountryCode(location.country_ref)
                }
                return null
              })
              .filter((code): code is string => Boolean(code))
          )
        )

        // Fetch regions only for countries present in site locations
        if (countryCodes.length > 0) {
          await fetchRegionsForCountries(countryCodes)
        }

        // Transform and set the final data
        const transformedData = rawLocationsData.map(transformSiteLocation)
        setSiteLocations(transformedData)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error changing page:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchRawSiteLocations, fetchRegionsForCountries, transformSiteLocation, pageSize]
  )

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First, fetch countries (cached after first call)
      await fetchCountriesAndRegions()

      // Fetch raw site locations data
      const rawLocationsData = await fetchRawSiteLocations(currentPage, pageSize)

      // Extract unique country codes from raw site locations data
      const countryCodes = Array.from(
        new Set(
          rawLocationsData
            .map(location => {
              if (location.country_ref) {
                return extractCountryCode(location.country_ref)
              }
              return null
            })
            .filter((code): code is string => Boolean(code))
        )
      )

      // Fetch regions only for countries present in site locations
      if (countryCodes.length > 0) {
        await fetchRegionsForCountries(countryCodes)
      }

      // Transform and set the final data
      const transformedData = rawLocationsData.map(transformSiteLocation)
      setSiteLocations(transformedData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading site locations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    fetchRawSiteLocations,
    fetchCountriesAndRegions,
    fetchRegionsForCountries,
    transformSiteLocation,
    currentPage,
    pageSize
  ])

  // Filter site locations by various criteria
  const filterSiteLocations = useCallback(
    (searchTerm: string = '', status?: 'Active' | 'Inactive' | 'ALL'): SiteLocation[] => {
      return siteLocations.filter(location => {
        // Search filter
        const matchesSearch =
          !searchTerm ||
          location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (location.code && location.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (location.address && location.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (location.locality && location.locality.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (location.country && location.country.toLowerCase().includes(searchTerm.toLowerCase()))

        // Status filter
        const matchesStatus = !status || status === 'ALL' || location.status === status

        return matchesSearch && matchesStatus
      })
    },
    [siteLocations]
  )

  // Get active site locations
  const getActiveSiteLocations = useCallback((): SiteLocation[] => {
    return siteLocations.filter(location => location.status === 'Active')
  }, [siteLocations])

  // Get inactive site locations
  const getInactiveSiteLocations = useCallback((): SiteLocation[] => {
    return siteLocations.filter(location => location.status === 'Inactive')
  }, [siteLocations])

  // Search site locations by name, code, or address
  const searchSiteLocations = useCallback(
    (query: string): SiteLocation[] => {
      const searchTerm = query.toLowerCase()
      return siteLocations.filter(
        location =>
          location.name.toLowerCase().includes(searchTerm) ||
          (location.code && location.code.toLowerCase().includes(searchTerm)) ||
          (location.address && location.address.toLowerCase().includes(searchTerm)) ||
          (location.locality && location.locality.toLowerCase().includes(searchTerm))
      )
    },
    [siteLocations]
  )

  // Get site location by ID
  const getSiteLocationById = useCallback(
    (id: string): SiteLocation | undefined => {
      return siteLocations.find(location => location.id === id)
    },
    [siteLocations]
  )

  // Get locations with employees
  const getLocationsWithEmployees = useCallback((): SiteLocation[] => {
    return siteLocations.filter(location => location.employeeCount > 0)
  }, [siteLocations])

  // Get locations with cost centers
  const getLocationsWithCostCenters = useCallback((): SiteLocation[] => {
    return siteLocations.filter(location => location.costCenterCount > 0)
  }, [siteLocations])

  // Get regions for a specific country
  const getRegionsForCountry = useCallback((countryCode: string): SiteLocationRegion[] => {
    return cache.current.regions.get(countryCode) || []
  }, [])

  // Get total employee count across all locations
  const getTotalEmployeeCount = useCallback((): number => {
    return siteLocations.reduce((total, location) => total + location.employeeCount, 0)
  }, [siteLocations])

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken])

  return {
    // Pagination props
    totalCount,
    currentPage,
    pageSize,
    changePage,
    // Data
    siteLocations,
    structureId: structureId.current,

    // State
    isLoading,
    error,

    // Actions
    refetch,

    // Filter functions
    filterSiteLocations,
    searchSiteLocations,
    getSiteLocationById,
    getActiveSiteLocations,
    getInactiveSiteLocations,
    getLocationsWithEmployees,
    getLocationsWithCostCenters,

    // Catalog data
    countries: Array.from(cache.current.countries.values()).sort((a, b) => a.value.localeCompare(b.value)),
    fetchRegionsForCountries,
    getRegionsForCountry,

    // Statistics
    totalLocations: siteLocations.length,
    activeLocations: getActiveSiteLocations().length,
    inactiveLocations: getInactiveSiteLocations().length,
    totalEmployeeCount: getTotalEmployeeCount(),
    locationsWithEmployees: getLocationsWithEmployees().length,
    locationsWithCostCenters: getLocationsWithCostCenters().length
  }
}
