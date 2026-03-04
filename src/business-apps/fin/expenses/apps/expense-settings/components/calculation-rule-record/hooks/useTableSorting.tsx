import React, { useState, useCallback, useMemo } from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react'
export type SortOrder = 'ASC' | 'DESC'

export interface UseTableSortingOptions<T = any> {
  defaultSortField?: string
  defaultSortOrder?: SortOrder
  nestedFieldMappings?: Record<string, { field: string; secondarySort?: string }>
  // Client-side sorting options
  data?: T[]
  fieldMappings?: Record<string, (item: T) => string | number | boolean | undefined>
}

export interface UseTableSortingReturn<T = any> {
  sortField: string
  sortOrder: SortOrder
  handleSort: (field: string) => void
  renderSortIcon: (field: string) => React.ReactNode
  buildOrderByClause: () => string
  resetSort: () => void
  // Client-side sorted data (if data and fieldMappings provided)
  sortedData?: T[]
}

/**
 * Shared hook for table sorting functionality
 * Single source of truth: state management, UI helpers, and client-side sorting
 *
 * @param options - Configuration options for sorting
 * @returns Sorting state, utility functions, and sorted data (if data provided)
 */
export const useTableSorting = <T = any,>(options: UseTableSortingOptions<T> = {}): UseTableSortingReturn<T> => {
  const { defaultSortField = 'code', defaultSortOrder = 'ASC', nestedFieldMappings = {}, data, fieldMappings } = options

  const [sortField, setSortField] = useState<string>(defaultSortField)
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder)

  // Handle header click for sorting
  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        // Toggle sort order if clicking the same field
        setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'))
      } else {
        // Set new field and default to ASC
        setSortField(field)
        setSortOrder('ASC')
      }
    },
    [sortField]
  )

  // Render sort icon
  const renderSortIcon = useCallback(
    (field: string): React.ReactNode => {
      if (sortField !== field) {
        return <span className="gba:ml-1 gba:inline-block gba:w-[12px] gba:h-[12px]" />
      }
      return sortOrder === 'ASC' ? (
        <ArrowUpIcon className="gba:ml-1 gba:h-3 gba:w-3" />
      ) : (
        <ArrowDownIcon className="gba:ml-1 gba:h-3 gba:w-3" />
      )
    },
    [sortField, sortOrder]
  )

  // Build GraphQL orderBy clause
  const buildOrderByClause = useCallback((): string => {
    // Check if this is a nested field mapping
    const nestedMapping = nestedFieldMappings[sortField]

    if (nestedMapping) {
      // Handle nested fields (e.g., expenseGroup.code)
      // nestedMapping.field should be like "expenseGroup.code"
      // We need to build: { expenseGroup: { code: ASC } }
      const fieldParts = nestedMapping.field.split('.')
      if (fieldParts.length === 2) {
        const [parentField, childField] = fieldParts
        const primarySort = `{ ${parentField}: { ${childField}: ${sortOrder} } }`

        if (nestedMapping.secondarySort) {
          // Add secondary sort (e.g., code within each group)
          return `[${primarySort}, { ${nestedMapping.secondarySort}: ASC }]`
        }

        return primarySort
      }
    }

    // Simple field sort
    return `{ ${sortField}: ${sortOrder} }`
  }, [sortField, sortOrder, nestedFieldMappings])

  // Reset to default sort
  const resetSort = useCallback(() => {
    setSortField(defaultSortField)
    setSortOrder(defaultSortOrder)
  }, [defaultSortField, defaultSortOrder])

  // Client-side sorting (if data and fieldMappings provided)
  const sortedData = useMemo(() => {
    if (!data || !fieldMappings || !data.length) return data

    const sorted = [...data].sort((a, b) => {
      // Get the value extractor for the current field
      const getValue = fieldMappings[sortField]

      let aValue: string | number | boolean | undefined
      let bValue: string | number | boolean | undefined

      if (getValue) {
        // Use the provided field mapping
        aValue = getValue(a)
        bValue = getValue(b)
      } else {
        // Fallback to direct property access
        aValue = (a as any)[sortField] || ''
        bValue = (b as any)[sortField] || ''
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortOrder === 'ASC' ? comparison : -comparison
      }

      // Handle numeric/boolean comparison
      if (aValue === bValue) return 0
      const comparison = aValue! > bValue! ? 1 : -1
      return sortOrder === 'ASC' ? comparison : -comparison
    })

    return sorted
  }, [data, sortField, sortOrder, fieldMappings])

  return {
    sortField,
    sortOrder,
    handleSort,
    renderSortIcon,
    buildOrderByClause,
    resetSort,
    sortedData
  }
}
