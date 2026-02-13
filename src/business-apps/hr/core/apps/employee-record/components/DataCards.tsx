'use client'

import { ReactNode } from 'react'

// Simple class merging utility
const mergeClasses = (...classes: string[]) => classes.filter(Boolean).join(' ')

interface DataCardsProps<T extends Record<string, any>> {
  readonly data: readonly T[]
  readonly renderItem: (item: T) => ReactNode
  readonly columnMinWidth?: number
  readonly gap?: number
  readonly loading?: boolean
  readonly error?: string | null
  readonly emptyMessage?: string
  readonly className?: string
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
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-info"></div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="gba:text-center gba:text-destructive gba:py-8">
        <p>{error}</p>
      </div>
    )
  }

  // Handle empty state
  if (!data || data.length === 0) {
    return (
      <div className="gba:text-center gba:text-muted-foreground gba:py-8">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={mergeClasses('gba:w-full gba:p-4', className)}>
      <div
        className={`gba:grid gba:grid-cols-[repeat(auto-fill,minmax(${columnMinWidth}px,1fr))] gba:gap-[${gap}px] gba:grid-auto-rows-[min-content]`}
      >
        {data.map((item, index) => {
          // Use a unique ID from the item if available, otherwise use index as fallback
          const key = 'id' in item ? String((item as any).id) : `item-${index}`
          return (
            <div key={key} className="gba:h-full">
              {renderItem(item)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
