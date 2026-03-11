import React from 'react'
import type { Connection as RFConnection } from '@xyflow/react'
import { MeshCanvasCard } from '@/business-apps/platform/apps/agent-mesh/components/mesh-dashboard/MeshCanvasCard'

const noop = () => {}

interface MeshPreviewCanvasProps {
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
  onNodesChange?: (changes: unknown[]) => void
  onEdgesChange?: (changes: unknown[]) => void
  onConnect?: (params: RFConnection) => void
  className?: string
  'data-testid'?: string
}

export const MeshPreviewCanvas: React.FC<MeshPreviewCanvasProps> = ({
  nodes,
  edges,
  onNodesChange = noop,
  onEdgesChange = noop,
  onConnect = noop,
  className,
  'data-testid': testId = 'mesh-preview-canvas'
}) => {
  return (
    <div className={`gba:relative gba:w-full gba:min-h-[320px] gba:flex-1 ${className ?? ''}`} data-testid={testId}>
      <MeshCanvasCard
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={noop}
        onEdgeClick={noop}
        onPaneClick={noop}
        data-testid={testId}
      />
    </div>
  )
}
