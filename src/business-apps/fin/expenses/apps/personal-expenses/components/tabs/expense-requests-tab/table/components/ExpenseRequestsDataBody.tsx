import React from 'react'
import { DataDisplay, DataTable, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { expenseRequestAvailableColumns } from '../../config/expenseRequestAvailableColumns'
import { expenseRequestSortableColumns } from '../../config/expenseRequestSortableColumns'
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
  sorting: Array<{ id: string; desc: boolean }>
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  primaryAction: React.ReactNode
  secondaryActions: React.ReactNode | undefined
  visibleColumns: string[]
  onVisibleColumnsChange: (ids: string[]) => void
  filterSheetTitle: string
  filterSheetDescription: string
  items: ExpenseRequestRow[]
  columns: ColumnDef<ExpenseRequestRow>[]
  columnVisibility: Record<string, boolean>
  error: string | undefined
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (p: { pageIndex: number; pageSize: number }) => void
  emptyMessage: React.ReactNode
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
  sorting,
  onSortingChange,
  primaryAction,
  secondaryActions,
  visibleColumns,
  onVisibleColumnsChange,
  filterSheetTitle,
  filterSheetDescription,
  items,
  columns,
  columnVisibility,
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
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_list.flows_button.expense_requests',
            'Expense Requests'
          ),
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
      sortableColumns={expenseRequestSortableColumns}
      onSortingChange={onSortingChange}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      availableColumns={expenseRequestAvailableColumns}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={onVisibleColumnsChange}
      toolbarDensity="default"
      enableLiveFiltering={true}
      filterSheetTitle={filterSheetTitle}
      filterSheetDescription={filterSheetDescription}
    >
      <DataTable<ExpenseRequestRow>
        data={items}
        columns={columns}
        columnVisibility={columnVisibility}
        loading={isLoading}
        error={error}
        totalCount={totalCount}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        enablePagination
        enableSorting
        enableSelection={false}
        enableColumnPinning
        enableResizing={false}
        tableLayout="fixed"
        rowsPerPageOptions={[10, 20, 50, 100]}
        showPageNumbers
        maxVisiblePages={7}
        emptyMessage={emptyMessage as string | undefined}
        actions={rowActions}
        onRowClick={onRowClick}
        data-testid={EXPENSE_REQUESTS_TABLE_DATA_TEST_ID}
      />
    </DataDisplay>
  )
}
