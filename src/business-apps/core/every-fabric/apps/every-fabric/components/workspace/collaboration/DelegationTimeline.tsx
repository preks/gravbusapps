import { CheckIcon, ShareNetworkIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react'
import type { DelegationNode, DelegationStatus } from '../../../types/delegation'

function statusChipClass(status: DelegationStatus): string {
  if (status === 'running') return 'gba:bg-sky-100 gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300'
  if (status === 'failed') return 'gba:bg-destructive/10 gba:text-destructive'
  return 'gba:bg-muted gba:text-muted-foreground'
}

function StatusGlyph({ status }: { status: DelegationStatus }) {
  if (status === 'running') return <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" />
  if (status === 'done') return <CheckIcon className="gba:h-3 gba:w-3" />
  return <XIcon className="gba:h-3 gba:w-3" />
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

interface TimelineRowProps {
  node: DelegationNode
  depth: number
}

const TimelineRow: React.FC<TimelineRowProps> = ({ node, depth }) => {
  if (node.kind === 'root') return null

  const indent = depth * 16

  return (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:px-3 gba:hover:bg-muted/20 gba:transition-colors"
      style={{ paddingLeft: `${12 + indent}px` }}
      data-testid={`delegation-timeline-${node.id}`}
    >
      {depth > 1 && (
        <span className="gba:text-border gba:text-[10px] gba:select-none" aria-hidden="true">
          └
        </span>
      )}
      <span
        className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${statusChipClass(node.status)}`}
      >
        <ShareNetworkIcon className="gba:h-3 gba:w-3" weight="duotone" />
        {truncate(node.name, 22)}
      </span>
      <span className="gba:flex-1 gba:truncate gba:text-[10px] gba:text-muted-foreground/70">
        {node.task !== node.name ? truncate(node.task, 40) : ''}
      </span>
      <span className="gba:flex gba:shrink-0 gba:items-center gba:gap-1">
        {node.durationMs !== null && (
          <span className="gba:text-[9px] gba:text-muted-foreground/60">{(node.durationMs / 1000).toFixed(1)}s</span>
        )}
        <StatusGlyph status={node.status} />
      </span>
    </div>
  )
}

interface DelegationTimelineProps {
  root: DelegationNode
}

function renderRows(node: DelegationNode, depth: number): React.ReactNode[] {
  const rows: React.ReactNode[] = []
  if (node.kind !== 'root') {
    rows.push(<TimelineRow key={node.id} node={node} depth={depth} />)
  }
  const childDepth = node.kind === 'root' ? 1 : depth + 1
  node.children.forEach(child => {
    rows.push(...renderRows(child, childDepth))
  })
  return rows
}

export const DelegationTimeline: React.FC<DelegationTimelineProps> = ({ root }) => {
  const rows = renderRows(root, 0)

  if (rows.length === 0) return null

  return (
    <div className="gba:py-1 gba:space-y-0.5" data-testid="delegation-timeline">
      {rows}
    </div>
  )
}
