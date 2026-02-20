import { useRef } from 'react'
import { ReactFlow, Controls, MiniMap, type Connection as RFConnection } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AgentNode } from './AgentNode'
import { useMeshEdgeSvgFix } from '../../hooks/useMeshEdgeSvgFix'

const nodeTypes = { agentNode: AgentNode }

interface MeshCanvasCardProps {
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: unknown
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    [key: string]: unknown
  }>
  onNodesChange: (changes: unknown[]) => void
  onEdgesChange: (changes: unknown[]) => void
  onConnect: (params: RFConnection) => void
  onNodeClick: (event: React.MouseEvent, node: { id: string }) => void
  onEdgeClick: (event: React.MouseEvent, edge: { id: string }) => void
  onPaneClick: () => void
  'data-testid'?: string
}

export const MeshCanvasCard: React.FC<MeshCanvasCardProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  'data-testid': testId = 'mesh-canvas'
}) => {
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null)

  useMeshEdgeSvgFix(reactFlowWrapperRef, [edges])

  return (
    <div ref={reactFlowWrapperRef} className="gba:absolute gba:inset-0" data-testid={`${testId}-wrapper`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.05}
        maxZoom={2}
        fitViewOptions={{ padding: 0.5, maxZoom: 1, minZoom: 0.05 }}
        connectOnClick={false}
        onlyRenderVisibleElements={false}
        proOptions={{ hideAttribution: true }}
        className="gba:w-full gba:h-full"
      >
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          style={{
            backgroundColor: 'var(--color-surface-primary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--border-radius-md)'
          }}
        />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          style={{
            backgroundColor: 'var(--color-surface-primary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--border-radius-md)'
          }}
        />
      </ReactFlow>
    </div>
  )
}
