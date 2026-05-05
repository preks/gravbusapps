import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Badge } from '@newwork/nw-design-system'
import { Database, Key, Link as LinkIcon } from 'lucide-react'
import type { DataEntityNodeData, DataEntityColumn } from '../types/dataViewerTypes'
import { humanizeDataViewerLabel } from '../humanizeDataViewerLabel'
import { DATA_VIEWER_ENTITY_MAX_VISIBLE_COLUMNS, DATA_VIEWER_ENTITY_NODE_WIDTH_CLASS } from '../layout/dataViewerLayout'

const HANDLE_STYLE: React.CSSProperties = { visibility: 'hidden', width: 8, height: 8 }

function isFK(col: DataEntityColumn): boolean {
  const ds = col.dataSource?.type
  return ds === 'CUSTOM_ENTITY' || ds === 'INTERNAL_ENTITY'
}

function columnDisplayLabel(column: DataEntityColumn): string {
  const configuredLabel = column.label?.trim()
  if (configuredLabel) return configuredLabel
  return humanizeDataViewerLabel(column.name) || column.name
}

function typeLabel(col: DataEntityColumn): string {
  if (isFK(col)) return humanizeDataViewerLabel(col.dataSource?.entity) || 'FK'
  return humanizeDataViewerLabel(col.type) || col.type.toLowerCase()
}

export const EntityNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const { displayName, entityKey, publishState, columns, isExternal } = data as DataEntityNodeData
  const visibleColumns = columns.slice(0, DATA_VIEWER_ENTITY_MAX_VISIBLE_COLUMNS)
  const hiddenCount = columns.length - visibleColumns.length

  const borderClass = selected
    ? 'gba:border-primary gba:shadow-md gba:scale-[1.02]'
    : isExternal
      ? 'gba:border-dashed gba:border-muted-foreground/40'
      : 'gba:border-border'

  const bgClass = isExternal ? 'gba:bg-muted/50' : 'gba:bg-card'

  return (
    <div
      className={`gba:rounded-lg gba:border-2 gba:shadow-sm ${DATA_VIEWER_ENTITY_NODE_WIDTH_CLASS} gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:shadow-md ${borderClass} ${bgClass}`}
      data-testid={`entity-node-${entityKey}`}
    >
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Left} id="left" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="right" style={HANDLE_STYLE} />

      <div className="gba:px-3 gba:py-2 gba:border-b gba:border-border gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <Database className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:shrink-0" />
          <span className="gba:font-semibold gba:text-xs gba:truncate gba:text-foreground">
            {displayName || humanizeDataViewerLabel(entityKey) || entityKey}
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
          {publishState && (
            <Badge
              variant={publishState === 'PROMOTED_TRACKED' ? 'success' : 'warning'}
              className="gba:text-[9px] gba:px-1 gba:py-0 gba:leading-tight"
            >
              {publishState === 'PROMOTED_TRACKED' ? 'Live' : 'Draft'}
            </Badge>
          )}
          {isExternal && (
            <Badge variant="secondary" className="gba:text-[9px] gba:px-1 gba:py-0 gba:leading-tight">
              Ext
            </Badge>
          )}
        </div>
      </div>

      <div className="gba:py-1">
        {visibleColumns.map(col => (
          <div key={col.name} className="gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-0.5 gba:text-[11px]">
            {col.name === 'id' ? (
              <Key className="gba:h-2.5 gba:w-2.5 gba:text-amber-500 gba:shrink-0" />
            ) : isFK(col) ? (
              <LinkIcon className="gba:h-2.5 gba:w-2.5 gba:text-blue-500 gba:shrink-0" />
            ) : (
              <span className="gba:w-2.5 gba:shrink-0" />
            )}
            <span className="gba:text-foreground gba:truncate gba:flex-1">{columnDisplayLabel(col)}</span>
            <span className="gba:text-muted-foreground gba:shrink-0">{typeLabel(col)}</span>
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="gba:px-3 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground">+{hiddenCount} more</div>
        )}
        {columns.length === 0 && (
          <div className="gba:px-3 gba:py-1 gba:text-[10px] gba:text-muted-foreground gba:italic">
            No columns defined
          </div>
        )}
      </div>
    </div>
  )
})

EntityNode.displayName = 'EntityNode'
