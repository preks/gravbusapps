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
import { Card, Badge, Progress, cn } from '@newwork/nw-design-system'
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
        'gba:relative gba:overflow-hidden gba:transition-all gba:duration-300 gba:h-full gba:min-h-[108px] gba:border-border/80',
        (tile.status === 'discovering' || tile.status === 'building' || tile.status === 'wiring') &&
          'gba:ring-1 gba:ring-blue-400/35',
        tile.status === 'skipped' && 'gba:opacity-65'
      )}
      data-testid={testId}
    >
      <div className="gba:p-2.5 gba:h-full gba:flex gba:flex-col gba:gap-1.5">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <div className="gba:p-1.5 gba:rounded-md gba:bg-muted">
              <Icon className="gba:w-3.5 gba:h-3.5 gba:text-foreground" />
            </div>
            <h3 className="gba:font-medium gba:text-xs gba:text-foreground gba:truncate">{tile.title}</h3>
          </div>

          <Badge
            variant="secondary"
            className="gba:flex gba:items-center gba:gap-1 gba:shrink-0 gba:bg-transparent gba:text-muted-foreground gba:border-0 gba:text-[10px] gba:px-0"
          >
            <StatusIcon className={cn('gba:w-3 gba:h-3', status.animate && 'gba:animate-spin')} />
            {status.label}
          </Badge>
        </div>

        <p className="gba:text-[10px] gba:text-muted-foreground gba:line-clamp-1">{tile.description}</p>

        <div className="gba:space-y-1.5">
          {hasItems && (
            <>
              <Progress value={progressPercent} className="gba:h-1.5 [&>div]:gba:bg-foreground" />
              <p className="gba:text-[10px] gba:text-muted-foreground">
                {completedItems}/{totalItems} done
                {reusedItems > 0 ? ` • ${reusedItems} reused` : ''}
              </p>
            </>
          )}

          {tile.currentOperation && !isCompact && (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-[10px] gba:text-muted-foreground gba:line-clamp-1">
              <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin gba:shrink-0" />
              <span className="gba:truncate">{tile.currentOperation}</span>
            </div>
          )}

          {tile.status === 'skipped' && (
            <span className="gba:text-[10px] gba:text-muted-foreground gba:italic">Not needed for this build</span>
          )}
        </div>
      </div>
    </Card>
  )
}

export default BuildTile
