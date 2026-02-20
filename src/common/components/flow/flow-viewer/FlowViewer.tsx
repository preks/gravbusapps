import React, { useMemo, useEffect, useState, useRef } from 'react'
import ReactFlow, {
  type Node,
  type Edge,
  type ReactFlowInstance,
  Controls,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  ConnectionMode
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useFlowCanvasContext } from './FlowViewerProvider'
import { StartNode } from './nodes/StartNode'
import { TaskNode } from './nodes/TaskNode'
import { DecisionNode } from './nodes/DecisionNode'
import { ForkNode } from './nodes/ForkNode'
import { JoinNode } from './nodes/JoinNode'
import { EndNode } from './nodes/EndNode'
import { RoutedEdge, FORWARD_MARKER } from './edges/RoutedEdge'
import { BackwardEdge, BACKWARD_MARKER } from './edges/BackwardEdge'
import { computeLayout } from './layout/elkLayout'
import { resolveFlowCanvasThemeColors, DEFAULT_FLOW_CANVAS_THEME_COLORS } from './utils/themeColors'
import type {
  FlowCanvasViewProps,
  FlowGraphNode,
  FlowGraphEdge,
  StepStatus,
  FlowCanvasThemeColors
} from './types/viewerTypes'

// ---- Node type registry (memoized outside component) ----

const NODE_TYPES = {
  start: StartNode,
  task: TaskNode,
  decision: DecisionNode,
  fork: ForkNode,
  join: JoinNode,
  end: EndNode
} as const

const EDGE_TYPES = {
  routed: RoutedEdge,
  backward: BackwardEdge
} as const

// ---- Conversion helpers ----

function getNodeDimensions(type: string): { width: number; height: number } {
  switch (type) {
    case 'start':
    case 'end':
      return { width: 140, height: 140 }
    case 'decision':
      return { width: 120, height: 120 }
    case 'fork':
    case 'join':
      return { width: 200, height: 40 }
    default:
      return { width: 260, height: 100 }
  }
}

function buildNodeData(
  node: FlowGraphNode,
  isSelected: boolean,
  status: StepStatus | undefined,
  iteration: number | undefined,
  onSelect: () => void
): Record<string, unknown> {
  const meta = node.metadata ?? {}

  const base = {
    label: node.label,
    isSelected,
    status,
    onSelect
  }

  switch (node.type) {
    case 'start':
      return { ...base, triggerType: meta.triggerType }
    case 'task':
      return {
        ...base,
        title: node.label,
        description: meta.description,
        taskVariant: meta.taskVariant,
        assignmentMode: meta.assignmentMode,
        isSystem: meta.isSystem,
        stepNumber: meta.stepNumber,
        iteration
      }
    case 'decision':
      return {
        ...base,
        decisionMode: meta.decisionMode,
        branchCount: meta.branchCount
      }
    case 'fork':
      return { ...base, branchCount: meta.branchCount }
    case 'join':
      return { ...base, joinCondition: meta.joinCondition }
    case 'end':
      return { ...base, summaryFieldsCount: meta.summaryFieldsCount }
    default:
      return base
  }
}

function toReactFlowEdge(edge: FlowGraphEdge, sourceHandle?: string, targetHandle?: string): Edge {
  const isBackward = edge.direction === 'backward'

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(sourceHandle ? { sourceHandle } : {}),
    ...(targetHandle ? { targetHandle } : {}),
    type: isBackward ? 'backward' : 'routed',
    animated: edge.metadata?.animated === true,
    data: {
      label: edge.label,
      points: edge.metadata?.points
    },
    markerEnd: isBackward ? BACKWARD_MARKER : FORWARD_MARKER,
    style: isBackward ? { strokeDasharray: '6 4' } : undefined
  }
}

// ---- FlowCanvas (view; must be used inside FlowCanvasProvider) ----

const DEFAULT_FIT_VIEW_OPTIONS = { padding: 0.2, minZoom: 0.2, maxZoom: 1.5 }

export const FlowCanvas: React.FC<FlowCanvasViewProps> = ({
  definition,
  themeColors: themeColorsProp,
  fitViewOptions: fitViewOptionsProp,
  runFitAfterLayout = false,
  useForwardEdgesOnlyForRanking = false,
  rightPanel,
  'data-testid': testId = 'flow-viewer'
}) => {
  const { selectedNodeId, selectedEdgeId, executionState, selectNode, selectEdge, isInteractive } =
    useFlowCanvasContext()
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null)
  const [layoutReady, setLayoutReady] = useState(false)
  const [layoutNodes, setLayoutNodes] = useState<Record<string, { x: number; y: number }>>({})
  const [layoutEdgePoints, setLayoutEdgePoints] = useState<Record<string, Array<{ x: number; y: number }>>>({})
  const [resolvedThemeColors, setResolvedThemeColors] = useState<FlowCanvasThemeColors | null>(null)

  useEffect(() => {
    if (themeColorsProp) return
    setResolvedThemeColors(resolveFlowCanvasThemeColors())
  }, [themeColorsProp])

  const uiColors = themeColorsProp ?? resolvedThemeColors ?? DEFAULT_FLOW_CANVAS_THEME_COLORS
  const fitViewOptions = { ...DEFAULT_FIT_VIEW_OPTIONS, ...fitViewOptionsProp }

  // Build ReactFlow nodes (positions from layout state, like FlowStudioCanvas)
  const rfNodes = useMemo<Node[]>(() => {
    return definition.nodes.map((node, index) => {
      const dims = getNodeDimensions(node.type)
      const status = executionState?.nodeStates[node.id]
      const iteration = executionState?.iterations?.[node.id]
      const isSelected = selectedNodeId === node.id
      const pos = layoutNodes[node.id] ?? { x: 20, y: index * 140 + 40 }

      return {
        id: node.id,
        type: node.type,
        position: pos,
        data: buildNodeData(node, isSelected, status, iteration, () => selectNode(node.id)),
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0,
          width: dims.width,
          height: dims.height
        }
      }
    })
  }, [definition.nodes, selectedNodeId, executionState, selectNode, layoutNodes])

  // Build ReactFlow edges (points from layout state)
  const rfEdges = useMemo<Edge[]>(() => {
    const nodesById = new Map(definition.nodes.map(n => [n.id, n] as const))
    return definition.edges.map(edge => {
      const sourceNode = nodesById.get(edge.source)
      const targetNode = nodesById.get(edge.target)
      const targetHandle = edge.direction === 'backward' && targetNode?.type === 'task' ? 'left' : undefined

      let base: Edge
      if (sourceNode?.type !== 'decision') {
        base = toReactFlowEdge(edge, undefined, targetHandle)
      } else {
        const label = (edge.label ?? '').toLowerCase()
        if (label === 'approve') base = toReactFlowEdge(edge, 'right', targetHandle)
        else if (label === 'reject') base = toReactFlowEdge(edge, 'left', targetHandle)
        else if (edge.direction === 'backward') base = toReactFlowEdge(edge, 'left', targetHandle)
        else base = toReactFlowEdge(edge, undefined, targetHandle)
      }
      const points = layoutEdgePoints[edge.id]
      const edgeData = {
        ...base.data,
        ...(points?.length ? { points } : {}),
        isSelected: selectedEdgeId === edge.id,
        onSelect: () => selectEdge(edge.id)
      }
      return { ...base, data: edgeData }
    })
  }, [definition.edges, definition.nodes, layoutEdgePoints, selectedEdgeId, selectEdge])

  const [flowNodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(rfEdges)

  // Run ELK layout and store result in state (like FlowStudioCanvas)
  useEffect(() => {
    let cancelled = false
    setLayoutNodes({})
    setLayoutEdgePoints({})
    setLayoutReady(false)

    const runLayout = async () => {
      try {
        const result = await computeLayout(definition, {
          useForwardEdgesOnlyForRanking
        })

        if (cancelled) return

        const nextNodes: Record<string, { x: number; y: number }> = {}
        for (const node of result.nodes) nextNodes[node.id] = { x: node.x, y: node.y }
        const nextPoints: Record<string, Array<{ x: number; y: number }>> = {}
        for (const edge of result.edges) nextPoints[edge.id] = edge.points

        setLayoutNodes(nextNodes)
        setLayoutEdgePoints(nextPoints)
        setLayoutReady(true)

        if (runFitAfterLayout && reactFlowInstanceRef.current) {
          requestAnimationFrame(() => {
            try {
              reactFlowInstanceRef.current?.fitView({
                padding: fitViewOptions.padding,
                minZoom: fitViewOptions.minZoom,
                maxZoom: fitViewOptions.maxZoom,
                duration: 200
              })
            } catch {
              // ignore
            }
          })
        }
      } catch (err) {
        console.error('ELK layout failed, using fallback', err)
        const fallback: Record<string, { x: number; y: number }> = {}
        definition.nodes.forEach((node, i) => {
          fallback[node.id] = { x: 20, y: i * 150 + 20 }
        })
        setLayoutNodes(fallback)
        setLayoutEdgePoints({})
        setLayoutReady(true)
      }
    }

    runLayout()
    return () => {
      cancelled = true
    }
  }, [
    definition,
    runFitAfterLayout,
    useForwardEdgesOnlyForRanking,
    fitViewOptions.padding,
    fitViewOptions.minZoom,
    fitViewOptions.maxZoom
  ])

  // Sync nodes/edges when definition or selection changes (positions come from layout state)
  useEffect(() => {
    setNodes(rfNodes)
  }, [rfNodes, setNodes])

  useEffect(() => {
    setEdges(rfEdges)
  }, [rfEdges, setEdges])

  return (
    <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden" data-testid={testId}>
      <div className="gba:flex-1 gba:relative gba:min-h-0 gba:w-full gba:overflow-hidden">
        <ReactFlow
          data-testid={`${testId}-surface`}
          style={{ opacity: layoutReady ? 1 : 0, transition: 'opacity 200ms' }}
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={instance => {
            reactFlowInstanceRef.current = instance
          }}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          connectionMode={ConnectionMode.Strict}
          fitView
          fitViewOptions={fitViewOptions}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={isInteractive}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          onNodeClick={(_, node) => {
            if (isInteractive) selectNode(node.id)
          }}
          onEdgeClick={(_, edge) => {
            if (isInteractive) selectEdge(edge.id)
          }}
          onPaneClick={() => {
            if (isInteractive) {
              selectNode(null)
              selectEdge(null)
            }
          }}
        >
          <Background color={uiColors.border} gap={16} size={1} />
          <Controls
            showZoom={true}
            showFitView={true}
            showInteractive={false}
            style={{
              backgroundColor: uiColors.surface,
              border: uiColors.border ? `1px solid ${uiColors.border}` : undefined,
              borderRadius: '8px'
            }}
          />
          <MiniMap
            position="bottom-left"
            nodeStrokeWidth={3}
            pannable
            zoomable
            maskColor={uiColors.mask}
            style={{
              backgroundColor: uiColors.surface,
              border: uiColors.border ? `1px solid ${uiColors.border}` : undefined,
              borderRadius: '8px'
            }}
            nodeColor={() => uiColors.minimapNode}
            nodeStrokeColor={() => uiColors.minimapStroke}
          />
          {rightPanel != null ? (
            <Panel position="top-right" className="gba:h-full gba:flex gba:items-stretch gba:justify-end">
              {rightPanel}
            </Panel>
          ) : null}
        </ReactFlow>
      </div>
    </div>
  )
}

/** @deprecated Use FlowCanvas */
export const FlowViewer = FlowCanvas
