import { useCallback, useMemo, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { useFilterSignatureReset, useVisibleColumns } from '../../../../../manager-expenses/hooks/useTabState'
import {
  BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS,
  createBackofficeExpenseRequestSortableColumns
} from '../config/backofficeExpenseRequestSortableColumns'
import {
  expenseRequestColumnIdToSortField,
  expenseRequestSortFieldToColumnId
} from '../table/backofficeExpenseRequestSortUtils'
import type { ExpenseRequestListSortField } from '../../../../hooks/useExpenseRequests'
import type { TranslateFn } from '../../../../utils/utils'

const DEFAULT_VISIBLE_COLUMN_IDS = [...BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS]

interface UseExpenseRequestTableStateParams {
  t: TranslateFn
  sorting: {
    field: ExpenseRequestListSortField | null
    order: 'ASC' | 'DESC' | null
  }
  applySorting: (field: ExpenseRequestListSortField | null, order: 'ASC' | 'DESC' | null) => void
  setCurrentPage: (page: number) => void
  hasActiveFilters: boolean
  filterSignature: unknown[]
}

export function useExpenseRequestTableState({
  t,
  sorting,
  applySorting,
  setCurrentPage,
  hasActiveFilters,
  filterSignature
}: UseExpenseRequestTableStateParams) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...DEFAULT_VISIBLE_COLUMN_IDS])

  const resetPage = useCallback(() => setCurrentPage(1), [setCurrentPage])
  useFilterSignatureReset(filterSignature, resetPage)

  const sortingState = useMemo((): SortingState => {
    if (!sorting.field || !sorting.order) {
      return []
    }

    const columnId = expenseRequestSortFieldToColumnId(sorting.field)
    return [{ id: columnId, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      if (newSorting.length === 0) {
        if (sorting.field === 'createdAt') {
          applySorting(null, null)
        } else {
          applySorting('createdAt', 'DESC')
        }

        setCurrentPage(1)
        return
      }

      const [firstSorting] = newSorting
      if (firstSorting.id === 'select' || firstSorting.id === 'actions') {
        return
      }

      const field = expenseRequestColumnIdToSortField(firstSorting.id)
      const order: 'ASC' | 'DESC' = firstSorting.desc ? 'DESC' : 'ASC'

      if (field === sorting.field && order === sorting.order) {
        return
      }

      applySorting(field, order)
      setCurrentPage(1)
    },
    [applySorting, setCurrentPage, sorting.field, sorting.order]
  )

  const sortableColumns = useMemo(() => createBackofficeExpenseRequestSortableColumns(t), [t])
  const columnsFilteredByVisibility = useVisibleColumns(visibleColumns, sortableColumns)

  const listEmptyMessage = useMemo(
    () => (hasActiveFilters ? t('empty-no-data') : t('empty-no-requests-yet')),
    [hasActiveFilters, t]
  )

  return {
    visibleColumns,
    setVisibleColumns,
    sortingState,
    handleSortingChange,
    sortableColumns,
    columnsFilteredByVisibility,
    listEmptyMessage
  }
}
