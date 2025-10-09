'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetLeadStatuses } from './useGetLeadStatuses'
import { useGetLeadRatings } from './useGetLeadRatings'
import { useGetLeadSources } from './useGetLeadSources'
import { useGetIndustries } from './useGetIndustries'
import { useGetCompanySizes } from './useGetCompanySizes'
import { useGetLeadOwners } from './useGetLeadOwners'
import { useGetLeadContacts } from './useGetLeadContacts'
import { useGetLeadCompanies } from './useGetLeadCompanies'
import { useGetCountries } from './useGetCountries'
import { useGetRegions } from './useGetRegions'
import { useGetCities } from './useGetCities'
import { DateRangeFilter } from '../components/DateRangeFilter'
import { Switch } from '@newwork/nw-design-system'

// DataFilter interfaces to match DataContainer expectations
export interface DataFilter {
  id: string
  label: string
  value: string
  selected: boolean
  count?: number
}

export interface DataFilterGroup {
  id: string
  title: string
  filters: DataFilter[]
  backendSearch?: (search: string) => {
    filters: DataFilter[]
    loading: boolean
    error: any
  }
}

// Lead filter state interface
export interface LeadFilters {
  search: string
  leadStatuses: string[]
  leadRatings: string[]
  leadSources: string[]
  industries: string[]
  companySizes: string[]
  owners: string[]
  leadContacts: string[]
  leadCompanies: string[]
  createdAfter?: string
  createdBefore?: string
}

export const useLeadFilters = (context: BusinessAppContextProps) => {
  // Main search and filter state
  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // Date range filter state
  const [createdAfter, setCreatedAfter] = useState<string | undefined>()
  const [createdBefore, setCreatedBefore] = useState<string | undefined>()

  // Search state for each filter type (following employee pattern)
  const [leadStatusSearch, setLeadStatusSearch] = useState('')
  const [leadRatingSearch, setLeadRatingSearch] = useState('')
  const [leadSourceSearch, setLeadSourceSearch] = useState('')
  const [industrySearch, setIndustrySearch] = useState('')
  const [companySizeSearch, setCompanySizeSearch] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [companySearch, setCompanySearch] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [regionSearch, setRegionSearch] = useState('')
  const [citySearch, setCitySearch] = useState('')

  // Offset state for pagination (if needed later)
  const [leadStatusOffset] = useState(0)
  const [leadRatingOffset] = useState(0)
  const [leadSourceOffset] = useState(0)
  const [industryOffset] = useState(0)
  const [companySizeOffset] = useState(0)
  const [ownerOffset] = useState(0)
  const [countryOffset] = useState(0)
  const [regionOffset] = useState(0)
  const [cityOffset] = useState(0)

  // Get catalog data with search parameters
  const {
    leadStatusOptions,
    isLoading: leadStatusLoading,
    error: leadStatusError
  } = useGetLeadStatuses(context, leadStatusSearch, leadStatusOffset)
  const {
    leadRatingOptions,
    isLoading: leadRatingLoading,
    error: leadRatingError
  } = useGetLeadRatings(context, leadRatingSearch, leadRatingOffset)
  const {
    leadSourceOptions,
    isLoading: leadSourceLoading,
    error: leadSourceError
  } = useGetLeadSources(context, leadSourceSearch, leadSourceOffset)
  const {
    industryOptions,
    isLoading: industryLoading,
    error: industryError
  } = useGetIndustries(context, industrySearch, industryOffset)
  const {
    companySizeOptions,
    isLoading: companySizeLoading,
    error: companySizeError
  } = useGetCompanySizes(context, companySizeSearch, companySizeOffset)
  const { leadOwners, isLoading: ownerLoading, error: ownerError } = useGetLeadOwners(context, ownerSearch, ownerOffset)
  const { leadContacts, isLoading: contactLoading, error: contactError } = useGetLeadContacts(context, contactSearch, 0)
  const {
    leadCompanies,
    isLoading: companyLoading,
    error: companyError
  } = useGetLeadCompanies(context, companySearch, 0)
  const {
    countries,
    isLoading: countryLoading,
    error: countryError
  } = useGetCountries(context, countrySearch, countryOffset)
  const { regions, isLoading: regionLoading, error: regionError } = useGetRegions(context, regionSearch, regionOffset)
  const { cities, isLoading: cityLoading, error: cityError } = useGetCities(context, citySearch, cityOffset)

  // Memoize stable options to prevent infinite loops
  const stableOptions = useMemo(
    () => ({
      leadStatusOptions: [...leadStatusOptions],
      leadRatingOptions: [...leadRatingOptions],
      leadSourceOptions: [...leadSourceOptions],
      industryOptions: [...industryOptions],
      companySizeOptions: [...companySizeOptions],
      leadOwners: [...leadOwners],
      leadContacts: [...leadContacts],
      leadCompanies: [...leadCompanies],
      countries: [...countries],
      regions: [...regions],
      cities: [...cities]
    }),
    [
      leadStatusOptions.length,
      leadRatingOptions.length,
      leadSourceOptions.length,
      industryOptions.length,
      companySizeOptions.length,
      leadOwners.length,
      leadContacts.length,
      leadCompanies.length,
      countries.length,
      regions.length,
      cities.length
    ]
  )

  // Memoize selectedFilters string for stable dependencies
  const selectedFiltersKey = useMemo(() => selectedFilters.join(','), [selectedFilters])

  // Initialize filters from URL parameters when all data is loaded
  useEffect(() => {
    if (
      !filtersInitialized &&
      !leadStatusLoading &&
      !leadRatingLoading &&
      !leadSourceLoading &&
      !industryLoading &&
      !companySizeLoading &&
      !ownerLoading &&
      !contactLoading &&
      !companyLoading &&
      !countryLoading &&
      !regionLoading &&
      !cityLoading
    ) {
      const urlParams = new URLSearchParams(window.location.search)
      const preselectedFilters: string[] = []

      // Handle leadStatus parameter: leadStatus=LEAD_NEW
      const leadStatusParams = urlParams.getAll('leadStatus')
      leadStatusParams.forEach(statusValue => {
        if (
          ['LEAD_NEW', 'LEAD_OPEN', 'LEAD_QUALIFIED', 'LEAD_CONVERTED', 'LEAD_LOST', 'UNKNOWN_LEAD_STATUS'].includes(
            statusValue
          )
        ) {
          preselectedFilters.push(statusValue)
        }
      })

      // Handle leadRating parameter: leadRating=HOT_LEAD
      const leadRatingParams = urlParams.getAll('leadRating')
      leadRatingParams.forEach(ratingValue => {
        if (['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'UNKNOWN_LEAD_RATING'].includes(ratingValue)) {
          preselectedFilters.push(ratingValue)
        }
      })

      // Only process URL filters if we have data loaded
      if (stableOptions.leadSourceOptions.length > 0) {
        // Handle leadSource parameter: leadSource=LeadSource:v1:WEBSITE
        const leadSourceParams = urlParams.getAll('leadSource')
        leadSourceParams.forEach(sourceValue => {
          const matchingSource = stableOptions.leadSourceOptions.find(option => option.id === sourceValue)
          if (matchingSource) {
            preselectedFilters.push(`source-${matchingSource.id}`)
          }
        })
      }

      if (stableOptions.industryOptions.length > 0) {
        // Handle industry parameter: industry=Industry:v1:TECHNOLOGY
        const industryParams = urlParams.getAll('industry')
        industryParams.forEach(industryValue => {
          const matchingIndustry = stableOptions.industryOptions.find(option => option.id === industryValue)
          if (matchingIndustry) {
            preselectedFilters.push(`industry-${matchingIndustry.id}`)
          }
        })
      }

      if (stableOptions.companySizeOptions.length > 0) {
        // Handle companySize parameter: companySize=CompanySize:v1:SMALL
        const companySizeParams = urlParams.getAll('companySize')
        companySizeParams.forEach(sizeValue => {
          const matchingSize = stableOptions.companySizeOptions.find(option => option.id === sizeValue)
          if (matchingSize) {
            preselectedFilters.push(`size-${matchingSize.id}`)
          }
        })
      }

      if (stableOptions.leadOwners.length > 0) {
        // Handle leadOwner parameter: leadOwner=employee-123
        const leadOwnerParams = urlParams.getAll('leadOwner')
        leadOwnerParams.forEach(ownerValue => {
          const matchingOwner = stableOptions.leadOwners.find(owner => owner.id === ownerValue)
          if (matchingOwner) {
            preselectedFilters.push(`owner-${matchingOwner.id}`)
          }
        })
      }

      if (preselectedFilters.length > 0) {
        setSelectedFilters(preselectedFilters)
      }

      // Always set initialized to true once loading is complete, regardless of whether data exists
      setFiltersInitialized(true)
    }
  }, [
    stableOptions.leadStatusOptions,
    stableOptions.leadRatingOptions,
    stableOptions.leadSourceOptions,
    stableOptions.industryOptions,
    stableOptions.companySizeOptions,
    stableOptions.leadOwners,
    leadStatusLoading,
    leadRatingLoading,
    leadSourceLoading,
    industryLoading,
    companySizeLoading,
    ownerLoading,
    filtersInitialized,
    selectedFiltersKey
  ])

  // Combined loading and error states
  const isLoading =
    leadStatusLoading ||
    leadRatingLoading ||
    leadSourceLoading ||
    industryLoading ||
    companySizeLoading ||
    ownerLoading ||
    countryLoading ||
    regionLoading ||
    cityLoading
  const error =
    leadStatusError ||
    leadRatingError ||
    leadSourceError ||
    industryError ||
    companySizeError ||
    ownerError ||
    countryError ||
    regionError ||
    cityError

  // Filter management functions
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => [...prev, filterId])
  }, [])

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId))
  }, [])

  const resetFilters = useCallback(() => {
    setSearch('')
    setSelectedFilters([])
    setCreatedAfter(undefined)
    setCreatedBefore(undefined)
  }, [])

  // Initialize filters from URL parameters
  const initializeFromUrl = useCallback(
    (urlParams: URLSearchParams) => {
      const newFilters: string[] = []

      // Handle leadStatus parameter
      const leadStatusParam = urlParams.get('leadStatus')

      if (leadStatusParam && stableOptions.leadStatusOptions.length > 0) {
        // More flexible matching for common lead status values
        const matchingStatus = stableOptions.leadStatusOptions.find(option => {
          const optionName = option.name.toLowerCase()
          const paramValue = leadStatusParam.toLowerCase()

          // Direct name match
          if (optionName === paramValue) return true

          // ID match
          if (option.id.toLowerCase() === paramValue) return true

          // Common mappings
          if (
            paramValue === 'open' &&
            (optionName.includes('new') || optionName.includes('open') || optionName.includes('active'))
          )
            return true
          if (
            paramValue === 'converted' &&
            (optionName.includes('convert') || optionName.includes('qualified') || optionName.includes('won'))
          )
            return true

          return false
        })

        if (matchingStatus) {
          newFilters.push(matchingStatus.id)
        }
      }

      if (newFilters.length > 0) {
        setSelectedFilters(prev => [...prev, ...newFilters])
      }
    },
    [stableOptions.leadStatusOptions, setSelectedFilters]
  )

  // Handle date range changes
  const handleDateRangeChange = useCallback((after?: string, before?: string) => {
    setCreatedAfter(after)
    setCreatedBefore(before)
  }, [])

  // Backend search functions (stable versions to prevent infinite loops)
  const getLeadStatusFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== leadStatusSearch) {
        setLeadStatusSearch(search)
      }

      const searchValue = search.trim().toLowerCase()

      const filtered = searchValue
        ? stableOptions.leadStatusOptions.filter(option => {
            const name = option.name ? option.name.toLowerCase() : ''
            return name.includes(searchValue)
          })
        : stableOptions.leadStatusOptions

      return {
        filters: filtered.map(option => ({
          id: option.id,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(option.id)
        })),
        loading: leadStatusLoading,
        error: leadStatusError
      }
    },
    [stableOptions.leadStatusOptions, leadStatusLoading, leadStatusError, leadStatusSearch, selectedFilters]
  )

  const getLeadRatingFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== leadRatingSearch) {
        setLeadRatingSearch(search)
      }

      const filtered = search
        ? stableOptions.leadRatingOptions.filter(option => option.name.toLowerCase().includes(search.toLowerCase()))
        : stableOptions.leadRatingOptions

      return {
        filters: filtered.map(option => ({
          id: option.id,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(option.id)
        })),
        loading: leadRatingLoading,
        error: leadRatingError
      }
    },
    [stableOptions.leadRatingOptions, leadRatingLoading, leadRatingError, leadRatingSearch, selectedFilters]
  )

  const getLeadSourceFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== leadSourceSearch) {
        setLeadSourceSearch(search)
      }

      return {
        filters: stableOptions.leadSourceOptions.map(option => ({
          id: option.id,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(option.id)
        })),
        loading: leadSourceLoading,
        error: leadSourceError
      }
    },
    [stableOptions.leadSourceOptions, leadSourceLoading, leadSourceError, leadSourceSearch, selectedFilters]
  )

  const getIndustryFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== industrySearch) {
        setIndustrySearch(search)
      }

      return {
        filters: stableOptions.industryOptions.map(option => ({
          id: option.id,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(option.id)
        })),
        loading: industryLoading,
        error: industryError
      }
    },
    [stableOptions.industryOptions, industryLoading, industryError, industrySearch, selectedFilters]
  )

  // Company size doesn't need backend search as it's predefined
  const getCompanySizeFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== companySizeSearch) {
        setCompanySizeSearch(search)
      }

      const searchValue = search.trim().toLowerCase()

      const filtered = searchValue
        ? stableOptions.companySizeOptions.filter(option => {
            const name = option.name ? option.name.toLowerCase() : ''
            return name.includes(searchValue)
          })
        : stableOptions.companySizeOptions

      return {
        filters: filtered.map(option => ({
          id: option.id,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(option.id)
        })),
        loading: companySizeLoading,
        error: companySizeError
      }
    },
    [stableOptions.companySizeOptions, companySizeLoading, companySizeError, companySizeSearch, selectedFilters]
  )

  const getOwnerFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== ownerSearch) {
        setOwnerSearch(search)
      }

      return {
        filters: stableOptions.leadOwners.map(owner => ({
          id: owner.id,
          label: owner.name,
          value: owner.name,
          selected: selectedFilters.includes(owner.id)
        })),
        loading: ownerLoading,
        error: ownerError
      }
    },
    [stableOptions.leadOwners, ownerLoading, ownerError, ownerSearch, selectedFilters]
  )

  const getContactFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== contactSearch) {
        setContactSearch(search)
      }

      return {
        filters: stableOptions.leadContacts.map(contact => ({
          id: contact.id,
          label: contact.name,
          value: contact.name,
          selected: selectedFilters.includes(contact.id)
        })),
        loading: contactLoading,
        error: contactError
      }
    },
    [stableOptions.leadContacts, contactLoading, contactError, contactSearch, selectedFilters]
  )

  const getCompanyFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== companySearch) {
        setCompanySearch(search)
      }

      return {
        filters: stableOptions.leadCompanies.map(company => ({
          id: company.id,
          label: company.name,
          value: company.name,
          selected: selectedFilters.includes(company.id)
        })),
        loading: companyLoading,
        error: companyError
      }
    },
    [stableOptions.leadCompanies, companyLoading, companyError, companySearch, selectedFilters]
  )

  const getCountryFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== countrySearch) {
        setCountrySearch(search)
      }

      return {
        filters: stableOptions.countries.map(country => ({
          id: country.id,
          label: country.name,
          value: country.name,
          selected: selectedFilters.includes(country.id)
        })),
        loading: countryLoading,
        error: countryError
      }
    },
    [stableOptions.countries, countryLoading, countryError, countrySearch, selectedFilters]
  )

  const getRegionFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== regionSearch) {
        setRegionSearch(search)
      }

      return {
        filters: stableOptions.regions.map(region => ({
          id: region.id,
          label: region.name,
          value: region.name,
          selected: selectedFilters.includes(region.id)
        })),
        loading: regionLoading,
        error: regionError
      }
    },
    [stableOptions.regions, regionLoading, regionError, regionSearch, selectedFilters]
  )

  const getCityFilters = useCallback(
    (search: string) => {
      // Only update search state if it has actually changed to prevent infinite loops
      if (search !== citySearch) {
        setCitySearch(search)
      }

      return {
        filters: stableOptions.cities.map(city => ({
          id: city.id,
          label: city.name,
          value: city.name,
          selected: selectedFilters.includes(city.id)
        })),
        loading: cityLoading,
        error: cityError
      }
    },
    [stableOptions.cities, cityLoading, cityError, citySearch, selectedFilters]
  )

  // Convert catalog options to filter options for static display
  const leadStatusFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.leadStatusOptions.map((option: any) => ({
        id: option.id,
        label: option.name,
        value: option.name,
        selected: selectedFilters.includes(option.id)
      })),
    [stableOptions.leadStatusOptions, selectedFilters]
  )

  const leadRatingFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.leadRatingOptions.map((option: any) => ({
        id: option.id,
        label: option.name,
        value: option.name,
        selected: selectedFilters.includes(option.id)
      })),
    [stableOptions.leadRatingOptions, selectedFilters]
  )

  const leadSourceFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.leadSourceOptions.map((option: any) => ({
        id: option.id,
        label: option.name,
        value: option.name,
        selected: selectedFilters.includes(option.id)
      })),
    [stableOptions.leadSourceOptions, selectedFilters]
  )

  const industryFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.industryOptions.map((option: any) => ({
        id: option.id,
        label: option.name,
        value: option.name,
        selected: selectedFilters.includes(option.id)
      })),
    [stableOptions.industryOptions, selectedFilters]
  )

  const companySizeFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.companySizeOptions.map((option: any) => ({
        id: option.id,
        label: option.name,
        value: option.name,
        selected: selectedFilters.includes(option.id)
      })),
    [stableOptions.companySizeOptions, selectedFilters]
  )

  const ownerFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.leadOwners.map((owner: any) => ({
        id: owner.id,
        label: owner.name,
        value: owner.name,
        selected: selectedFilters.includes(owner.id)
      })),
    [stableOptions.leadOwners, selectedFilters]
  )

  const contactFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.leadContacts.map((contact: any) => ({
        id: contact.id,
        label: contact.name,
        value: contact.name,
        selected: selectedFilters.includes(contact.id)
      })),
    [stableOptions.leadContacts, selectedFilters]
  )

  const companyFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.leadCompanies.map((company: any) => ({
        id: company.id,
        label: company.name,
        value: company.name,
        selected: selectedFilters.includes(company.id)
      })),
    [stableOptions.leadCompanies, selectedFilters]
  )

  const countryFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.countries.map((country: any) => ({
        id: country.id,
        label: country.name,
        value: country.name,
        selected: selectedFilters.includes(country.id)
      })),
    [stableOptions.countries, selectedFilters]
  )

  const regionFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.regions.map((region: any) => ({
        id: region.id,
        label: region.name,
        value: region.name,
        selected: selectedFilters.includes(region.id)
      })),
    [stableOptions.regions, selectedFilters]
  )

  const cityFilterOptions: DataFilter[] = useMemo(
    () =>
      stableOptions.cities.map((city: any) => ({
        id: city.id,
        label: city.name,
        value: city.name,
        selected: selectedFilters.includes(city.id)
      })),
    [stableOptions.cities, selectedFilters]
  )

  // Debug logging
  // Debug lead status values

  // Create filter groups with backend search functions in the requested order
  const filterGroups: DataFilterGroup[] = [
    {
      id: 'sensitive',
      title: 'Sensitive',
      // Use design system Switch as a toggle instead of checkbox
      customComponent: React.createElement(
        'div',
        { className: 'gba:flex gba:items-center gba:gap-3 gba:px-2' },
        React.createElement(Switch as any, {
          checked: selectedFilters.includes('sensitive:true'),
          onCheckedChange: (checked: boolean) => {
            setSelectedFilters(
              checked ? [...selectedFilters, 'sensitive:true'] : selectedFilters.filter(f => f !== 'sensitive:true')
            )
          },
          'data-testid': 'customer-leads-high-priority-switch'
        }),
        React.createElement('span', { className: 'gba:text-sm' }, 'Sensitive')
      ),
      hideSearch: true
    } as any,
    {
      id: 'leadContacts',
      title: 'Lead Contact',
      filters: contactFilterOptions,
      backendSearch: getContactFilters
    },
    {
      id: 'leadCompanies',
      title: 'Lead Company',
      filters: companyFilterOptions,
      backendSearch: getCompanyFilters
    },
    {
      id: 'countries',
      title: 'Country',
      filters: countryFilterOptions,
      backendSearch: getCountryFilters
    },
    {
      id: 'regions',
      title: 'Region/State',
      filters: regionFilterOptions,
      backendSearch: getRegionFilters
    },
    {
      id: 'cities',
      title: 'City',
      filters: cityFilterOptions,
      backendSearch: getCityFilters
    },
    {
      id: 'dateRange',
      title: 'Creation Date',
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: createdAfter,
        createdBefore: createdBefore,
        onDateRangeChange: handleDateRangeChange,
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent'
      }),
      hideSearch: true
    } as any, // Temporary type assertion to bypass interface issue
    {
      id: 'owners',
      title: 'Owner',
      filters: ownerFilterOptions,
      backendSearch: getOwnerFilters
    },
    {
      id: 'leadStatuses',
      title: 'Status',
      filters: leadStatusFilterOptions,
      backendSearch: getLeadStatusFilters
    },
    {
      id: 'leadRatings',
      title: 'Rating',
      filters: leadRatingFilterOptions,
      backendSearch: getLeadRatingFilters
    },
    {
      id: 'leadSources',
      title: 'Source',
      filters: leadSourceFilterOptions,
      backendSearch: getLeadSourceFilters
    },
    {
      id: 'industries',
      title: 'Industry',
      filters: industryFilterOptions,
      backendSearch: getIndustryFilters
    }
  ]

  // Create a label mapping for filters to support filter management functions
  const filterLabelMap = useMemo(() => {
    return {
      // Sensitivity labels
      'sensitive:true': 'Sensitive',
      ...Object.fromEntries(stableOptions.leadStatusOptions.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.leadRatingOptions.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.leadSourceOptions.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.industryOptions.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.companySizeOptions.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.leadOwners.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.leadContacts.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.leadCompanies.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.countries.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.regions.map(o => [o.id, o.name])),
      ...Object.fromEntries(stableOptions.cities.map(o => [o.id, o.name]))
    }
  }, [
    stableOptions.leadStatusOptions,
    stableOptions.leadRatingOptions,
    stableOptions.leadSourceOptions,
    stableOptions.industryOptions,
    stableOptions.companySizeOptions,
    stableOptions.leadOwners,
    stableOptions.leadContacts,
    stableOptions.leadCompanies,
    stableOptions.countries,
    stableOptions.regions,
    stableOptions.cities
  ])

  return {
    // Filter state
    search,
    selectedFilters,
    filtersInitialized,

    // Date range state
    createdAfter,
    createdBefore,

    // Filter data
    filterGroups,
    filterLabelMap,

    // Filter actions
    setSearch,
    addFilter,
    removeFilter,
    resetFilters,
    initializeFromUrl,
    handleDateRangeChange,

    // Loading states
    isLoading,
    error
  }
}
