'use client';

import { ReactNode } from 'react';

// Simple class merging utility
const mergeClasses = (...classes: string[]) => classes.filter(Boolean).join(' ');

interface DataCardsProps<T extends Record<string, any>> {
  readonly data: readonly T[];
  readonly renderItem: (item: T) => ReactNode;
  readonly columnMinWidth?: number;
  readonly gap?: number;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly emptyMessage?: string;
  readonly className?: string;
}

/**
 * DataCards Component
 * A reusable grid layout for displaying card-based data with consistent styling
 * 
 * Features:
 * - Responsive grid layout that adjusts based on screen size
 * - Built-in loading, error, and empty state handling
 * - Consistent styling across the application
 * - Default values optimized for visual consistency
 */
export function DataCards<T extends Record<string, any>>({
  data,
  renderItem,
  columnMinWidth = 300, // Default value as per memory
  gap = 16, // Default value as per memory
  loading = false,
  error = null,
  emptyMessage = 'No data available',
  className = ''
}: DataCardsProps<T>) {
  // Handle loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>{error}</p>
      </div>
    );
  }

  // Handle empty state
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={mergeClasses('w-full', className)}
      style={{
        padding: '16px', // Consistent padding as per memory
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${columnMinWidth}px, 1fr))`,
          gap: `${gap}px`,
          gridAutoRows: 'min-content', // Ensures rows adjust to content height as per memory
        }}
      >
        {data.map((item, index) => {
          // Use a unique ID from the item if available, otherwise use index as fallback
          const key = 'id' in item ? String((item as any).id) : `item-${index}`;
          return (
            <div key={key} className="h-full">
              {renderItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
