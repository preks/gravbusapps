import { type ReactNode } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import type { ExpenseData } from '../../../../types'
import {
  BackofficeListTableDisplay,
  type BackofficeListTableToolbarProps
} from '../../../../common/components/BackofficeListTableDisplay'
import ExpenseRequestsTable from './ExpenseRequestsTable'

export interface BackofficeExpenseRequestsTableBodyProps {
  expenses: ExpenseData[]
  isLoading: boolean
  error: string | null
  totalCount: number
  tableColumns: ColumnDef<ExpenseData>[]
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  onRowClick: (record: ExpenseData) => void
  renderRowActions: (row: { original: ExpenseData }) => ReactNode
}

export type BackofficeExpenseRequestsTableDisplayProps = BackofficeExpenseRequestsTableBodyProps &
  BackofficeListTableToolbarProps

export function BackofficeExpenseRequestsTableDisplay({
  expenses,
  error,
  tableColumns,
  pagination,
  onPaginationChange,
  emptyMessage,
  onRowClick,
  renderRowActions,
  ...toolbarProps
}: Readonly<BackofficeExpenseRequestsTableDisplayProps>) {
  return (
    <BackofficeListTableDisplay {...toolbarProps}>
      <ExpenseRequestsTable
        expenses={expenses}
        loading={toolbarProps.isLoading}
        error={error}
        totalItems={toolbarProps.totalCount}
        columns={tableColumns}
        sorting={toolbarProps.sorting}
        onSortingChange={toolbarProps.onSortingChange}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
        actions={renderRowActions}
      />
    </BackofficeListTableDisplay>
  )
}
