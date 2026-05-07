import React from 'react'
import { DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { ColumnConfig } from '@/business-apps/fin/expenses/common/types/columnTypes'
import ExpenseDataTable from '@/business-apps/fin/expenses/common/components/table/ExpenseDataTable'
import type { ExpenseRequestRow } from '../columns/expenseRequestColumns'
import { EXPENSE_REQUESTS_TABLE_DATA_TEST_ID } from '../columns/expenseRequestColumns'

export interface ExpenseRequestsDataBodyProps {
  totalCount: number
  isLoading: boolean
  searchInput: string
  searchPlaceholderSuffix: string
  onSearchChange: (value: string) => void
  filtersObject: Record<string, unknown>
  expenseRequestsFilterConfig: FilterConfiguration
  onFilterChange: (filters: Record<string, unknown>) => void
  listSectionLabel: string
  sorting: Array<{ id: string; desc: boolean }>
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  sortableColumns: ColumnConfig[]
  availableColumns: ColumnConfig[]
  primaryAction: React.ReactNode
  secondaryActions: React.ReactNode | undefined
  visibleColumns: string[]
  onVisibleColumnsChange: (ids: string[]) => void
  filterSheetTitle: string
  filterSheetDescription: string
  items: ExpenseRequestRow[]
  columns: ColumnDef<ExpenseRequestRow>[]
  error: string | undefined
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (p: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  rowActions: (row: { original: ExpenseRequestRow }) => React.ReactNode
  onRowClick: (row: ExpenseRequestRow) => void
}

export function ExpenseRequestsDataBody({
  totalCount,
  isLoading,
  searchInput,
  searchPlaceholderSuffix,
  onSearchChange,
  filtersObject,
  expenseRequestsFilterConfig,
  onFilterChange,
  listSectionLabel,
  sorting,
  onSortingChange,
  sortableColumns,
  availableColumns,
  primaryAction,
  secondaryActions,
  visibleColumns,
  onVisibleColumnsChange,
  filterSheetTitle,
  filterSheetDescription,
  items,
  columns,
  error,
  pagination,
  onPaginationChange,
  emptyMessage,
  rowActions,
  onRowClick
}: Readonly<ExpenseRequestsDataBodyProps>) {
  return (
    <DataDisplay
      titleSections={[
        {
          id: 'list',
          label: listSectionLabel,
          metadata: { count: totalCount, isLoading }
        }
      ]}
      currentSection="list"
      searchValue={searchInput}
      searchPlaceholder={searchPlaceholderSuffix}
      onSearchChange={onSearchChange}
      filters={filtersObject}
      filterConfiguration={expenseRequestsFilterConfig}
      onFilterChange={onFilterChange}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={onSortingChange}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      availableColumns={availableColumns}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={onVisibleColumnsChange}
      toolbarDensity="default"
      enableLiveFiltering={true}
      filterSheetTitle={filterSheetTitle}
      filterSheetDescription={filterSheetDescription}
    >
      <ExpenseDataTable<ExpenseRequestRow>
        data={items}
        columns={columns}
        loading={isLoading}
        error={error}
        totalCount={totalCount}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        emptyMessage={emptyMessage}
        actions={rowActions}
        onRowClick={onRowClick}
        dataTestId={EXPENSE_REQUESTS_TABLE_DATA_TEST_ID}
      />
    </DataDisplay>
  )
}
