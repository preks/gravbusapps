import { useRef } from 'react'
import { ReactFlow, Background, Controls, MiniMap, type Connection as RFConnection } from '@xyflow/react'
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
        fitViewOptions={{ padding: 0.3 }}
        connectOnClick={false}
        onlyRenderVisibleElements={false}
        className="gba:w-full gba:h-full"
      >
        <Background color="var(--color-border-default)" gap={16} size={1} />
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

      {/* Connection legend */}
      <div
        className="gba:absolute gba:bottom-14 gba:left-2 gba:bg-card/90 gba:border gba:border-border gba:rounded gba:px-3 gba:py-2 gba:text-[10px] gba:text-muted-foreground gba:space-y-1 gba:z-10"
        data-testid="mesh-legend"
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          <svg width="30" height="10" viewBox="0 0 30 10">
            <line x1="0" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2" />
            <polygon points="22,1 30,5 22,9" fill="currentColor" />
          </svg>
          <span>One-way</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <svg width="30" height="10" viewBox="0 0 30 10">
            <polygon points="8,1 0,5 8,9" fill="currentColor" />
            <line x1="8" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2" />
            <polygon points="22,1 30,5 22,9" fill="currentColor" />
          </svg>
          <span>Bidirectional</span>
        </div>
      </div>
    </div>
  )
}
