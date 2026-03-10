import React from 'react'
import { BaseEdge, type EdgeProps, EdgeLabelRenderer, MarkerType } from '@xyflow/react'
import { HANDLE_OFFSET } from '../nodes/nodeDimensions'
import { extendEdgePointsByHandleOffset } from './edgePathUtils'

const hasRenderablePoints = (
  pts: Array<{ x: number; y: number }> | undefined
): pts is Array<{ x: number; y: number }> => {
  return Boolean(pts && pts.length >= 2 && pts.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)))
}

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
  const isSelected = Boolean(data?.isSelected)
  const points: Array<{ x: number; y: number }> = data?.points
  const strokeDefault = 'hsl(215 16% 65%)'
  const strokeSelected = 'hsl(215 76% 56%)'
  // Keep markerEnd unchanged: BaseEdge passes it to SVG path; only url(#id) is valid there.
  // Switching to an object when selected would make the arrow disappear.

  let edgePath: string
  let labelX: number
  let labelY: number

  if (hasRenderablePoints(points)) {
    const adjustedPoints = extendEdgePointsByHandleOffset(points, HANDLE_OFFSET)
    edgePath = adjustedPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    const mid = adjustedPoints[Math.floor(adjustedPoints.length / 2)]
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
          strokeWidth: isSelected ? 2.5 : 1.5,
          stroke: isSelected ? strokeSelected : strokeDefault,
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

const STROKE_SELECTED = 'hsl(215 76% 56%)'

/** Default marker for backward edges */
export const BACKWARD_MARKER = {
  type: MarkerType.ArrowClosed,
  color: 'hsl(215 16% 65%)'
}

/** Marker for backward edges when selected (arrow matches stroke) */
export const BACKWARD_MARKER_SELECTED = {
  type: MarkerType.ArrowClosed,
  color: STROKE_SELECTED
}
