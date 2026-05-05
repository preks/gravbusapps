import { useMemo } from 'react'
import { MarkerType } from '@xyflow/react'
import {
  buildDataGraph,
  type DataGraphEntityInput,
  type DataEntityColumn,
  type DataInternalEntityField,
  type DataInternalEntitySchema,
  type DataGraphNode,
  type DataGraphEdge
} from '@/common/components/flow/data-viewer'
import type {
  CustomDataDefinition,
  InternalEntityDefinition,
  NamespaceAggregate,
  NamespaceEntityRelationship
} from '../types'

export type { DataInternalEntityField as InternalEntityField }
export type { DataGraphNode as EntityGraphNode }
export type { DataGraphEdge as EntityGraphEdge }

interface UseEntityGraphResult {
  nodes: DataGraphNode[]
  edges: DataGraphEdge[]
}

function toInternalEntityReferenceKey(entityType: string): string {
  return String(entityType).trim().toLowerCase()
}

function toDataGraphInput(def: CustomDataDefinition, isExternal: boolean): DataGraphEntityInput {
  return {
    id: def.id,
    namespace: def.namespace,
    key: def.key,
    displayName: def.display_name,
    publishState: def.publish_state,
    columns: (def.columns_json ?? []).map(col => ({
      name: col.name,
      type: col.type,
      label: col.label,
      required: col.required,
      dataSource: col.dataSource
        ? { type: col.dataSource.type, entity: col.dataSource.entity, namespace: col.dataSource.namespace }
        : undefined
    })),
    isExternal
  }
}

function toInternalEntitySchemaMap(
  internalEntities: InternalEntityDefinition[]
): Record<string, DataInternalEntitySchema> {
  return internalEntities.reduce<Record<string, DataInternalEntitySchema>>((schemaMap, entity) => {
    const entityReferenceKey = toInternalEntityReferenceKey(entity.type)
    const fields: DataInternalEntityField[] = (entity.fields ?? []).map(field => ({
      name: field.name,
      displayName: field.displayName,
      type: field.type
    }))

    schemaMap[entityReferenceKey] = {
      displayName: entity.displayName,
      fields
    }

    return schemaMap
  }, {})
}

function buildJoinTableLogicalKey(sourceKey: string, targetKey: string): string {
  const sourceWords = sourceKey.split('_').filter(Boolean)
  const targetWords = targetKey.split('_').filter(Boolean)
  let commonPrefixLength = 0

  while (
    commonPrefixLength < sourceWords.length &&
    commonPrefixLength < targetWords.length &&
    sourceWords[commonPrefixLength] === targetWords[commonPrefixLength]
  ) {
    commonPrefixLength += 1
  }

  const strippedTarget = targetWords.slice(commonPrefixLength)
  if (strippedTarget.length === 0) {
    return `${sourceKey}_${targetKey}`
  }

  return `${sourceKey}_${strippedTarget.join('_')}`
}

function resolveEdgeDisplayLabel(column: DataEntityColumn | undefined, targetDisplayName?: string): string | undefined {
  const columnLabel = String(column?.label || '').trim()
  if (columnLabel) {
    return columnLabel
  }

  const resolvedTargetDisplayName = String(targetDisplayName || '').trim()
  if (resolvedTargetDisplayName) {
    return resolvedTargetDisplayName
  }

  const referencedEntity = String(column?.dataSource?.entity || '').trim()
  return referencedEntity || undefined
}

function buildAggregateRelationshipEdges(
  graphEdges: DataGraphEdge[],
  relationships: NamespaceEntityRelationship[],
  entitiesByKey: Map<string, CustomDataDefinition>,
  internalEntitiesByType: Map<string, InternalEntityDefinition>,
  namespace: string
): DataGraphEdge[] {
  const entityIdByKey = new Map(Array.from(entitiesByKey.values()).map(entity => [entity.key, entity.id]))
  const graphEdgeById = new Map(graphEdges.map(edge => [edge.id, edge]))

  return relationships
    .map(relationship => {
      const sourceId = entityIdByKey.get(relationship.sourceEntity)
      const targetId =
        relationship.targetKind === 'INTERNAL_ENTITY'
          ? `internal-${relationship.targetEntity}`
          : relationship.targetNamespace && relationship.targetNamespace !== namespace
            ? undefined
            : entityIdByKey.get(relationship.targetEntity)

      if (!sourceId || !targetId) {
        return null
      }

      const expectedEdgeId = `${sourceId}-${relationship.fieldName}-${targetId}`
      const existingEdge = graphEdgeById.get(expectedEdgeId)
      if (existingEdge) {
        return existingEdge
      }

      const sourceEntity = entitiesByKey.get(relationship.sourceEntity)
      const sourceColumn = sourceEntity?.columns_json?.find(column => column.name === relationship.fieldName)
      const relationshipType =
        relationship.targetKind === 'INTERNAL_ENTITY'
          ? relationship.relationType === 'MANY_TO_MANY'
            ? 'MANY_TO_MANY'
            : 'INTERNAL_REF'
          : relationship.relationType
      const joinTableName =
        relationshipType === 'MANY_TO_MANY'
          ? buildJoinTableLogicalKey(relationship.sourceEntity, relationship.targetEntity)
          : undefined
      const targetDisplayName =
        relationship.targetKind === 'INTERNAL_ENTITY'
          ? internalEntitiesByType.get(relationship.targetEntity)?.displayName
          : entitiesByKey.get(relationship.targetEntity)?.display_name

      return {
        id: expectedEdgeId,
        source: sourceId,
        target: targetId,
        type: 'relationship',
        markerStart:
          relationshipType === 'MANY_TO_MANY' ? { type: MarkerType.ArrowClosed, width: 16, height: 16 } : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        data: {
          foreignKeyColumn: relationship.fieldName,
          displayLabel: resolveEdgeDisplayLabel(sourceColumn, targetDisplayName),
          relationshipType,
          joinTableName
        }
      } satisfies DataGraphEdge
    })
    .filter((edge): edge is DataGraphEdge => Boolean(edge))
}

export function useEntityGraph(namespaceAggregate: NamespaceAggregate | null): UseEntityGraphResult {
  return useMemo(() => {
    if (!namespaceAggregate) {
      return { nodes: [], edges: [] }
    }

    const entities = namespaceAggregate.customEntities.map(definition => toDataGraphInput(definition, false))
    const internalEntitiesByType = toInternalEntitySchemaMap(namespaceAggregate.internalEntities)
    const graph = buildDataGraph(entities, { internalEntitiesByType })
    const entitiesByKey = new Map(namespaceAggregate.customEntities.map(entity => [entity.key, entity]))
    const internalEntitiesByReferenceKey = new Map(
      namespaceAggregate.internalEntities.map(entity => [toInternalEntityReferenceKey(entity.type), entity])
    )
    const edges = buildAggregateRelationshipEdges(
      graph.edges,
      namespaceAggregate.entityRelationships,
      entitiesByKey,
      internalEntitiesByReferenceKey,
      namespaceAggregate.namespace
    )

    return {
      nodes: graph.nodes,
      edges
    }
  }, [namespaceAggregate])
}
