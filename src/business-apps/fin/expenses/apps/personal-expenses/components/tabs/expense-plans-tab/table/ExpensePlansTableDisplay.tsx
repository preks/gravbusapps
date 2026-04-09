import { type ReactNode } from 'react'
import { DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ExpenseDataTable from '@/business-apps/fin/expenses/common/components/table/ExpenseDataTable'
import type { ExpensePlan } from '../../../../hooks/useGetExpensePlans'
import { EXPENSE_PLANS_TABLE_DATA_TEST_ID_PREFIX } from './expensePlanColumns'

export interface ExpensePlansTableDisplayProps {
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
  columns: ColumnDef<ExpensePlan>[]
  tableError: string | undefined
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  rowActions: (row: { original: ExpensePlan }) => ReactNode
  onRowClick: (item: ExpensePlan) => void
}

export function ExpensePlansTableDisplay({
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
  columns,
  tableError,
  pagination,
  onPaginationChange,
  emptyMessage,
  rowActions,
  onRowClick
}: Readonly<ExpensePlansTableDisplayProps>) {
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
      <ExpenseDataTable<ExpensePlan>
        data={plans}
        columns={columns}
        loading={isLoading}
        error={tableError}
        totalCount={totalCount}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        emptyMessage={emptyMessage}
        actions={rowActions}
        onRowClick={onRowClick}
        dataTestId={EXPENSE_PLANS_TABLE_DATA_TEST_ID_PREFIX}
      />
    </DataDisplay>
  )
}
