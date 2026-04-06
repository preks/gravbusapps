import React, { type ReactNode, useMemo } from 'react'
import { DataDisplay, DataTable, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ExpensePlan } from '../../../../hooks/useGetExpensePlans'
import { EXPENSE_PLANS_TABLE_DATA_TEST_ID_PREFIX } from '../columns/expensePlanColumns'

export interface ExpensePlansDataBodyProps {
  totalCount: number
  isLoading: boolean
  search: string
  onSearchChange: (search: string) => void
  filtersObject: Record<string, unknown>
  filterConfiguration: FilterConfiguration
  onFilterChange: (filters: Record<string, unknown>) => void
  sorting: Array<{ id: string; desc: boolean }>
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  sortableColumns: Array<{ id: string; label: string }>
  availableColumns: Array<{ id: string; label: string }>
  visibleColumnIds: string[]
  onVisibleColumnIdsChange: (ids: string[]) => void
  primaryAction: ReactNode
  secondaryActions: ReactNode | undefined
  filterSheetTitle: string
  filterSheetDescription: string
  plans: ExpensePlan[]
  allColumns: ColumnDef<ExpensePlan>[]
  tableError: string | undefined
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  rowActions: (row: { original: ExpensePlan }) => ReactNode
  onRowClick: (item: ExpensePlan) => void
}

export function ExpensePlansDataBody({
  totalCount,
  isLoading,
  search,
  onSearchChange,
  filtersObject,
  filterConfiguration,
  onFilterChange,
  sorting,
  onSortingChange,
  sortableColumns,
  availableColumns,
  visibleColumnIds,
  onVisibleColumnIdsChange,
  primaryAction,
  secondaryActions,
  filterSheetTitle,
  filterSheetDescription,
  plans,
  allColumns,
  tableError,
  pagination,
  onPaginationChange,
  emptyMessage,
  rowActions,
  onRowClick
}: Readonly<ExpensePlansDataBodyProps>) {
  const visibleColumns = useMemo(
    () =>
      allColumns.filter(col => visibleColumnIds.includes((col as ColumnDef<ExpensePlan> & { id?: string }).id ?? '')),
    [allColumns, visibleColumnIds]
  )

  const searchPlaceholder = `${getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_list.employee_report_filter.job_search',
    'Search'
  )}...`

  return (
    <DataDisplay
      titleSections={[
        {
          id: 'list',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.title', 'My Expense Plans'),
          metadata: { count: totalCount, isLoading }
        }
      ]}
      currentSection="list"
      searchValue={search ?? ''}
      searchPlaceholder={searchPlaceholder}
      onSearchChange={onSearchChange}
      filters={filtersObject}
      filterConfiguration={filterConfiguration}
      onFilterChange={onFilterChange}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={onSortingChange}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      availableColumns={availableColumns}
      visibleColumns={visibleColumnIds}
      onVisibleColumnsChange={onVisibleColumnIdsChange}
      toolbarDensity="default"
      enableLiveFiltering={true}
      filterSheetTitle={filterSheetTitle}
      filterSheetDescription={filterSheetDescription}
    >
      <DataTable<ExpensePlan>
        data={plans}
        columns={visibleColumns}
        loading={isLoading}
        error={tableError}
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
        emptyMessage={emptyMessage}
        actions={rowActions}
        onRowClick={onRowClick}
        data-testid={EXPENSE_PLANS_TABLE_DATA_TEST_ID_PREFIX}
      />
    </DataDisplay>
  )
}
