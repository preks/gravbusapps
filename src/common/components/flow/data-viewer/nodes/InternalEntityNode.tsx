import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Badge } from '@newwork/nw-design-system'
import { Globe } from 'lucide-react'
import type { DataInternalEntityNodeData } from '../types/dataViewerTypes'
import { humanizeDataViewerLabel } from '../humanizeDataViewerLabel'
import {
  DATA_VIEWER_INTERNAL_ENTITY_MAX_VISIBLE_FIELDS,
  DATA_VIEWER_INTERNAL_ENTITY_NODE_WIDTH_CLASS
} from '../layout/dataViewerLayout'

const HANDLE_STYLE: React.CSSProperties = { visibility: 'hidden', width: 8, height: 8 }

export const InternalEntityNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const { entityType, displayName, fields } = data as DataInternalEntityNodeData

  const borderClass = selected ? 'gba:border-secondary gba:shadow-md gba:scale-[1.02]' : 'gba:border-secondary/50'
  const visibleFields = fields.slice(0, DATA_VIEWER_INTERNAL_ENTITY_MAX_VISIBLE_FIELDS)
  const hiddenCount = fields.length - visibleFields.length

  return (
    <div
      className={`gba:rounded-lg gba:border-2 gba:shadow-sm ${DATA_VIEWER_INTERNAL_ENTITY_NODE_WIDTH_CLASS} gba:bg-secondary/5 gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:shadow-md ${borderClass}`}
      data-testid={`internal-entity-node-${entityType}`}
    >
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Left} id="left" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="right" style={HANDLE_STYLE} />

      <div className="gba:px-3 gba:py-2 gba:border-b gba:border-secondary/30 gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <Globe className="gba:h-3.5 gba:w-3.5 gba:text-secondary gba:shrink-0" />
          <span className="gba:font-semibold gba:text-xs gba:truncate gba:text-foreground">{displayName}</span>
        </div>
        <Badge variant="secondary" className="gba:text-[9px] gba:px-1 gba:py-0 gba:leading-tight gba:shrink-0">
          Internal
        </Badge>
      </div>

      <div className="gba:py-1">
        {visibleFields.map(field => (
          <div key={field.name} className="gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-0.5 gba:text-[11px]">
            <span className="gba:w-2.5 gba:shrink-0" />
            <span className="gba:text-foreground gba:truncate gba:flex-1">{field.displayName}</span>
            <span className="gba:text-muted-foreground gba:shrink-0">{humanizeDataViewerLabel(field.type)}</span>
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="gba:px-3 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground">+{hiddenCount} more</div>
        )}
      </div>
    </div>
  )
})

InternalEntityNode.displayName = 'InternalEntityNode'
