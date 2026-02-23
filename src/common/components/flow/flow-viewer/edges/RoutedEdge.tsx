import React, { useCallback, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, MarkerType, getStraightPath } from 'reactflow'
import { GitBranch, Plus, SplitSquareHorizontal, UserCheck } from 'lucide-react'
import { HANDLE_OFFSET } from '../nodes/nodeDimensions'
import { extendEdgePointsByHandleOffset } from './edgePathUtils'

/* ─── helpers ──────────────────────────────────────────────────────── */

const midpointOfPolyline = (pts: Array<{ x: number; y: number }>): { x: number; y: number } => {
  if (pts.length === 0) return { x: 0, y: 0 }
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y }

  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
  }
  const half = total / 2

  let acc = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (acc + seg >= half) {
      const t = seg === 0 ? 0 : (half - acc) / seg
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    acc += seg
  }

  return pts[pts.length - 1]
}

/* ─── insertable node types ───────────────────────────────────────── */

type InsertableType = 'task' | 'decision' | 'fork'

const INSERT_OPTIONS: Array<{ type: InsertableType; label: string; Icon: React.FC<{ className?: string }> }> = [
  { type: 'task', label: 'Task', Icon: UserCheck },
  { type: 'decision', label: 'Decision', Icon: GitBranch },
  { type: 'fork', label: 'Parallelize tasks', Icon: SplitSquareHorizontal }
]

/* ─── edge component ──────────────────────────────────────────────── */

export const RoutedEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, data, style, markerEnd }) => {
  const points: Array<{ x: number; y: number }> = data?.points
  const edgeLabel = data?.label as string | undefined
  const onInsert = data?.onInsert as ((type: InsertableType) => void) | undefined
  const onSelect = data?.onSelect as (() => void) | undefined
  const onOpenInsertPanel = data?.onOpenInsertPanel as (() => void) | undefined
  const isSelected = Boolean(data?.isSelected)

  // Resolve stroke colors from CSS custom properties with solid fallbacks.
  // The design system uses HSL tokens, so we read the computed value at runtime.
  const strokeDefault = 'hsl(215 16% 75%)'
  const strokeSelected = 'hsl(215 76% 56%)'
  // Keep markerEnd unchanged: BaseEdge passes it to SVG path; only url(#id) is valid there.
  // Switching to an object when selected would make the arrow disappear.

  const [menuOpen, setMenuOpen] = useState(false)

  const handlePlusClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      if (onOpenInsertPanel) {
        onOpenInsertPanel()
        return
      }
      onSelect?.()
      if (onInsert) setMenuOpen(prev => !prev)
    },
    [onInsert, onOpenInsertPanel, onSelect]
  )

  const stopPropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation()
  }, [])

  const handlePlusPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.stopPropagation()
      // Prefer opening the Studio's "Add step" panel as early as possible,
      // so ReactFlow can't treat the interaction as an edge click.
      if (onOpenInsertPanel) onOpenInsertPanel()
    },
    [onOpenInsertPanel]
  )

  const handleInsert = useCallback(
    (type: InsertableType, event: React.MouseEvent) => {
      event.stopPropagation()
      setMenuOpen(false)
      onInsert?.(type)
    },
    [onInsert]
  )

  const renderEdgeLabel = (x: number, y: number) => {
    if (!edgeLabel) return null
    return (
      <EdgeLabelRenderer>
        <div
          className="gba:absolute gba:pointer-events-none"
          style={{ transform: `translate(-50%, -100%) translate(${x}px,${y - 18}px)` }}
        >
          <span className="gba:rounded gba:bg-card gba:border gba:border-border gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:whitespace-nowrap">
            {edgeLabel}
          </span>
        </div>
      </EdgeLabelRenderer>
    )
  }

  const renderEdgeAction = (x: number, y: number) => {
    // Only show the "+" control when an insertion action exists.
    // (Backward/rework edges should be selectable by clicking the edge line.)
    if (!onInsert && !onOpenInsertPanel) return null

    return (
      <EdgeLabelRenderer>
        <div
          className="gba:absolute gba:pointer-events-all"
          style={{ transform: `translate(-50%, -50%) translate(${x}px,${y}px)` }}
        >
          {/* Plus button */}
          <button
            type="button"
            className={[
              'gba:w-7 gba:h-7 gba:rounded-full gba:border gba:flex gba:items-center gba:justify-center gba:bg-card gba:transition-all gba:cursor-pointer',
              menuOpen
                ? 'gba:border-primary gba:text-primary gba:ring-2 gba:ring-primary/30'
                : isSelected
                  ? 'gba:border-primary gba:text-primary'
                  : 'gba:border-border gba:text-muted-foreground gba:hover:border-primary gba:hover:text-primary gba:hover:scale-110'
            ].join(' ')}
            onClick={handlePlusClick}
            onMouseDown={stopPropagation}
            onPointerDown={handlePlusPointerDown}
            data-testid={`flow-studio-edge-add-${id}`}
          >
            <Plus className="gba:h-4 gba:w-4" />
          </button>

          {/* Type picker menu */}
          {menuOpen && (
            <div
              className="gba:absolute gba:left-1/2 gba:top-full gba:mt-2 gba:-translate-x-1/2 gba:w-96 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-2 gba:shadow-lg"
              data-testid={`flow-studio-edge-menu-${id}`}
            >
              <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                {INSERT_OPTIONS.map(({ type, label, Icon }) => (
                  <button
                    key={type}
                    type="button"
                    className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-1 gba:rounded-md gba:px-4 gba:py-3 gba:text-muted-foreground gba:hover:bg-accent gba:hover:text-accent-foreground gba:transition-colors gba:cursor-pointer"
                    onClick={event => handleInsert(type, event)}
                    data-testid={`flow-studio-edge-insert-${type}-${id}`}
                  >
                    <Icon className="gba:h-6 gba:w-6" />
                    <span className="gba:text-[11px] gba:font-semibold gba:leading-tight gba:text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    )
  }

  // If ELK provided routed points, build an SVG path from them
  if (points && points.length >= 2) {
    const adjustedPoints = extendEdgePointsByHandleOffset(points, HANDLE_OFFSET)
    const edgePath = adjustedPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    const mid = midpointOfPolyline(adjustedPoints)
    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            strokeWidth: isSelected ? 2.5 : 2,
            stroke: isSelected ? strokeSelected : strokeDefault,
            ...style
          }}
          markerEnd={markerEnd}
        />
        {renderEdgeLabel(mid.x, mid.y)}
        {renderEdgeAction(mid.x, mid.y)}
      </>
    )
  }

  // Fallback: straight path
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY })

  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: isSelected ? 2.5 : 2,
          stroke: isSelected ? strokeSelected : strokeDefault,
          ...style
        }}
        markerEnd={markerEnd}
      />
      {renderEdgeLabel(midX, midY)}
      {renderEdgeAction(midX, midY)}
    </>
  )
}

RoutedEdge.displayName = 'RoutedEdge'

const STROKE_SELECTED = 'hsl(215 76% 56%)'

/** Default marker for forward edges */
export const FORWARD_MARKER = {
  type: MarkerType.ArrowClosed,
  color: 'hsl(215 16% 75%)'
}

/** Marker for forward edges when selected (arrow matches stroke) */
export const FORWARD_MARKER_SELECTED = {
  type: MarkerType.ArrowClosed,
  color: STROKE_SELECTED
}
