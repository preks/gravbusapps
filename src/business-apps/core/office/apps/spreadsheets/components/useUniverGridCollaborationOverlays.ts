import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { areCursorRectsEqual } from './univerGridCommentPresentation'
import {
  resolveCollaborationOverlayCellRect,
  resolveGridCanvasViewport,
  type CollaborationOverlayRect
} from './univerGridOverlayCellRect'
import type { UniverGridController } from './useUniverGridController'

export type RemoteCursorOverlayItem = {
  id: string
  userName: string
  userColor: string
  avatarUrl?: string
  row: number
  col: number
  endRow?: number
  endCol?: number
}

export type CommentOverlayItem = {
  id: string
  ref: string
  row: number
  col: number
  endRow?: number
  endCol?: number
  content: string
  createdByName?: string
  createdByAvatar?: string
  createdAt?: string
}

type CollaborationOverlayDeps = Pick<
  UniverGridController,
  | 'univerAPIRef'
  | 'propsRef'
  | 'cellDimensionsRef'
  | 'sheetScrollRef'
  | 'refreshCursorRectsRef'
  | 'refreshCommentRectsRef'
  | 'updateCellDimensionsRef'
>

/**
 * Positions remote collaborator cursors and comment markers over the Univer canvas.
 */
export function useUniverGridCollaborationOverlays(
  params: {
    containerRef: RefObject<HTMLDivElement | null>
    remoteCursorOverlays: readonly RemoteCursorOverlayItem[]
    commentOverlays: readonly CommentOverlayItem[]
  } & CollaborationOverlayDeps
): {
  cursorRects: Record<string, CollaborationOverlayRect>
  commentRects: Record<string, CollaborationOverlayRect>
  gridViewportRect: CollaborationOverlayRect | null
  hoveredCommentId: string | null
  setHoveredCommentId: Dispatch<SetStateAction<string | null>>
} {
  const {
    containerRef,
    remoteCursorOverlays,
    commentOverlays,
    univerAPIRef,
    propsRef,
    cellDimensionsRef,
    sheetScrollRef,
    refreshCursorRectsRef,
    refreshCommentRectsRef,
    updateCellDimensionsRef
  } = params

  const [cursorRects, setCursorRects] = useState<Record<string, CollaborationOverlayRect>>({})
  const [commentRects, setCommentRects] = useState<Record<string, CollaborationOverlayRect>>({})
  const [gridViewportRect, setGridViewportRect] = useState<CollaborationOverlayRect | null>(null)
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)

  const resolveCellRect = useCallback(
    (row: number, col: number): CollaborationOverlayRect | null => {
      const api = univerAPIRef.current
      const container = containerRef.current
      if (!api || !container) return null
      return resolveCollaborationOverlayCellRect({
        api,
        container,
        props: propsRef.current,
        cellDimensions: cellDimensionsRef.current,
        sheetScroll: sheetScrollRef.current,
        row,
        col
      })
    },
    [cellDimensionsRef, containerRef, propsRef, sheetScrollRef, univerAPIRef]
  )

  const refreshViewportRect = useCallback(() => {
    const container = containerRef.current
    const next = container ? resolveGridCanvasViewport(container, cellDimensionsRef.current) : null
    setGridViewportRect(prev => {
      if (!prev && !next) return prev
      if (!prev || !next) return next
      if (
        Math.abs(prev.top - next.top) > 0.5 ||
        Math.abs(prev.left - next.left) > 0.5 ||
        Math.abs(prev.width - next.width) > 0.5 ||
        Math.abs(prev.height - next.height) > 0.5
      ) {
        return next
      }
      return prev
    })
  }, [cellDimensionsRef, containerRef])

  useEffect(() => {
    if (remoteCursorOverlays.length === 0) {
      refreshCursorRectsRef.current = null
      setCursorRects({})
      return
    }
    const refresh = () => {
      refreshViewportRect()
      const next: Record<string, CollaborationOverlayRect> = {}
      for (const cursor of remoteCursorOverlays) {
        const startRect = resolveCellRect(cursor.row, cursor.col)
        if (!startRect) continue
        const hasEnd =
          typeof cursor.endRow === 'number' &&
          typeof cursor.endCol === 'number' &&
          (cursor.endRow !== cursor.row || cursor.endCol !== cursor.col)
        if (hasEnd) {
          const endRect = resolveCellRect(cursor.endRow as number, cursor.endCol as number)
          if (endRect) {
            const top = Math.min(startRect.top, endRect.top)
            const left = Math.min(startRect.left, endRect.left)
            const right = Math.max(startRect.left + startRect.width, endRect.left + endRect.width)
            const bottom = Math.max(startRect.top + startRect.height, endRect.top + endRect.height)
            next[cursor.id] = { top, left, width: right - left, height: bottom - top }
            continue
          }
        }
        next[cursor.id] = startRect
      }
      setCursorRects(prev => (areCursorRectsEqual(prev, next) ? prev : next))
    }
    refreshCursorRectsRef.current = refresh
    refresh()
    const retryId = globalThis.setTimeout(() => {
      refresh()
    }, 300)
    const onResize = () => refresh()
    const onScroll = () => refresh()
    globalThis.addEventListener('resize', onResize)
    globalThis.addEventListener('scroll', onScroll, true)
    return () => {
      globalThis.clearTimeout(retryId)
      refreshCursorRectsRef.current = null
      globalThis.removeEventListener('resize', onResize)
      globalThis.removeEventListener('scroll', onScroll, true)
    }
  }, [refreshViewportRect, remoteCursorOverlays, resolveCellRect])

  useEffect(() => {
    if (commentOverlays.length === 0) {
      refreshCommentRectsRef.current = null
      setCommentRects({})
      setHoveredCommentId(null)
      return
    }
    const refresh = () => {
      refreshViewportRect()
      const next: Record<string, CollaborationOverlayRect> = {}
      for (const marker of commentOverlays) {
        const startRect = resolveCellRect(marker.row, marker.col)
        if (!startRect) continue
        const hasEnd =
          typeof marker.endRow === 'number' &&
          typeof marker.endCol === 'number' &&
          (marker.endRow !== marker.row || marker.endCol !== marker.col)
        if (hasEnd) {
          const endRect = resolveCellRect(marker.endRow as number, marker.endCol as number)
          if (endRect) {
            const top = Math.min(startRect.top, endRect.top)
            const left = Math.min(startRect.left, endRect.left)
            const right = Math.max(startRect.left + startRect.width, endRect.left + endRect.width)
            const bottom = Math.max(startRect.top + startRect.height, endRect.top + endRect.height)
            next[marker.id] = { top, left, width: right - left, height: bottom - top }
            continue
          }
        }
        next[marker.id] = { top: startRect.top, left: startRect.left, width: startRect.width, height: startRect.height }
      }
      setCommentRects(prev => {
        const prevKeys = Object.keys(prev)
        const nextKeys = Object.keys(next)
        if (prevKeys.length !== nextKeys.length) return next
        for (const key of nextKeys) {
          const p = prev[key]
          const n = next[key]
          if (!p) return next
          if (
            Math.abs(p.top - n.top) > 0.5 ||
            Math.abs(p.left - n.left) > 0.5 ||
            Math.abs(p.width - n.width) > 0.5 ||
            Math.abs((p.height ?? 0) - (n.height ?? 0)) > 0.5
          ) {
            return next
          }
        }
        return prev
      })
    }
    refreshCommentRectsRef.current = refresh
    refresh()
    const retryId = globalThis.setTimeout(() => {
      refresh()
    }, 300)
    const onResize = () => refresh()
    const onScroll = () => refresh()
    globalThis.addEventListener('resize', onResize)
    globalThis.addEventListener('scroll', onScroll, true)
    return () => {
      globalThis.clearTimeout(retryId)
      refreshCommentRectsRef.current = null
      globalThis.removeEventListener('resize', onResize)
      globalThis.removeEventListener('scroll', onScroll, true)
    }
  }, [commentOverlays, refreshViewportRect, resolveCellRect])

  useEffect(() => {
    refreshViewportRect()
    const onResize = () => refreshViewportRect()
    const onScroll = () => refreshViewportRect()
    globalThis.addEventListener('resize', onResize)
    globalThis.addEventListener('scroll', onScroll, true)
    return () => {
      globalThis.removeEventListener('resize', onResize)
      globalThis.removeEventListener('scroll', onScroll, true)
    }
  }, [refreshViewportRect])

  useEffect(() => {
    let currentDpr = globalThis.devicePixelRatio ?? 1
    let mqCleanup: (() => void) | undefined
    const listen = () => {
      const mq = globalThis.matchMedia?.(`(resolution: ${currentDpr}dppx)`)
      if (!mq) return
      const handler = () => {
        currentDpr = globalThis.devicePixelRatio ?? 1
        updateCellDimensionsRef.current?.()
        refreshCursorRectsRef.current?.()
        refreshCommentRectsRef.current?.()
        mqCleanup?.()
        listen()
      }
      mq.addEventListener('change', handler, { once: true })
      mqCleanup = () => mq.removeEventListener('change', handler)
    }
    listen()
    return () => mqCleanup?.()
  }, [])

  useEffect(() => {
    if (!hoveredCommentId) return
    const stillExists = commentOverlays.some(marker => marker.id === hoveredCommentId)
    if (!stillExists) setHoveredCommentId(null)
  }, [commentOverlays, hoveredCommentId])

  return { cursorRects, commentRects, gridViewportRect, hoveredCommentId, setHoveredCommentId }
}
