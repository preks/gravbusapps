import React, { useCallback } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@newwork/nw-design-system'
import { Minus, Maximize, ZoomIn as ZoomInIcon, LayoutGrid } from 'lucide-react'

import type { DataCanvasProps } from './types/dataViewerTypes'
import { EntityNode } from './nodes/EntityNode'
import { InternalEntityNode } from './nodes/InternalEntityNode'
import { RelationshipEdge } from './edges/RelationshipEdge'
import { layoutDataGraphNodes } from './layout/dataViewerLayout'

const nodeTypes = {
  entity: EntityNode,
  internalEntity: InternalEntityNode
}

const edgeTypes = {
  relationship: RelationshipEdge
}

const proOptions = { hideAttribution: true }

const CanvasControls: React.FC<{
  testId: string
  onAutoLayout?: () => void
}> = ({ testId, onAutoLayout }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <div className="gba:flex gba:items-center gba:gap-1 gba:bg-background gba:border gba:border-border gba:rounded-lg gba:p-1 gba:shadow-sm">
      <Button variant="ghost" size="icon-sm" onClick={() => zoomIn()} data-testid={`${testId}-zoom-in`}>
        <ZoomInIcon className="gba:h-3.5 gba:w-3.5" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => zoomOut()} data-testid={`${testId}-zoom-out`}>
        <Minus className="gba:h-3.5 gba:w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => fitView({ padding: 0.3 })}
        data-testid={`${testId}-fit-view`}
      >
        <Maximize className="gba:h-3.5 gba:w-3.5" />
      </Button>
      {onAutoLayout && (
        <Button variant="ghost" size="icon-sm" onClick={onAutoLayout} data-testid={`${testId}-auto-layout`}>
          <LayoutGrid className="gba:h-3.5 gba:w-3.5" />
        </Button>
      )}
    </div>
  )
}

const DataCanvasInner: React.FC<DataCanvasProps> = ({
  nodes: inputNodes,
  edges: inputEdges,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  rightPanel,
  toolbar,
  emptyMessage,
  nodesDraggable = true,
  showMiniMap = true,
  showControls = true,
  onAutoLayout,
  'data-testid': testId = 'data-canvas'
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(inputNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(inputEdges)

  React.useEffect(() => {
    setNodes(inputNodes)
    setEdges(inputEdges)
  }, [inputNodes, inputEdges, setNodes, setEdges])

  const handleAutoLayout = useCallback(() => {
    if (onAutoLayout) {
      onAutoLayout()
      return
    }
    setNodes(prev => layoutDataGraphNodes(prev))
  }, [onAutoLayout, setNodes])

  return (
    <div className="gba:h-full gba:w-full" data-testid={testId}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.3, minZoom: 0.5, maxZoom: 1.2 }}
        proOptions={proOptions}
        nodesDraggable={nodesDraggable}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        defaultEdgeOptions={{ type: 'relationship' }}
        data-testid={`${testId}-flow`}
      >
        <Background gap={16} size={1} />

        {showMiniMap && (
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            nodeStrokeWidth={3}
            style={{
              marginBottom: 62,
              width: 200,
              height: 140,
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--background)'
            }}
          />
        )}

        {showControls && (
          <Panel position="bottom-left" style={{ zIndex: 100 }}>
            <CanvasControls testId={testId} onAutoLayout={handleAutoLayout} />
          </Panel>
        )}

        {toolbar && <Panel position="top-left">{toolbar}</Panel>}

        {rightPanel && (
          <Panel position="top-right" style={{ margin: 0, padding: 0, height: '100%' }}>
            {rightPanel}
          </Panel>
        )}

        {nodes.length === 0 && emptyMessage && <Panel position="top-center">{emptyMessage}</Panel>}
      </ReactFlow>
    </div>
  )
}

export const DataCanvas: React.FC<DataCanvasProps> = props => (
  <ReactFlowProvider>
    <DataCanvasInner {...props} />
  </ReactFlowProvider>
)
