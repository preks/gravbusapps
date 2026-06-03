import { useEffect, useRef, type RefObject } from 'react'

interface UseFillNotificationsPagesOptions {
  isOpen: boolean
  isLoadingList: boolean
  hasMore: boolean
  itemCount: number
  scrollContainerRef: RefObject<HTMLDivElement | null>
  loadNextPage: () => void
}

/**
 * Loads additional pages when the list does not overflow the scroll container yet
 * (so scroll-based pagination never fires).
 */
export function useFillNotificationsPages({
  isOpen,
  isLoadingList,
  hasMore,
  itemCount,
  scrollContainerRef,
  loadNextPage
}: UseFillNotificationsPagesOptions) {
  const loadNextPageRef = useRef(loadNextPage)
  loadNextPageRef.current = loadNextPage

  useEffect(() => {
    if (!isOpen || isLoadingList || !hasMore || itemCount === 0) {
      return
    }

    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    const scrollable = container.scrollHeight - container.clientHeight > 8
    if (!scrollable) {
      loadNextPageRef.current()
    }
  }, [hasMore, isLoadingList, isOpen, itemCount, scrollContainerRef])
}
