import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { MeshNodeKind, MeshNodeStatus } from '../../utils/traceModel'
import { MeshNodeCardContent } from './MeshNodeCard'

export interface MeshNodeData extends Record<string, unknown> {
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
  liveCount: number
  activityHeat: number
  onSelect: () => void
  onHoverStart?: () => void
  onHoverEnd?: () => void
}

/** React Flow node type for {@link MeshNode} (v12 `NodeProps` requires a full `Node`, not data alone). */
export type MeshFlowNode = Node<MeshNodeData, 'meshNode'>

const MeshNodeBase = ({ data }: NodeProps<MeshFlowNode>) => {
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
    liveCount,
    activityHeat,
    onSelect,
    onHoverStart,
    onHoverEnd
  } = data

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
      <MeshNodeCardContent
        kind={kind}
        label={label}
        category={category}
        status={status}
        size={size}
        isSelected={isSelected}
        isActive={isActive}
        skillNames={skillNames}
        liveCount={liveCount}
        activityHeat={activityHeat}
        badgeClassName="gba:relative gba:flex gba:items-center gba:justify-center gba:rounded-full gba:border-2 gba:bg-card gba:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-14px_rgba(15,23,42,0.18)] gba:transition-all gba:group-hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_14px_30px_-14px_rgba(15,23,42,0.22)]"
        badgeStyle={{ width: size, height: size }}
        ringSurface="flow"
      />
      <Handle type="source" position={Position.Bottom} className="gba:invisible" />
    </button>
  )
}

export const MeshNode = memo(MeshNodeBase)
MeshNode.displayName = 'MeshNode'
