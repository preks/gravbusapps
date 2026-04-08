import type { FC } from 'react'
import { CheckCircle, ShareNetwork, SpinnerGap, XCircle } from '@phosphor-icons/react'
import type { FabricTaskNode, FabricTaskStatus } from '../../types/fabric'

export const STEP_STATUS_CLASSES: Record<FabricTaskStatus, string> = {
  done: 'gba:bg-green-100 gba:text-green-600 dark:gba:bg-green-900/30 dark:gba:text-green-400',
  active: 'gba:bg-primary gba:text-primary-foreground',
  failed: 'gba:bg-destructive/10 gba:text-destructive',
  skipped: 'gba:bg-muted gba:text-muted-foreground/40',
  pending: 'gba:bg-muted gba:text-muted-foreground/60'
}

export const progressStatusCaption = (status: FabricTaskStatus): string | null => {
  switch (status) {
    case 'active':
      return 'In progress'
    case 'pending':
      return 'Pending'
    case 'failed':
      return 'Failed'
    case 'skipped':
      return 'Skipped'
    default:
      return null
  }
}

export const progressLabelClass = (status: FabricTaskStatus): string => {
  if (status === 'done') {
    return 'gba:text-muted-foreground gba:line-through gba:decoration-muted-foreground/50'
  }
  if (status === 'active') {
    return 'gba:text-foreground gba:font-medium'
  }
  return 'gba:text-foreground/85'
}

interface FabricProgressTaskRowProps {
  node: FabricTaskNode
  index: number
  /** Tighter padding and hide sub-agent chips (e.g. streaming island) */
  compact?: boolean
  /** Prefix for data-testid to avoid duplicates when two lists mount (default fabric-task) */
  testIdPrefix?: string
}

export const FabricProgressTaskRow: FC<FabricProgressTaskRowProps> = ({
  node,
  index,
  compact,
  testIdPrefix = 'fabric-task'
}) => {
  const isActive = node.status === 'active'
  const isDone = node.status === 'done'
  const stepNumber = index + 1
  const caption = progressStatusCaption(node.status)
  const statusWord = isDone ? 'Done' : (caption ?? '')
  const labelClass = progressLabelClass(node.status)
  const py = compact ? 'gba:py-1.5' : 'gba:py-2'
  const px = compact ? 'gba:px-3' : 'gba:px-4'

  return (
    <div
      className={`gba:flex gba:items-start gba:gap-2 gba:rounded-lg gba:transition-colors ${px} ${py} ${
        isActive ? 'gba:bg-primary/5' : ''
      }`}
      data-testid={`${testIdPrefix}-${node.id}`}
      aria-label={`Step ${stepNumber}: ${node.label}. ${statusWord}`}
    >
      <div
        className={`gba:shrink-0 gba:flex gba:items-center gba:justify-center gba:h-6 gba:min-w-6 gba:rounded-full gba:text-[10px] gba:font-semibold gba:mt-0.5 gba:transition-all gba:px-0.5 ${
          STEP_STATUS_CLASSES[node.status]
        }`}
      >
        {isDone ? (
          <CheckCircle className="gba:h-3.5 gba:w-3.5" weight="fill" />
        ) : isActive ? (
          <SpinnerGap className="gba:h-3.5 gba:w-3.5 gba:animate-spin" weight="bold" />
        ) : node.status === 'failed' ? (
          <XCircle className="gba:h-3.5 gba:w-3.5" weight="fill" />
        ) : (
          <span>{stepNumber}</span>
        )}
      </div>

      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:flex-wrap gba:items-baseline gba:gap-x-2 gba:gap-y-0.5">
          <p className={`gba:text-[13px] gba:leading-snug gba:wrap-break-word ${labelClass}`}>{node.label}</p>
          {caption && (
            <span className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground/70">
              {caption}
            </span>
          )}
        </div>

        {node.sublabel && (
          <p className="gba:text-[11px] gba:text-muted-foreground/50 gba:font-mono gba:mt-0.5">{node.sublabel}</p>
        )}

        {!compact && node.subAgents.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1.5">
            {node.subAgents.map(sa => (
              <span
                key={sa.id}
                className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-medium ${
                  sa.status === 'running'
                    ? 'gba:bg-purple-100 gba:text-purple-700 dark:gba:bg-purple-900/30 dark:gba:text-purple-300'
                    : sa.status === 'failed'
                      ? 'gba:bg-destructive/10 gba:text-destructive'
                      : 'gba:bg-muted gba:text-muted-foreground'
                }`}
              >
                <ShareNetwork className="gba:h-3 gba:w-3" weight="duotone" />
                {sa.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
