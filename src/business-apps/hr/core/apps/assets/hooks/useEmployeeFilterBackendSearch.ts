/**
 * Hook for Employee filter group in Assets sidebar.
 * Provides backendSearch(search) for DataFilter and getEmployeeLabel for filter pills.
 */

import { useCallback, useEffect } from 'react'
import { useStructureEmployees } from '@/business-apps/hr/core/forms/performance-evaluation-form/hooks/useStructureEmployees'
import type { DataFilter } from '@/components/data-filter/DataFilter'

const EMPLOYEE_FILTER_PREFIX = 'employee:'

export interface UseEmployeeFilterBackendSearchResult {
  backendSearch: (search: string) => {
    filters: DataFilter[]
    loading: boolean
    error: any
  }
  getEmployeeLabel: (employeeId: string) => string | undefined
}

export function useEmployeeFilterBackendSearch(
  accessToken: string,
  selectedFilterIds: string[],
  employeeSearchQuery: string
): UseEmployeeFilterBackendSearchResult {
  const { employees, isLoading, error, fetchStructureEmployees } = useStructureEmployees(accessToken ?? '', false)

  useEffect(() => {
    const query = (employeeSearchQuery ?? '').trim()
    if (query === '') {
      return
    }
    fetchStructureEmployees(employeeSearchQuery)
  }, [employeeSearchQuery, fetchStructureEmployees])

  const getEmployeeLabel = useCallback(
    (employeeId: string): string | undefined => {
      const emp = employees.find(e => e.id === employeeId)
      return emp?.name
    },
    [employees]
  )

  const backendSearch = useCallback(
    (search: string): { filters: DataFilter[]; loading: boolean; error: any } => {
      const trimmed = (search ?? '').trim()
      const filters: DataFilter[] =
        trimmed === ''
          ? []
          : employees.map(emp => ({
              id: `${EMPLOYEE_FILTER_PREFIX}${emp.id}`,
              label: emp.name,
              selected: selectedFilterIds.includes(`${EMPLOYEE_FILTER_PREFIX}${emp.id}`)
            }))
      return {
        filters,
        loading: isLoading,
        error: error ? (typeof error === 'string' ? error : String(error)) : null
      }
    },
    [employees, isLoading, error, selectedFilterIds]
  )

  return { backendSearch, getEmployeeLabel }
}
