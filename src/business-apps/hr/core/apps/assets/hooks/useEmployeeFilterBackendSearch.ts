/**
 * Hook for the async employee filter in Asset Management.
 * Provides merged options for both selected employees and backend search results.
 */

import { useEffect, useMemo } from 'react'
import { useStructureEmployees } from '@/business-apps/hr/core/forms/performance-evaluation-form/hooks/useStructureEmployees'
export interface UseEmployeeFilterBackendSearchResult {
  employeeOptions: Array<{ id: string; label: string }>
  isLoading: boolean
  error: string | null
}

export function useEmployeeFilterBackendSearch(
  accessToken: string,
  selectedEmployeeIds: string[],
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

  const employeeLabelMap = useMemo(
    () => new Map(employees.map(emp => [emp.id, emp.name || emp.id] as const)),
    [employees]
  )

  const selectedEmployeeOptions = selectedEmployeeIds
    .map(employeeId => ({
      id: employeeId,
      label: employeeLabelMap.get(employeeId) || employeeId
    }))
    .filter((option, index, options) => options.findIndex(candidate => candidate.id === option.id) === index)

  const mergedOptions = [...selectedEmployeeOptions]
  employees.forEach(emp => {
    const option = {
      id: emp.id,
      label: emp.name || emp.id
    }
    if (!mergedOptions.some(candidate => candidate.id === option.id)) {
      mergedOptions.push(option)
    }
  })

  return {
    employeeOptions: mergedOptions,
    isLoading,
    error: error ? (typeof error === 'string' ? error : String(error)) : null
  }
}
