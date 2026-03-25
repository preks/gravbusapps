import { useCallback, useEffect, useMemo, useState, type Key } from 'react'
import type { ExpenseData } from '../../../../types'

const BOOKED_STATUS = 'BOOKED'

function filterKeysToBookableIds(keys: Key[], bookableRecords: ExpenseData[]): Key[] {
  if (bookableRecords.length === 0) {
    return []
  }
  const bookableIds = new Set(bookableRecords.map(record => record.id))
  return keys.filter(key => bookableIds.has(String(key)))
}

/**
 * Row selection for backoffice expense requests: only BOOKED rows are selectable for bulk transfer.
 */
export function useExpenseRequestSelection(expenses: ExpenseData[] | undefined) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])

  const bookableRecords = useMemo(() => expenses?.filter(expense => expense.status === BOOKED_STATUS) ?? [], [expenses])

  useEffect(() => {
    setSelectedRowKeys(previousKeys => filterKeysToBookableIds(previousKeys, bookableRecords))
  }, [bookableRecords])

  const selectedRecords = useMemo(
    () => bookableRecords.filter(record => selectedRowKeys.includes(record.id)),
    [bookableRecords, selectedRowKeys]
  )

  const clearSelection = useCallback(() => {
    setSelectedRowKeys([])
  }, [])

  const handleSelectRecord = useCallback((record: ExpenseData, checked: boolean) => {
    if (record.status !== BOOKED_STATUS) {
      return
    }
    if (checked) {
      setSelectedRowKeys(previousSelectedKeys =>
        previousSelectedKeys.includes(record.id) ? previousSelectedKeys : [...previousSelectedKeys, record.id]
      )
    } else {
      setSelectedRowKeys(previousSelectedKeys => previousSelectedKeys.filter(key => key !== record.id))
    }
  }, [])

  const handleSelectAllRecords = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRowKeys(bookableRecords.map(record => record.id))
      } else {
        setSelectedRowKeys([])
      }
    },
    [bookableRecords]
  )

  const hasBookableSelected = useMemo(
    () => selectedRecords.some(record => record.status === BOOKED_STATUS),
    [selectedRecords]
  )

  const allBookableSelected = useMemo(() => {
    return (
      bookableRecords.length > 0 &&
      selectedRecords.length === bookableRecords.length &&
      selectedRecords.every(record => record.status === BOOKED_STATUS)
    )
  }, [bookableRecords, selectedRecords])

  const bookableRecordsCount = bookableRecords.length

  const selectedBookableCount = useMemo(
    () => selectedRecords.filter(r => r.status === BOOKED_STATUS).length,
    [selectedRecords]
  )

  return {
    selectedRowKeys,
    selectedRecords,
    clearSelection,
    handleSelectRecord,
    handleSelectAllRecords,
    hasBookableSelected,
    allBookableSelected,
    bookableRecordsCount,
    selectedBookableCount
  }
}
