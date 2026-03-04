/**
 * useDashboardData - fetches ALL rows matching current server filters
 * for the dashboard view so KPIs and charts are accurate.
 *
 * Uses progressive page fetching for small-to-medium boards (<5000 rows)
 * and sampling with a clear label for larger boards.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { BoardApiService } from '../services/BoardApiService'
import type { BoardRow, EntityDataSource } from '../types'
import type { ServerFilterParams } from './useTableFilterSort'

const PAGE_SIZE = 200
const MAX_CLIENT_ROWS = 5000

export interface DashboardDataState {
  allRows: BoardRow[]
  isLoading: boolean
  isSampled: boolean
  totalRows: number
  loadedRows: number
  error: string | null
  entityDataSource?: EntityDataSource
  serverAnalyticsAvailable: boolean
}

export function useDashboardData(
  boardId: string,
  sheetId: string,
  isDashboardActive: boolean,
  serverFilters?: ServerFilterParams,
  entityDataSource?: EntityDataSource
): DashboardDataState {
  const [allRows, setAllRows] = useState<BoardRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSampled, setIsSampled] = useState(false)
  const [totalRows, setTotalRows] = useState(0)
  const [loadedRows, setLoadedRows] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)
  const fetchIdRef = useRef(0)

  const fetchAllRows = useCallback(async () => {
    if (!boardId || !sheetId || !isDashboardActive) return
    const fetchId = ++fetchIdRef.current
    abortRef.current = false
    setIsLoading(true)
    setError(null)

    try {
      const firstPage = await BoardApiService.getRows(boardId, sheetId, {
        page: 1,
        limit: PAGE_SIZE,
        filters: serverFilters?.filters,
        filterConnector: serverFilters?.filterConnector,
        sorts: serverFilters?.sorts,
        search: serverFilters?.search
      })

      if (fetchId !== fetchIdRef.current) return
      const total = firstPage.total
      setTotalRows(total)

      if (total <= PAGE_SIZE) {
        setAllRows(firstPage.items)
        setLoadedRows(firstPage.items.length)
        setIsSampled(false)
        setIsLoading(false)
        return
      }

      if (total > MAX_CLIENT_ROWS) {
        const samplePages = Math.ceil(MAX_CLIENT_ROWS / PAGE_SIZE)
        const collected = [...firstPage.items]
        setLoadedRows(collected.length)

        for (let p = 2; p <= samplePages; p++) {
          if (abortRef.current || fetchId !== fetchIdRef.current) return
          const page = await BoardApiService.getRows(boardId, sheetId, {
            page: p,
            limit: PAGE_SIZE,
            filters: serverFilters?.filters,
            filterConnector: serverFilters?.filterConnector,
            sorts: serverFilters?.sorts,
            search: serverFilters?.search
          })
          collected.push(...page.items)
          setLoadedRows(collected.length)
        }

        setAllRows(collected)
        setIsSampled(true)
        setIsLoading(false)
        return
      }

      const totalPages = Math.ceil(total / PAGE_SIZE)
      const collected = [...firstPage.items]
      setLoadedRows(collected.length)

      for (let p = 2; p <= totalPages; p++) {
        if (abortRef.current || fetchId !== fetchIdRef.current) return
        const page = await BoardApiService.getRows(boardId, sheetId, {
          page: p,
          limit: PAGE_SIZE,
          filters: serverFilters?.filters,
          filterConnector: serverFilters?.filterConnector,
          sorts: serverFilters?.sorts,
          search: serverFilters?.search
        })
        collected.push(...page.items)
        setLoadedRows(collected.length)
      }

      setAllRows(collected)
      setIsSampled(false)
      setIsLoading(false)
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      setIsLoading(false)
    }
  }, [
    boardId,
    sheetId,
    isDashboardActive,
    serverFilters?.filters,
    serverFilters?.filterConnector,
    serverFilters?.sorts
  ])

  useEffect(() => {
    if (isDashboardActive) {
      void fetchAllRows()
    }
    return () => {
      abortRef.current = true
    }
  }, [fetchAllRows, isDashboardActive])

  const serverAnalyticsAvailable =
    Boolean(entityDataSource && (entityDataSource as Record<string, unknown>).provider === 'functionManager') ||
    totalRows > MAX_CLIENT_ROWS

  return { allRows, isLoading, isSampled, totalRows, loadedRows, error, entityDataSource, serverAnalyticsAvailable }
}
