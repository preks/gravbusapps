/**
 * Graph Toolbar Component
 *
 * Provides controls for the case relationship graph:
 * - Layout direction toggle (vertical/horizontal)
 * - Fit view button
 * - Fullscreen toggle
 * - Zoom controls
 */

import React from 'react'
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import {
  Maximize2,
  Minimize2,
  LayoutGrid,
  ArrowDownToLine,
  ArrowRightToLine,
  ZoomIn,
  ZoomOut,
  Locate,
  RefreshCw
} from 'lucide-react'
import { LayoutDirection } from './useCaseGraph'

export interface GraphToolbarProps {
  /** Current layout direction */
  layoutDirection: LayoutDirection
  /** Callback to change layout direction */
  onLayoutChange: (direction: LayoutDirection) => void
  /** Whether fullscreen mode is active */
  isFullscreen: boolean
  /** Callback to toggle fullscreen */
  onFullscreenToggle: () => void
  /** Callback to fit view */
  onFitView: () => void
  /** Callback to zoom in */
  onZoomIn: () => void
  /** Callback to zoom out */
  onZoomOut: () => void
  /** Callback to refresh data */
  onRefresh: () => void
  /** Whether refresh is in progress */
  isRefreshing?: boolean
}

/**
 * Layout options for the dropdown
 */
const LAYOUT_OPTIONS: { value: LayoutDirection; label: string; icon: React.ReactNode }[] = [
  {
    value: 'TB',
    label: 'Top to Bottom',
    icon: <ArrowDownToLine className="gba:h-4 gba:w-4" />
  },
  {
    value: 'LR',
    label: 'Left to Right',
    icon: <ArrowRightToLine className="gba:h-4 gba:w-4" />
  }
]

/**
 * Graph Toolbar Component
 *
 * Renders a toolbar with controls for manipulating the graph view.
 */
export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  layoutDirection,
  onLayoutChange,
  isFullscreen,
  onFullscreenToggle,
  onFitView,
  onZoomIn,
  onZoomOut,
  onRefresh,
  isRefreshing = false
}) => {
  return (
    <div className="gba:flex gba:items-center gba:gap-3">
      {/* Layout Direction */}
      <div className="gba:flex gba:items-center gba:h-9 gba:border gba:border-border gba:rounded-lg gba:bg-background gba:shadow-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="gba:flex gba:items-center gba:h-full gba:px-2">
                <LayoutGrid className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">Layout Direction</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="gba:border-l gba:border-border gba:h-full gba:flex gba:items-center">
          <Select value={layoutDirection} onValueChange={v => onLayoutChange(v as LayoutDirection)}>
            <SelectTrigger className="gba:h-full gba:w-[180px] gba:border-0 gba:rounded-none gba:bg-transparent gba:font-medium gba:text-sm gba:text-center gba:justify-center focus:gba:ring-0 focus:gba:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="center">
              {LAYOUT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {option.icon}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Divider */}
      <div className="gba:h-6 gba:w-px gba:bg-border" />

      {/* Zoom Controls */}
      <div className="gba:flex gba:items-center gba:h-9 gba:border gba:border-border gba:rounded-lg gba:bg-background gba:shadow-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-full gba:w-9 gba:p-0 gba:rounded-l-lg gba:rounded-r-none hover:gba:bg-muted"
                onClick={onZoomOut}
              >
                <ZoomOut className="gba:h-4 gba:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom Out</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="gba:border-x gba:border-border gba:h-full gba:flex gba:items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gba:h-full gba:px-3 gba:rounded-none gba:font-medium gba:text-sm hover:gba:bg-muted"
                  onClick={onFitView}
                >
                  <Locate className="gba:h-4 gba:w-4 gba:mr-1.5" />
                  Fit
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Fit to View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-full gba:w-9 gba:p-0 gba:rounded-r-lg gba:rounded-l-none hover:gba:bg-muted"
                onClick={onZoomIn}
              >
                <ZoomIn className="gba:h-4 gba:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom In</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Divider */}
      <div className="gba:h-6 gba:w-px gba:bg-border" />

      {/* Refresh Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gba:h-9 gba:w-9 gba:p-0 gba:shadow-sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`gba:h-4 gba:w-4 ${isRefreshing ? 'gba:animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Refresh Data</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Fullscreen Toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gba:h-9 gba:w-9 gba:p-0 gba:shadow-sm"
              onClick={onFullscreenToggle}
            >
              {isFullscreen ? <Minimize2 className="gba:h-4 gba:w-4" /> : <Maximize2 className="gba:h-4 gba:w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
