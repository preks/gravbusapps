import React, { useRef, useEffect, useCallback } from 'react'

/**
 * Props for the DataCards component.
 * @template T - The type of items in the cards.
 */
export interface DataCardsProps<T> {
  /**
   * The array of items to render as cards.
   */
  readonly items: readonly T[]

  /**
   * Function to render a card item. Receives the item.
   */
  readonly renderItem: (item: T) => React.ReactNode

  /**
   * Function to get a unique key for each item.
   */
  readonly getKey: (item: T) => React.Key

  /**
   * Whether more items are available to load.
   */
  readonly hasMore: boolean

  /**
   * Whether items are currently being loaded.
   */
  readonly loading: boolean

  /**
   * Error message if loading failed.
   */
  readonly error?: string | null

  /**
   * Function to call when more items should be loaded.
   */
  readonly onLoadMore: () => void

  /**
   * Function to retry loading if an error occurred.
   */
  readonly onRetry?: () => void

  /**
   * Message to display when no items are found.
   */
  readonly emptyMessage?: string

  /**
   * Additional className for the container.
   */
  readonly className?: string

  /**
   * Number of columns to display (min-width of each card).
   * Default is 340px.
   */
  readonly columnMinWidth?: number

  /**
   * Gap between cards in pixels.
   * Default is 24px (6 * 4).
   */
  readonly gap?: number
}

/**
 * DataCards is a reusable component for displaying items in a responsive card grid with infinite scrolling.
 *
 * @example
 * <DataCards
 *   items={employees}
 *   getKey={(employee) => employee.id}
 *   renderItem={(employee) => <EmployeeCard employee={employee} />}
 *   hasMore={hasMore}
 *   loading={loading}
 *   onLoadMore={loadMoreEmployees}
 *   error={error}
 *   onRetry={retryLoading}
 * />
 */
export function DataCards<T>({
  items,
  renderItem,
  getKey,
  hasMore,
  loading,
  error,
  onLoadMore,
  onRetry,
  emptyMessage = 'No items found.',
  className = '',
  columnMinWidth = 340,
  gap = 24
}: DataCardsProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  // Set up intersection observer for infinite scrolling
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry?.isIntersecting && hasMore && !loading) {
        onLoadMore()
      }
    },
    [hasMore, loading, onLoadMore]
  )

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    })

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current)
      }
    }
  }, [handleObserver])

  return (
    <div
      ref={scrollContainerRef}
      className={`w-full h-full overflow-y-auto gba:m-4 ${className}`.trim()}
      data-testid="data-cards-container"
    >
      <div
        className="gba:p-4 gba:grid gba:justify-center"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${columnMinWidth}px, 1fr))`,
          gridAutoRows: 'min-content',
          gap: `${gap}px`
        }}
        data-testid="data-cards-grid"
      >
        {items.length === 0 && !loading ? (
          <div
            className="gba:col-span-full gba:text-center gba:text-gray-400 gba:py-12"
            data-testid="data-cards-empty-state"
          >
            {emptyMessage}
          </div>
        ) : (
          items.map(item => (
            <div
              key={getKey(item)}
              className="gba:shrink-0 gba:transition-transform gba:duration-200 gba:ease-in-out hover:-translate-y-0.5 gba:mb-3"
              data-testid={`data-cards-item-${getKey(item)}`}
            >
              {renderItem(item)}
            </div>
          ))
        )}
      </div>

      <div
        ref={loaderRef}
        className="gba:flex gba:justify-center gba:items-center gba:py-6 gba:min-h-[32px]"
        data-testid="data-cards-loader-container"
      >
        {loading && (
          <div className="gba:flex gba:justify-center gba:items-center" data-testid="data-cards-loading-spinner">
            <div className="gba:w-6 gba:h-6 gba:border-3 gba:border-gray-200 gba:border-t-blue-500 gba:rounded-full gba:animate-spin"></div>
          </div>
        )}
      </div>

      {error && (
        <div
          className="gba:text-red-500 gba:mt-4 gba:flex gba:flex-col gba:items-center gba:text-center"
          data-testid="data-cards-error-container"
        >
          <span data-testid="data-cards-error-message">{error}</span>
          {onRetry && (
            <button
              className="gba:mt-2 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded gba:hover:bg-blue-600 gba:transition-colors gba:duration-200"
              onClick={onRetry}
              data-testid="data-cards-retry-button"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}
