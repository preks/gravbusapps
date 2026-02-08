/**
 * Relationship Edge Component for React Flow Graph
 *
 * Custom edge displaying the relationship type between linked cases
 * with color coding and optional labels.
 */

import React, { memo } from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow'
import { FolderTree, GitBranch, Link2 } from 'lucide-react'

/**
 * Relationship types for case connections
 */
export type CaseRelationship = 'parent' | 'child' | 'related'

/**
 * Data structure for relationship edge
 */
export interface RelationshipEdgeData {
  /** Type of relationship between cases */
  relationship: CaseRelationship
  /** Whether to show the relationship label */
  showLabel?: boolean
  /** Whether the edge is animated (for blocked relationships) */
  animated?: boolean
}

/**
 * Edge styling based on relationship type
 */
const RELATIONSHIP_STYLES: Record<CaseRelationship, { color: string; strokeWidth: number; label: string }> = {
  parent: {
    color: '#3b82f6', // blue-500
    strokeWidth: 2,
    label: 'Parent'
  },
  child: {
    color: '#3b82f6', // blue-500
    strokeWidth: 2,
    label: 'Child'
  },
  related: {
    color: '#9ca3af', // gray-400
    strokeWidth: 1.5,
    label: 'Related'
  }
}

/**
 * Get the appropriate icon for the relationship type
 */
const getRelationshipIcon = (relationship: CaseRelationship) => {
  switch (relationship) {
    case 'parent':
      return <FolderTree className="gba:h-3 gba:w-3" />
    case 'child':
      return <GitBranch className="gba:h-3 gba:w-3" />
    case 'related':
      return <Link2 className="gba:h-3 gba:w-3" />
  }
}

/**
 * Relationship Edge Component
 *
 * Renders a bezier curve edge with optional relationship label
 * showing the connection type between cases.
 */
const RelationshipEdgeComponent: React.FC<EdgeProps<RelationshipEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd
}) => {
  const relationship = data?.relationship || 'related'
  const showLabel = data?.showLabel ?? true
  const animated = data?.animated ?? false

  const style = RELATIONSHIP_STYLES[relationship]

  // Calculate the bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25
  })

  return (
    <>
      {/* Edge Path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: style.color,
          strokeWidth: style.strokeWidth,
          strokeDasharray: animated ? '5,5' : undefined
        }}
        className={animated ? 'gba:animate-pulse' : ''}
      />

      {/* Edge Label */}
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all'
            }}
            className="nodrag nopan"
          >
            <div
              className={`gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:shadow-sm gba:border gba:bg-background/95 gba:backdrop-blur-sm ${
                relationship === 'related'
                  ? 'gba:text-gray-600 gba:border-gray-300'
                  : 'gba:text-blue-600 gba:border-blue-300'
              }`}
              style={{
                borderColor: style.color,
                color: style.color
              }}
            >
              {getRelationshipIcon(relationship)}
              <span>{style.label}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

/**
 * Memoized export for better React Flow performance
 */
export const RelationshipEdge = memo(RelationshipEdgeComponent)
