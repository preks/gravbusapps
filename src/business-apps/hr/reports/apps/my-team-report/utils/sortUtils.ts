import { Employee } from '../hooks/useGetEmployeesReport'
import { getCatalogValue } from '@/common/utils/windowUtils'

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  key: keyof Employee
  direction: SortDirection
}

export const sortData = (data: Employee[], sortConfig: SortConfig | null): Employee[] => {
  if (!sortConfig) {
    return data
  }

  const { key, direction } = sortConfig

  return [...data].sort((a, b) => {
    let aValue = a[key]
    let bValue = b[key]

    if (key === 'employmentType' || key === 'contractType') {
      aValue = aValue ? getCatalogValue(aValue as any) : ''
      bValue = bValue ? getCatalogValue(bValue as any) : ''
    }

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1
    }
    return 0
  })
}
