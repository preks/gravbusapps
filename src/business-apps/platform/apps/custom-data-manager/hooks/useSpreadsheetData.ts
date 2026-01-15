import { useState, useEffect, useCallback } from 'react'
import { useCustomDataClient } from './useCustomDataClient'
import { SpreadsheetRow, CreateRowDto, UpdateRowDto } from '../types'

interface UseSpreadsheetDataResult {
  rows: SpreadsheetRow[]
  total: number
  isLoading: boolean
  error: string | null

  // Pagination
  page: number
  pageSize: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void

  // Actions
  refetch: () => Promise<void>
  createRow: (values: Record<string, any>) => Promise<SpreadsheetRow>
  updateRow: (rowId: string, values: Record<string, any>) => Promise<SpreadsheetRow>
  deleteRow: (rowId: string) => Promise<boolean>
}

/**
 * Hook for managing spreadsheet data rows
 */
export const useSpreadsheetData = (accessToken: string, definitionKey: string | null): UseSpreadsheetDataResult => {
  const client = useCustomDataClient(accessToken)

  const [rows, setRows] = useState<SpreadsheetRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const fetchRows = useCallback(async () => {
    if (!accessToken || !definitionKey) {
      setRows([])
      setTotal(0)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const offset = (page - 1) * pageSize
      const data = await client.listRows(definitionKey, { limit: pageSize, offset })
      setRows(data.rows || [])
      setTotal(data.total || 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rows'
      setError(message)
      console.error('Failed to fetch spreadsheet rows:', err)
    } finally {
      setIsLoading(false)
    }
  }, [client, accessToken, definitionKey, page, pageSize])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const createRow = useCallback(
    async (values: Record<string, any>): Promise<SpreadsheetRow> => {
      if (!definitionKey) {
        throw new Error('No definition key')
      }
      const dto: CreateRowDto = { values }
      const newRow = await client.createRow(definitionKey, dto)
      await fetchRows() // Refresh the list
      return newRow
    },
    [client, definitionKey, fetchRows]
  )

  const updateRow = useCallback(
    async (rowId: string, values: Record<string, any>): Promise<SpreadsheetRow> => {
      if (!definitionKey) {
        throw new Error('No definition key')
      }
      const dto: UpdateRowDto = { values }
      const updatedRow = await client.updateRow(definitionKey, rowId, dto)
      setRows(prev => prev.map(r => (r.id === rowId ? updatedRow : r)))
      return updatedRow
    },
    [client, definitionKey]
  )

  const deleteRow = useCallback(
    async (rowId: string): Promise<boolean> => {
      if (!definitionKey) {
        throw new Error('No definition key')
      }
      const result = await client.deleteRow(definitionKey, rowId)
      if (result.success) {
        setRows(prev => prev.filter(r => r.id !== rowId))
        setTotal(prev => prev - 1)
      }
      return result.success
    },
    [client, definitionKey]
  )

  return {
    rows,
    total,
    isLoading,
    error,
    page,
    pageSize,
    setPage,
    setPageSize,
    refetch: fetchRows,
    createRow,
    updateRow,
    deleteRow
  }
}
