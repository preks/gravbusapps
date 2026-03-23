import React, { useMemo } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import { ExpenseData } from '../../../types'
import translations from '../../../_i18n'
import { ExpenseRequestsDataTable } from './components'
import { useTableSetup } from '../../../common/hooks/useTableSetup'
import {
  createBackofficeExpenseRequestColumns,
  type BackofficeExpenseRequestTableChrome
} from './backofficeExpenseRequestColumns'

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  expenses: ExpenseData[]
  loading: boolean
  error: string | null
  totalItems: number
  currentPage: number
  setCurrentPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  visibleColumnIds: string[]
  emptyMessage: string
  onRowClick: (record: ExpenseData) => void
  tableChrome: BackofficeExpenseRequestTableChrome
}

const DATA_TEST_ID_PREFIX = 'expense-requests'

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = props => {
  const {
    expenses,
    loading,
    error,
    totalItems,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sorting,
    onSortingChange,
    visibleColumnIds,
    emptyMessage,
    onRowClick,
    tableChrome
  } = props
  const { t } = useTranslation(translations)

  const allColumns = useMemo(() => createBackofficeExpenseRequestColumns(t, tableChrome), [t, tableChrome])

  const { columns, pagination, handlePaginationChange } = useTableSetup(
    props,
    allColumns,
    visibleColumnIds,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize
  )

  return (
    <ExpenseRequestsDataTable
      error={error}
      loading={loading}
      expenses={expenses}
      totalItems={totalItems}
      columns={columns}
      sorting={sorting}
      onSortingChange={onSortingChange}
      pagination={pagination}
      onPaginationChange={handlePaginationChange}
      onRowClick={onRowClick}
      emptyMessage={emptyMessage}
      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
    />
  )
}

export default React.memo(ExpenseRequestsTable)
