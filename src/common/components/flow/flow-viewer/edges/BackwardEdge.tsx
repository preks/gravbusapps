import React from 'react'
import { BaseEdge, type EdgeProps, EdgeLabelRenderer, MarkerType } from 'reactflow'

/**
 * Dashed backward edge for rework / go-back loops.
 * Visually distinct from forward edges: dashed stroke, muted color, curved path.
 * Shows an optional label (e.g., "On Reject").
 */
export const BackwardEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  markerEnd
}) => {
  const label = data?.label as string | undefined
  const points: Array<{ x: number; y: number }> = data?.points

  let edgePath: string
  let labelX: number
  let labelY: number

  if (points && points.length >= 2) {
    // Pure ELK routing (do not adjust endpoints).
    edgePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    const mid = points[Math.floor(points.length / 2)]
    labelX = mid.x
    labelY = mid.y
  } else {
    // Fallback: deterministic loop routed to the left of the flow.
    // This avoids overlapping the main top-to-bottom forward lane.
    const SIDE_OFFSET = 120
    const leftX = Math.min(sourceX, targetX) - SIDE_OFFSET
    const pts = [
      { x: sourceX, y: sourceY },
      { x: leftX, y: sourceY },
      { x: leftX, y: targetY },
      { x: targetX, y: targetY }
    ]
    edgePath = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    labelX = leftX
    labelY = (sourceY + targetY) / 2
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: 1.5,
          stroke: 'hsl(215 16% 65%)',
          strokeDasharray: '6 4',
          ...style
        }}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="gba:absolute gba:bg-card gba:border gba:border-border gba:rounded gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground gba:font-medium gba:pointer-events-none gba:whitespace-nowrap"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

BackwardEdge.displayName = 'BackwardEdge'

/** Default marker for backward edges */
export const BACKWARD_MARKER = {
  type: MarkerType.ArrowClosed,
  color: 'hsl(215 16% 65%)'
}
