'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetCampaignTypes } from './useGetCampaignTypes'
import { CampaignDateRangeFilter } from '../components/CampaignDateRangeFilter'

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
  customComponent?: React.ReactElement
  hideSearch?: boolean
  backendSearch?: (search: string) => {
    filters: DataFilter[]
    loading: boolean
    error: Error | null
  }
}

// Campaign filter state interface
export interface CampaignFilters {
  search: string
  campaignTypes: string[]
  startDateAfter?: string
  startDateBefore?: string
  endDateAfter?: string
  endDateBefore?: string
  createdAfter?: string
  createdBefore?: string
}

export const useCampaignFilters = (context: BusinessAppContextProps) => {
  // Main search and filter state
  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // Date range filter state
  const [startDateAfter, setStartDateAfter] = useState<string | undefined>()
  const [startDateBefore, setStartDateBefore] = useState<string | undefined>()
  const [endDateAfter, setEndDateAfter] = useState<string | undefined>()
  const [endDateBefore, setEndDateBefore] = useState<string | undefined>()
  const [createdAfter, setCreatedAfter] = useState<string | undefined>()
  const [createdBefore, setCreatedBefore] = useState<string | undefined>()

  // Search state for campaign types
  const [campaignTypeSearch, setCampaignTypeSearch] = useState('')

  // Get campaign types from catalog
  const {
    campaignTypeOptions,
    isLoading: campaignTypesLoading,
    error: campaignTypesError
  } = useGetCampaignTypes(context, campaignTypeSearch)

  // Handle date range changes - defined before useMemo to avoid hoisting issues
  const handleStartDateRangeChange = useCallback((after?: string, before?: string) => {
    setStartDateAfter(after)
    setStartDateBefore(before)
  }, [])

  const handleEndDateRangeChange = useCallback((after?: string, before?: string) => {
    setEndDateAfter(after)
    setEndDateBefore(before)
  }, [])

  const handleCreatedDateRangeChange = useCallback((after?: string, before?: string) => {
    setCreatedAfter(after)
    setCreatedBefore(before)
  }, [])

  // Filter groups for DataFilter component
  const filterGroups = useMemo(
    () => [
      {
        id: 'campaignTypes',
        title: 'Campaign Type',
        filters: campaignTypeOptions.map(option => ({
          id: `TYPE_${option.id}`,
          label: option.label,
          value: option.value,
          selected: selectedFilters.includes(`TYPE_${option.id}`)
        })),
        backendSearch: (search: string) => {
          setCampaignTypeSearch(search)
          const filtered = campaignTypeOptions.filter(option =>
            option.label.toLowerCase().includes(search.toLowerCase())
          )
          return {
            filters: filtered.map(option => ({
              id: `TYPE_${option.id}`,
              label: option.label,
              value: option.value,
              selected: selectedFilters.includes(`TYPE_${option.id}`)
            })),
            loading: campaignTypesLoading,
            error: campaignTypesError
          }
        }
      },
      {
        id: 'startDateRange',
        title: 'Campaign Start Date',
        customComponent: React.createElement(CampaignDateRangeFilter, {
          afterDate: startDateAfter,
          beforeDate: startDateBefore,
          onDateRangeChange: handleStartDateRangeChange,
          placeholder: ['Start before', 'Start after'],
          className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
          dataTestId: 'campaign-start-date-range-filter'
        }),
        hideSearch: true,
        filters: [] // Required by interface but not used for custom components
      },
      {
        id: 'endDateRange',
        title: 'Campaign End Date',
        customComponent: React.createElement(CampaignDateRangeFilter, {
          afterDate: endDateAfter,
          beforeDate: endDateBefore,
          onDateRangeChange: handleEndDateRangeChange,
          placeholder: ['End before', 'End after'],
          className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
          dataTestId: 'campaign-end-date-range-filter'
        }),
        hideSearch: true,
        filters: [] // Required by interface but not used for custom components
      },
      {
        id: 'createdDateRange',
        title: 'Creation Date',
        customComponent: React.createElement(CampaignDateRangeFilter, {
          afterDate: createdAfter,
          beforeDate: createdBefore,
          onDateRangeChange: handleCreatedDateRangeChange,
          placeholder: ['Created before', 'Created after'],
          className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
          dataTestId: 'campaign-created-date-range-filter'
        }),
        hideSearch: true,
        filters: [] // Required by interface but not used for custom components
      }
    ],
    [
      campaignTypeOptions,
      selectedFilters,
      campaignTypesLoading,
      campaignTypesError,
      startDateAfter,
      startDateBefore,
      endDateAfter,
      endDateBefore,
      createdAfter,
      createdBefore,
      handleStartDateRangeChange,
      handleEndDateRangeChange,
      handleCreatedDateRangeChange
    ]
  )

  // Filter label mapping for DataController
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}

    // Add campaign types
    campaignTypeOptions.forEach(option => {
      map[`TYPE_${option.id}`] = option.label
    })

    return map
  }, [campaignTypeOptions])

  // Add filter
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => [...prev, filterId])
  }, [])

  // Remove filter
  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId))
  }, [])

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSelectedFilters([])
    setStartDateAfter(undefined)
    setStartDateBefore(undefined)
    setEndDateAfter(undefined)
    setEndDateBefore(undefined)
    setCreatedAfter(undefined)
    setCreatedBefore(undefined)
  }, [])

  // Initialize filters from URL parameters
  const initializeFromUrl = useCallback(() => {
    if (filtersInitialized) return

    const urlParams = new URLSearchParams(globalThis.location.search)
    const urlFilters = urlParams.get('filters')
    const urlStartDateAfter = urlParams.get('startDateAfter')
    const urlStartDateBefore = urlParams.get('startDateBefore')
    const urlEndDateAfter = urlParams.get('endDateAfter')
    const urlEndDateBefore = urlParams.get('endDateBefore')
    const urlCreatedAfter = urlParams.get('createdAfter')
    const urlCreatedBefore = urlParams.get('createdBefore')

    if (urlFilters) {
      const filters = urlFilters.split(',').filter(Boolean)
      setSelectedFilters(filters)
    }

    if (urlStartDateAfter) {
      setStartDateAfter(urlStartDateAfter)
    }

    if (urlStartDateBefore) {
      setStartDateBefore(urlStartDateBefore)
    }

    if (urlEndDateAfter) {
      setEndDateAfter(urlEndDateAfter)
    }

    if (urlEndDateBefore) {
      setEndDateBefore(urlEndDateBefore)
    }

    if (urlCreatedAfter) {
      setCreatedAfter(urlCreatedAfter)
    }

    if (urlCreatedBefore) {
      setCreatedBefore(urlCreatedBefore)
    }

    setFiltersInitialized(true)
  }, [filtersInitialized])

  // Initialize on mount
  useEffect(() => {
    initializeFromUrl()
  }, [initializeFromUrl])

  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    initializeFromUrl,
    startDateAfter,
    startDateBefore,
    endDateAfter,
    endDateBefore,
    createdAfter,
    createdBefore,
    handleStartDateRangeChange,
    handleEndDateRangeChange,
    handleCreatedDateRangeChange,
    filtersInitialized
  }
}
