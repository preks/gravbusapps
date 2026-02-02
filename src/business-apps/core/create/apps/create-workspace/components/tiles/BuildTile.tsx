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

import React, { useState } from 'react'
import { Card, Badge, Button, cn } from '@newwork/nw-design-system'
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
  ChevronDown,
  ChevronUp,
  MinusCircle,
  Recycle,
  Search,
  Link2,
  type LucideIcon
} from 'lucide-react'
import { CircularProgress } from '../CircularProgress'
import type { ComponentTileInfo, BuildStatus } from '../../types/orchestrator'

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
  pending: { icon: Clock, label: 'Waiting', variant: 'offline' },
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
  // Auto-collapse when skipped or pending
  const [isExpanded, setIsExpanded] = useState(tile.status !== 'skipped' && tile.status !== 'pending')
  const Icon = iconMap[tile.icon] || Monitor
  const status = statusConfig[tile.status]
  const StatusIcon = status.icon

  const hasItems = tile.items.length > 0
  const completedItems = tile.items.filter(i => i.status === 'completed' || i.status === 'reused').length
  const reusedItems = tile.items.filter(i => i.status === 'reused').length
  const totalItems = tile.items.length

  // Calculate progress percentage
  const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  // Compact view for skipped/pending
  const isCompact = tile.status === 'skipped' || tile.status === 'pending'

  return (
    <Card
      className={cn(
        'gba:relative gba:overflow-hidden gba:transition-all gba:duration-300',
        (tile.status === 'discovering' || tile.status === 'building' || tile.status === 'wiring') &&
          'gba:ring-1 gba:ring-foreground/20',
        tile.status === 'skipped' && 'gba:opacity-50',
        isCompact && 'gba:py-2'
      )}
      data-testid={testId}
    >
      {/* Progress bar overlay - Monochrome */}
      {tile.status === 'building' && progressPercent > 0 && (
        <div
          className="gba:absolute gba:top-0 gba:left-0 gba:h-1 gba:bg-foreground gba:transition-all gba:duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      )}

      <div className={cn('gba:p-4', isCompact && 'gba:py-2')}>
        {/* Header - Compact for skipped/pending */}
        <div className={cn('gba:flex gba:items-start gba:justify-between', !isCompact && 'gba:mb-3')}>
          <div className="gba:flex gba:items-center gba:gap-3">
            {/* Show icon only if not compact, or show circular progress */}
            {!isCompact && (
              <>
                {(tile.status === 'building' || tile.status === 'wiring') && totalItems > 0 ? (
                  <CircularProgress value={progressPercent} size="sm" showPercentage={false} color="primary" />
                ) : (
                  <div className="gba:p-2 gba:rounded-lg gba:bg-muted">
                    <Icon className="gba:w-4 gba:h-4 gba:text-foreground" />
                  </div>
                )}
              </>
            )}
            <div>
              <h3 className={cn('gba:font-medium gba:text-foreground', isCompact ? 'gba:text-sm' : 'gba:text-base')}>
                {tile.title}
              </h3>
              {!isCompact && <p className="gba:text-sm gba:text-muted-foreground">{tile.description}</p>}
            </div>
          </div>

          <Badge
            variant="secondary"
            className="gba:flex gba:items-center gba:gap-1 gba:shrink-0 gba:bg-transparent gba:text-muted-foreground gba:border-0"
          >
            <StatusIcon className={cn('gba:w-3 gba:h-3', status.animate && 'gba:animate-spin')} />
            {status.label}
          </Badge>
        </div>

        {/* Current operation - Hide when compact */}
        {tile.currentOperation && !isCompact && (
          <div className="gba:mb-3 gba:p-2 gba:bg-muted gba:rounded-md">
            <p className="gba:text-sm gba:text-foreground gba:flex gba:items-center gba:gap-2">
              <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin gba:text-foreground" />
              {tile.currentOperation}
            </p>
          </div>
        )}

        {/* Item count - Hide when compact */}
        {hasItems && !isCompact && (
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-xs gba:text-muted-foreground">
              {completedItems} of {totalItems} items
              {reusedItems > 0 && ` • ${reusedItems} reused`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gba:h-6 gba:px-2 gba:text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="gba:w-3 gba:h-3 gba:mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="gba:w-3 gba:h-3 gba:mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>
        )}

        {/* Skipped message */}
        {tile.status === 'skipped' && (
          <span className="gba:text-xs gba:text-muted-foreground gba:italic gba:ml-1">Not needed for this build</span>
        )}

        {/* Expanded details - Monochrome */}
        {isExpanded && hasItems && (
          <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-border">
            <ul className="gba:space-y-2">
              {tile.items.map(item => (
                <li key={item.id} className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                  <span className="gba:text-foreground">{item.name}</span>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {item.status === 'completed' && <CheckCircle2 className="gba:w-3 gba:h-3 gba:text-foreground" />}
                    {item.status === 'reused' && (
                      <span className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground">
                        <Recycle className="gba:w-3 gba:h-3" />
                        <span className="gba:text-xs">reused</span>
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="gba:text-foreground gba:text-xs" title={item.error}>
                        <XCircle className="gba:w-3 gba:h-3" />
                      </span>
                    )}
                    {item.status === 'building' && (
                      <Loader2 className="gba:w-3 gba:h-3 gba:text-foreground gba:animate-spin" />
                    )}
                    {item.status === 'pending' && <Clock className="gba:w-3 gba:h-3 gba:text-muted-foreground" />}
                    {item.createdId && (
                      <span className="gba:text-xs gba:text-muted-foreground gba:font-mono">
                        {item.createdId.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

export default BuildTile
