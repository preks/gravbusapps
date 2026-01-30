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

import React from 'react'
import { Users, ChevronLeft, ChevronRight } from 'lucide-react'

export interface GridLayout {
  cols: number
  rows: number
  focusedSpan: { col: number; row: number }
}

export interface VideoGridProps {
  /** Grid items to display (current page) */
  gridItems: React.ReactNode[]
  /** Current page number (0-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Total number of items across all pages */
  totalItems: number
  /** Callback when page changes */
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
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  isEmpty = false,
  prefixDataTestId = 'rtk-group-call',
  t = (key: string) => key,
  mode = 'auto-fit',
  minTileSize = 250,
  gridLayout
}) => {
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

  // Calculate optimal number of columns for auto-fit mode
  // This prevents creating too many thin columns
  const calculateOptimalColumns = (itemCount: number): number => {
    if (itemCount <= 1) return 1
    if (itemCount <= 4) return 2
    if (itemCount <= 9) return 3
    if (itemCount <= 16) return 4
    if (itemCount <= 25) return 5
    // For larger counts, use square root rounded up, but cap at 6 columns max
    return Math.min(Math.ceil(Math.sqrt(itemCount)), 6)
  }

  // Determine grid style based on mode
  const gridStyle =
    mode === 'auto-fit'
      ? {
          gridTemplateColumns: `repeat(${calculateOptimalColumns(gridItems.length)}, minmax(${minTileSize}px, 1fr))`,
          gridAutoRows: '1fr'
        }
      : {
          gridTemplateColumns: `repeat(${gridLayout?.cols || 1}, 1fr)`,
          gridTemplateRows: `repeat(${gridLayout?.rows || 1}, 1fr)`
        }

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:w-full gba:gap-2 gba:min-h-0">
      {/* Participant Grid */}
      <div
        className="gba:flex-1 gba:w-full gba:grid gba:gap-3 gba:min-h-0 gba:content-start"
        style={gridStyle}
        data-testid={`${prefixDataTestId}-video-grid`}
      >
        {gridItems}
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

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-4 gba:py-2 gba:flex-shrink-0">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="gba:p-2 gba:rounded-lg hover:gba:bg-accent disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:transition-colors"
            data-testid={`${prefixDataTestId}-prev-page-btn`}
            aria-label={t('videogrid-previous-page')}
          >
            <ChevronLeft className="gba:w-5 gba:h-5" />
          </button>

          {/* Page info */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">
              {t('videogrid-page-info', { current: currentPage + 1, total: totalPages })}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:px-2 gba:py-1 gba:rounded gba:bg-muted/50">
              {totalItems} {totalItems === 1 ? t('chat-participant') : t('groupCall-participants')}
            </span>
          </div>

          {/* Next button */}
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="gba:p-2 gba:rounded-lg hover:gba:bg-accent disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:transition-colors"
            data-testid={`${prefixDataTestId}-next-page-btn`}
            aria-label={t('videogrid-next-page')}
          >
            <ChevronRight className="gba:w-5 gba:h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
