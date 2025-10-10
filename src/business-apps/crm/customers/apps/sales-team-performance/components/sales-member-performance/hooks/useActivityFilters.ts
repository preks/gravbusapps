import { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetActivityTypes } from './useGetActivityTypes'

export interface FilterGroup {
  id: string
  title: string
  filters: Array<{
    id: string
    label: string
    value: string
    selected: boolean
  }>
  backendSearch?: (search: string) => {
    filters: Array<{ id: string; label: string; selected: boolean }>
    loading: boolean
    error: any
  }
}

export interface ActivityFilters {
  selectedFilters: string[]
  filterGroups: FilterGroup[]
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  clearAllFilters: () => void
  getFilters: () => any
  activityTypeSearch: string
  setActivityTypeSearch: (search: string) => void
}

export const useActivityFilters = (context: BusinessAppContextProps): ActivityFilters => {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  // Activity type search state
  const [activityTypeSearch, setActivityTypeSearch] = useState('')

  // Get activity type data with search
  const {
    activityTypeOptions,
    isLoading: activityTypeLoading,
    error: activityTypeError
  } = useGetActivityTypes(context, activityTypeSearch)

  // Backend search function for activity types
  const getActivityTypeFilters = useCallback(
    (search: string) => {
      setActivityTypeSearch(search)

      return {
        filters: activityTypeOptions.map(option => ({
          id: option.id,
          label: option.name,
          selected: selectedFilters.includes(option.id)
        })),
        loading: activityTypeLoading,
        error: activityTypeError
      }
    },
    [activityTypeOptions, selectedFilters, activityTypeLoading, activityTypeError]
  )

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: 'activityType',
        title: 'Activity Type',
        filters: activityTypeOptions.map(option => ({
          id: option.id,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(option.id)
        })),
        backendSearch: getActivityTypeFilters
      }
    ],
    [selectedFilters, activityTypeOptions, getActivityTypeFilters]
  )

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    filterGroups.forEach(group => {
      group.filters.forEach(filter => {
        map[filter.id] = filter.label
      })
    })
    return map
  }, [filterGroups])

  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => (prev.includes(filterId) ? prev : [...prev, filterId]))
  }, [])

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId))
  }, [])

  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
  }, [])

  // Add getFilters for activityType
  const getFilters = useCallback(() => {
    const filters: any = {}
    const activityTypes: string[] = []
    selectedFilters.forEach(filterId => {
      const typeOption = activityTypeOptions.find((opt: any) => opt.id === filterId)
      if (typeOption) {
        activityTypes.push(typeOption.name)
      }
    })
    if (activityTypes.length > 0) {
      filters.activityTypes = activityTypes
    }
    return filters
  }, [selectedFilters, activityTypeOptions])

  return {
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
    activityTypeSearch,
    setActivityTypeSearch
  }
}
