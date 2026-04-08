import { CheckCircleIcon, CircleIcon, MinusCircleIcon, ShareNetworkIcon, XCircleIcon } from '@phosphor-icons/react'
import type { FabricTaskNode, FabricTaskStatus } from '../../types/fabric'
import { subAgentDelegationChipClass } from './fabricProgressShared'

// ─── Status icon ──────────────────────────────────────────────────────────────

const StatusIcon: React.FC<{ status: FabricTaskStatus; isLast?: boolean }> = ({ status }) => {
  switch (status) {
    case 'done':
      return <CheckCircleIcon className="gba:h-4 gba:w-4 gba:text-green-500 gba:shrink-0" weight="fill" />
    case 'failed':
      return <XCircleIcon className="gba:h-4 gba:w-4 gba:text-destructive gba:shrink-0" weight="fill" />
    case 'skipped':
      return <MinusCircleIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground/40 gba:shrink-0" weight="fill" />
    case 'active':
      return (
        <span className="gba:relative gba:flex gba:h-4 gba:w-4 gba:shrink-0 gba:items-center gba:justify-center">
          <span className="gba:animate-spin gba:h-4 gba:w-4 gba:rounded-full gba:border-2 gba:border-primary/20 gba:border-t-primary" />
        </span>
      )
    default:
      return <CircleIcon className="gba:h-4 gba:w-4 gba:text-border gba:shrink-0" weight="regular" />
  }
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  completed: number
  total: number
  percent: number
}

function taskTreeLabelClass(isDone: boolean, isActive: boolean): string {
  if (isDone) {
    return 'gba:text-muted-foreground gba:line-through gba:decoration-muted-foreground/40'
  }
  if (isActive) {
    return 'gba:text-foreground gba:font-medium'
  }
  return 'gba:text-foreground'
}

const ProgressBar: React.FC<ProgressBarProps> = ({ completed, total, percent }) => (
  <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border gba:shrink-0">
    <div className="gba:flex gba:items-center gba:justify-between gba:mb-1.5">
      <span className="gba:text-xs gba:font-medium gba:text-foreground">Plan</span>
      <span className="gba:text-xs gba:text-muted-foreground">
        {completed} / {total}
      </span>
    </div>
    <div className="gba:h-1 gba:w-full gba:rounded-full gba:bg-border gba:overflow-hidden">
      <div
        className="gba:h-full gba:rounded-full gba:bg-primary gba:transition-all gba:duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
)

// ─── Task row ─────────────────────────────────────────────────────────────────

const TaskRow: React.FC<{ node: FabricTaskNode; index: number }> = ({ node, index }) => {
  const isActive = node.status === 'active'
  const isDone = node.status === 'done'

  return (
    <div
      className={`gba:flex gba:flex-col gba:gap-1 gba:px-4 gba:py-2 gba:transition-colors ${
        isActive ? 'gba:bg-primary/[.03]' : ''
      }`}
      data-testid={`fabric-task-${node.id}`}
    >
      <div className="gba:flex gba:items-start gba:gap-2.5">
        {/* Connector line + icon */}
        <div className="gba:flex gba:flex-col gba:items-center gba:shrink-0 gba:mt-0.5">
          <StatusIcon status={node.status} />
        </div>

        {/* Content */}
        <div className="gba:flex-1 gba:min-w-0">
          <p className={`gba:text-xs gba:leading-snug gba:break-words ${taskTreeLabelClass(isDone, isActive)}`}>
            <span className="gba:text-muted-foreground/50 gba:mr-1 gba:tabular-nums">{index + 1}.</span>
            {node.label}
          </p>

          {/* Tool + duration */}
          {node.sublabel && (
            <p className="gba:text-[11px] gba:text-muted-foreground/60 gba:font-mono gba:mt-0.5">{node.sublabel}</p>
          )}

          {/* Sub-agents */}
          {node.subAgents.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1.5">
              {node.subAgents.map(sa => (
                <span
                  key={sa.id}
                  className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-medium ${subAgentDelegationChipClass(
                    sa.status
                  )}`}
                >
                  <ShareNetworkIcon className="gba:h-3 gba:w-3" weight="duotone" />
                  {sa.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TaskTreeProps {
  nodes: FabricTaskNode[]
  completedCount: number
  totalCount: number
  progressPercent: number
}

export const TaskTree: React.FC<TaskTreeProps> = ({ nodes, completedCount, totalCount, progressPercent }) => {
  if (nodes.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-1.5 gba:py-12">
        <p className="gba:text-xs gba:text-muted-foreground">No plan yet</p>
        <p className="gba:text-[11px] gba:text-muted-foreground/50">Steps will appear once the agent starts</p>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0" data-testid="fabric-task-tree">
      <ProgressBar completed={completedCount} total={totalCount} percent={progressPercent} />
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:py-1">
        {nodes.map((node, i) => (
          <TaskRow key={node.id} node={node} index={i} />
        ))}
      </div>
    </div>
  )
}
