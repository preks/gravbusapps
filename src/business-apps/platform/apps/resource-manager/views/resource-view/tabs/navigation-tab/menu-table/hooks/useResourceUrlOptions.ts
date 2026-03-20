import { useState, useCallback, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useNavigations } from '@/common/data/resources/hooks/useNavigations'

interface ResourceUrlOption {
  value: string
  label: string
}

interface UseResourceUrlOptionsReturn {
  resourceUrlOptions: ResourceUrlOption[]
  navigationsLoading: boolean
  handleNavigationSearch: (query: string) => void
}

/**
 * Hook for managing resource URL options (navigations)
 */
export function useResourceUrlOptions(context: BusinessAppContextProps): UseResourceUrlOptionsReturn {
  const [resourceUrlSearch, setResourceUrlSearch] = useState('')

  // Load all navigations for resource URL selection
  const {
    navigations,
    isLoading: navigationsLoading,
    refetch: refetchNavigations
  } = useNavigations(context, {
    search: resourceUrlSearch
  })

  // Initial load of navigations
  useEffect(() => {
    refetchNavigations()
  }, [refetchNavigations])

  // Refetch when search changes
  useEffect(() => {
    refetchNavigations()
  }, [resourceUrlSearch, refetchNavigations])

  // Handle navigation search (debounced via Combobox)
  const handleNavigationSearch = useCallback((query: string) => {
    setResourceUrlSearch(query)
  }, [])

  // Build resource URL options
  const resourceUrlOptions = useMemo(() => {
    return navigations
      .filter(nav => nav.id) // Filter out items without IDs
      .map(nav => ({
        value: nav.id!,
        label: `${nav.name} (${nav.url})`
      }))
  }, [navigations])

  return {
    resourceUrlOptions,
    navigationsLoading,
    handleNavigationSearch
  }
}
