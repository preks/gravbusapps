import { useMemo, type ReactNode } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import type { ColumnConfig } from '@/business-apps/fin/expenses/common/types/columnTypes'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { ExpenseData } from '../../../../types'
import { useBackofficeListTableToolbarProps } from '../../../../common/hooks/useBackofficeListTableToolbarProps'
import type { BackofficeExpenseRequestsTableDisplayProps } from '../table/BackofficeExpenseRequestsTableDisplay'

export interface UseBackofficeExpenseRequestsTableDisplayModelParams {
  totalItems: number
  loading: boolean
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
  expenses: ExpenseData[]
  error: string | null
  tableColumns: ColumnDef<ExpenseData>[]
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  onRowClick: (record: ExpenseData) => void
  renderRowActions: (row: { original: ExpenseData }) => ReactNode
}

export function useBackofficeExpenseRequestsTableDisplayModel(
  params: UseBackofficeExpenseRequestsTableDisplayModelParams
): BackofficeExpenseRequestsTableDisplayProps {
  const {
    totalItems,
    loading,
    expenses,
    error,
    tableColumns,
    pagination,
    onPaginationChange,
    emptyMessage,
    onRowClick,
    renderRowActions,
    sortingState,
    onSortingChange,
    ...toolbarParams
  } = params

  const toolbarProps = useBackofficeListTableToolbarProps({
    ...toolbarParams,
    totalCount: totalItems,
    isLoading: loading,
    sortingState,
    onSortingChange
  })

  return useMemo(
    (): BackofficeExpenseRequestsTableDisplayProps => ({
      ...toolbarProps,
      expenses,
      error,
      tableColumns,
      pagination,
      onPaginationChange,
      emptyMessage,
      onRowClick,
      renderRowActions
    }),
    [
      toolbarProps,
      expenses,
      error,
      tableColumns,
      pagination,
      onPaginationChange,
      emptyMessage,
      onRowClick,
      renderRowActions
    ]
  )
}
