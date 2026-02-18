/**
 * View mode state and derived flags for chat layout: full / compact / mobile,
 * ResizeObserver-driven updates, showListView / showChatView.
 *
 * List + conversation side-by-side: desktop (full) only.
 * Single-pane (list OR conversation): compact and mobile; user toggles via back/selection.
 */

import { useState, useEffect, useMemo, type RefObject } from 'react'

export type ViewMode = 'full' | 'compact' | 'mobile'

export interface UseChatViewModeParams {
  containerRef: RefObject<HTMLDivElement | null>
  isEmbeddedMobile: boolean
  showConversationList: boolean
  hasConversation: boolean
  /** When true, the ref is attached to the main layout root (list+chat); re-run measurement so we observe the correct container */
  isMainLayoutShown?: boolean
}

export interface UseChatViewModeReturn {
  viewMode: ViewMode
  isSingleViewMode: boolean
  showListView: boolean
  showChatView: boolean
}

const MOBILE_MAX_WIDTH = 380
const COMPACT_MAX_WIDTH = 700
/** Width below this is treated as "not yet laid out" - keep full so both list and chat show */
const MIN_MEANINGFUL_WIDTH = 100

export function useChatViewMode({
  containerRef,
  isEmbeddedMobile,
  showConversationList,
  hasConversation,
  isMainLayoutShown = true
}: UseChatViewModeParams): UseChatViewModeReturn {
  const [viewMode, setViewMode] = useState<ViewMode>('full')

  useEffect(() => {
    if (isEmbeddedMobile) {
      setViewMode('mobile')
      return
    }

    const container = containerRef.current
    if (!container) return

    const checkViewMode = () => {
      const containerWidth = container.offsetWidth
      if (containerWidth < MIN_MEANINGFUL_WIDTH) {
        setViewMode('full')
      } else if (containerWidth < MOBILE_MAX_WIDTH) {
        setViewMode('mobile')
      } else if (containerWidth < COMPACT_MAX_WIDTH) {
        setViewMode('compact')
      } else {
        setViewMode('full')
      }
    }

    checkViewMode()
    const resizeObserver = new ResizeObserver(checkViewMode)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [isEmbeddedMobile, isMainLayoutShown])

  const isDesktop = viewMode === 'full'
  const isSingleViewMode = !isDesktop

  const showListView = useMemo(
    () => (isDesktop ? true : showConversationList || !hasConversation),
    [isDesktop, showConversationList, hasConversation]
  )
  const showChatView = useMemo(
    () => (isDesktop ? true : !showConversationList && hasConversation),
    [isDesktop, showConversationList, hasConversation]
  )

  return { viewMode, isSingleViewMode, showListView, showChatView }
}
