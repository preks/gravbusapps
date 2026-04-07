import { useDebounce } from '@/common/hooks/useDebounce'
import { useCallback, useMemo, useState } from 'react'
import {
  useFilterSignatureReset,
  useSearchHandler,
  useVisibleColumns
} from '../../../../../../common/hooks/useSharedTabState'
import type { ExpenseItemsTableStateParams, TableSortOrder } from './expenseItemsTable.types'

export function useExpenseItemsTableState({
  selectedFilters,
  activeWidgetKey,
  expenseDateRange,
  amountRange,
  initialVisibleColumnIds,
  items
}: ExpenseItemsTableStateParams) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)

  const hasActiveFilters = useMemo(
    () => Boolean(debouncedSearch?.trim()) || selectedFilters.length > 0,
    [debouncedSearch, selectedFilters]
  )

  const filterSignature = useMemo(
    () =>
      [
        [...selectedFilters].sort((a, b) => a.localeCompare(b)).join('\0'),
        activeWidgetKey ?? '',
        expenseDateRange?.[0]?.toISOString() ?? '',
        expenseDateRange?.[1]?.toISOString() ?? '',
        typeof amountRange?.min === 'number' ? String(amountRange.min) : '',
        typeof amountRange?.max === 'number' ? String(amountRange.max) : ''
      ].join('\0'),
    [selectedFilters, activeWidgetKey, expenseDateRange, amountRange]
  )

  const [sortField, setSortField] = useState<string>('expenseDate')
  const [sortOrder, setSortOrder] = useState<TableSortOrder>('descend')
  const effectiveSortField = sortOrder ? sortField : 'expenseDate'
  const effectiveSortOrder: Exclude<TableSortOrder, undefined> = sortOrder ?? 'descend'

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [rawVisibleColumns, setRawVisibleColumns] = useState<string[]>(() => [...initialVisibleColumnIds])
  const visibleColumns = useVisibleColumns(
    rawVisibleColumns,
    initialVisibleColumnIds.map(id => ({ id }))
  )
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  useFilterSignatureReset(filterSignature, () => setCurrentPage(1))

  const handleSearchChange = useSearchHandler(setSearch, setCurrentPage)

  const sorting = useMemo(() => {
    if (!sortOrder) return []
    return [{ id: sortField || 'expenseDate', desc: sortOrder === 'descend' }]
  }, [sortField, sortOrder])

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      const entry = newSorting[0]
      if (!entry) {
        if (sortField !== 'expenseDate') {
          setSortField('expenseDate')
          setSortOrder('descend')
        } else {
          setSortOrder(undefined)
        }
        setCurrentPage(1)
        return
      }
      const incomingOrder: Exclude<TableSortOrder, undefined> = entry.desc ? 'descend' : 'ascend'
      setSortField(entry.id)
      setSortOrder(incomingOrder)
      setCurrentPage(1)
    },
    [sortField]
  )

  const handleRowSelectionChange = useCallback((itemId: string, checked: boolean) => {
    setSelectedRowKeys(prev => {
      if (checked) {
        return prev.includes(itemId) ? prev : [...prev, itemId]
      }
      return prev.filter(key => key !== itemId)
    })
  }, [])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRowKeys(items.map(item => item.id))
      } else {
        setSelectedRowKeys([])
      }
    },
    [items]
  )

  const clearSelection = useCallback(() => {
    setSelectedRowKeys([])
  }, [])

  return {
    search,
    debouncedSearch,
    hasActiveFilters,
    sortField,
    sortOrder,
    effectiveSortField,
    effectiveSortOrder,
    currentPage,
    pageSize,
    visibleColumns,
    selectedRowKeys,
    sorting,
    setCurrentPage,
    setPageSize,
    setVisibleColumns: setRawVisibleColumns,
    handleSearchChange,
    handleSortingChange,
    handleRowSelectionChange,
    handleSelectAll,
    clearSelection
  }
}
