import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { ReactFlowProvider } from 'reactflow'
import type { FlowCanvasContextValue, FlowExecutionState } from './types/viewerTypes'

const FlowCanvasContext = createContext<FlowCanvasContextValue | null>(null)

export function useFlowCanvasContext(): FlowCanvasContextValue {
  const ctx = useContext(FlowCanvasContext)
  if (!ctx) {
    throw new Error('useFlowCanvasContext must be used within a FlowCanvasProvider')
  }
  return ctx
}

/** @deprecated Use useFlowCanvasContext */
export const useFlowViewerContext = useFlowCanvasContext

interface FlowCanvasProviderProps {
  children: React.ReactNode
  isInteractive?: boolean
  executionState?: FlowExecutionState
  selectedNodeId?: string | null
  onNodeSelect?: (nodeId: string | null) => void
  selectedEdgeId?: string | null
  onEdgeSelect?: (edgeId: string | null) => void
}

export const FlowCanvasProvider: React.FC<FlowCanvasProviderProps> = ({
  children,
  isInteractive = false,
  executionState,
  selectedNodeId: controlledSelectedNodeId,
  onNodeSelect: controlledOnNodeSelect,
  selectedEdgeId: controlledSelectedEdgeId,
  onEdgeSelect: controlledOnEdgeSelect
}) => {
  const [zoom] = useState(1)
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null)
  const [internalSelectedEdgeId, setInternalSelectedEdgeId] = useState<string | null>(null)

  const isNodeControlled = controlledSelectedNodeId !== undefined
  const selectedNodeId = isNodeControlled ? (controlledSelectedNodeId ?? null) : internalSelectedNodeId

  const isEdgeControlled = controlledSelectedEdgeId !== undefined
  const selectedEdgeId = isEdgeControlled ? (controlledSelectedEdgeId ?? null) : internalSelectedEdgeId

  const selectNode = useCallback(
    (nodeId: string | null) => {
      if (!isInteractive) return
      if (isNodeControlled && controlledOnNodeSelect) {
        controlledOnNodeSelect(nodeId)
      } else {
        setInternalSelectedNodeId(nodeId)
      }
    },
    [isInteractive, isNodeControlled, controlledOnNodeSelect]
  )

  const selectEdge = useCallback(
    (edgeId: string | null) => {
      if (!isInteractive) return
      if (isEdgeControlled && controlledOnEdgeSelect) {
        controlledOnEdgeSelect(edgeId)
      } else {
        setInternalSelectedEdgeId(edgeId)
      }
    },
    [isInteractive, isEdgeControlled, controlledOnEdgeSelect]
  )

  const value = useMemo<FlowCanvasContextValue>(
    () => ({
      zoom,
      selectedNodeId,
      selectedEdgeId,
      executionState,
      selectNode,
      selectEdge,
      isInteractive
    }),
    [zoom, selectedNodeId, selectedEdgeId, executionState, selectNode, selectEdge, isInteractive]
  )

  return (
    <FlowCanvasContext.Provider value={value}>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </FlowCanvasContext.Provider>
  )
}

/** @deprecated Use FlowCanvasProvider */
export const FlowViewerProvider = FlowCanvasProvider
