import { useState, useCallback } from 'react'
import { OfficeUsageFilters } from '../types'
import { getDateRangeForPreset } from '../utils/dateUtils'

export const useOfficeUsageFilters = () => {
  const [filters, setFilters] = useState<OfficeUsageFilters>(() => {
    const { dateFrom, dateTo } = getDateRangeForPreset('last-week')
    return {
      dateFrom,
      dateTo,
      datePreset: 'last-week',
      granularity: 'day',
      selectedLocations: [],
      selectedDepartments: []
    }
  })

  const updateFilters = useCallback((updates: Partial<OfficeUsageFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  const setDatePreset = useCallback((preset: OfficeUsageFilters['datePreset']) => {
    if (!preset || preset === 'custom') return

    const { dateFrom, dateTo } = getDateRangeForPreset(preset)
    setFilters(prev => ({ ...prev, dateFrom, dateTo, datePreset: preset }))
  }, [])

  const setDateRange = useCallback((dateFrom: string, dateTo: string) => {
    setFilters(prev => ({ ...prev, dateFrom, dateTo, datePreset: 'custom' }))
  }, [])

  const setGranularity = useCallback((granularity: 'day' | 'week') => {
    setFilters(prev => ({ ...prev, granularity }))
  }, [])

  const toggleLocation = useCallback((locationId: string) => {
    setFilters(prev => {
      const selected = prev.selectedLocations
      const isSelected = selected.includes(locationId)

      return {
        ...prev,
        selectedLocations: isSelected ? selected.filter(id => id !== locationId) : [...selected, locationId]
      }
    })
  }, [])

  const clearLocationFilters = useCallback(() => {
    setFilters(prev => ({ ...prev, selectedLocations: [] }))
  }, [])

  return {
    filters,
    updateFilters,
    setDatePreset,
    setDateRange,
    setGranularity,
    toggleLocation,
    clearLocationFilters
  }
}
