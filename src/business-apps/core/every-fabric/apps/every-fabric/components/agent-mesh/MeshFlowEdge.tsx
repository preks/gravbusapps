import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import {
  ChatTeardropTextIcon,
  HandshakeIcon,
  LightbulbIcon,
  TerminalWindowIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import type { MeshEdgeKind } from '../../utils/traceModel'

/** Centre + visual radius of a node, in absolute graph coordinates. */
export interface MeshEdgeEndpoint {
  x: number
  y: number
  radius: number
}

export interface MeshFlowEdgeData {
  kind: MeshEdgeKind
  /** Full message body (sub-task prompt, tool args summary, …). */
  label?: string
  /** True while the replay clock is hovering this edge's frame. */
  isActive: boolean
  /** True after the matching completion event arrived. */
  isResolved: boolean
  /** True when the closing event reported a failure. */
  isFailed: boolean
  /** True when the edge has a body worth opening in a modal. */
  hasDetail: boolean
  /** Show the clickable bubble at midpoint (driven by the Layers > Labels toggle). */
  showBubble: boolean
  /** Source node centre/radius — used to draw the line circle-edge to circle-edge. */
  sourceCenter: MeshEdgeEndpoint
  /** Target node centre/radius — used to draw the line circle-edge to circle-edge. */
  targetCenter: MeshEdgeEndpoint
  /**
   * 0-based index of this edge among all edges sharing the same node pair
   * (in either direction). Used to spread the message bubbles evenly along
   * the line so multiple tool calls / delegations don't stack on top of
   * each other.
   */
  bubbleIndex: number
  /** Total number of edges sharing the same node pair (>= 1). */
  bubbleTotal: number
  /** True when a hover-highlight is active and this edge is NOT part of the highlighted set. */
  isDimmed: boolean
  onSelect: () => void
}

/**
 * Pick stroke + dot colour via Tailwind utilities — `var(--primary)` in inline
 * SVG style does not resolve to the design-system token in this scope, so the
 * earlier inline-style approach produced an *invisible* line. Tailwind's
 * `stroke-*` / `text-*` classes correctly map to the gba theme variables.
 */
const strokeClass = (data: MeshFlowEdgeData): string => {
  if (data.isFailed) return 'gba:stroke-destructive'
  if (data.isActive) return 'gba:stroke-primary'
  if (data.isResolved) return 'gba:stroke-border'
  return 'gba:stroke-primary/70'
}

const dotColorClass = (data: MeshFlowEdgeData): string => {
  if (data.isFailed) return 'gba:fill-destructive'
  return 'gba:fill-primary'
}

function BubbleIcon({ kind }: { kind: MeshEdgeKind }) {
  const className = 'gba:h-3.5 gba:w-3.5 gba:text-primary'
  switch (kind) {
    case 'tool_call':
      return <WrenchIcon className={className} weight="bold" />
    case 'expert_call':
      return <TerminalWindowIcon className={className} weight="bold" />
    case 'skill_load':
      return <LightbulbIcon className={className} weight="bold" />
    case 'completion':
      return <HandshakeIcon className={className} weight="bold" />
    case 'delegation':
    default:
      return <ChatTeardropTextIcon className={className} weight="bold" />
  }
}

/** Fallback used if the edge somehow renders before its data is wired up. */
const FALLBACK_ENDPOINT: MeshEdgeEndpoint = { x: 0, y: 0, radius: 22 }

const MeshFlowEdgeBase = ({ id, data }: EdgeProps<MeshFlowEdgeData>) => {
  const safeData: MeshFlowEdgeData = data ?? {
    kind: 'delegation',
    isActive: false,
    isResolved: false,
    isFailed: false,
    hasDetail: false,
    showBubble: false,
    sourceCenter: FALLBACK_ENDPOINT,
    targetCenter: FALLBACK_ENDPOINT,
    bubbleIndex: 0,
    bubbleTotal: 1,
    isDimmed: false,
    onSelect: () => {}
  }

  // We compute the path *centre-to-centre*, then trim each end by the visual
  // radius of the corresponding circle. This bypasses React Flow's handle
  // system entirely — handles default to top/bottom, which produces ugly
  // slanted edges in a radial layout where a node may live to the left or
  // right of its parent. Drawing edge → circle perimeter looks like a clean
  // spoke between two badges regardless of where the node sits on the ring.
  const sx = safeData.sourceCenter.x
  const sy = safeData.sourceCenter.y
  const tx = safeData.targetCenter.x
  const ty = safeData.targetCenter.y
  const dx = tx - sx
  const dy = ty - sy
  const dist = Math.max(Math.hypot(dx, dy), 1)
  const ux = dx / dist
  const uy = dy / dist
  const sourceX = sx + ux * safeData.sourceCenter.radius
  const sourceY = sy + uy * safeData.sourceCenter.radius
  const targetX = tx - ux * safeData.targetCenter.radius
  const targetY = ty - uy * safeData.targetCenter.radius
  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
  // Bubble position is parametric along the centre-to-centre line so multiple
  // parallel edges (e.g. an agent calling the same tool 3 times) spread evenly
  // instead of stacking. For N=1 this reduces to the midpoint; for N=k the
  // bubbles land at t = 1/(k+1), 2/(k+1), …, k/(k+1).
  const total = Math.max(safeData.bubbleTotal, 1)
  const t = (safeData.bubbleIndex + 1) / (total + 1)
  const labelX = sx + (tx - sx) * t
  const labelY = sy + (ty - sy) * t

  const strokeWidth = safeData.isActive ? 2.25 : 1.5
  const baseOpacity = safeData.isResolved && !safeData.isActive ? 0.55 : 0.95
  const strokeOpacity = safeData.isDimmed ? 0.12 : baseOpacity

  // Dots animate only while edge is unresolved (session in progress)
  const showMovingDot = !safeData.isResolved && !safeData.isFailed
  const showBubble = safeData.showBubble && safeData.hasDetail

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={`${strokeClass(safeData)} gba:fill-none`}
        style={{ strokeWidth, opacity: strokeOpacity }}
      />
      {showMovingDot && (
        <circle r={3.5} className={dotColorClass(safeData)} opacity={0.9}>
          <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      )}
      {showBubble && (
        <EdgeLabelRenderer>
          {/*
           * IMPORTANT — hit area vs visible bubble:
           *
           * The <button> is the *click target* and stays a fixed 44×44 box
           * (28px visible bubble + 8px transparent padding on every side).
           * It NEVER transforms on hover, so the cursor never falls out of
           * the clickable region while you're trying to click it. The visible
           * bubble lives inside as a <span> and is the only thing that
           * scales — a smooth grow-in-place animation that gives a clear
           * affordance without moving the hit area.
           *
           * This pattern eliminates the previous "hover flicker" where the
           * scaling bubble repeatedly grew under the cursor, lost it, shrank
           * back, captured it again, etc.
           */}
          <button
            type="button"
            onClick={event => {
              event.stopPropagation()
              safeData.onSelect()
            }}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all'
            }}
            className="gba:group gba:flex gba:items-center gba:justify-center gba:p-2 gba:cursor-pointer gba:focus:outline-none gba:focus-visible:outline-2 gba:focus-visible:outline-primary/60 gba:focus-visible:rounded-full"
            data-testid={`mesh-edge-bubble-${id}`}
            aria-label="View message between agents"
            title="Click to view the full message"
          >
            <span
              className={`gba:relative gba:flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-full gba:border gba:bg-card gba:shadow-[0_2px_6px_rgba(15,23,42,0.12)] gba:transition-transform gba:duration-150 gba:ease-out gba:group-hover:scale-110 gba:group-active:scale-95 ${
                safeData.isFailed
                  ? 'gba:border-destructive/60'
                  : safeData.isActive
                    ? 'gba:border-primary'
                    : 'gba:border-primary/40'
              }`}
            >
              <BubbleIcon kind={safeData.kind} />
              {safeData.isActive && (
                <span
                  className="gba:absolute gba:inset-0 gba:rounded-full gba:border gba:border-primary/60 gba:animate-ping"
                  aria-hidden
                />
              )}
            </span>
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const MeshFlowEdge = memo(MeshFlowEdgeBase)
MeshFlowEdge.displayName = 'MeshFlowEdge'
