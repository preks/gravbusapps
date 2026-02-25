/**
 * useBoardUrlState - syncs board navigation state (boardId, sheetId, viewId, page)
 * with URL query parameters for bookmarkable, refreshable deep links.
 */

import { useState, useCallback, useEffect } from 'react'

interface BoardUrlState {
  boardId: string | null
  sheetId: string | null
  viewId: string | null
  page: number
}

function readFromUrl(): BoardUrlState {
  const params = new URLSearchParams(globalThis.window?.location?.search || '')
  return {
    boardId: params.get('boardId'),
    sheetId: params.get('sheetId'),
    viewId: params.get('viewId'),
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  }
}

function writeToUrl(state: Partial<BoardUrlState & { clearFilters?: boolean }>) {
  const params = new URLSearchParams(globalThis.window?.location?.search || '')

  if (state.boardId !== undefined) {
    if (state.boardId) params.set('boardId', state.boardId)
    else params.delete('boardId')
  }
  if (state.sheetId !== undefined) {
    if (state.sheetId) params.set('sheetId', state.sheetId)
    else params.delete('sheetId')
  }
  if (state.viewId !== undefined) {
    if (state.viewId) params.set('viewId', state.viewId)
    else params.delete('viewId')
  }
  if (state.page !== undefined) {
    if (state.page > 1) params.set('page', String(state.page))
    else params.delete('page')
  }
  if (state.clearFilters) {
    params.delete('bf')
    params.delete('bs')
    params.delete('bc')
    params.delete('qf')
  }

  const qs = params.toString()
  const newUrl = `${globalThis.window?.location?.pathname || ''}${qs ? `?${qs}` : ''}`
  globalThis.window?.history?.replaceState({}, '', newUrl)
}

export interface UseBoardUrlStateReturn {
  urlBoardId: string | null
  urlSheetId: string | null
  urlViewId: string | null
  urlPage: number
  setBoardId: (id: string | null) => void
  setSheetId: (id: string | null) => void
  setViewId: (id: string | null) => void
  setPage: (p: number) => void
  clearBoardState: () => void
}

export function useBoardUrlState(): UseBoardUrlStateReturn {
  const initial = readFromUrl()
  const [boardId, _setBoardId] = useState<string | null>(initial.boardId)
  const [sheetId, _setSheetId] = useState<string | null>(initial.sheetId)
  const [viewId, _setViewId] = useState<string | null>(initial.viewId)
  const [page, _setPage] = useState(initial.page)

  const setBoardId = useCallback((id: string | null) => {
    _setBoardId(id)
    _setSheetId(null)
    _setViewId(null)
    _setPage(1)
    writeToUrl({ boardId: id, sheetId: null, viewId: null, page: 1, clearFilters: true })
  }, [])

  const setSheetId = useCallback((id: string | null) => {
    _setSheetId(id)
    _setViewId(null)
    _setPage(1)
    writeToUrl({ sheetId: id, viewId: null, page: 1 })
  }, [])

  const setViewId = useCallback((id: string | null) => {
    _setViewId(id)
    writeToUrl({ viewId: id })
  }, [])

  const setPage = useCallback((p: number) => {
    _setPage(p)
    writeToUrl({ page: p })
  }, [])

  const clearBoardState = useCallback(() => {
    _setBoardId(null)
    _setSheetId(null)
    _setViewId(null)
    _setPage(1)
    writeToUrl({ boardId: null, sheetId: null, viewId: null, page: 1, clearFilters: true })
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const s = readFromUrl()
      _setBoardId(s.boardId)
      _setSheetId(s.sheetId)
      _setViewId(s.viewId)
      _setPage(s.page)
    }
    globalThis.window?.addEventListener('popstate', handlePopState)
    return () => globalThis.window?.removeEventListener('popstate', handlePopState)
  }, [])

  return {
    urlBoardId: boardId,
    urlSheetId: sheetId,
    urlViewId: viewId,
    urlPage: page,
    setBoardId,
    setSheetId,
    setViewId,
    setPage,
    clearBoardState
  }
}
