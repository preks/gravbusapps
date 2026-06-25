import { type ReactNode } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import type { AdvancePaymentItem } from '../../../../types'
import {
  BackofficeListTableDisplay,
  type BackofficeListTableToolbarProps
} from '../../../../common/components/BackofficeListTableDisplay'
import AdvancePaymentsDataBody from '../components/AdvancePaymentsDataBody'

export interface BackofficeAdvancePaymentsTableBodyProps {
  payments: AdvancePaymentItem[]
  isLoading: boolean
  error: unknown
  totalCount: number
  columns: ColumnDef<AdvancePaymentItem>[]
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  onRowClick: (record: AdvancePaymentItem) => void
  renderRowActions: (row: { original: AdvancePaymentItem }) => ReactNode
}

export type BackofficeAdvancePaymentsTableDisplayProps = BackofficeAdvancePaymentsTableBodyProps &
  BackofficeListTableToolbarProps

export function BackofficeAdvancePaymentsTableDisplay({
  payments,
  error,
  columns,
  pagination,
  onPaginationChange,
  emptyMessage,
  onRowClick,
  renderRowActions,
  ...toolbarProps
}: Readonly<BackofficeAdvancePaymentsTableDisplayProps>) {
  return (
    <BackofficeListTableDisplay {...toolbarProps}>
      <AdvancePaymentsDataBody
        payments={payments}
        isLoading={toolbarProps.isLoading}
        error={error}
        totalCount={toolbarProps.totalCount}
        columns={columns}
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
