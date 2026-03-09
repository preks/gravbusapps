import React, { useCallback, useMemo, useRef, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { DesignerMode } from '../../types/studioTypes'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import { CanvasToolbar } from './CanvasToolbar'
import { ConfigPanelContainer } from '../config-panels/ConfigPanelContainer'
import { useFlowValidation } from '../../hooks/useFlowValidation'
import { useFlowStudioData } from '../../hooks/useFlowStudioData'
import { FlowCanvasProvider, FlowCanvas } from '@/common/components/flow'
import type { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { StepStatus } from '@/common/components/flow/flow-viewer/types/viewerTypes'

type SimStatus = 'pending' | 'active' | 'completed'

interface FlowStudioCanvasProps extends BusinessAppContextProps {
  mode: DesignerMode
  onModeChange?: (mode: DesignerMode) => void
  onSave?: () => Promise<void> | void
  'data-testid'?: string
}

export const FlowStudioCanvas: React.FC<FlowStudioCanvasProps> = ({
  accessToken,
  mode,
  onModeChange,
  onSave,
  'data-testid': testId = 'flow-studio-canvas'
}) => {
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
  const studioData = useFlowStudioData(accessToken)
  const { errors, warnings } = useFlowValidation()
  const [simStatuses, setSimStatuses] = useState<Record<string, SimStatus>>({})
  const prevContentKeyRef = useRef<string>('')
  const prevDefinitionRef = useRef<ReturnType<typeof toGraphDefinition>>({
    nodes: [],
    edges: []
  })

  const definition = useMemo(() => {
    const next = toGraphDefinition()
    const contentKey = JSON.stringify({
      nodes: next.nodes.map(n => ({ id: n.id, type: n.type, label: n.label, metadata: n.metadata })),
      edges: next.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        direction: e.direction,
        label: e.label,
        metadata: e.metadata
      }))
    })
    if (contentKey === prevContentKeyRef.current) {
      return prevDefinitionRef.current
    }
    prevContentKeyRef.current = contentKey
    prevDefinitionRef.current = next
    return next
  }, [toGraphDefinition, storeNodes, storeEdges])

  const executionState = useMemo<{ nodeStates: Record<string, StepStatus> }>(
    () => ({ nodeStates: simStatuses }),
    [simStatuses]
  )

  const onConnect = useCallback(
    (connection: { source: string; target: string }) => {
      if (connection.source && connection.target) {
        addEdgeAction(connection.source, connection.target)
      }
    },
    [addEdgeAction]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: { id: string }) => {
      const plus = document.querySelector(`[data-testid="flow-studio-edge-add-${edge.id}"]`)
      if (plus && typeof document !== 'undefined') {
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
      openEdgeDetails(edge.id)
    },
    [openEdgeDetails, openEdgeInsert]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
    selectEdge(null)
  }, [selectEdge, selectNode])

  const getEdgeActions = useCallback(
    (edgeId: string) => {
      const edge = storeEdges.find(e => e.id === edgeId)
      const dir =
        edge && String((edge as { direction?: string }).direction ?? 'forward').toLowerCase() === 'backward'
          ? 'backward'
          : 'forward'
      if (dir !== 'forward') return {}
      return {
        onOpenInsertPanel: () => openEdgeInsert(edgeId),
        onInsert: (type: 'task' | 'decision' | 'fork', taskStepType?: unknown) => {
          insertNodeOnEdge(edgeId, type, taskStepType as FlowStepType | undefined)
        }
      }
    },
    [storeEdges, openEdgeInsert, insertNodeOnEdge]
  )

  const onSimulate = useCallback(() => {
    const start = storeNodes.find(node => node.type === 'start')
    if (!start) return
    const forwardEdges = storeEdges.filter(
      edge => String((edge as { direction?: string }).direction ?? 'forward').toLowerCase() === 'forward'
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
    const advanceSimStatus =
      (nodeId: string) =>
      (
        prev: Record<string, 'pending' | 'active' | 'completed'>
      ): Record<string, 'pending' | 'active' | 'completed'> => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          if (next[key] === 'active') next[key] = 'completed'
        }
        next[nodeId] = 'active'
        return next
      }
    route.forEach((nodeId, index) => {
      setTimeout(() => {
        setSimStatuses(advanceSimStatus(nodeId))
        selectNode(nodeId)
      }, index * 600)
    })
  }, [selectNode, storeEdges, storeNodes])

  const rightPanel =
    selectedNodeId || selectedEdgeId ? (
      <ConfigPanelContainer
        mode={mode}
        accessToken={accessToken}
        studioData={studioData}
        data-testid={`${testId}-config-panel`}
      />
    ) : null

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:overflow-hidden" data-testid={testId}>
      <CanvasToolbar
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
      <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col" data-testid={`${testId}-surface`}>
        <FlowCanvasProvider
          isInteractive={true}
          selectedNodeId={selectedNodeId}
          onNodeSelect={selectNode}
          selectedEdgeId={selectedEdgeId}
          onEdgeSelect={selectEdge}
          executionState={executionState}
        >
          <FlowCanvas
            definition={definition}
            rightPanel={rightPanel}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            getEdgeActions={getEdgeActions}
            nodesConnectable={true}
            useForwardEdgesOnlyForRanking={true}
            fitViewOptions={{ padding: 0.26, minZoom: 0.65, maxZoom: 0.95 }}
            data-testid={`${testId}-canvas`}
          />
        </FlowCanvasProvider>
      </div>
    </div>
  )
}
