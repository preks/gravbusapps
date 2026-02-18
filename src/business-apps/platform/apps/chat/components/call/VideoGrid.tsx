/**
 * VideoGrid Component
 *
 * Renders the participant grid with two modes:
 * - auto-fit: Columns and rows are computed from container size so 16:9 tiles fill the space.
 * - fixed-grid: Manual cols/rows specification (legacy support)
 *
 * Features:
 * - Pagination for large participant lists
 * - Empty state
 */

import React, { useRef, useLayoutEffect, useState } from 'react'
import { Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'

const GRID_GAP_PX = 12

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
  /** Minimum tile size for auto-fit mode (in pixels). Columns grow with 1fr to fill width (no max). */
  minTileSize?: number
  /** @deprecated No longer used in auto-fit; columns use 1fr to fill space. Kept for API compatibility. */
  maxTileSize?: number
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

  const gridContainerRef = useRef<HTMLDivElement>(null)
  const [computedLayout, setComputedLayout] = useState<{
    gridTemplateColumns: string
    gridAutoRows: string
  } | null>(null)

  useLayoutEffect(() => {
    if (mode !== 'auto-fit' || isEmpty || gridItems.length === 0) {
      setComputedLayout(null)
      return
    }
    const el = gridContainerRef.current
    if (!el) return

    const update = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const count = gridItems.length
      const gap = GRID_GAP_PX
      const maxCols = Math.min(count, Math.max(1, Math.floor((w + gap) / (minTileSize + gap))))

      let bestCols = 1
      let bestTileWidth = 0
      let bestRowHeight = 0

      for (let numCols = 1; numCols <= maxCols; numCols++) {
        const numRows = Math.ceil(count / numCols)
        const availableWidth = w - (numCols - 1) * gap
        const availableHeight = h - (numRows - 1) * gap
        const tileWidthIfFillWidth = availableWidth / numCols
        const rowHeightIfFillWidth = tileWidthIfFillWidth * (9 / 16)
        const fitsHeight = numRows * rowHeightIfFillWidth <= availableHeight

        let tileWidth: number
        let rowHeight: number
        if (fitsHeight) {
          tileWidth = tileWidthIfFillWidth
          rowHeight = rowHeightIfFillWidth
        } else {
          rowHeight = availableHeight / numRows
          const tileWidthFromHeight = rowHeight * (16 / 9)
          tileWidth = Math.min(tileWidthFromHeight, availableWidth / numCols)
          rowHeight = tileWidth * (9 / 16)
        }

        if (tileWidth > bestTileWidth) {
          bestTileWidth = tileWidth
          bestRowHeight = rowHeight
          bestCols = numCols
        }
      }

      setComputedLayout({
        gridTemplateColumns: `repeat(${bestCols}, ${bestTileWidth}px)`,
        gridAutoRows: `${bestRowHeight}px`
      })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode, isEmpty, gridItems.length, minTileSize])

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

  const gridStyle =
    mode === 'auto-fit'
      ? (computedLayout ?? {
          gridTemplateColumns: `repeat(auto-fit, minmax(${minTileSize}px, 1fr))`,
          gridAutoRows: 'auto' as const
        })
      : {
          gridTemplateColumns: `repeat(${gridLayout?.cols || 1}, 1fr)`,
          gridTemplateRows: `repeat(${gridLayout?.rows || 1}, 1fr)`
        }

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:w-full gba:gap-2 gba:min-h-0">
      {/* Participant Grid with Navigation Buttons */}
      <div ref={gridContainerRef} className="gba:relative gba:flex-1 gba:w-full gba:min-h-0">
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
          className={`gba:w-full gba:h-full gba:grid gba:gap-3 ${mode === 'auto-fit' ? 'gba:overflow-hidden gba:items-stretch gba:content-stretch gba:justify-center' : 'gba:overflow-hidden gba:items-stretch'}`}
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
