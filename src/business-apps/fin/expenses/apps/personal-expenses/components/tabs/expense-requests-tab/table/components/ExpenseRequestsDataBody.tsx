import React from 'react'
import { DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ExpenseDataTable from '@/business-apps/fin/expenses/common/components/table/ExpenseDataTable'
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
