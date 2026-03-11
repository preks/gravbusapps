import React, { createContext, useCallback, useMemo, useEffect, useState, useRef, useContext } from 'react'
import {
  ReactFlow,
  type Node,
  type Edge,
  type ReactFlowInstance,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useNodesInitialized,
  useReactFlow,
  ConnectionMode
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useFlowCanvasContext } from './FlowViewerProvider'
import { useFlowExport } from './controls/useFlowExport'
import { FlowCanvasControls } from './controls/FlowCanvasControls'

/** When true, the right panel is playing its close animation; panel content should render last cached content instead of null. */
const RightPanelExitingContext = createContext(false)
export const useRightPanelExiting = (): boolean => useContext(RightPanelExitingContext)
import { StartNode } from './nodes/StartNode'
import { TaskNode } from './nodes/TaskNode'
import { DecisionNode } from './nodes/DecisionNode'
import { ForkNode } from './nodes/ForkNode'
import { JoinNode } from './nodes/JoinNode'
import { EndNode } from './nodes/EndNode'
import {
  RoutedEdge,
  FORWARD_MARKER,
  FORWARD_MARKER_ACTIVE,
  FORWARD_MARKER_FAILED,
  FORWARD_MARKER_SELECTED
} from './edges/RoutedEdge'
import { BackwardEdge, BACKWARD_MARKER, BACKWARD_MARKER_FAILED, BACKWARD_MARKER_SELECTED } from './edges/BackwardEdge'
import { computeLayout } from './layout/elkLayout'
import { getNodeDimensions } from './nodes/nodeDimensions'
import { resolveFlowCanvasThemeColors, DEFAULT_FLOW_CANVAS_THEME_COLORS } from './utils/themeColors'
import type {
  FlowCanvasViewProps,
  FlowGraphNode,
  FlowGraphEdge,
  StepStatus,
  FlowCanvasThemeColors
} from './types/viewerTypes'

// ---- Conversion helpers ----

function buildNodeData(
  node: FlowGraphNode,
  isSelected: boolean,
  status: StepStatus | undefined,
  isOnActivePath: boolean,
  iteration: number | undefined,
  onSelect: () => void
): Record<string, unknown> {
  const meta = node.metadata ?? {}

  const base = {
    label: node.label,
    isSelected,
    status,
    isOnActivePath,
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
        decisionMode: meta.decisionMode
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
  useForwardEdgesOnlyForRanking = true,
  rightPanel,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  getEdgeActions,
  nodesConnectable = false,
  nodesDraggable = false,
  elementsSelectable: elementsSelectableProp,
  fitViewVerticalAlign = 'top',
  showMiniMap = true,
  showControls = true,
  'data-testid': testId = 'flow-viewer'
}) => {
  const { selectedNodeId, selectedEdgeId, executionState, selectNode, selectEdge, isInteractive } =
    useFlowCanvasContext()
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null)
  const prevPanelContentRef = useRef<React.ReactNode>(null)
  const hasRightPanelEverRef = useRef(false)
  const [panelKey, setPanelKey] = useState(0)
  const [panelOpenTransition, setPanelOpenTransition] = useState(false)
  const [layoutReady, setLayoutReady] = useState(false)
  const [layoutNodes, setLayoutNodes] = useState<Record<string, { x: number; y: number }>>({})
  const [layoutEdgePoints, setLayoutEdgePoints] = useState<Record<string, Array<{ x: number; y: number }>>>({})
  const [wasInitiallyCentered, setWasInitiallyCentered] = useState(false)
  const [layoutResultKey, setLayoutResultKey] = useState('')
  const hasEverLaidOutRef = useRef(false)
  const panelMeasureRef = useRef<HTMLDivElement | null>(null)
  const panelShiftAppliedRef = useRef(false)
  const panelShiftPxRef = useRef(0)
  const nodesInitialized = useNodesInitialized()
  const { fitView, getViewport, setViewport, getNodesBounds } = useReactFlow()
  const { exportPng, isExporting } = useFlowExport()
  const [resolvedThemeColors, setResolvedThemeColors] = useState<FlowCanvasThemeColors | null>(null)
  const panelVisible = rightPanel != null && panelOpenTransition

  const nodeTypes = useMemo(
    () => ({
      start: StartNode,
      task: TaskNode,
      decision: DecisionNode,
      fork: ForkNode,
      join: JoinNode,
      end: EndNode
    }),
    []
  )
  const edgeTypes = useMemo(
    () => ({
      routed: RoutedEdge,
      backward: BackwardEdge
    }),
    []
  )

  useEffect(() => {
    if (themeColorsProp) return
    setResolvedThemeColors(resolveFlowCanvasThemeColors())
  }, [themeColorsProp])

  const uiColors = themeColorsProp ?? resolvedThemeColors ?? DEFAULT_FLOW_CANVAS_THEME_COLORS
  const fitViewOptions = { ...DEFAULT_FIT_VIEW_OPTIONS, ...fitViewOptionsProp }
  const elementsSelectable = elementsSelectableProp ?? isInteractive

  // Layout is expensive and visually disruptive (we fade the canvas while recomputing).
  // Only recompute layout when the graph structure changes (ids/types/connections),
  // not when labels/metadata change (common during typing).
  const layoutKey = useMemo(() => {
    const nodes = definition.nodes
      .map(n => ({ id: n.id, type: n.type }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    const edges = definition.edges
      .map(e => ({ id: e.id, source: e.source, target: e.target, direction: e.direction }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    return JSON.stringify({ nodes, edges })
  }, [definition.nodes, definition.edges])

  const layoutDefinition = useMemo(
    () => ({
      nodes: definition.nodes.map(n => ({ id: n.id, type: n.type, label: '' })),
      edges: definition.edges.map(e => ({ id: e.id, source: e.source, target: e.target, direction: e.direction }))
    }),
    [layoutKey]
  )

  // When a completely different flow is loaded into the same viewer instance,
  // reset the initial fit/shift behavior so we start in fitView again.
  const nodeIdsKey = useMemo(() => {
    const ids = definition.nodes.map(n => n.id).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    return ids.join('|')
  }, [definition.nodes])
  const prevNodeIdsRef = useRef<Set<string> | null>(null)
  useEffect(() => {
    const current = new Set(definition.nodes.map(n => n.id))
    const prev = prevNodeIdsRef.current
    prevNodeIdsRef.current = current

    if (!prev) return

    if (prev.size === 0 && current.size > 0) {
      setWasInitiallyCentered(false)
      panelShiftAppliedRef.current = false
      panelShiftPxRef.current = 0
      return
    }

    if (prev.size > 0 && current.size > 0) {
      let intersection = 0
      for (const id of current) if (prev.has(id)) intersection += 1
      const overlapRatio = intersection / Math.max(prev.size, current.size)
      if (overlapRatio < 0.2) {
        setWasInitiallyCentered(false)
        panelShiftAppliedRef.current = false
        panelShiftPxRef.current = 0
      }
    }
  }, [nodeIdsKey])

  // Build ReactFlow nodes (positions from layout state, like FlowStudioCanvas)
  const rfNodes = useMemo<Node[]>(() => {
    return definition.nodes.map((node, index) => {
      const dims = getNodeDimensions(node.type)
      const status = executionState?.nodeStates[node.id]
      const isOnActivePath = executionState?.pathNodeIds?.includes(node.id) ?? false
      const iteration = executionState?.iterations?.[node.id]
      const isSelected = selectedNodeId === node.id
      const pos = layoutNodes[node.id] ?? { x: 20, y: index * 140 + 40 }

      return {
        id: node.id,
        type: node.type,
        position: pos,
        data: buildNodeData(node, isSelected, status, isOnActivePath, iteration, () => selectNode(node.id)),
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

  // Build ReactFlow edges (points from layout state; merge getEdgeActions when provided)
  const rfEdges = useMemo<Edge[]>(() => {
    const nodesById = new Map(definition.nodes.map(n => [n.id, n] as const))
    return definition.edges.map(edge => {
      const sourceNode = nodesById.get(edge.source)
      const targetNode = nodesById.get(edge.target)
      const targetHandle = edge.direction === 'backward' && targetNode?.type === 'task' ? 'left' : undefined

      let base: Edge
      if (sourceNode?.type === 'decision') {
        const label = (edge.label ?? '').toLowerCase()
        if (label === 'approve') base = toReactFlowEdge(edge, 'right', targetHandle)
        else if (label === 'reject') base = toReactFlowEdge(edge, 'left', targetHandle)
        else if (edge.direction === 'backward') base = toReactFlowEdge(edge, 'left', targetHandle)
        else base = toReactFlowEdge(edge, undefined, targetHandle)
      } else {
        base = toReactFlowEdge(edge, undefined, targetHandle)
      }
      const points = layoutEdgePoints[edge.id]
      const edgeActions = getEdgeActions?.(edge.id) ?? {}
      const targetStatus = executionState?.nodeStates[edge.target]
      const edgeState =
        executionState?.pathEdgeIds?.includes(edge.id) || executionState?.activeNodeId === edge.target
          ? 'active'
          : targetStatus === 'failed'
            ? 'failed'
            : undefined
      const edgeData = {
        ...base.data,
        ...(points?.length ? { points } : {}),
        isSelected: selectedEdgeId === edge.id,
        ...(edgeState ? { edgeState } : {}),
        onSelect: () => selectEdge(edge.id),
        ...(edgeActions.onInsert == null ? {} : { onInsert: edgeActions.onInsert }),
        ...(edgeActions.onOpenInsertPanel == null ? {} : { onOpenInsertPanel: edgeActions.onOpenInsertPanel })
      }
      const isSelected = selectedEdgeId === edge.id
      const isBackward = edge.direction === 'backward'
      const markerEnd = (() => {
        if (isSelected) {
          return isBackward ? BACKWARD_MARKER_SELECTED : FORWARD_MARKER_SELECTED
        }
        if (edgeState === 'failed') {
          return isBackward ? BACKWARD_MARKER_FAILED : FORWARD_MARKER_FAILED
        }
        if (edgeState === 'active') {
          return isBackward ? BACKWARD_MARKER_SELECTED : FORWARD_MARKER_ACTIVE
        }
        return base.markerEnd
      })()
      return { ...base, data: edgeData, markerEnd }
    })
  }, [definition.edges, definition.nodes, executionState, layoutEdgePoints, selectedEdgeId, selectEdge, getEdgeActions])

  const [flowNodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(rfEdges)

  const alignViewportAfterFit = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      if (fitViewVerticalAlign !== 'top' || flowNodes.length === 0) return viewport

      const bounds = getNodesBounds(flowNodes)
      const topPaddingPx = 28

      return {
        ...viewport,
        y: topPaddingPx - bounds.y * viewport.zoom
      }
    },
    [fitViewVerticalAlign, flowNodes, getNodesBounds]
  )

  const runFitView = useCallback(
    async (duration = 300) => {
      try {
        await fitView({
          padding: fitViewOptions.padding,
          minZoom: fitViewOptions.minZoom,
          maxZoom: fitViewOptions.maxZoom,
          duration
        })
      } catch {
        // ignore
      }

      let nextViewport = getViewport()

      if (panelVisible) {
        const width = panelMeasureRef.current?.getBoundingClientRect().width ?? 0
        const shiftPx = width > 0 ? Math.round(width / 2) : 0
        if (shiftPx > 0) {
          panelShiftAppliedRef.current = true
          panelShiftPxRef.current = shiftPx
          nextViewport = { ...nextViewport, x: nextViewport.x - shiftPx }
        }
      }

      nextViewport = alignViewportAfterFit(nextViewport)
      setViewport(nextViewport)
    },
    [
      fitView,
      fitViewOptions.padding,
      fitViewOptions.minZoom,
      fitViewOptions.maxZoom,
      getViewport,
      panelVisible,
      alignViewportAfterFit,
      setViewport
    ]
  )

  // Run ELK layout and store result in state (like FlowStudioCanvas)
  useEffect(() => {
    let cancelled = false
    const isFirstLayout = hasEverLaidOutRef.current === false
    if (isFirstLayout) {
      setLayoutNodes({})
      setLayoutEdgePoints({})
      setLayoutReady(false)
    }

    const runLayout = async () => {
      try {
        const result = await computeLayout(layoutDefinition as any, {
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
        setLayoutResultKey(layoutKey)
        hasEverLaidOutRef.current = true
      } catch (err) {
        console.error('ELK layout failed, using fallback', err)
        const fallback: Record<string, { x: number; y: number }> = {}
        layoutDefinition.nodes.forEach((node: any, i: number) => {
          fallback[node.id] = { x: 20, y: i * 150 + 20 }
        })
        setLayoutNodes(fallback)
        setLayoutEdgePoints({})
        setLayoutReady(true)
        setLayoutResultKey(layoutKey)
        hasEverLaidOutRef.current = true
      }
    }

    runLayout()
    return () => {
      cancelled = true
    }
  }, [layoutKey, useForwardEdgesOnlyForRanking])

  // Fit view once when layout is ready and nodes are initialized (orgchart pattern: no defaultViewport, explicit fitView after nodesInitialized)
  useEffect(() => {
    if (
      !wasInitiallyCentered &&
      layoutReady &&
      layoutResultKey === layoutKey &&
      definition.nodes.length > 0 &&
      nodesInitialized
    ) {
      const timer = setTimeout(async () => {
        await runFitView(300)
        setWasInitiallyCentered(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [
    wasInitiallyCentered,
    layoutReady,
    layoutResultKey,
    layoutKey,
    definition.nodes.length,
    nodesInitialized,
    runFitView
  ])

  // Sync nodes/edges when definition or selection changes (positions come from layout state)
  useEffect(() => {
    setNodes(rfNodes)
  }, [rfNodes, setNodes])

  useEffect(() => {
    setEdges(rfEdges)
  }, [rfEdges, setEdges])

  // Right panel: like orgchart – Panel always mounted once used, visibility via translate on Panel (whole box moves off-screen when closed)
  if (rightPanel != null) {
    prevPanelContentRef.current = rightPanel
    hasRightPanelEverRef.current = true
  }
  useEffect(() => {
    if (rightPanel != null) {
      setPanelOpenTransition(false)
      const raf = requestAnimationFrame(() => {
        setPanelOpenTransition(true)
      })
      return () => cancelAnimationFrame(raf)
    }
    setPanelOpenTransition(false)
    if (rightPanel == null && prevPanelContentRef.current != null) {
      const t = setTimeout(() => {
        prevPanelContentRef.current = null
        setPanelKey(k => k + 1)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [rightPanel])

  const showRightPanel = hasRightPanelEverRef.current
  const panelContent = rightPanel ?? prevPanelContentRef.current

  // When the sidebar opens, shift viewport left so content stays visible.
  // Restore previous viewport when the sidebar closes.
  useEffect(() => {
    const width = panelMeasureRef.current?.getBoundingClientRect().width ?? 0

    if (panelVisible) {
      // Don't shift during initial load; the initial fitView effect will handle
      // shifting exactly once after the viewport is computed.
      if (!wasInitiallyCentered) return

      if (panelShiftAppliedRef.current) return
      if (width <= 0) return

      panelShiftAppliedRef.current = true
      const shiftPx = Math.round(width / 2)
      panelShiftPxRef.current = shiftPx

      const v = getViewport()
      // Decrease x => move graph left, away from right panel overlay.
      setViewport({ x: v.x - shiftPx, y: v.y, zoom: v.zoom }, { duration: 250 })
      return
    }

    // Panel is not visible: shift back once the close transition finished,
    // without undoing user panning/zooming while the panel was open.
    const shiftPx = panelShiftPxRef.current
    if (!panelShiftAppliedRef.current || shiftPx <= 0) return

    const t = window.setTimeout(() => {
      const v = getViewport()
      panelShiftAppliedRef.current = false
      panelShiftPxRef.current = 0
      setViewport({ x: v.x + shiftPx, y: v.y, zoom: v.zoom }, { duration: 250 })
    }, 300)

    return () => window.clearTimeout(t)
  }, [panelVisible, getViewport, setViewport])

  const handlePanelTransitionEnd = () => {
    if (rightPanel == null && prevPanelContentRef.current != null) {
      prevPanelContentRef.current = null
      setPanelKey(k => k + 1)
    }
  }

  return (
    <div
      className="gba:flex gba:h-full gba:flex-1 gba:relative gba:min-h-0 gba:w-full gba:overflow-hidden"
      data-testid={testId}
    >
      <ReactFlow
        data-testid={`${testId}-surface`}
        style={{ opacity: layoutReady ? 1 : 0.35, transition: 'opacity 200ms' }}
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={
          onConnect
            ? connection => {
                if (connection.source != null && connection.target != null) {
                  onConnect({
                    source: connection.source,
                    target: connection.target,
                    sourceHandle: connection.sourceHandle ?? undefined,
                    targetHandle: connection.targetHandle ?? undefined
                  })
                }
              }
            : undefined
        }
        onInit={instance => {
          reactFlowInstanceRef.current = instance
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Strict}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        nodesDraggable={nodesDraggable}
        nodesConnectable={nodesConnectable}
        elementsSelectable={elementsSelectable}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        onNodeClick={
          onNodeClick ??
          ((_, node) => {
            if (isInteractive) selectNode(node.id)
          })
        }
        onEdgeClick={
          onEdgeClick ??
          ((_, edge) => {
            if (isInteractive) selectEdge(edge.id)
          })
        }
        onPaneClick={
          onPaneClick ??
          (() => {
            if (isInteractive) {
              selectNode(null)
              selectEdge(null)
            }
          })
        }
      >
        <Background color={uiColors.border} gap={16} size={1} />
        {showControls ? (
          <FlowCanvasControls
            uiColors={uiColors}
            onFitView={() => {
              void runFitView(300)
            }}
            onExport={exportPng}
            isExporting={isExporting}
            data-testid={`${testId}-controls`}
          />
        ) : null}
        {showMiniMap ? (
          <MiniMap
            position="bottom-left"
            nodeStrokeWidth={3}
            pannable
            zoomable
            maskColor={uiColors.mask}
            style={{
              marginBottom: '62px',
              width: 220,
              height: 150,
              backgroundColor: uiColors.surface,
              border: uiColors.border ? `1px solid ${uiColors.border}` : undefined,
              borderRadius: '8px'
            }}
            nodeColor={() => uiColors.minimapNode}
            nodeStrokeColor={() => uiColors.minimapStroke}
          />
        ) : null}
        {showRightPanel ? (
          <Panel
            position="top-right"
            className={`gba:!m-0 gba:h-full gba:flex gba:flex-col gba:overflow-hidden gba:transition-transform gba:duration-300 gba:ease-in-out ${
              panelVisible ? 'gba:translate-x-0' : 'gba:translate-x-full'
            }`}
            onTransitionEnd={(e: React.TransitionEvent) => {
              if (e.propertyName === 'transform') handlePanelTransitionEnd()
            }}
          >
            <div
              ref={panelMeasureRef}
              key={panelKey}
              className="gba:h-full gba:min-h-0 gba:flex gba:flex-col gba:bg-sidebar"
            >
              <RightPanelExitingContext.Provider value={rightPanel == null && showRightPanel}>
                {panelContent}
              </RightPanelExitingContext.Provider>
            </div>
          </Panel>
        ) : null}
      </ReactFlow>
    </div>
  )
}

/** @deprecated Use FlowCanvas */
export const FlowViewer = FlowCanvas
