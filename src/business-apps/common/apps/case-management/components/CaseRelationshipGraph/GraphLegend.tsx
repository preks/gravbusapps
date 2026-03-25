/**
 * Graph Legend Component
 *
 * Displays a legend explaining the visual indicators in the case relationship graph:
 * - Status colors
 * - Relationship types
 * - Priority indicators
 */

import React from 'react'
import { FolderTree, Link2, AlertTriangle } from 'lucide-react'

/**
 * Status configuration for the legend
 */
const STATUS_LEGEND = [
  { label: 'Open', color: 'gba:bg-blue-400', textColor: 'gba:text-blue-700' },
  { label: 'In Progress', color: 'gba:bg-amber-400', textColor: 'gba:text-amber-700' },
  { label: 'Blocked', color: 'gba:bg-red-400', textColor: 'gba:text-red-700' },
  { label: 'Completed', color: 'gba:bg-green-400', textColor: 'gba:text-green-700' },
  { label: 'Cancelled', color: 'gba:bg-gray-400', textColor: 'gba:text-gray-700' }
]

/**
 * Relationship configuration for the legend
 */
const RELATIONSHIP_LEGEND = [
  {
    label: 'Parent/Child',
    icon: <FolderTree className="gba:h-3.5 gba:w-3.5" />,
    color: 'gba:text-blue-500',
    description: 'Hierarchical'
  },
  {
    label: 'Related',
    icon: <Link2 className="gba:h-3.5 gba:w-3.5" />,
    color: 'gba:text-gray-500',
    description: 'Peer connection'
  }
]

/**
 * Priority configuration for the legend
 */
const PRIORITY_LEGEND = [
  { label: 'Critical', color: 'gba:border-l-red-600' },
  { label: 'High', color: 'gba:border-l-orange-500' },
  { label: 'Medium', color: 'gba:border-l-blue-500' },
  { label: 'Low', color: 'gba:border-l-gray-400' }
]

export interface GraphLegendProps {
  /** Whether to show in compact mode */
  compact?: boolean
  /** Additional className */
  className?: string
}

/**
 * Graph Legend Component
 *
 * Renders a legend explaining the visual elements in the graph.
 */
export const GraphLegend: React.FC<GraphLegendProps> = ({ compact = false, className = '' }) => {
  if (compact) {
    return (
      <div
        className={`gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground gba:flex-wrap ${className}`}
      >
        {/* Status indicators - compact */}
        <span className="gba:font-medium gba:text-foreground">Status:</span>
        {STATUS_LEGEND.map(status => (
          <div key={status.label} className="gba:flex gba:items-center gba:gap-1.5">
            <div className={`gba:w-3 gba:h-3 gba:rounded ${status.color}`} />
            <span>{status.label}</span>
          </div>
        ))}

        {/* Divider */}
        <div className="gba:h-4 gba:w-px gba:bg-border gba:mx-1" />

        {/* Relationship indicators - compact */}
        <span className="gba:font-medium gba:text-foreground">Links:</span>
        {RELATIONSHIP_LEGEND.map(rel => (
          <div key={rel.label} className={`gba:flex gba:items-center gba:gap-1.5 ${rel.color}`}>
            {rel.icon}
            <span className="gba:text-muted-foreground">{rel.label}</span>
          </div>
        ))}

        {/* Divider */}
        <div className="gba:h-4 gba:w-px gba:bg-border gba:mx-1" />

        {/* Priority indicator */}
        <span className="gba:font-medium gba:text-foreground">Priority:</span>
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <AlertTriangle className="gba:h-3 gba:w-3 gba:text-red-500" />
          <span>High/Critical</span>
        </div>

        {/* Current case indicator */}
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <div className="gba:w-3 gba:h-3 gba:rounded gba:bg-primary gba:ring-2 gba:ring-primary/30" />
          <span>Current</span>
        </div>
      </div>
    )
  }

  // Full legend view
  return (
    <div className={`gba:p-4 gba:bg-background gba:rounded-lg gba:border gba:shadow-sm ${className}`}>
      <h4 className="gba:text-sm gba:font-semibold gba:mb-3 gba:text-foreground">Legend</h4>

      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-4">
        {/* Status Section */}
        <div>
          <h5 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:uppercase gba:tracking-wider">
            Status Colors
          </h5>
          <div className="gba:space-y-1.5">
            {STATUS_LEGEND.map(status => (
              <div key={status.label} className="gba:flex gba:items-center gba:gap-2">
                <div className={`gba:w-4 gba:h-4 gba:rounded gba:border-2 ${status.color}`} />
                <span className="gba:text-sm gba:text-foreground">{status.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Relationship Section */}
        <div>
          <h5 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:uppercase gba:tracking-wider">
            Relationships
          </h5>
          <div className="gba:space-y-1.5">
            {RELATIONSHIP_LEGEND.map(rel => (
              <div key={rel.label} className="gba:flex gba:items-center gba:gap-2">
                <div className={`gba:p-1 gba:rounded ${rel.color}`}>{rel.icon}</div>
                <div className="gba:flex gba:flex-col">
                  <span className="gba:text-sm gba:text-foreground">{rel.label}</span>
                  <span className="gba:text-xs gba:text-muted-foreground">{rel.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Section */}
        <div>
          <h5 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:uppercase gba:tracking-wider">
            Priority (Left Border)
          </h5>
          <div className="gba:space-y-1.5">
            {PRIORITY_LEGEND.map(priority => (
              <div key={priority.label} className="gba:flex gba:items-center gba:gap-2">
                <div className={`gba:w-4 gba:h-4 gba:rounded gba:bg-muted gba:border-l-4 ${priority.color}`} />
                <span className="gba:text-sm gba:text-foreground">{priority.label}</span>
              </div>
            ))}
          </div>

          {/* Special indicators */}
          <h5 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:mt-4 gba:uppercase gba:tracking-wider">
            Special
          </h5>
          <div className="gba:space-y-1.5">
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:w-4 gba:h-4 gba:rounded gba:bg-primary gba:ring-2 gba:ring-primary/30 gba:ring-offset-1" />
              <span className="gba:text-sm gba:text-foreground">Current Case</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <AlertTriangle className="gba:h-4 gba:w-4 gba:text-orange-500" />
              <span className="gba:text-sm gba:text-foreground">High/Critical Priority</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
