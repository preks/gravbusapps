import type { Node, Edge } from '@xyflow/react'

export interface DataEntityColumn {
  name: string
  type: string
  label?: string
  required?: boolean
  dataSource?: { type: string; entity?: string; namespace?: string }
}

export interface DataEntityNodeData {
  entityName: string
  displayName?: string
  publishState?: string
  columns: DataEntityColumn[]
  isExternal?: boolean
  [key: string]: unknown
}

export interface DataInternalEntityField {
  name: string
  displayName: string
  type: string
}

export interface DataInternalEntitySchema {
  displayName: string
  fields: DataInternalEntityField[]
}

export interface DataInternalEntityNodeData {
  entityType: string
  displayName: string
  fields: DataInternalEntityField[]
  [key: string]: unknown
}

export interface DataRelationshipEdgeData {
  foreignKeyColumn: string
  displayLabel?: string
  relationshipType: string
  joinTableName?: string
  [key: string]: unknown
}

export type DataGraphNode = Node<DataEntityNodeData, 'entity'> | Node<DataInternalEntityNodeData, 'internalEntity'>

export type DataGraphEdge = Edge<DataRelationshipEdgeData>

export interface DataCanvasProps {
  nodes: DataGraphNode[]
  edges: DataGraphEdge[]
  onNodeClick?: (event: React.MouseEvent, node: Node) => void
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void
  onPaneClick?: () => void
  rightPanel?: React.ReactNode
  toolbar?: React.ReactNode
  emptyMessage?: React.ReactNode
  nodesDraggable?: boolean
  showMiniMap?: boolean
  showControls?: boolean
  onAutoLayout?: () => void
  'data-testid'?: string
}
