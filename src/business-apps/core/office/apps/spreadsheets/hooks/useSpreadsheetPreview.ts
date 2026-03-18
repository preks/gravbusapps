/**
 * useSpreadsheetPreview Hook
 *
 * Lazy-loads first 5 rows of a spreadsheet for grid card preview.
 * Fetches only when the element is visible (IntersectionObserver).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'

export interface SpreadsheetPreviewData {
  columns: Array<{ id: string; name: string }>
  rows: Array<Record<string, unknown>>
  isLoading: boolean
  error: string | null
}

export function useSpreadsheetPreview(
  appId: string,
  firstSheetId: string | undefined,
  isVisible: boolean
): SpreadsheetPreviewData {
  const [columns, setColumns] = useState<Array<{ id: string; name: string }>>([])
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchPreview = useCallback(async () => {
    if (!appId || !firstSheetId || fetchedRef.current) return

    fetchedRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const sheet = await SpreadsheetApiService.getSheet(appId, firstSheetId)
      if (!sheet) {
        setError('Sheet not found')
        return
      }

      const colList = (sheet.columns || [])
        .filter((c: { isVisible?: boolean }) => c.isVisible !== false)
        .slice(0, 6)
        .map((c: { id: string; name?: string; label?: string }) => ({
          id: c.id,
          name: c.name || c.label || c.id
        }))

      setColumns(colList)

      const rowData = await SpreadsheetApiService.getRows(appId, firstSheetId, { limit: 5 })
      setRows(rowData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setIsLoading(false)
    }
  }, [appId, firstSheetId])

  useEffect(() => {
    if (isVisible && appId && firstSheetId) {
      fetchPreview()
    }
  }, [isVisible, appId, firstSheetId, fetchPreview])

  return { columns, rows, isLoading, error }
}
