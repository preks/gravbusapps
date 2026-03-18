/**
 * useBoardPresence - cell-level focus tracking for board collaboration.
 *
 * Listens for board.cell.focus / board.cell.blur events on the shared
 * /boards Socket.IO connection and exposes a map of which cells other
 * users are focused on.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'

export interface CellPresenceEntry {
  userId: string
  userName: string
  userColor: string
}

export interface UseBoardPresenceOptions {
  socket: Socket | null
  boardId: string
  sheetId: string
  enabled: boolean
}

export interface UseBoardPresenceReturn {
  focusedCells: Map<string, CellPresenceEntry>
  emitCellFocus: (rowId: string, columnId: string) => void
  emitCellBlur: () => void
}

export function useBoardPresence({
  socket,
  boardId,
  sheetId,
  enabled
}: UseBoardPresenceOptions): UseBoardPresenceReturn {
  const [focusedCells, setFocusedCells] = useState<Map<string, CellPresenceEntry>>(() => new Map())
  const lastEmittedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!socket || !enabled) {
      setFocusedCells(new Map())
      return
    }

    const handleFocus = (data: {
      userId: string
      userName: string
      userColor: string
      boardId: string
      sheetId: string
      rowId: string
      columnId: string
    }) => {
      if (data.boardId !== boardId || data.sheetId !== sheetId) return
      const key = `${data.rowId}:${data.columnId}`
      setFocusedCells(prev => {
        const next = new Map(prev)
        for (const [k, v] of next) {
          if (v.userId === data.userId) next.delete(k)
        }
        next.set(key, {
          userId: data.userId,
          userName: data.userName,
          userColor: data.userColor
        })
        return next
      })
    }

    const handleBlur = (data: { userId: string; boardId: string }) => {
      if (data.boardId !== boardId) return
      setFocusedCells(prev => {
        let changed = false
        const next = new Map(prev)
        for (const [k, v] of next) {
          if (v.userId === data.userId) {
            next.delete(k)
            changed = true
          }
        }
        return changed ? next : prev
      })
    }

    socket.on('board.cell.focus', handleFocus)
    socket.on('board.cell.blur', handleBlur)

    return () => {
      socket.off('board.cell.focus', handleFocus)
      socket.off('board.cell.blur', handleBlur)
      setFocusedCells(new Map())
    }
  }, [socket, enabled, boardId, sheetId])

  const emitCellFocus = useCallback(
    (rowId: string, columnId: string) => {
      if (!socket || !enabled) return
      const key = `${rowId}:${columnId}`
      if (lastEmittedRef.current === key) return
      lastEmittedRef.current = key
      socket.emit('board.cell.focus', { boardId, sheetId, rowId, columnId })
    },
    [socket, enabled, boardId, sheetId]
  )

  const emitCellBlur = useCallback(() => {
    if (!socket || !enabled) return
    lastEmittedRef.current = null
    socket.emit('board.cell.blur', { boardId })
  }, [socket, enabled, boardId])

  return { focusedCells, emitCellFocus, emitCellBlur }
}
