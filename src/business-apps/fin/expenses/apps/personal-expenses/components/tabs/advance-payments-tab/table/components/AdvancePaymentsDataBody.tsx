import React from 'react'
import { DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import ExpenseDataTable from '@/business-apps/fin/expenses/common/components/table/ExpenseDataTable'
import type { ColumnConfig } from '@/business-apps/fin/expenses/common/types/columnTypes'
import type { AdvancePayment } from '../../../../../hooks/useGetAdvancePayments'
import { ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID } from '../columns/advancePaymentColumns'

export interface AdvancePaymentsDataBodyProps {
  totalCount: number
  isLoading: boolean
  searchText: string
  onSearchChange: (value: string) => void
  filtersObject: Record<string, unknown>
  advancePaymentsFilterConfig: FilterConfiguration
  onFilterChangeFromDisplay: (filters: Record<string, unknown>) => void
  sorting: Array<{ id: string; desc: boolean }>
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  sortableColumns: ColumnConfig[]
  availableColumns: ColumnConfig[]
  listSectionLabel: string
  searchPlaceholder: string
  primaryAction: React.ReactNode
  secondaryActions: React.ReactNode | undefined
  visibleColumns: string[]
  onVisibleColumnsChange: (ids: string[]) => void
  filterSheetTitle: string
  filterSheetDescription: string
  items: AdvancePayment[]
  columns: ColumnDef<AdvancePayment>[]
  error: string | undefined
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (p: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  rowActions: (row: { original: AdvancePayment }) => React.ReactNode
  onRowClick: (row: AdvancePayment) => void
}

export function AdvancePaymentsDataBody({
  totalCount,
  isLoading,
  searchText,
  onSearchChange,
  filtersObject,
  advancePaymentsFilterConfig,
  onFilterChangeFromDisplay,
  sorting,
  onSortingChange,
  sortableColumns,
  availableColumns,
  listSectionLabel,
  searchPlaceholder,
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
}: Readonly<AdvancePaymentsDataBodyProps>) {
  const visibleColumnSet = new Set(visibleColumns)
  const filteredColumns = columns.filter(col => {
    const id = (col as ColumnDef<AdvancePayment> & { id?: string }).id ?? ''
    return visibleColumnSet.has(id)
  })

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
      searchValue={searchText}
      searchPlaceholder={searchPlaceholder}
      onSearchChange={onSearchChange}
      filters={filtersObject}
      filterConfiguration={advancePaymentsFilterConfig}
      onFilterChange={onFilterChangeFromDisplay}
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
      <ExpenseDataTable<AdvancePayment>
        data={items || []}
        columns={filteredColumns}
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
        dataTestId={ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID}
      />
    </DataDisplay>
  )
}
