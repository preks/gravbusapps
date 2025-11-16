import { useMemo } from 'react'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { EmployeeOption } from './EmployeeSelect'

export interface UseEmployeeSelectProps {
  businessAppContext: BusinessAppContextProps
  initialEmployee?: Employee | null
  currentValue?: string | null
}

export interface UseEmployeeSelectReturn {
  employees: EmployeeOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  onSearch: (searchTerm: string) => void
  onLoadMore: () => void
}

/**
 * Hook for EmployeeSelect component
 * Uses central Employee interface
 */
export const useEmployeeSelect = ({
  businessAppContext,
  initialEmployee
}: UseEmployeeSelectProps): UseEmployeeSelectReturn => {
  // Transform initialEmployee to search format
  const initialEmployeeForSearch = useMemo(() => {
    if (!initialEmployee) return null

    return {
      id: initialEmployee.id,
      displayName:
        initialEmployee.displayName ||
        `${initialEmployee.firstName || ''} ${initialEmployee.lastName || ''}`.trim() ||
        'Unknown',
      firstName: initialEmployee.firstName,
      lastName: initialEmployee.lastName,
      userId: undefined,
      pictureThumbnail: initialEmployee.pictureThumbnail,
      organizationalUnitName: initialEmployee.employeePosition?.organizationalUnit?.name,
      jobPositionName: initialEmployee.employeePosition?.jobPosition?.name
    }
  }, [initialEmployee])

  const {
    employees: employeeRecords,
    loading,
    error,
    hasMore,
    search,
    loadMore
  } = useEmployeeSearch(businessAppContext.accessToken, initialEmployeeForSearch)

  // Transform to EmployeeOption format
  const employees: EmployeeOption[] = useMemo(() => {
    return employeeRecords.map(emp => ({
      id: emp.id,
      displayName: emp.displayName,
      pictureThumbnail: emp.pictureThumbnail,
      organizationalUnitName: emp.organizationalUnitName,
      jobPositionName: emp.jobPositionName
    }))
  }, [employeeRecords])

  // Search handler
  const onSearch = (searchTerm: string) => {
    search(searchTerm || '')
  }

  return {
    employees,
    loading,
    error,
    hasMore,
    onSearch,
    onLoadMore: loadMore
  }
}
