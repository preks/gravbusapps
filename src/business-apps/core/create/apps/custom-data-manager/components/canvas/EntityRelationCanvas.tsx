import React, { useCallback, useMemo } from 'react'
import { type Node, type Edge } from '@xyflow/react'
import { Button } from '@newwork/nw-design-system'
import { Plus, Rocket } from 'lucide-react'

import {
  DataCanvas,
  type DataInternalEntityNodeData,
  type DataRelationshipEdgeData
} from '@/common/components/flow/data-viewer'
import type { CustomDataDefinition, NamespaceAggregate } from '../../types'
import { useEntityGraph } from '../../hooks/useEntityGraph'
import type { SelectedRelationshipData } from '../RelationshipInfoPanel'

interface EntityRelationCanvasProps {
  definitions: CustomDataDefinition[]
  namespaceAggregate: NamespaceAggregate | null
  selectedEntity?: CustomDataDefinition | null
  onSelectEntity: (definition: CustomDataDefinition | null) => void
  onSelectInternalEntity?: (data: DataInternalEntityNodeData) => void
  onSelectRelationship?: (data: SelectedRelationshipData) => void
  onAddEntity: () => void
  onPromoteNamespace?: () => void
  rightPanel?: React.ReactNode
  'data-testid'?: string
}

export const EntityRelationCanvas: React.FC<EntityRelationCanvasProps> = ({
  definitions,
  namespaceAggregate,
  onSelectEntity,
  onSelectInternalEntity,
  onSelectRelationship,
  onAddEntity,
  onPromoteNamespace,
  rightPanel,
  'data-testid': testId = 'entity-relation-canvas'
}) => {
  const { nodes, edges } = useEntityGraph(namespaceAggregate)

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'entity') {
        const def = definitions.find(d => d.id === node.id)
        if (def) onSelectEntity(def)
      } else if (node.type === 'internalEntity') {
        onSelectInternalEntity?.(node.data as DataInternalEntityNodeData)
      }
    },
    [definitions, onSelectEntity, onSelectInternalEntity]
  )

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const edgeData = edge.data as DataRelationshipEdgeData | undefined
      if (!edgeData || !onSelectRelationship) {
        const def = definitions.find(d => d.id === edge.source)
        if (def) onSelectEntity(def)
        return
      }

      const sourceDef = definitions.find(d => d.id === edge.source)
      const targetDef = definitions.find(d => d.id === edge.target)
      const targetId = edge.target
      const isInternal = targetId.startsWith('internal-')
      const targetKey = isInternal ? targetId.replace('internal-', '') : (targetDef?.entityName ?? targetId)
      const targetDisplayName = isInternal ? targetKey : targetDef?.displayName

      onSelectRelationship({
        sourceEntityKey: sourceDef?.entityName ?? edge.source,
        sourceEntityDisplayName: sourceDef?.displayName,
        targetEntityKey: targetKey,
        targetEntityDisplayName: targetDisplayName,
        foreignKeyColumn: edgeData.foreignKeyColumn,
        relationshipType: edgeData.relationshipType,
        joinTableName: edgeData.joinTableName
      })
    },
    [definitions, onSelectEntity, onSelectRelationship]
  )

  const handlePaneClick = useCallback(() => {
    onSelectEntity(null)
  }, [onSelectEntity])

  const toolbar = useMemo(
    () => (
      <div className="gba:flex gba:items-center gba:gap-2">
        <Button variant="outline" size="sm" onClick={onAddEntity} data-testid={`${testId}-add-entity`}>
          <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
          Add Entity
        </Button>
        {onPromoteNamespace && definitions.length > 0 && (
          <Button variant="outline" size="sm" onClick={onPromoteNamespace} data-testid={`${testId}-promote-namespace`}>
            <Rocket className="gba:h-4 gba:w-4 gba:mr-1" />
            Promote Namespace
          </Button>
        )}
      </div>
    ),
    [definitions.length, onAddEntity, onPromoteNamespace, testId]
  )

  const emptyMessage = useMemo(
    () => (
      <div className="gba:text-center gba:py-12">
        <p className="gba:text-muted-foreground gba:text-sm gba:mb-2">No entities in this namespace yet.</p>
        <p className="gba:text-muted-foreground gba:text-xs">
          Use the chat panel to generate entities with AI, or add one manually.
        </p>
      </div>
    ),
    []
  )

  return (
    <DataCanvas
      nodes={nodes}
      edges={edges}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      onPaneClick={handlePaneClick}
      rightPanel={rightPanel}
      toolbar={toolbar}
      emptyMessage={emptyMessage}
      data-testid={testId}
    />
  )
}
