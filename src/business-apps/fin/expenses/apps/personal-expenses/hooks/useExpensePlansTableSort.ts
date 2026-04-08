import { useCallback, useState } from 'react'

const PLAN_DATE_FIELD = 'planDate'

type SortOrder = 'ascend' | 'descend' | null

interface TableSorterPayload {
  field?: string
  order?: SortOrder
}

export interface UseExpensePlansTableSortParams {
  overviewTotalCount: number | undefined
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
}

export function useExpensePlansTableSort({
  overviewTotalCount,
  setCurrentPage,
  setPageSize
}: UseExpensePlansTableSortParams) {
  const [sortField, setSortField] = useState<string>(PLAN_DATE_FIELD)
  const [sortOrder, setSortOrder] = useState<SortOrder>('descend')

  const getNextSortState = useCallback(
    (sorter: TableSorterPayload): { nextField: string; nextOrder: 'ascend' | 'descend' } => {
      if (!sorter?.field) {
        return { nextField: PLAN_DATE_FIELD, nextOrder: 'descend' }
      }
      const isSameColumn = sortField === sorter.field
      const orderFromTable = sorter.order ?? null
      if (isSameColumn && orderFromTable !== null) {
        return { nextField: sorter.field, nextOrder: orderFromTable }
      }
      if (isSameColumn) {
        if (sortOrder === 'ascend') return { nextField: sorter.field, nextOrder: 'descend' }
        if (sortOrder === 'descend') return { nextField: PLAN_DATE_FIELD, nextOrder: 'descend' }
        return { nextField: sorter.field, nextOrder: 'ascend' }
      }
      return { nextField: sorter.field, nextOrder: 'ascend' }
    },
    [sortField, sortOrder]
  )

  const handleTableChange = useCallback(
    (pagination: { current: number; pageSize: number }, _filters: unknown, sorter: unknown) => {
      const totalCount = overviewTotalCount || 0
      const maxPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize))
      const validPage = pagination.current > maxPages ? 1 : pagination.current

      setCurrentPage(validPage)
      setPageSize(pagination.pageSize)

      const sortPayload = sorter && typeof sorter === 'object' && sorter !== null && 'field' in sorter
      if (sortPayload) {
        const { nextField, nextOrder } = getNextSortState(sorter as TableSorterPayload)
        setSortField(nextField)
        setSortOrder(nextOrder)
      }
    },
    [getNextSortState, overviewTotalCount, setCurrentPage, setPageSize]
  )

  return {
    sortField,
    sortOrder,
    handleTableChange
  }
}
