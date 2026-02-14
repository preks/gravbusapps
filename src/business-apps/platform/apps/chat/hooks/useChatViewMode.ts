/**
 * View mode state and derived flags for chat layout: full / compact / mobile,
 * ResizeObserver-driven updates, showListView / showChatView.
 */

import { useState, useEffect, useMemo, type RefObject } from 'react'

export type ViewMode = 'full' | 'compact' | 'mobile'

export interface UseChatViewModeParams {
  containerRef: RefObject<HTMLDivElement | null>
  isEmbeddedMobile: boolean
  showConversationList: boolean
  hasConversation: boolean
}

export interface UseChatViewModeReturn {
  viewMode: ViewMode
  isSingleViewMode: boolean
  showListView: boolean
  showChatView: boolean
}

export function useChatViewMode({
  containerRef,
  isEmbeddedMobile,
  showConversationList,
  hasConversation
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
      if (containerWidth < 480) {
        setViewMode('mobile')
      } else if (containerWidth < 700) {
        setViewMode('compact')
      } else {
        setViewMode('full')
      }
    }

    checkViewMode()
    const resizeObserver = new ResizeObserver(checkViewMode)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [isEmbeddedMobile])

  const isSingleViewMode = viewMode === 'mobile' || viewMode === 'compact'
  const showListView = useMemo(
    () => (isSingleViewMode ? showConversationList || !hasConversation : true),
    [isSingleViewMode, showConversationList, hasConversation]
  )
  const showChatView = useMemo(
    () => (isSingleViewMode ? !showConversationList && hasConversation : true),
    [isSingleViewMode, showConversationList, hasConversation]
  )

  return { viewMode, isSingleViewMode, showListView, showChatView }
}
