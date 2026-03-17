/**
 * EntityDataStatusBar Component
 *
 * Displays the status of entity data source synchronization.
 * Shows loading, error, success, and empty states.
 */

import React, { memo } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'

export interface EntityDataStatusBarProps {
  isLoading: boolean
  error: string | null
  dataCount: number
  dataSourceName?: string
  onRefresh: () => void
  onEdit?: () => void
  'data-testid'?: string
}

export const EntityDataStatusBar: React.FC<EntityDataStatusBarProps> = memo(function EntityDataStatusBar({
  isLoading,
  error,
  dataCount,
  dataSourceName,
  onRefresh,
  onEdit,
  'data-testid': testId = 'entity-data-status-bar'
}) {
  return (
    <div
      className="gba:px-4 gba:py-1.5 gba:border-b gba:border-border/30 gba:bg-gradient-to-r gba:from-muted/30 gba:to-transparent gba:w-full gba:overflow-hidden gba:flex-shrink-0"
      data-testid={testId}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-full gba:bg-muted/50 gba:border gba:border-border/50">
            <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin gba:text-muted-foreground" />
            <span className="gba:text-xs gba:text-muted-foreground">Syncing...</span>
          </div>
          <span className="gba:text-xs gba:text-muted-foreground">Loading from {dataSourceName}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-full gba:bg-destructive/10 gba:border gba:border-destructive/20">
            <AlertCircle className="gba:w-3.5 gba:h-3.5 gba:text-destructive" />
            <span className="gba:text-xs gba:font-medium gba:text-destructive">Sync failed</span>
          </div>
          <span className="gba:text-xs gba:text-muted-foreground">{error}</span>
          <button type="button" onClick={onRefresh} className="gba:text-xs gba:text-primary gba:hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Success state with data */}
      {!isLoading && !error && dataCount > 0 && (
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-full gba:bg-success/10 gba:border gba:border-success/20">
              <div className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success gba:animate-pulse" />
              <span className="gba:text-xs gba:font-medium gba:text-success-foreground">Synced</span>
            </div>
            <span className="gba:text-xs gba:text-muted-foreground">
              <span className="gba:font-semibold gba:text-foreground">{dataCount}</span> records from{' '}
              <span className="gba:font-medium gba:text-foreground">{dataSourceName}</span>
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/50 gba:transition-colors"
                >
                  <RefreshCw className="gba:w-3 gba:h-3" />
                  <span className="gba:hidden sm:gba:inline">Refresh</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Refresh data from source</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && dataCount === 0 && (
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-full gba:bg-warning/10 gba:border gba:border-warning/20">
            <AlertCircle className="gba:w-3.5 gba:h-3.5 gba:text-warning" />
            <span className="gba:text-xs gba:font-medium gba:text-warning-foreground">No data</span>
          </div>
          <span className="gba:text-xs gba:text-muted-foreground">No records found matching your filters</span>
          {onEdit && (
            <button type="button" onClick={onEdit} className="gba:text-xs gba:text-primary gba:hover:underline">
              Edit filters
            </button>
          )}
        </div>
      )}
    </div>
  )
})
