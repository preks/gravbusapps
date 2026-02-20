import React, { useCallback, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  type Node,
  type Edge,
  type Connection,
  Controls,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  type ReactFlowInstance,
  ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'

import { StartNode } from '@/common/components/flow/flow-viewer/nodes/StartNode'
import { TaskNode } from '@/common/components/flow/flow-viewer/nodes/TaskNode'
import { DecisionNode } from '@/common/components/flow/flow-viewer/nodes/DecisionNode'
import { ForkNode } from '@/common/components/flow/flow-viewer/nodes/ForkNode'
import { JoinNode } from '@/common/components/flow/flow-viewer/nodes/JoinNode'
import { EndNode } from '@/common/components/flow/flow-viewer/nodes/EndNode'
import { RoutedEdge, FORWARD_MARKER } from '@/common/components/flow/flow-viewer/edges/RoutedEdge'
import { BackwardEdge, BACKWARD_MARKER } from '@/common/components/flow/flow-viewer/edges/BackwardEdge'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { DesignerMode } from '../../types/studioTypes'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import { CanvasToolbar } from './CanvasToolbar'
import { ConfigPanelContainer } from '../config-panels/ConfigPanelContainer'
import { useFlowValidation } from '../../hooks/useFlowValidation'
import { computeLayout } from '@/common/components/flow/flow-viewer/layout/elkLayout'
import { useFlowStudioClient } from '../../hooks/useFlowStudioClient'
import { useFlowStudioData } from '../../hooks/useFlowStudioData'
import type { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'

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

interface FlowStudioCanvasProps extends BusinessAppContextProps {
  mode: DesignerMode
  onModeChange?: (mode: DesignerMode) => void
  onBackToList?: () => void
  'data-testid'?: string
}

function resolveCssColor(className: string, property: 'backgroundColor' | 'borderColor' | 'color'): string | undefined {
  try {
    if (typeof document === 'undefined') return undefined
    const el = document.createElement('div')
    el.className = className
    el.style.position = 'absolute'
    el.style.visibility = 'hidden'
    el.style.pointerEvents = 'none'
    el.style.top = '-9999px'
    el.style.left = '-9999px'
    if (property === 'borderColor') {
      el.style.borderWidth = '1px'
      el.style.borderStyle = 'solid'
    }
    document.body.appendChild(el)
    const value = getComputedStyle(el)[property]
    el.remove()
    const v = String(value || '').trim()
    return v || undefined
  } catch {
    return undefined
  }
}

function withAlpha(color: string | undefined, alpha: number): string | undefined {
  if (!color) return undefined
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+\s*)?\)$/.exec(color)
  if (!m) return color
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const FlowStudioCanvasInner: React.FC<FlowStudioCanvasProps> = ({
  accessToken,
  mode,
  onModeChange,
  onBackToList,
  'data-testid': testId = 'flow-studio-canvas'
}) => {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const didInitialFitRef = useRef(false)
  const pendingFitRef = useRef(true)

  const storeNodes = useFlowStudioStore(s => s.nodes)
  const storeEdges = useFlowStudioStore(s => s.edges)
  const selectedNodeId = useFlowStudioStore(s => s.selectedNodeId)
  const selectedEdgeId = useFlowStudioStore(s => s.selectedEdgeId)
  const addEdgeAction = useFlowStudioStore(s => s.addEdge)
  const insertNodeOnEdge = useFlowStudioStore(s => s.insertNodeOnEdge)
  const selectNode = useFlowStudioStore(s => s.selectNode)
  const selectEdge = useFlowStudioStore(s => s.selectEdge)
  const openEdgeDetails = useFlowStudioStore(s => s.openEdgeDetails)
  const openEdgeInsert = useFlowStudioStore(s => s.openEdgeInsert)
  const toGraphDefinition = useFlowStudioStore(s => s.toGraphDefinition)
  const { saveFlow } = useFlowStudioClient(accessToken)
  const studioData = useFlowStudioData(accessToken)
  const { errors, warnings } = useFlowValidation()
  const [layoutNodes, setLayoutNodes] = useState<Record<string, { x: number; y: number }>>({})
  const [layoutEdgePoints, setLayoutEdgePoints] = useState<Record<string, Array<{ x: number; y: number }>>>({})
  const [simStatuses, setSimStatuses] = useState<Record<string, 'pending' | 'active' | 'completed'>>({})
  const [uiColors, setUiColors] = useState<{
    surface: string
    border: string
    minimapNode: string
    minimapStroke: string
    mask: string
  } | null>(null)

  React.useEffect(() => {
    // Resolve real colors from design-system classes (avoid CSS vars in SVG attrs).
    const surface = resolveCssColor('gba:bg-background', 'backgroundColor') ?? 'white'
    const border = resolveCssColor('gba:border-border', 'borderColor') ?? 'rgba(0,0,0,0.12)'
    const minimapNode = resolveCssColor('gba:bg-muted', 'backgroundColor') ?? surface
    const minimapStroke = border
    const mask = withAlpha(minimapNode, 0.12) ?? 'rgba(0,0,0,0.08)'
    setUiColors({ surface, border, minimapNode, minimapStroke, mask })
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const definition = toGraphDefinition()
    const dir = (value: unknown) => (String(value ?? 'forward').toLowerCase() === 'backward' ? 'backward' : 'forward')
    // Keep the overall flow layout top-to-bottom based on forward structure.
    // Backward (send-back / rework) edges are routed visually but should not affect node ranking.
    const layoutDefinition = {
      ...definition,
      edges: definition.edges.filter(e => dir((e as any).direction) === 'forward')
    }
    // Give edges enough breathing room so routed lines + labels don't crowd node borders.
    computeLayout(layoutDefinition, {
      direction: 'TB',
      nodeSpacing: 90,
      layerSpacing: 130,
      edgeNodeSpacing: 52,
      edgeEdgeSpacing: 22
    })
      .then(result => {
        if (cancelled) return
        const nextNodes: Record<string, { x: number; y: number }> = {}
        for (const node of result.nodes) nextNodes[node.id] = { x: node.x, y: node.y }
        const nextPoints: Record<string, Array<{ x: number; y: number }>> = {}
        for (const edge of result.edges) nextPoints[edge.id] = edge.points
        setLayoutNodes(nextNodes)
        setLayoutEdgePoints(nextPoints)

        const instance = reactFlowInstance.current
        if (!instance) return
        if (!didInitialFitRef.current || pendingFitRef.current) {
          instance.fitView({
            padding: 0.26,
            duration: 200,
            minZoom: 0.65,
            maxZoom: 0.95
          })
          const currentZoom = instance.getZoom()
          if (currentZoom < 0.65) {
            const viewport = instance.getViewport()
            instance.setViewport({ ...viewport, zoom: 0.65 }, { duration: 120 })
          }
          if (currentZoom > 0.95) {
            const viewport = instance.getViewport()
            instance.setViewport({ ...viewport, zoom: 0.95 }, { duration: 120 })
          }
          didInitialFitRef.current = true
          pendingFitRef.current = false
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [storeNodes, storeEdges, toGraphDefinition])

  const rfNodes = useMemo<Node[]>(() => {
    return storeNodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      position: layoutNodes[node.id] ?? { x: 80, y: index * 140 + 40 },
      data: {
        label: node.label,
        isSelected: selectedNodeId === node.id,
        onSelect: () => selectNode(node.id),
        ...(node.config.nodeType === 'start' && { triggerType: node.config.triggerType }),
        ...(node.config.nodeType === 'task' && {
          title: node.config.title,
          taskVariant: node.config.stepType,
          isSystem: node.config.kind === 'SYSTEM',
          status: simStatuses[node.id]
        }),
        ...(node.config.nodeType === 'decision' && {
          decisionMode: node.config.decisionMode,
          branchCount: node.config.branches.length
        }),
        ...(node.config.nodeType === 'fork' && { branchCount: node.config.branches.length }),
        ...(node.config.nodeType === 'join' && { joinCondition: node.config.joinCondition }),
        ...(node.config.nodeType === 'end' && {
          summaryFieldsCount: node.config.summaryFields?.length ?? 0
        })
      },
      style: { background: 'transparent', border: 'none', padding: 0 }
    }))
  }, [layoutNodes, selectedNodeId, selectNode, simStatuses, storeNodes])

  const rfEdges = useMemo<Edge[]>(() => {
    const nodesById = new Map(storeNodes.map(n => [n.id, n] as const))

    const normDir = (value: unknown): 'forward' | 'backward' =>
      String(value ?? 'forward').toLowerCase() === 'backward' ? 'backward' : 'forward'

    return storeEdges.map(edge => {
      const edgeDir = normDir((edge as any).direction)
      const sourceHandle = (() => {
        const sourceNode = nodesById.get(edge.source)
        if (sourceNode?.type !== 'decision') return undefined

        // Backward edges (send-back) should never leave from the bottom vertex,
        // otherwise they overlap with forward branches.
        if (edgeDir === 'backward') return 'left'
        return undefined
      })()

      const targetHandle = (() => {
        if (edgeDir !== 'backward') return undefined
        const targetNode = nodesById.get(edge.target)
        if (targetNode?.type === 'task') return 'left'
        return undefined
      })()

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(sourceHandle ? { sourceHandle } : {}),
        ...(targetHandle ? { targetHandle } : {}),
        type: edgeDir === 'backward' ? 'backward' : 'routed',
        data: {
          label: edge.label,
          points: layoutEdgePoints[edge.id],
          isSelected: selectedEdgeId === edge.id,
          onSelect: () => openEdgeDetails(edge.id),
          onOpenInsertPanel: edgeDir === 'forward' ? () => openEdgeInsert(edge.id) : undefined,
          onInsert:
            edgeDir === 'forward'
              ? (type: 'task' | 'decision' | 'fork', taskStepType?: FlowStepType) =>
                  insertNodeOnEdge(edge.id, type, taskStepType)
              : undefined
        },
        markerEnd: edgeDir === 'backward' ? BACKWARD_MARKER : FORWARD_MARKER
      }
    })
  }, [insertNodeOnEdge, layoutEdgePoints, openEdgeDetails, openEdgeInsert, selectedEdgeId, storeEdges, storeNodes])

  const [flowNodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(rfEdges)

  React.useEffect(() => setNodes(rfNodes), [rfNodes, setNodes])
  React.useEffect(() => setEdges(rfEdges), [rfEdges, setEdges])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdgeAction(connection.source, connection.target)
      }
    },
    [addEdgeAction]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // ReactFlow sometimes reports the edge path as target even when the user clicked
      // the "+" overlay button. Detect this by comparing click position to the button rect.
      const canInsert =
        typeof (edge as any)?.data?.onOpenInsertPanel === 'function' ||
        typeof (edge as any)?.data?.onInsert === 'function'
      if (canInsert && typeof document !== 'undefined') {
        const plus = document.querySelector(`[data-testid="flow-studio-edge-add-${edge.id}"]`) as HTMLElement | null
        if (plus) {
          const rect = plus.getBoundingClientRect()
          const pad = 6
          const x = event.clientX
          const y = event.clientY
          const inside = x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad
          if (inside) {
            openEdgeInsert(edge.id)
            return
          }
        }
      }

      openEdgeDetails(edge.id)
    },
    [openEdgeDetails, openEdgeInsert]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
    selectEdge(null)
  }, [selectEdge, selectNode])

  const onSave = useCallback(async () => {
    await saveFlow()
  }, [saveFlow])

  const onSimulate = useCallback(() => {
    const start = storeNodes.find(node => node.type === 'start')
    if (!start) return
    const forwardEdges = storeEdges.filter(
      edge => String((edge as any).direction ?? 'forward').toLowerCase() === 'forward'
    )
    const nextBySource = new Map<string, string[]>()
    for (const edge of forwardEdges) {
      nextBySource.set(edge.source, [...(nextBySource.get(edge.source) ?? []), edge.target])
    }
    const route: string[] = []
    const visited = new Set<string>()
    const queue = [start.id]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      route.push(current)
      for (const next of nextBySource.get(current) ?? []) queue.push(next)
    }
    setSimStatuses({})
    route.forEach((nodeId, index) => {
      setTimeout(() => {
        setSimStatuses(prev => {
          const next = { ...prev }
          for (const key of Object.keys(next)) {
            if (next[key] === 'active') next[key] = 'completed'
          }
          next[nodeId] = 'active'
          return next
        })
        selectNode(nodeId)
      }, index * 600)
    })
  }, [selectNode, storeEdges, storeNodes])

  return (
    <div className="gba:flex gba:flex-1 gba:overflow-hidden" data-testid={testId}>
      <div className="gba:flex gba:flex-col gba:flex-1">
        <CanvasToolbar
          onBackToList={onBackToList}
          onSave={onSave}
          onSimulate={onSimulate}
          mode={mode}
          onModeChange={onModeChange}
          data-testid={`${testId}-toolbar`}
        />
        {(errors.length > 0 || warnings.length > 0) && (
          <div className="gba:px-3 gba:py-1.5 gba:border-b gba:border-border gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:text-xs">
            {errors.length > 0 ? `${errors.length} errors` : 'No errors'} · {warnings.length} warnings
          </div>
        )}

        <div
          className="gba:flex-1 gba:relative gba:min-h-0 gba:w-full gba:overflow-hidden"
          data-testid={`${testId}-surface`}
        >
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onInit={instance => {
              reactFlowInstance.current = instance
            }}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            connectionMode={ConnectionMode.Strict}
            fitView
            fitViewOptions={{ padding: 0.26, minZoom: 0.65, maxZoom: 0.95 }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={null}
            nodesDraggable={false}
            elementsSelectable={true}
            nodesConnectable={true}
          >
            <Background color={uiColors?.border ?? '#e5e7eb'} gap={16} size={1} />
            <Controls
              position="bottom-right"
              showZoom
              showFitView
              showInteractive={false}
              style={{
                backgroundColor: uiColors?.surface,
                border: uiColors?.border ? `1px solid ${uiColors.border}` : undefined,
                borderRadius: '8px'
              }}
            />
            <MiniMap
              position="bottom-left"
              nodeStrokeWidth={3}
              nodeBorderRadius={6}
              pannable
              zoomable
              maskColor={uiColors?.mask}
              style={{
                backgroundColor: uiColors?.surface,
                border: uiColors?.border ? `1px solid ${uiColors.border}` : undefined,
                borderRadius: '8px'
              }}
              nodeColor={() => uiColors?.minimapNode ?? '#e5e7eb'}
              nodeStrokeColor={() => uiColors?.minimapStroke ?? '#9ca3af'}
            />
            {(selectedNodeId || selectedEdgeId) && (
              <Panel position="top-right" className="gba:h-full gba:flex gba:items-stretch gba:justify-end">
                <ConfigPanelContainer
                  mode={mode}
                  accessToken={accessToken}
                  studioData={studioData}
                  data-testid={`${testId}-config-panel`}
                />
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}

export const FlowStudioCanvas: React.FC<FlowStudioCanvasProps> = props => {
  return (
    <ReactFlowProvider>
      <FlowStudioCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
