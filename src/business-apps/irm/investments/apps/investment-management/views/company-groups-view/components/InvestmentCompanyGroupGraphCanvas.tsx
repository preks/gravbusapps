import React, { useEffect } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Spinner } from '@newwork/nw-design-system'
import { InvestmentCompanyNode } from './InvestmentCompanyNode'
import { OwnershipEdge } from './OwnershipEdge'
import type { InvestmentCompanyGraphNode, InvestmentCompanyOwnershipEdge } from '../types/companyGroupGraphTypes'

const nodeTypes: NodeTypes = {
  investmentCompany: InvestmentCompanyNode
}

const edgeTypes: EdgeTypes = {
  ownership: OwnershipEdge
}

const proOptions = { hideAttribution: true }

interface InvestmentCompanyGroupGraphCanvasProps {
  nodes: InvestmentCompanyGraphNode[]
  edges: InvestmentCompanyOwnershipEdge[]
  loading?: boolean
}

const InvestmentCompanyGroupGraphCanvasInner: React.FC<InvestmentCompanyGroupGraphCanvasProps> = ({
  nodes: inputNodes,
  edges: inputEdges,
  loading = false
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(inputNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(inputEdges)
  const { fitView } = useReactFlow()

  useEffect(() => {
    setNodes(inputNodes)
    setEdges(inputEdges)
  }, [inputEdges, inputNodes, setEdges, setNodes])

  useEffect(() => {
    if (inputNodes.length === 0) return
    const fitTimer = globalThis.setTimeout(() => fitView({ padding: 0.25, maxZoom: 1 }), 100)
    return () => globalThis.clearTimeout(fitTimer)
  }, [fitView, inputNodes.length])

  if (loading) {
    return (
      <div
        className="gba:flex gba:h-full gba:items-center gba:justify-center"
        data-testid="company-group-graph-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div
      className="gba:h-full gba:min-h-96 gba:w-full gba:overflow-hidden gba:rounded-xl gba:bg-muted/30"
      data-testid="company-group-ownership-graph"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        proOptions={proOptions}
        nodesDraggable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        className="gba:bg-muted/30"
      >
        <Background gap={24} size={1} className="gba:opacity-70" />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export const InvestmentCompanyGroupGraphCanvas: React.FC<InvestmentCompanyGroupGraphCanvasProps> = props => (
  <ReactFlowProvider>
    <InvestmentCompanyGroupGraphCanvasInner {...props} />
  </ReactFlowProvider>
)
