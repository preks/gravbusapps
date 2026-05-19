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
  /** Skill names loaded by this agent (shown as dots below the label). */
  skillNames: string[]
  /** True when the canvas is in hover-highlight mode and this node is NOT part of the highlighted set. */
  isDimmed: boolean
  /** True when this node is part of the hover-highlighted skill path. */
  isHighlighted: boolean
  onSelect: () => void
  onHoverStart?: () => void
  onHoverEnd?: () => void
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

const SKILL_DOT_COLORS = [
  'gba:bg-teal-500',
  'gba:bg-violet-500',
  'gba:bg-amber-500',
  'gba:bg-sky-500',
  'gba:bg-rose-500'
]
const MAX_VISIBLE_DOTS = 5

const MeshNodeBase = ({ data }: NodeProps<MeshNodeData>) => {
  const {
    label,
    category,
    kind,
    status,
    size,
    isSelected,
    isActive,
    isUpcoming,
    skillNames,
    isDimmed,
    isHighlighted,
    onSelect,
    onHoverStart,
    onHoverEnd
  } = data
  const isTool = kind === 'tool'
  const showInitialsOnly = isTool && size <= 44
  const isAgent = kind === 'orchestrator' || kind === 'subagent' || kind === 'expert'
  const showSkillDots = isAgent && skillNames.length > 0

  const stopPan = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={stopPan}
      onMouseDown={stopPan}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      className={`gba:group gba:absolute gba:left-1/2 gba:top-0 gba:flex gba:flex-col gba:items-center gba:-translate-x-1/2 gba:focus:outline-none gba:transition-opacity gba:duration-200 ${isUpcoming ? 'gba:opacity-30' : isDimmed ? 'gba:opacity-20' : ''} ${isHighlighted ? 'gba:drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]' : ''}`}
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
      {showSkillDots && (
        <span
          className="gba:mt-1.5 gba:flex gba:items-center gba:gap-1"
          aria-label={`${skillNames.length} skill${skillNames.length === 1 ? '' : 's'}`}
        >
          {skillNames.slice(0, MAX_VISIBLE_DOTS).map((name, i) => (
            <span
              key={name}
              title={name}
              className={`gba:inline-block gba:h-2 gba:w-2 gba:rounded-full ${SKILL_DOT_COLORS[i % SKILL_DOT_COLORS.length]}`}
            />
          ))}
          {skillNames.length > MAX_VISIBLE_DOTS && (
            <span
              className="gba:text-[9px] gba:font-medium gba:text-muted-foreground"
              title={skillNames.slice(MAX_VISIBLE_DOTS).join(', ')}
            >
              +{skillNames.length - MAX_VISIBLE_DOTS}
            </span>
          )}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="gba:invisible" />
    </button>
  )
}

export const MeshNode = memo(MeshNodeBase)
MeshNode.displayName = 'MeshNode'
