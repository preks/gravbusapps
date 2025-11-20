'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import { useDepartmentFilters, DepartmentFilterOption } from './useDepartmentFilters'
import { useJobProfileFilters, JobProfileFilterOption } from './useJobProfileFilters'
import { useJobFunctionFilters, JobFunctionFilterOption } from './useJobFunctionFilters'

/**
 * Filter option interface for consistent typing
 */
export interface FilterOption {
  id: string
  label: string
  value: string
  selected: boolean
}

/**
 * Filter group interface for use with DataContainer component
 */
export interface FilterGroup {
  id: string
  title: string
  filters?: FilterOption[]
  backendSearch?: (search: string) => { filters: FilterOption[]; loading: boolean; error: any }
}

/**
 * Job position filters interface for use with API calls
 */
export interface JobPositionFilters {
  search: string
  departments: string[]
  jobProfiles: string[]
  jobFunctions: string[]
  vacant?: boolean
}

/**
 * Custom hook to manage job position filters across components
 * @returns Filter state and utility functions
 */
export function useJobPositionFilters(accessToken: string) {
  const [search, setSearch] = useState('')
  const { t } = useTranslation(translations)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [filtersInitialized] = useState(true) // OPTIMIZED: Initialize immediately

  // Lazy loading state for filters
  const [filtersEnabled, setFiltersEnabled] = useState(true) // Enable immediately to load filter options

  // Department filters - LAZY LOADED
  const [departmentSearch, setDepartmentSearch] = useState('')
  const {
    departments: departmentOptions,
    loading: departmentLoading,
    error: departmentError
  } = useDepartmentFilters(accessToken, departmentSearch, 0, filtersEnabled)

  // Job profile filters - LAZY LOADED
  const [jobProfileSearch, setJobProfileSearch] = useState('')
  const {
    profiles: jobProfileOptions,
    loading: jobProfileLoading,
    error: jobProfileError
  } = useJobProfileFilters(accessToken, jobProfileSearch, 0, filtersEnabled)

  // Job function filters - LAZY LOADED
  const [jobFunctionSearch, setJobFunctionSearch] = useState('')
  const {
    functions: jobFunctionOptions,
    loading: jobFunctionLoading,
    error: jobFunctionError
  } = useJobFunctionFilters(accessToken, jobFunctionSearch, 0, filtersEnabled)

  // Function to enable filter loading when filters are needed (lazy loading)
  const enableFilters = useCallback(() => {
    if (!filtersEnabled) {
      setFiltersEnabled(true)
    }
  }, [filtersEnabled])

  /**
   * Add a filter to the selected filters
   */
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      if (!prev.includes(filterId)) {
        return [...prev, filterId]
      }
      return prev
    })
  }, [])

  /**
   * Remove a filter from the selected filters
   */
  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId))
  }, [])

  /**
   * Clear all selected filters
   */
  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
  }, [])

  /**
   * Get selected filters by type
   */
  const getSelectedFiltersByType = useCallback(
    (filterType: string): string[] => {
      return selectedFilters.filter(filterId => {
        if (filterType === 'departments') {
          return departmentOptions.some(dept => dept.id === filterId)
        }
        if (filterType === 'jobProfiles') {
          return jobProfileOptions.some(profile => profile.id === filterId)
        }
        if (filterType === 'jobFunctions') {
          return jobFunctionOptions.some(func => func.id === filterId)
        }
        return false
      })
    },
    [selectedFilters, departmentOptions, jobProfileOptions, jobFunctionOptions]
  )

  // Backend search functions for each filter type
  const getDepartmentFilters = useCallback(
    (search: string) => {
      setDepartmentSearch(search)
      return {
        filters: departmentOptions.map(dept => ({
          id: dept.id,
          label: dept.name,
          value: dept.name,
          selected: selectedFilters.includes(dept.id)
        })),
        loading: departmentLoading,
        error: departmentError
      }
    },
    [departmentOptions, selectedFilters, departmentLoading, departmentError]
  )

  const getJobProfileFilters = useCallback(
    (search: string) => {
      setJobProfileSearch(search)
      return {
        filters: jobProfileOptions.map((profile: JobProfileFilterOption) => ({
          id: profile.id,
          label: profile.name,
          value: profile.name,
          selected: selectedFilters.includes(profile.id)
        })),
        loading: jobProfileLoading,
        error: jobProfileError
      }
    },
    [jobProfileOptions, selectedFilters, jobProfileLoading, jobProfileError]
  )

  const getJobFunctionFilters = useCallback(
    (search: string) => {
      setJobFunctionSearch(search)
      return {
        filters: jobFunctionOptions.map((func: JobFunctionFilterOption) => ({
          id: func.id,
          label: func.name,
          value: func.name,
          selected: selectedFilters.includes(func.id)
        })),
        loading: jobFunctionLoading,
        error: jobFunctionError
      }
    },
    [jobFunctionOptions, selectedFilters, jobFunctionLoading, jobFunctionError]
  )

  // Filter groups for DataContainer - Only Department, Job Functions, and Job Profiles
  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: 'departments',
        title: t('hr-positions-filters-departments'),
        backendSearch: getDepartmentFilters
      },
      {
        id: 'jobFunctions',
        title: t('hr-positions-filters-job-functions'),
        backendSearch: getJobFunctionFilters
      },
      {
        id: 'jobProfiles',
        title: t('hr-positions-filters-job-profiles'),
        backendSearch: getJobProfileFilters
      }
    ],
    [t, getDepartmentFilters, getJobFunctionFilters, getJobProfileFilters]
  )

  // Filter label map for DataController
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {}

    departmentOptions.forEach((dept: DepartmentFilterOption) => {
      labelMap[dept.id] = dept.name
    })

    jobProfileOptions.forEach((profile: JobProfileFilterOption) => {
      labelMap[profile.id] = profile.name
    })

    jobFunctionOptions.forEach((func: JobFunctionFilterOption) => {
      labelMap[func.id] = func.name
    })

    return labelMap
  }, [departmentOptions, jobProfileOptions, jobFunctionOptions])

  /**
   * Get the current filter configuration for API calls
   */
  const getFilters = useCallback((): JobPositionFilters => {
    return {
      search,
      departments: getSelectedFiltersByType('departments'),
      jobProfiles: getSelectedFiltersByType('jobProfiles'),
      jobFunctions: getSelectedFiltersByType('jobFunctions')
    }
  }, [search, getSelectedFiltersByType])

  return {
    search,
    setSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
    filtersInitialized,
    enableFilters
  }
}
