import { useCallback, useMemo, useState, type Key } from 'react'
import type { ExpenseData } from '../../../../types'

const BOOKED_STATUS = 'BOOKED'

/**
 * Row selection for backoffice expense requests: only BOOKED rows are selectable for bulk transfer.
 */
export function useExpenseRequestSelection(expenses: ExpenseData[] | undefined) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [selectedRecords, setSelectedRecords] = useState<ExpenseData[]>([])

  const clearSelection = useCallback(() => {
    setSelectedRecords([])
    setSelectedRowKeys([])
  }, [])

  const handleSelectRecord = useCallback((record: ExpenseData, checked: boolean) => {
    if (record.status !== BOOKED_STATUS) {
      return
    }
    if (checked) {
      setSelectedRecords(prev => [...prev, record])
      setSelectedRowKeys(prev => [...prev, record.id])
    } else {
      setSelectedRecords(prev => prev.filter(r => r.id !== record.id))
      setSelectedRowKeys(prev => prev.filter(key => key !== record.id))
    }
  }, [])

  const handleSelectAllRecords = useCallback(
    (checked: boolean) => {
      if (checked) {
        const bookableRecords = expenses?.filter(expense => expense.status === BOOKED_STATUS) || []
        setSelectedRecords(bookableRecords)
        setSelectedRowKeys(bookableRecords.map(record => record.id))
      } else {
        setSelectedRecords([])
        setSelectedRowKeys([])
      }
    },
    [expenses]
  )

  const hasBookableSelected = useMemo(
    () => selectedRecords.some(record => record.status === BOOKED_STATUS),
    [selectedRecords]
  )

  const allBookableSelected = useMemo(() => {
    const bookableRecords = expenses?.filter(expense => expense.status === BOOKED_STATUS) || []
    return (
      selectedRecords.length > 0 &&
      selectedRecords.length === bookableRecords.length &&
      selectedRecords.every(record => record.status === BOOKED_STATUS)
    )
  }, [selectedRecords, expenses])

  const bookableRecordsCount = useMemo(
    () => expenses?.filter(expense => expense.status === BOOKED_STATUS).length || 0,
    [expenses]
  )

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
