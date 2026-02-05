/**
 * VideoGrid Component
 *
 * Renders the participant grid with two modes:
 * - auto-fit: CSS Grid automatically calculates columns (industry standard)
 * - fixed-grid: Manual cols/rows specification (legacy support)
 *
 * Features:
 * - Pagination for large participant lists
 * - Empty state
 */

import React, { useState, useEffect } from 'react'
import { Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'

export interface GridLayout {
  cols: number
  rows: number
  focusedSpan: { col: number; row: number }
}

export interface VideoGridProps {
  /** Grid items to display (current page) */
  gridItems: React.ReactNode[]
  /** Current page number (0-indexed) - DEPRECATED: Pagination now handled at modal level */
  currentPage?: number
  /** Total number of pages - DEPRECATED: Pagination now handled at modal level */
  totalPages?: number
  /** Total number of items across all pages - DEPRECATED: Pagination now handled at modal level */
  totalItems?: number
  /** Callback when page changes - DEPRECATED: Pagination now handled at modal level */
  onPageChange?: (page: number) => void
  /** Whether the grid is empty */
  isEmpty?: boolean
  /** Data test ID prefix */
  prefixDataTestId?: string
  /** Translation function */
  t?: (key: string, params?: Record<string, unknown>) => string
  /** Grid mode: auto-fit uses CSS auto-fit, fixed-grid uses manual cols/rows */
  mode?: 'auto-fit' | 'fixed-grid'
  /** Minimum tile size for auto-fit mode (in pixels) */
  minTileSize?: number
  /** Grid layout configuration (only used in fixed-grid mode) */
  gridLayout?: GridLayout
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  gridItems,
  currentPage = 0,
  totalPages = 1,
  onPageChange,
  isEmpty = false,
  prefixDataTestId = 'rtk-group-call',
  t = (key: string) => key,
  mode = 'auto-fit',
  minTileSize = 250,
  gridLayout
}) => {
  // Track window size for responsive grid
  const [, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate if pagination buttons should be shown
  const showPagination = totalPages > 1 && onPageChange
  const canGoPrevious = currentPage > 0
  const canGoNext = currentPage < totalPages - 1

  const handlePrevious = () => {
    if (canGoPrevious && onPageChange) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (canGoNext && onPageChange) {
      onPageChange(currentPage + 1)
    }
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:rounded-lg gba:bg-muted gba:text-muted-foreground">
        <div className="gba:text-center">
          <Users className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2" />
          <p>{t('groupCall-waitingForParticipants')}</p>
        </div>
      </div>
    )
  }

  // Calculate optimal number of columns based on screen size and item count
  // This prevents creating too many thin columns on small screens
  // Prioritizes 2-column layouts for better aspect ratios (wider videos)
  const calculateOptimalColumns = (itemCount: number): number => {
    const screenWidth = window.innerWidth

    // Mobile screens (< 768px)
    if (screenWidth < 768) {
      // On very narrow screens (< 500px), prefer 1 column for better aspect ratio
      if (screenWidth < 500) {
        if (itemCount <= 4) return 1 // Single column for 1-4 participants
        return 2 // 2 columns only for 5+ participants
      }
      // On wider mobile screens (500-767px), allow 2 columns earlier
      if (itemCount <= 2) return 1
      if (itemCount <= 4) return 2
      return 2 // Max 2 columns on mobile
    }

    // Tablet screens (768px - 1023px)
    if (screenWidth < 1024) {
      if (itemCount <= 1) return 1
      if (itemCount <= 2) return 2
      if (itemCount <= 4) return 2
      if (itemCount <= 6) return 2 // 2×3 for better aspect ratio
      if (itemCount <= 9) return 3
      return 3 // Max 3 columns on tablet
    }

    // Desktop screens (>= 1024px)
    if (itemCount <= 1) return 1
    if (itemCount <= 2) return 2
    if (itemCount <= 4) return 2
    if (itemCount <= 6) return 2 // 2×3 for better aspect ratio instead of 3×2
    if (itemCount <= 9) return 3 // 3×3 for 7-9 participants
    if (itemCount <= 12) return 3 // 3×4 for 10-12 participants
    if (itemCount <= 16) return 4
    if (itemCount <= 25) return 5
    // For larger counts, use square root rounded up, but cap at 6 columns max
    return Math.min(Math.ceil(Math.sqrt(itemCount)), 6)
  }

  // Calculate optimal row height based on screen size
  const calculateRowHeight = (): string => {
    const screenWidth = window.innerWidth

    // On mobile, make tiles taller to fill vertical space better
    if (screenWidth < 768) {
      // For 2 columns, calculate height to fill available space
      // Account for gap and padding
      return `minmax(${minTileSize * 0.8}px, 1fr)`
    }

    // On larger screens, maintain aspect ratio
    return 'minmax(200px, 1fr)'
  }

  // Determine grid style based on mode
  const gridStyle =
    mode === 'auto-fit'
      ? {
          gridTemplateColumns: `repeat(${calculateOptimalColumns(gridItems.length)}, minmax(${minTileSize}px, 1fr))`,
          gridAutoRows: calculateRowHeight()
        }
      : {
          gridTemplateColumns: `repeat(${gridLayout?.cols || 1}, 1fr)`,
          gridTemplateRows: `repeat(${gridLayout?.rows || 1}, 1fr)`
        }

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:w-full gba:gap-2 gba:min-h-0">
      {/* Participant Grid with Navigation Buttons */}
      <div className="gba:relative gba:flex-1 gba:w-full gba:min-h-0">
        {/* Left Navigation Button */}
        {showPagination && canGoPrevious && (
          <div className="gba:absolute gba:left-2 gba:top-1/2 gba:-translate-y-1/2 gba:z-10">
            <Button
              variant="secondary"
              size="icon"
              onClick={handlePrevious}
              data-testid={`${prefixDataTestId}-pagination-prev`}
              className="gba:rounded-full gba:shadow-lg gba:opacity-90 hover:gba:opacity-100"
            >
              <ChevronLeft className="gba:h-5 gba:w-5" />
            </Button>
          </div>
        )}

        {/* Grid Container */}
        <div
          className="gba:w-full gba:h-full gba:grid gba:gap-3 gba:content-start gba:overflow-hidden"
          style={gridStyle}
          data-testid={`${prefixDataTestId}-video-grid`}
        >
          {gridItems}
        </div>

        {/* Right Navigation Button */}
        {showPagination && canGoNext && (
          <div className="gba:absolute gba:right-2 gba:top-1/2 gba:-translate-y-1/2 gba:z-10">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleNext}
              data-testid={`${prefixDataTestId}-pagination-next`}
              className="gba:rounded-full gba:shadow-lg gba:opacity-90 hover:gba:opacity-100"
            >
              <ChevronRight className="gba:h-5 gba:w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* CSS for reaction animations */}
      <style>{`
        @keyframes reaction-float-up {
          0% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -80px) scale(1.3);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150px) scale(1.5);
          }
        }
      `}</style>
    </div>
  )
}
