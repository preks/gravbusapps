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
  const [isExpanded, setIsExpanded] = useState(false)
  const Icon = iconMap[tile.icon] || Monitor
  const status = statusConfig[tile.status]
  const StatusIcon = status.icon

  const hasItems = tile.items.length > 0
  const completedItems = tile.items.filter(i => i.status === 'completed' || i.status === 'reused').length
  const reusedItems = tile.items.filter(i => i.status === 'reused').length
  const totalItems = tile.items.length

  return (
    <Card
      className={cn(
        'gba:relative gba:overflow-hidden gba:transition-all gba:duration-300',
        tile.status === 'discovering' && 'gba:ring-2 gba:ring-info gba:ring-opacity-50',
        tile.status === 'building' && 'gba:ring-2 gba:ring-info gba:ring-opacity-50',
        tile.status === 'wiring' && 'gba:ring-2 gba:ring-info gba:ring-opacity-50',
        tile.status === 'completed' && 'gba:ring-2 gba:ring-success gba:ring-opacity-30',
        tile.status === 'reused' && 'gba:ring-2 gba:ring-success gba:ring-opacity-30',
        tile.status === 'error' && 'gba:ring-2 gba:ring-destructive gba:ring-opacity-30',
        tile.status === 'skipped' && 'gba:opacity-60'
      )}
      data-testid={testId}
    >
      {/* Progress bar overlay */}
      {tile.status === 'building' && tile.progressPercent !== undefined && (
        <div
          className="gba:absolute gba:top-0 gba:left-0 gba:h-1 gba:bg-info gba:transition-all gba:duration-300"
          style={{ width: `${tile.progressPercent}%` }}
        />
      )}

      <div className="gba:p-4">
        {/* Header */}
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div
              className={cn(
                'gba:p-2 gba:rounded-lg',
                tile.status === 'discovering' && 'gba:bg-info-secondary',
                tile.status === 'building' && 'gba:bg-info-secondary',
                tile.status === 'wiring' && 'gba:bg-info-secondary',
                tile.status === 'completed' && 'gba:bg-success-secondary',
                tile.status === 'reused' && 'gba:bg-success-secondary',
                tile.status === 'error' && 'gba:bg-destructive-secondary',
                tile.status === 'pending' && 'gba:bg-muted',
                tile.status === 'skipped' && 'gba:bg-muted'
              )}
            >
              <Icon
                className={cn(
                  'gba:w-5 gba:h-5',
                  tile.status === 'discovering' && 'gba:text-info',
                  tile.status === 'building' && 'gba:text-info',
                  tile.status === 'wiring' && 'gba:text-info',
                  tile.status === 'completed' && 'gba:text-success',
                  tile.status === 'reused' && 'gba:text-success',
                  tile.status === 'error' && 'gba:text-destructive',
                  tile.status === 'pending' && 'gba:text-muted-foreground',
                  tile.status === 'skipped' && 'gba:text-muted-foreground'
                )}
              />
            </div>
            <div>
              <h3 className="gba:font-semibold gba:text-foreground">{tile.title}</h3>
              <p className="gba:text-sm gba:text-muted-foreground">{tile.description}</p>
            </div>
          </div>

          <Badge variant={status.variant} className="gba:flex gba:items-center gba:gap-1">
            <StatusIcon className={cn('gba:w-3 gba:h-3', status.animate && 'gba:animate-spin')} />
            {status.label}
          </Badge>
        </div>

        {/* Current operation */}
        {tile.currentOperation && (
          <div className="gba:mb-3 gba:p-2 gba:bg-muted gba:rounded-md">
            <p className="gba:text-sm gba:text-foreground gba:flex gba:items-center gba:gap-2">
              <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin gba:text-info" />
              {tile.currentOperation}
            </p>
          </div>
        )}

        {/* Item count */}
        {hasItems && (
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-sm gba:text-muted-foreground">
              {completedItems} of {totalItems} items
              {reusedItems > 0 && (
                <span className="gba:inline-flex gba:items-center gba:gap-1 gba:ml-1 gba:text-success">
                  <Recycle className="gba:w-3 gba:h-3" />
                  {reusedItems} reused
                </span>
              )}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="gba:h-7 gba:px-2">
              {isExpanded ? (
                <>
                  <ChevronUp className="gba:w-4 gba:h-4 gba:mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="gba:w-4 gba:h-4 gba:mr-1" />
                  Details
                </>
              )}
            </Button>
          </div>
        )}

        {/* Skipped message */}
        {tile.status === 'skipped' && !hasItems && (
          <p className="gba:text-sm gba:text-muted-foreground gba:italic">Not needed for this build</p>
        )}

        {/* Expanded details */}
        {isExpanded && hasItems && (
          <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-border">
            <ul className="gba:space-y-2">
              {tile.items.map(item => (
                <li key={item.id} className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                  <span className="gba:text-foreground">{item.name}</span>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {item.status === 'completed' && <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-success" />}
                    {item.status === 'reused' && (
                      <span className="gba:flex gba:items-center gba:gap-1 gba:text-success">
                        <Recycle className="gba:w-4 gba:h-4" />
                        <span className="gba:text-xs">reused</span>
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="gba:text-destructive gba:text-xs" title={item.error}>
                        <XCircle className="gba:w-4 gba:h-4" />
                      </span>
                    )}
                    {item.status === 'building' && (
                      <Loader2 className="gba:w-4 gba:h-4 gba:text-info gba:animate-spin" />
                    )}
                    {item.status === 'pending' && <Clock className="gba:w-4 gba:h-4 gba:text-muted-foreground" />}
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
