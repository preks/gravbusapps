import { useMemo, type ReactNode } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import type { ColumnConfig } from '@/business-apps/fin/expenses/common/types/columnTypes'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { AdvancePaymentItem } from '../../../../types'
import { useBackofficeListTableToolbarProps } from '../../../../common/hooks/useBackofficeListTableToolbarProps'
import type { BackofficeAdvancePaymentsTableDisplayProps } from '../table/BackofficeAdvancePaymentsTableDisplay'

export interface UseBackofficeAdvancePaymentsTableDisplayModelParams {
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
  payments: AdvancePaymentItem[]
  error: unknown
  columns: ColumnDef<AdvancePaymentItem>[]
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  onRowClick: (record: AdvancePaymentItem) => void
  renderRowActions: (row: { original: AdvancePaymentItem }) => ReactNode
}

export function useBackofficeAdvancePaymentsTableDisplayModel(
  params: UseBackofficeAdvancePaymentsTableDisplayModelParams
): BackofficeAdvancePaymentsTableDisplayProps {
  const {
    payments,
    error,
    columns,
    pagination,
    onPaginationChange,
    emptyMessage,
    onRowClick,
    renderRowActions,
    totalCount,
    isLoading,
    sortingState,
    onSortingChange,
    ...toolbarParams
  } = params

  const toolbarProps = useBackofficeListTableToolbarProps({
    ...toolbarParams,
    totalCount,
    isLoading,
    sortingState,
    onSortingChange
  })

  return useMemo(
    (): BackofficeAdvancePaymentsTableDisplayProps => ({
      ...toolbarProps,
      payments,
      error,
      columns,
      pagination,
      onPaginationChange,
      emptyMessage,
      onRowClick,
      renderRowActions
    }),
    [toolbarProps, payments, error, columns, pagination, onPaginationChange, emptyMessage, onRowClick, renderRowActions]
  )
}
