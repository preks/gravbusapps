import React, { useMemo } from 'react'
import { Button, Badge, Spinner, Progress } from '@newwork/nw-design-system'
import { CheckCircle2, XCircle, Ban, RefreshCw, Download } from 'lucide-react'
import type { UnstructuredSyncRunStatus } from '../../types/externalUnstructuredConnector'

export interface UnstructuredSyncProgressProps {
  status: UnstructuredSyncRunStatus
  totalDiscovered: number
  totalImported: number
  totalSkipped: number
  limit?: number
  estimatedTotal?: number
  lastMessage?: string | null
  error?: string | null
  startedAt?: string
  completedAt?: string
  onCancel: () => void
  onRetry: () => void
  onClose: () => void
  'data-testid'?: string
}

const statusConfig: Record<
  UnstructuredSyncRunStatus,
  { label: string; variant: 'info' | 'success' | 'destructive' | 'warning' | 'secondary' }
> = {
  queued: { label: 'Queued', variant: 'info' },
  running: { label: 'Importing...', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'warning' }
}

function computeProgress(
  status: UnstructuredSyncRunStatus,
  totalImported: number,
  limit?: number,
  estimatedTotal?: number
): { percent: number; targetLabel: string | null } {
  if (status === 'completed') return { percent: 100, targetLabel: null }
  if (status === 'queued') return { percent: 0, targetLabel: null }
  const target = limit && limit > 0 ? limit : estimatedTotal && estimatedTotal > 0 ? estimatedTotal : 0
  if (!target) return { percent: 0, targetLabel: null }
  const percent = Math.min(100, Math.round((totalImported / target) * 100))
  return { percent, targetLabel: target.toLocaleString() }
}

export const UnstructuredSyncProgress: React.FC<UnstructuredSyncProgressProps> = ({
  status,
  totalDiscovered,
  totalImported,
  totalSkipped,
  limit,
  estimatedTotal,
  lastMessage,
  error,
  startedAt,
  completedAt,
  onCancel,
  onRetry,
  onClose,
  'data-testid': testId = 'unstructured-sync-progress'
}) => {
  const config = statusConfig[status]
  const isActive = status === 'queued' || status === 'running'
  const isDone = status === 'completed'
  const isFailed = status === 'failed'

  const { percent, targetLabel } = useMemo(
    () => computeProgress(status, totalImported, limit, estimatedTotal),
    [status, totalImported, limit, estimatedTotal]
  )

  const progressLabel = targetLabel
    ? `${totalImported.toLocaleString()} / ${targetLabel} documents (${percent}%)`
    : `${totalImported.toLocaleString()} documents imported`

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          {isActive && <Spinner size="sm" />}
          {isDone && <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-success" />}
          {isFailed && <XCircle className="gba:w-4 gba:h-4 gba:text-destructive" />}
          {status === 'cancelled' && <Ban className="gba:w-4 gba:h-4 gba:text-warning" />}
          <span className="gba:text-sm gba:font-medium">{config.label}</span>
        </div>
        <Badge variant={config.variant} className="gba:text-xs">
          {status}
        </Badge>
      </div>

      <div className="gba:space-y-2" data-testid={`${testId}-bar`}>
        <Progress value={percent} className="gba:h-2" />
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-label`}>
            {progressLabel}
          </span>
          {isDone && <Download className="gba:w-3 gba:h-3 gba:text-success" />}
        </div>
      </div>

      {lastMessage && isActive && (
        <div className="gba:rounded gba:border gba:border-warning/50 gba:bg-warning-secondary gba:p-2">
          <p className="gba:text-xs gba:text-warning-foreground">{lastMessage}</p>
        </div>
      )}

      <div className="gba:rounded gba:border gba:p-3 gba:space-y-2">
        <div className="gba:flex gba:justify-between gba:text-xs">
          <span className="gba:text-muted-foreground">Items discovered</span>
          <span className="gba:font-medium">{totalDiscovered.toLocaleString()}</span>
        </div>
        <div className="gba:flex gba:justify-between gba:text-xs">
          <span className="gba:text-muted-foreground">Documents imported</span>
          <span className="gba:font-medium">{totalImported.toLocaleString()}</span>
        </div>
        <div className="gba:flex gba:justify-between gba:text-xs">
          <span className="gba:text-muted-foreground">Skipped (unchanged)</span>
          <span className="gba:font-medium">{totalSkipped.toLocaleString()}</span>
        </div>
        {startedAt && (
          <div className="gba:flex gba:justify-between gba:text-xs">
            <span className="gba:text-muted-foreground">Started</span>
            <span>{new Date(startedAt).toLocaleTimeString()}</span>
          </div>
        )}
        {completedAt && (
          <div className="gba:flex gba:justify-between gba:text-xs">
            <span className="gba:text-muted-foreground">Finished</span>
            <span>{new Date(completedAt).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="gba:rounded gba:border gba:border-destructive/50 gba:bg-destructive-secondary gba:p-3">
          <p className="gba:text-xs gba:text-destructive">{error}</p>
        </div>
      )}

      <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-2">
        {isActive && (
          <Button variant="outline" size="sm" onClick={onCancel} data-testid={`${testId}-cancel`}>
            <Ban className="gba:w-3 gba:h-3 gba:mr-1" /> Cancel
          </Button>
        )}
        {isFailed && (
          <Button variant="outline" size="sm" onClick={onRetry} data-testid={`${testId}-retry`}>
            <RefreshCw className="gba:w-3 gba:h-3 gba:mr-1" /> Retry
          </Button>
        )}
        {!isActive && (
          <Button size="sm" onClick={onClose} data-testid={`${testId}-close`}>
            Done
          </Button>
        )}
      </div>
    </div>
  )
}
