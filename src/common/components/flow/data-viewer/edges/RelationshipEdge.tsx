import React from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { DataRelationshipEdgeData } from '../types/dataViewerTypes'
import { resolveCssColor } from '../../flow-viewer/utils/themeColors'

const EDGE_COLOR = () => resolveCssColor('gba:text-muted-foreground', 'color') ?? '#94a3b8'
const EDGE_COLOR_SELECTED = () => resolveCssColor('gba:text-primary', 'color') ?? '#6366f1'

export const RelationshipEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
  markerStart
}) => {
  const { foreignKeyColumn, displayLabel, relationshipType, joinTableName } = (data ?? {}) as DataRelationshipEdgeData
  const isInternal = relationshipType === 'INTERNAL_REF'
  const isManyToMany = relationshipType === 'MANY_TO_MANY'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8
  })

  const strokeColor = selected ? EDGE_COLOR_SELECTED() : EDGE_COLOR()
  const labelText = displayLabel || (isManyToMany && joinTableName ? joinTableName : foreignKeyColumn)

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: isInternal ? '6 3' : isManyToMany ? '4 2' : undefined
        }}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            className={`gba:absolute gba:bg-background gba:border gba:rounded gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:shadow-sm gba:cursor-pointer ${
              isManyToMany
                ? 'gba:border-primary/40 gba:text-primary gba:font-medium'
                : 'gba:border-border gba:text-muted-foreground'
            }`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`
            }}
          >
            {isManyToMany && <span className="gba:mr-1 gba:opacity-60">M:N</span>}
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
