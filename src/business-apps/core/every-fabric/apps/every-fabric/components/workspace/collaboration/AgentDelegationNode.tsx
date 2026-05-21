import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CheckIcon, ShareNetworkIcon, SpinnerGapIcon, WrenchIcon, XIcon } from '@phosphor-icons/react'
import type { DelegationKind, DelegationStatus } from '../../../types/delegation'

export interface AgentDelegationNodeData {
  name: string
  task: string
  status: DelegationStatus
  kind: DelegationKind
  durationMs: number | null
  toolCount: number
}

const NODE_WIDTH = 160

function StatusIcon({ status }: { status: DelegationStatus }) {
  if (status === 'running') {
    return <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-sky-600" weight="bold" />
  }
  if (status === 'done') {
    return <CheckIcon className="gba:h-3 gba:w-3 gba:text-green-500" weight="bold" />
  }
  return <XIcon className="gba:h-3 gba:w-3 gba:text-destructive" weight="bold" />
}

function kindBorderClass(kind: DelegationKind, status: DelegationStatus): string {
  if (status === 'running') return 'gba:border-sky-300 dark:gba:border-sky-700'
  if (status === 'failed') return 'gba:border-destructive/40'
  if (kind === 'root') return 'gba:border-primary/40'
  return 'gba:border-border'
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const AgentDelegationNodeBase = ({ data }: NodeProps<AgentDelegationNodeData>) => {
  const { name, task, status, kind, durationMs, toolCount } = data
  const isRoot = kind === 'root'

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={`gba:rounded-lg gba:border gba:bg-card gba:shadow-sm gba:transition-shadow gba:hover:shadow-md ${kindBorderClass(kind, status)}`}
      data-testid={`delegation-node-${name}`}
    >
      <Handle type="target" position={Position.Top} className="gba:invisible" />

      <div className="gba:px-2.5 gba:py-2">
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <span
            className={`gba:flex gba:h-5 gba:w-5 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full ${
              isRoot
                ? 'gba:bg-primary/10 gba:text-primary'
                : 'gba:bg-sky-100 gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300'
            }`}
          >
            <ShareNetworkIcon className="gba:h-2.5 gba:w-2.5" weight={isRoot ? 'fill' : 'regular'} />
          </span>
          <span className="gba:flex-1 gba:truncate gba:text-[11px] gba:font-semibold gba:text-foreground">
            {truncate(name, 20)}
          </span>
          <StatusIcon status={status} />
        </div>

        {task && task !== name && (
          <p className="gba:mt-1 gba:text-[10px] gba:leading-tight gba:text-muted-foreground gba:line-clamp-2">
            {truncate(task, 60)}
          </p>
        )}

        <div className="gba:mt-1.5 gba:flex gba:items-center gba:gap-2 gba:text-[9px] gba:text-muted-foreground/70">
          {durationMs !== null && <span>{(durationMs / 1000).toFixed(1)}s</span>}
          {toolCount > 0 && (
            <span className="gba:inline-flex gba:items-center gba:gap-0.5">
              <WrenchIcon className="gba:h-2.5 gba:w-2.5" />
              {toolCount}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="gba:invisible" />
    </div>
  )
}

export const AgentDelegationNode = memo(AgentDelegationNodeBase)
AgentDelegationNode.displayName = 'AgentDelegationNode'
