import { useCallback, useState } from 'react'

const PLAN_DATE_FIELD = 'planDate'

export type ExpensePlansTableSortOrder = 'ascend' | 'descend' | null

interface TableSorterPayload {
  field?: string
  order?: string
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
  const [sortField, setSortField] = useState<string | null>(PLAN_DATE_FIELD)
  const [sortOrder, setSortOrder] = useState<ExpensePlansTableSortOrder>('descend')

  const handleTableChange = useCallback(
    (pagination: { current: number; pageSize: number }, _filters: unknown, sorter: unknown) => {
      const totalCount = overviewTotalCount || 0
      const maxPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize))
      const validPage = pagination.current > maxPages ? 1 : pagination.current

      setCurrentPage(validPage)
      setPageSize(pagination.pageSize)

      const payload = sorter && typeof sorter === 'object' && sorter !== null ? (sorter as TableSorterPayload) : {}
      const field = payload.field
      const order = payload.order
      const hasExplicitSort =
        typeof field === 'string' && field.length > 0 && (order === 'ascend' || order === 'descend')

      if (hasExplicitSort) {
        setSortField(field)
        setSortOrder(order as 'ascend' | 'descend')
      } else {
        setSortField(null)
        setSortOrder(null)
      }
    },
    [overviewTotalCount, setCurrentPage, setPageSize]
  )

  return {
    sortField,
    sortOrder,
    handleTableChange
  }
}
