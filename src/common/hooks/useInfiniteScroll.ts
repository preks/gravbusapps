import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
  threshold?: number
}

/**
 * Hook for infinite scroll functionality
 * Automatically loads more data when user scrolls near the bottom
 *
 * @param onLoadMore - Callback to load more data
 * @param hasMore - Whether there is more data to load
 * @param isLoading - Whether data is currently being loaded
 * @param threshold - Distance from bottom (in pixels) to trigger load (default: 300)
 */
export const useInfiniteScroll = ({ onLoadMore, hasMore, isLoading, threshold = 300 }: UseInfiniteScrollOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries

      // Prevent multiple simultaneous loads
      if (entry.isIntersecting && hasMore && !isLoading && !loadingRef.current) {
        loadingRef.current = true
        onLoadMore()
      }
    },
    [hasMore, isLoading, onLoadMore]
  )

  // Reset loading flag when isLoading changes from true to false
  useEffect(() => {
    if (!isLoading) {
      loadingRef.current = false
    }
  }, [isLoading])

  useEffect(() => {
    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Create observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: `${threshold}px`,
      threshold: 0.1
    })

    // Observe sentinel element
    const sentinel = sentinelRef.current
    if (sentinel) {
      observerRef.current.observe(sentinel)
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleIntersection, threshold])

  return sentinelRef
}
