import { useState, useCallback } from 'react'
import { SortConfig, SortDirection } from '../utils/sortUtils'
import { Employee } from './useGetEmployeesReport'

export interface UseSortReturn {
  sortConfig: SortConfig | null
  handleSort: (key: keyof Employee) => void
}

export const useSort = (initialConfig: SortConfig | null = null): UseSortReturn => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(initialConfig)

  const handleSort = useCallback((key: keyof Employee) => {
    setSortConfig(prevConfig => {
      let direction: SortDirection = 'asc'
      if (prevConfig && prevConfig.key === key && prevConfig.direction === 'asc') {
        direction = 'desc'
      }
      return { key, direction }
    })
  }, [])

  return {
    sortConfig,
    handleSort
  }
}

export default useSort
