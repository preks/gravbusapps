import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Props for the DataCards component.
 * @template T - The type of items in the cards.
 */
export interface DataCardsProps<T> {
  /**
   * The array of items to render as cards.
   */
  readonly items: readonly T[];
  
  /**
   * Function to render a card item. Receives the item.
   */
  readonly renderItem: (item: T) => React.ReactNode;
  
  /**
   * Function to get a unique key for each item.
   */
  readonly getKey: (item: T) => React.Key;
  
  /**
   * Whether more items are available to load.
   */
  readonly hasMore: boolean;
  
  /**
   * Whether items are currently being loaded.
   */
  readonly loading: boolean;
  
  /**
   * Error message if loading failed.
   */
  readonly error?: string | null;
  
  /**
   * Function to call when more items should be loaded.
   */
  readonly onLoadMore: () => void;
  
  /**
   * Function to retry loading if an error occurred.
   */
  readonly onRetry?: () => void;
  
  /**
   * Message to display when no items are found.
   */
  readonly emptyMessage?: string;
  
  /**
   * Additional className for the container.
   */
  readonly className?: string;
  
  /**
   * Number of columns to display (min-width of each card).
   * Default is 340px.
   */
  readonly columnMinWidth?: number;
  
  /**
   * Gap between cards in pixels.
   * Default is 24px (6 * 4).
   */
  readonly gap?: number;
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
  gap = 24,
}: DataCardsProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  
  // Set up intersection observer for infinite scrolling
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry?.isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    });
    
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    
    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [handleObserver]);
  
  return (
    <div 
      ref={scrollContainerRef} 
      className={`w-full h-full overflow-y-auto ${className}`.trim()}
    >
      <div 
        className="p-4 grid justify-center" 
        style={{ 
          gridTemplateColumns: `repeat(auto-fill, minmax(${columnMinWidth}px, 1fr))`,
          gridAutoRows: 'min-content',
          gap: `${gap}px`
        }}
      >
        {items.length === 0 && !loading ? (
          <div className="col-span-full text-center text-gray-400 py-12">
            {emptyMessage}
          </div>
        ) : (
          items.map(item => (
            <div key={getKey(item)} className="flex-shrink-0 transition-transform duration-200 ease-in-out hover:-translate-y-0.5 mb-3">
              {renderItem(item)}
            </div>
          ))
        )}
      </div>
      
      <div 
        ref={loaderRef} 
        className="flex justify-center items-center py-6 min-h-[32px]"
      >
        {loading && (
          <div className="flex justify-center items-center">
            <div className="w-6 h-6 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="text-red-500 mt-4 flex flex-col items-center text-center">
          <span>{error}</span>
          {onRetry && (
            <button 
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200" 
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
