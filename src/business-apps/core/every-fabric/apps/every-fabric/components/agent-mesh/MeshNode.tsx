import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  BrainIcon,
  CompassIcon,
  LightbulbIcon,
  ShareNetworkIcon,
  SquaresFourIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import type { MeshNodeKind, MeshNodeStatus } from '../../utils/traceModel'

export interface MeshNodeData {
  label: string
  /** Optional category line shown below the label (e.g. "ORCHESTRATOR", "RESEARCH"). */
  category?: string
  kind: MeshNodeKind
  status: MeshNodeStatus
  /** Diameter of the circular badge in px — set per-kind by the layout. */
  size: number
  /** Selected via popover or external focus. */
  isSelected: boolean
  /** Currently active during the replay clock window. */
  isActive: boolean
  /** Ghosted because the replay clock hasn't reached it yet. */
  isUpcoming: boolean
  onSelect: () => void
}

function KindIcon({ kind, size }: { kind: MeshNodeKind; size: number }) {
  const className = 'gba:text-foreground/80'
  const style = { width: size * 0.42, height: size * 0.42 }
  switch (kind) {
    case 'orchestrator':
      return <SquaresFourIcon className={className} style={style} weight="bold" />
    case 'subagent':
      return <ShareNetworkIcon className={className} style={style} weight="bold" />
    case 'expert':
      return <BrainIcon className={className} style={style} weight="bold" />
    case 'skill':
      return <LightbulbIcon className={className} style={style} weight="bold" />
    case 'tool':
      return <WrenchIcon className={className} style={style} weight="bold" />
    default:
      return <CompassIcon className={className} style={style} weight="bold" />
  }
}

function ringClass(status: MeshNodeStatus, isSelected: boolean, isActive: boolean): string {
  if (isSelected) return 'gba:border-primary gba:ring-4 gba:ring-primary/15'
  if (status === 'failed') return 'gba:border-destructive/70 gba:ring-2 gba:ring-destructive/15'
  if (isActive) return 'gba:border-primary/70 gba:ring-2 gba:ring-primary/15'
  if (status === 'running') return 'gba:border-primary/60'
  return 'gba:border-border'
}

function tinyInitials(label: string): string {
  if (!label) return '·'
  const cleaned = label.replace(/[_\-:]+/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return cleaned.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const MeshNodeBase = ({ data }: NodeProps<MeshNodeData>) => {
  const { label, category, kind, status, size, isSelected, isActive, isUpcoming, onSelect } = data
  const isTool = kind === 'tool'
  const showInitialsOnly = isTool && size <= 44

  // CRITICAL — POSITIONING:
  // The React Flow wrapper around this component is `size × size` (just the
  // circle), centred on the layout coordinates via `nodeOrigin={[0.5, 0.5]}`
  // in MeshGraph. Edges target that wrapper centre.
  //
  // The label below the circle can be up to 140px wide — wider than the
  // circle (44–88px). If we let the button size to its widest child, the
  // button becomes wider than the wrapper and `items-center` centres the
  // circle within the BUTTON, which drifts horizontally relative to the
  // wrapper. Edges then visibly miss the circle.
  //
  // Solution: position the button absolutely so its horizontal centre is
  // locked to the wrapper's horizontal centre, and pin its top to the
  // wrapper's top. The circle is the first flex child, so it occupies the
  // wrapper exactly; label + category overflow below the wrapper visually,
  // which is fine — fitView padding accounts for it.
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`gba:group gba:absolute gba:left-1/2 gba:top-0 gba:flex gba:flex-col gba:items-center gba:-translate-x-1/2 gba:focus:outline-none ${isUpcoming ? 'gba:opacity-30' : ''}`}
      data-testid={`mesh-node-${kind}-${label}`}
      data-mesh-active={isActive ? 'true' : 'false'}
      data-mesh-selected={isSelected ? 'true' : 'false'}
    >
      <Handle type="target" position={Position.Top} className="gba:invisible" />
      <span
        className={`gba:relative gba:flex gba:items-center gba:justify-center gba:rounded-full gba:border-2 gba:bg-card gba:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-14px_rgba(15,23,42,0.18)] gba:transition-all gba:group-hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_14px_30px_-14px_rgba(15,23,42,0.22)] ${ringClass(status, isSelected, isActive)}`}
        style={{ width: size, height: size }}
      >
        {showInitialsOnly ? (
          <span className="gba:text-[10px] gba:font-semibold gba:tracking-wide gba:text-muted-foreground">
            {tinyInitials(label)}
          </span>
        ) : (
          <KindIcon kind={kind} size={size} />
        )}
        {status === 'running' && (
          <span
            className="gba:absolute gba:inset-0 gba:rounded-full gba:border-2 gba:border-primary/40 gba:animate-ping"
            aria-hidden
          />
        )}
      </span>
      <span
        className="gba:mt-2 gba:max-w-[140px] gba:truncate gba:text-center gba:text-[12px] gba:font-semibold gba:text-foreground"
        title={label}
      >
        {label}
      </span>
      {category && (
        <span className="gba:mt-0.5 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground">
          {category}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="gba:invisible" />
    </button>
  )
}

export const MeshNode = memo(MeshNodeBase)
MeshNode.displayName = 'MeshNode'
