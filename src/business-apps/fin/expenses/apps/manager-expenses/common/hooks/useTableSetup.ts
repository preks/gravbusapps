import { useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Shared table setup: context props, column filtering, and pagination handling.
 */
export function useTableSetup<T>(
  props: Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'>,
  allColumns: ColumnDef<T>[],
  visibleColumnIds: string[],
  currentPage: number,
  pageSize: number,
  setCurrentPage: (page: number) => void,
  setPageSize: (size: number) => void
) {
  const contextProps = useMemo(
    () => ({ accessToken: props.accessToken, userInfo: props.userInfo }),
    [props.accessToken, props.userInfo]
  )

  const columns = useMemo(() => {
    const ids = visibleColumnIds.length > 0 ? visibleColumnIds : allColumns.map(c => c.id as string)
    return allColumns.filter(col => ids.includes((col.id as string) ?? ''))
  }, [allColumns, visibleColumnIds])

  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])

  const handlePaginationChange = useCallback(
    (p: { pageIndex: number; pageSize: number }) => {
      setCurrentPage(p.pageIndex + 1)
      setPageSize(p.pageSize)
    },
    [setCurrentPage, setPageSize]
  )

  return { contextProps, columns, pagination, handlePaginationChange }
}
