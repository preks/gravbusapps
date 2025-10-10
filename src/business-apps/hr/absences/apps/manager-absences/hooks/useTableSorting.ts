import { useCallback } from 'react'

interface UseTableSortingProps {
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void
}

interface UseTableSortingReturn {
  handleSort: (field: string) => void
  getSortDirection: (field: string) => 'ASC' | 'DESC' | ''
}

export const useTableSorting = ({
  sortField,
  sortOrder,
  onSortingChange
}: UseTableSortingProps): UseTableSortingReturn => {
  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        // Cycle through: ASC -> DESC -> clear
        if (sortOrder === 'ASC') {
          onSortingChange(field, 'DESC')
        } else if (sortOrder === 'DESC') {
          onSortingChange('', '')
        } else {
          onSortingChange(field, 'ASC')
        }
      } else {
        onSortingChange(field, 'ASC')
      }
    },
    [sortField, sortOrder, onSortingChange]
  )

  const getSortDirection = useCallback(
    (field: string) => {
      if (sortField !== field) return ''
      return sortOrder
    },
    [sortField, sortOrder]
  )

  return {
    handleSort,
    getSortDirection
  }
}
