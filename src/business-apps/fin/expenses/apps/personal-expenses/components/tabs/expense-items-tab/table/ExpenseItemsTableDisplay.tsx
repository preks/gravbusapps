import React from 'react'
import { DataDisplay, useTranslation } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import ExpenseDataTable from '../../../../../../common/components/table/ExpenseDataTable'
import type { ColumnConfig } from '../../../../../../common/types/columnTypes'
import { EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX } from './expenseItemColumns'
import personalTranslations from '../../../../_i18n'

interface ExpenseItemsTableDisplayProps {
  totalCount: number
  isLoading: boolean
  search: string
  onSearchChange: (value: string) => void
  filters: Record<string, unknown>
  filterConfiguration: any
  onFilterChange: (filters: Record<string, any>) => void
  sorting: Array<{ id: string; desc: boolean }>
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  primaryAction: React.ReactNode
  secondaryActions: React.ReactNode
  sortableColumns: ColumnConfig[]
  availableColumns: ColumnConfig[]
  visibleColumns: string[]
  onVisibleColumnsChange: (cols: string[]) => void
  filterSheetTitle: string
  filterSheetDescription: string
  data: ExpenseItem[]
  columns: ColumnDef<ExpenseItem>[]
  error?: string | null
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  actions: (row: { original: ExpenseItem }) => React.ReactNode
  onRowClick: (row: ExpenseItem) => void
}

export function ExpenseItemsTableDisplay({
  totalCount,
  isLoading,
  search,
  onSearchChange,
  filters,
  filterConfiguration,
  onFilterChange,
  sorting,
  onSortingChange,
  primaryAction,
  secondaryActions,
  sortableColumns,
  availableColumns,
  visibleColumns,
  onVisibleColumnsChange,
  filterSheetTitle,
  filterSheetDescription,
  data,
  columns,
  error,
  pagination,
  onPaginationChange,
  emptyMessage,
  actions,
  onRowClick
}: Readonly<ExpenseItemsTableDisplayProps>) {
  const { t } = useTranslation(personalTranslations)

  return (
    <DataDisplay
      titleSections={[
        {
          id: 'list',
          label: t('expense-items-breadcrumb'),
          metadata: { count: totalCount, isLoading }
        }
      ]}
      currentSection="list"
      searchValue={search}
      searchPlaceholder={t('expense-items-search-placeholder')}
      onSearchChange={onSearchChange}
      filters={filters}
      filterConfiguration={filterConfiguration}
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
      <ExpenseDataTable<ExpenseItem>
        data={data}
        columns={columns}
        loading={isLoading}
        error={error}
        totalCount={totalCount}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        emptyMessage={emptyMessage}
        actions={actions}
        onRowClick={onRowClick}
        dataTestId={EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}
      />
    </DataDisplay>
  )
}
