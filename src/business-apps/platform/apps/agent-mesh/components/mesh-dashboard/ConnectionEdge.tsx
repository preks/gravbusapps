import { useMemo } from 'react'
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'

export interface ConnectionEdgeData {
  callCount?: number
  status?: string
  direction?: string
  isActive?: boolean
}

function resolveColor(cssVar: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  if (!raw) return fallback
  return `hsl(${raw})`
}

export const ConnectionEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd
}: EdgeProps<ConnectionEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })

  const { callCount, status, direction } = data || {}
  const isBidirectional = direction === 'bidirectional'
  const hasActivity = callCount !== undefined && callCount > 0
  const isActive = status === 'active'

  const activeColor = useMemo(() => resolveColor('--success', '#22c55e'), [])
  const inactiveColor = useMemo(() => resolveColor('--muted-foreground', '#64748b'), [])

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: isActive ? activeColor : inactiveColor,
          opacity: isActive ? 1 : 0.6
        }}
        data-testid={`connection-edge-${id}`}
      />
      {labelX !== undefined && labelY !== undefined && (
        <EdgeLabelRenderer>
          <div
            className="gba:absolute gba:pointer-events-none gba:flex gba:items-center gba:gap-1"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
            }}
          >
            {hasActivity && (
              <span
                className="gba:bg-card gba:border gba:border-border gba:rounded gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-foreground"
                data-testid={`connection-edge-${id}-count`}
              >
                {callCount}
              </span>
            )}
            {isBidirectional && (
              <span className="gba:bg-card gba:border gba:border-border gba:rounded gba:px-1 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground">
                ↔
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
