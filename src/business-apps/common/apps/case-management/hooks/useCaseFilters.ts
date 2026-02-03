/**
 * useCaseFilters Hook
 *
 * Hook for managing case filters with URL synchronization
 */

import { useState, useEffect, useCallback } from 'react'
import { CaseFilters, CaseStatus } from '../types'

export const useCaseFilters = (appTag: string) => {
  const [filters, setFilters] = useState<CaseFilters>({
    tags: { app: appTag },
    status: [],
    assignedTo: undefined,
    dateRange: undefined,
    search: ''
  })

  // Parse URL parameters on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)

    const statusFromUrl = searchParams.get('status')
    const assignedToFromUrl = searchParams.get('assignedTo')
    const searchFromUrl = searchParams.get('search')

    setFilters(prev => ({
      ...prev,
      status: statusFromUrl ? (statusFromUrl.split(',') as CaseStatus[]) : [],
      assignedTo: assignedToFromUrl || undefined,
      search: searchFromUrl || ''
    }))
  }, [])

  // Update a specific filter
  const updateFilter = useCallback((key: keyof CaseFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))

    // Update URL
    const searchParams = new URLSearchParams(window.location.search)

    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      const stringValue = Array.isArray(value) ? value.join(',') : String(value)
      searchParams.set(key, stringValue)
    } else {
      searchParams.delete(key)
    }

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [])

  // Reset all filters except app tag
  const resetFilters = useCallback(() => {
    setFilters({
      tags: { app: appTag },
      status: [],
      assignedTo: undefined,
      dateRange: undefined,
      search: ''
    })

    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname)
  }, [appTag])

  // Update multiple filters at once
  const updateFilters = useCallback((updates: Partial<CaseFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters
  }
}
