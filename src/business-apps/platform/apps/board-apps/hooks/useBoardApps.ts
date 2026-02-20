/**
 * useBoardApps hook
 *
 * Manages board CRUD operations via the document-service /boards API.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Board, BoardSummary, BoardSheet, BoardRow } from '../types'
import { BoardApiService } from '../services/BoardApiService'

export interface UseBoardAppsReturn {
  boards: BoardSummary[]
  currentBoard: Board | null
  isLoading: boolean
  error: string | null
  loadBoard: (id: string) => Promise<Board | null>
  createBoard: (board: Partial<Board>) => Promise<Board | null>
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>
  deleteBoard: (id: string) => Promise<boolean>
  duplicateBoard: (id: string) => Promise<Board | null>
  refreshBoards: () => Promise<void>
  clearCurrentBoard: () => void
  updateSheet: (boardId: string, sheetId: string, updates: Partial<BoardSheet>) => Promise<BoardSheet | null>
  rows: BoardRow[]
  rowsLoading: boolean
  rowsTotal: number
  loadRows: (
    boardId: string,
    sheetId: string,
    options?: {
      page?: number
      limit?: number
      sort?: string
      sortOrder?: 'ASC' | 'DESC'
      search?: string
      filters?: string
      filterConnector?: 'and' | 'or'
      sorts?: string
    }
  ) => Promise<void>
  createRow: (boardId: string, sheetId: string, data: Record<string, unknown>) => Promise<BoardRow | null>
  updateRow: (boardId: string, sheetId: string, rowId: string, data: Record<string, unknown>) => Promise<void>
  deleteRow: (boardId: string, sheetId: string, rowId: string) => Promise<boolean>
}

export function useBoardApps(accessToken: string): UseBoardAppsReturn {
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<BoardRow[]>([])
  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsTotal, setRowsTotal] = useState(0)
  const loadedRef = useRef(false)

  const refreshBoards = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await BoardApiService.listBoards({ limit: 100 })
      setBoards(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load boards')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (loadedRef.current || !accessToken) return
    loadedRef.current = true
    void refreshBoards()
  }, [accessToken, refreshBoards])

  const loadBoard = useCallback(async (id: string): Promise<Board | null> => {
    setIsLoading(true)
    try {
      const board = await BoardApiService.getBoard(id)
      if (board) setCurrentBoard(board)
      return board
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createBoard = useCallback(
    async (board: Partial<Board>): Promise<Board | null> => {
      try {
        const created = await BoardApiService.createBoard(board)
        await refreshBoards()
        return created
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create board')
        return null
      }
    },
    [refreshBoards]
  )

  const updateBoard = useCallback(
    async (id: string, updates: Partial<Board>) => {
      try {
        const updated = await BoardApiService.updateBoard(id, updates)
        setCurrentBoard(updated)
        await refreshBoards()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update board')
      }
    },
    [refreshBoards]
  )

  const deleteBoard = useCallback(
    async (id: string): Promise<boolean> => {
      const ok = await BoardApiService.deleteBoard(id)
      if (ok) {
        if (currentBoard?.id === id) setCurrentBoard(null)
        await refreshBoards()
      }
      return ok
    },
    [currentBoard?.id, refreshBoards]
  )

  const duplicateBoard = useCallback(
    async (id: string): Promise<Board | null> => {
      const dup = await BoardApiService.duplicateBoard(id)
      if (dup) await refreshBoards()
      return dup
    },
    [refreshBoards]
  )

  const clearCurrentBoard = useCallback(() => setCurrentBoard(null), [])

  const updateSheet = useCallback(
    async (boardId: string, sheetId: string, updates: Partial<BoardSheet>): Promise<BoardSheet | null> => {
      try {
        const updated = await BoardApiService.updateSheet(boardId, sheetId, updates)
        setCurrentBoard(prev => {
          if (!prev || prev.id !== boardId) return prev
          return {
            ...prev,
            sheets: prev.sheets.map(s => (s.id === sheetId ? updated : s))
          }
        })
        return updated
      } catch {
        return null
      }
    },
    []
  )

  const loadRows = useCallback(
    async (
      boardId: string,
      sheetId: string,
      options?: {
        page?: number
        limit?: number
        sort?: string
        sortOrder?: 'ASC' | 'DESC'
        search?: string
        filters?: string
        filterConnector?: 'and' | 'or'
        sorts?: string
      }
    ) => {
      setRowsLoading(true)
      try {
        const result = await BoardApiService.getRows(boardId, sheetId, options)
        setRows(result.items)
        setRowsTotal(result.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rows')
      } finally {
        setRowsLoading(false)
      }
    },
    []
  )

  const createRow = useCallback(
    async (boardId: string, sheetId: string, data: Record<string, unknown>): Promise<BoardRow | null> => {
      try {
        const row = await BoardApiService.createRow(boardId, sheetId, data)
        setRows(prev => [...prev, row])
        setRowsTotal(prev => prev + 1)
        return row
      } catch {
        return null
      }
    },
    []
  )

  const updateRow = useCallback(
    async (boardId: string, sheetId: string, rowId: string, data: Record<string, unknown>) => {
      try {
        const updated = await BoardApiService.updateRow(boardId, sheetId, rowId, data)
        setRows(prev => prev.map(r => (r.id === rowId ? updated : r)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update row')
      }
    },
    []
  )

  const deleteRow = useCallback(async (boardId: string, sheetId: string, rowId: string): Promise<boolean> => {
    const ok = await BoardApiService.deleteRow(boardId, sheetId, rowId)
    if (ok) {
      setRows(prev => prev.filter(r => r.id !== rowId))
      setRowsTotal(prev => prev - 1)
    }
    return ok
  }, [])

  return {
    boards,
    currentBoard,
    isLoading,
    error,
    loadBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    duplicateBoard,
    refreshBoards,
    clearCurrentBoard,
    updateSheet,
    rows,
    rowsLoading,
    rowsTotal,
    loadRows,
    createRow,
    updateRow,
    deleteRow
  }
}
