import { useMemo, type ReactNode } from 'react'
import type { SortingState } from '@tanstack/react-table'
import type { ColumnConfig } from '@/business-apps/fin/expenses/common/types/columnTypes'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { BackofficeListTableToolbarProps } from '../components/BackofficeListTableDisplay'

export interface UseBackofficeListTableToolbarParams {
  totalCount: number
  isLoading: boolean
  searchText: string
  searchPlaceholder: string
  onSearchChange: (value: string) => void
  filtersObject: Record<string, unknown>
  filterConfiguration: FilterConfiguration
  onFilterChange: (filters: Record<string, unknown>) => void
  listSectionLabel: string
  sortingState: SortingState
  onSortingChange: (sorting: SortingState) => void
  sortableColumns: ColumnConfig[]
  availableColumns: ColumnConfig[]
  visibleColumns: string[]
  onVisibleColumnsChange: (columns: string[]) => void
  secondaryActions: ReactNode
  filterSheetTitle: string
  filterSheetDescription: string
}

export function useBackofficeListTableToolbarProps(
  params: UseBackofficeListTableToolbarParams
): BackofficeListTableToolbarProps {
  const {
    totalCount,
    isLoading,
    searchText,
    searchPlaceholder,
    onSearchChange,
    filtersObject,
    filterConfiguration,
    onFilterChange,
    listSectionLabel,
    sortingState,
    onSortingChange,
    sortableColumns,
    availableColumns,
    visibleColumns,
    onVisibleColumnsChange,
    secondaryActions,
    filterSheetTitle,
    filterSheetDescription
  } = params

  return useMemo(
    (): BackofficeListTableToolbarProps => ({
      totalCount,
      isLoading,
      searchText,
      searchPlaceholder,
      onSearchChange,
      filtersObject,
      filterConfiguration,
      onFilterChange,
      listSectionLabel,
      sorting: sortingState,
      onSortingChange,
      sortableColumns,
      availableColumns,
      visibleColumns,
      onVisibleColumnsChange,
      secondaryActions,
      filterSheetTitle,
      filterSheetDescription
    }),
    [
      totalCount,
      isLoading,
      searchText,
      searchPlaceholder,
      onSearchChange,
      filtersObject,
      filterConfiguration,
      onFilterChange,
      listSectionLabel,
      sortingState,
      onSortingChange,
      sortableColumns,
      availableColumns,
      visibleColumns,
      onVisibleColumnsChange,
      secondaryActions,
      filterSheetTitle,
      filterSheetDescription
    ]
  )
}
