import { useMemo } from 'react'
import { MarkerType } from '@xyflow/react'
import type {
  DataEntityColumn,
  DataEntityNodeData,
  DataInternalEntitySchema,
  DataInternalEntityNodeData,
  DataGraphNode,
  DataGraphEdge
} from '../types/dataViewerTypes'
import { layoutDataGraphNodes } from '../layout/dataViewerLayout'

export interface DataGraphEntityInput {
  id: string
  namespace?: string
  key: string
  displayName?: string
  publishState?: string
  columns: DataEntityColumn[]
  isExternal?: boolean
}

export interface DataGraphOptions {
  /** Keys must match `INTERNAL_ENTITY` `dataSource.entity` (GET /entities `type`). */
  internalEntitiesByType?: Record<string, DataInternalEntitySchema>
}

interface DataGraphResult {
  nodes: DataGraphNode[]
  edges: DataGraphEdge[]
}

function extractInternalEntityRefs(entities: DataGraphEntityInput[]): string[] {
  const refs = new Set<string>()
  for (const entity of entities) {
    for (const col of entity.columns) {
      if (col.dataSource?.type === 'INTERNAL_ENTITY' && col.dataSource.entity) {
        refs.add(col.dataSource.entity)
      }
    }
  }
  return Array.from(refs)
}

function buildJoinTableLogicalKey(sourceKey: string, targetKey: string): string {
  const srcWords = sourceKey.split('_').filter(Boolean)
  const tgtWords = targetKey.split('_').filter(Boolean)
  let commonLen = 0
  while (commonLen < srcWords.length && commonLen < tgtWords.length && srcWords[commonLen] === tgtWords[commonLen]) {
    commonLen++
  }
  const stripped = tgtWords.slice(commonLen)
  if (stripped.length === 0) return `${sourceKey}_${targetKey}`
  return `${sourceKey}_${stripped.join('_')}`
}

function isMultiSelectType(colType: string): boolean {
  return colType.toUpperCase() === 'MULTISELECT'
}

function resolveEdgeDisplayLabel(column: DataEntityColumn, targetDisplayName?: string): string | undefined {
  const columnLabel = column.label?.trim()
  if (columnLabel) return columnLabel

  const resolvedTargetDisplayName = String(targetDisplayName || '').trim()
  if (resolvedTargetDisplayName) return resolvedTargetDisplayName

  const referencedEntity = String(column.dataSource?.entity || '').trim()
  return referencedEntity || undefined
}

function buildRelationshipEdges(entities: DataGraphEntityInput[]): DataGraphEdge[] {
  const edges: DataGraphEdge[] = []

  for (const entity of entities) {
    for (const col of entity.columns) {
      if (!col.dataSource) continue
      const isMulti = isMultiSelectType(col.type)

      if (col.dataSource.type === 'CUSTOM_ENTITY' && col.dataSource.entity) {
        const targetNamespace = String(col.dataSource.namespace || '').trim()
        const targetEntity = entities.find(entity => {
          if (entity.key !== col.dataSource?.entity) {
            return false
          }

          if (!targetNamespace) {
            return true
          }

          return String(entity.namespace || '').trim() === targetNamespace
        })
        if (targetEntity) {
          const relType = isMulti ? 'MANY_TO_MANY' : 'ONE_TO_MANY'
          const joinName = isMulti ? buildJoinTableLogicalKey(entity.key, targetEntity.key) : undefined
          const edgeDisplayLabel = resolveEdgeDisplayLabel(col, targetEntity.displayName)
          edges.push({
            id: `${entity.id}-${col.name}-${targetEntity.id}`,
            source: entity.id,
            target: targetEntity.id,
            type: 'relationship',
            markerStart: isMulti ? { type: MarkerType.ArrowClosed, width: 16, height: 16 } : undefined,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
            data: {
              foreignKeyColumn: col.name,
              displayLabel: edgeDisplayLabel,
              relationshipType: relType,
              joinTableName: joinName
            }
          })
        }
      }

      if (col.dataSource.type === 'INTERNAL_ENTITY' && col.dataSource.entity) {
        const targetId = `internal-${col.dataSource.entity}`
        const relType = isMulti ? 'MANY_TO_MANY' : 'INTERNAL_REF'
        const joinName = isMulti ? buildJoinTableLogicalKey(entity.key, col.dataSource.entity) : undefined
        const edgeDisplayLabel = resolveEdgeDisplayLabel(col, col.dataSource.entity)
        edges.push({
          id: `${entity.id}-${col.name}-${targetId}`,
          source: entity.id,
          target: targetId,
          type: 'relationship',
          markerStart: isMulti ? { type: MarkerType.ArrowClosed, width: 16, height: 16 } : undefined,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          data: {
            foreignKeyColumn: col.name,
            displayLabel: edgeDisplayLabel,
            relationshipType: relType,
            joinTableName: joinName
          }
        })
      }
    }
  }

  return edges
}

export function buildDataGraph(entities: DataGraphEntityInput[], options?: DataGraphOptions): DataGraphResult {
  const internalEntitiesByType = options?.internalEntitiesByType

  const entityNodes: DataGraphNode[] = entities.map<DataGraphNode>(entity => ({
    id: entity.id,
    type: 'entity' as const,
    position: { x: 0, y: 0 },
    data: {
      entityKey: entity.key,
      displayName: entity.displayName,
      publishState: entity.publishState,
      columns: entity.columns,
      isExternal: entity.isExternal
    } satisfies DataEntityNodeData
  }))

  const internalRefs = extractInternalEntityRefs(entities)
  const internalNodes: DataGraphNode[] = internalRefs.map<DataGraphNode>(entityType => {
    if (!internalEntitiesByType) {
      throw new Error('Missing internal entity schemas for graph rendering')
    }

    const internalEntitySchema = internalEntitiesByType[entityType]
    if (!internalEntitySchema) {
      throw new Error(`Missing internal entity schema for '${entityType}'`)
    }

    return {
      id: `internal-${entityType}`,
      type: 'internalEntity' as const,
      position: { x: 0, y: 0 },
      data: {
        entityType,
        displayName: internalEntitySchema.displayName,
        fields: internalEntitySchema.fields
      } satisfies DataInternalEntityNodeData
    }
  })

  const allNodes = layoutDataGraphNodes([...entityNodes, ...internalNodes])
  const edges = buildRelationshipEdges(entities)

  return { nodes: allNodes, edges }
}

export function useDataGraph(entities: DataGraphEntityInput[], options?: DataGraphOptions): DataGraphResult {
  return useMemo(() => buildDataGraph(entities, options), [entities, options?.internalEntitiesByType])
}
