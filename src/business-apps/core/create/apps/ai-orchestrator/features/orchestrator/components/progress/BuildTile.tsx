/**
 * BuildTile - Base component for displaying build progress for a component type
 *
 * Shows:
 * - Service icon and name
 * - Status indicator with animation
 * - Current operation text
 * - List of items being built
 * - Expandable details
 */

import React from 'react'
import { Badge, Progress, cn } from '@newwork/nw-design-system'
import {
  Monitor,
  Bot,
  Code2,
  Workflow,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  MinusCircle,
  Recycle,
  Search,
  Link2,
  type LucideIcon
} from 'lucide-react'
import type { ComponentTileInfo, BuildStatus } from '../../types'

export interface BuildTileProps {
  tile: ComponentTileInfo
  'data-testid'?: string
}

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Monitor,
  Bot,
  Code2,
  Workflow,
  Database
}

// Status configuration
const statusConfig: Record<
  BuildStatus,
  {
    icon: LucideIcon
    label: string
    variant: 'success' | 'destructive' | 'warning' | 'info' | 'offline' | 'default'
    animate?: boolean
  }
> = {
  pending: { icon: Clock, label: 'Queued', variant: 'offline' },
  analyzing: { icon: Loader2, label: 'Analyzing', variant: 'info', animate: true },
  discovering: { icon: Search, label: 'Discovering', variant: 'info', animate: true },
  building: { icon: Loader2, label: 'Building', variant: 'info', animate: true },
  wiring: { icon: Link2, label: 'Connecting', variant: 'info', animate: true },
  completed: { icon: CheckCircle2, label: 'Complete', variant: 'success' },
  error: { icon: XCircle, label: 'Error', variant: 'destructive' },
  skipped: { icon: MinusCircle, label: 'Skipped', variant: 'offline' },
  reused: { icon: Recycle, label: 'Reused', variant: 'success' },
  cancelled: { icon: XCircle, label: 'Cancelled', variant: 'warning' }
}

/**
 * BuildTile component for displaying build progress
 */
export const BuildTile: React.FC<BuildTileProps> = ({ tile, 'data-testid': testId }) => {
  const Icon = iconMap[tile.icon] || Monitor
  const status = statusConfig[tile.status]
  const StatusIcon = status.icon

  const hasItems = tile.items.length > 0
  const completedItems = tile.items.filter(i => i.status === 'completed').length
  const reusedItems = tile.items.filter(i => i.status === 'reused').length
  const failedItems = tile.items.filter(i => i.status === 'error').length
  const buildingItems = tile.items.filter(i => i.status === 'building').length
  const queuedItems = tile.items.filter(i => i.status === 'pending' || i.status === 'discovering').length
  const totalItems = tile.items.length

  // Calculate progress percentage
  const doneItems = completedItems + reusedItems + failedItems
  const progressPercent = tile.progressPercent ?? (totalItems > 0 ? (doneItems / totalItems) * 100 : 0)
  const showProgressBar = hasItems && ['discovering', 'analyzing', 'building', 'wiring'].includes(tile.status)

  // Compact view for skipped/pending
  const isCompact = tile.status === 'skipped' || tile.status === 'pending'

  return (
    <div
      className={cn(
        'gba:relative gba:w-full gba:rounded-lg gba:border gba:border-gray-300/90 gba:bg-gray-100/85 gba:px-3 gba:py-1.5',
        (tile.status === 'discovering' || tile.status === 'building' || tile.status === 'wiring') &&
          'gba:border-blue-400/70 gba:bg-blue-50/25',
        tile.status === 'completed' && 'gba:border-gray-300/90 gba:bg-gray-100/90',
        tile.status === 'skipped' && 'gba:opacity-65'
      )}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <div className="gba:p-0.5 gba:rounded-md gba:bg-muted">
            <Icon className="gba:w-3 gba:h-3 gba:text-foreground" />
          </div>
          <h3 className="gba:font-medium gba:text-xs gba:text-foreground gba:truncate gba:leading-none">
            {tile.title}
          </h3>
        </div>

        <Badge
          variant="secondary"
          className={cn(
            'gba:flex gba:items-center gba:gap-1 gba:shrink-0 gba:border-0 gba:text-[10px] gba:px-0 gba:bg-transparent gba:leading-none',
            tile.status === 'completed' && 'gba:text-emerald-600',
            (tile.status === 'discovering' || tile.status === 'building' || tile.status === 'wiring') &&
              'gba:text-blue-600',
            tile.status === 'pending' && 'gba:text-muted-foreground'
          )}
        >
          <StatusIcon className={cn('gba:w-3 gba:h-3', status.animate && 'gba:animate-spin')} />
          {status.label}
        </Badge>
      </div>

      {hasItems && (
        <>
          {showProgressBar && (
            <Progress value={progressPercent} className="gba:mt-1 gba:h-1.5 [&>div]:gba:bg-foreground" />
          )}
          <div className="gba:mt-1 gba:flex gba:items-center gba:justify-between gba:gap-2 gba:leading-none">
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:min-w-0">
              <span
                className={cn(
                  'gba:text-[9px] gba:px-1 gba:py-0.5 gba:rounded gba:border gba:whitespace-nowrap',
                  completedItems > 0
                    ? 'gba:bg-emerald-50 gba:border-emerald-300/70 gba:text-emerald-700'
                    : 'gba:bg-muted gba:border-border gba:text-muted-foreground'
                )}
              >
                done {completedItems}
              </span>
              <span
                className={cn(
                  'gba:text-[9px] gba:px-1 gba:py-0.5 gba:rounded gba:border gba:whitespace-nowrap',
                  buildingItems > 0
                    ? 'gba:bg-blue-50 gba:border-blue-300/70 gba:text-blue-700'
                    : 'gba:bg-muted gba:border-border gba:text-muted-foreground'
                )}
              >
                building {buildingItems}
              </span>
              <span
                className={cn(
                  'gba:text-[9px] gba:px-1 gba:py-0.5 gba:rounded gba:border gba:whitespace-nowrap',
                  reusedItems > 0
                    ? 'gba:bg-cyan-50 gba:border-cyan-300/70 gba:text-cyan-700'
                    : 'gba:bg-muted gba:border-border gba:text-muted-foreground'
                )}
              >
                reused {reusedItems}
              </span>
              {(queuedItems > 0 || failedItems > 0) && (
                <span
                  className={cn(
                    'gba:text-[9px] gba:px-1 gba:py-0.5 gba:rounded gba:border gba:whitespace-nowrap',
                    failedItems > 0
                      ? 'gba:bg-red-50 gba:border-red-300/70 gba:text-red-700'
                      : 'gba:bg-amber-50 gba:border-amber-300/70 gba:text-amber-700'
                  )}
                >
                  {failedItems > 0 ? `errors ${failedItems}` : `queued ${queuedItems}`}
                </span>
              )}
            </div>
            <span className="gba:text-[9px] gba:text-muted-foreground gba:whitespace-nowrap">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </>
      )}

      {tile.currentOperation && !isCompact && (
        <div className="gba:mt-1.5 gba:flex gba:items-center gba:gap-1.5 gba:text-[10px] gba:text-muted-foreground gba:line-clamp-1 gba:leading-snug">
          <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin gba:shrink-0" />
          <span className="gba:truncate">{tile.currentOperation}</span>
        </div>
      )}

      {tile.status === 'skipped' && (
        <span className="gba:mt-1 gba:block gba:text-[10px] gba:text-muted-foreground gba:italic">
          Not needed for this build
        </span>
      )}
    </div>
  )
}

export default BuildTile
