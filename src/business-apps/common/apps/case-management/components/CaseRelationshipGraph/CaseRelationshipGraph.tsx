/**
 * Case Relationship Graph Component
 *
 * Main component that renders an interactive graph visualization
 * of case relationships using React Flow with dagre layout.
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Node,
  Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertCircle, FileText, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@newwork/nw-design-system'

import { CaseApiClient } from '../../services/CaseApiClient'
import { Case, LinkedCase } from '../../types'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useEmployeeNamesBatch } from '@/business-apps/ser/hooks/useEmployeeNamesBatch'

import { CaseNode, CaseNodeData } from './CaseNode'
import { RelationshipEdge, RelationshipEdgeData } from './RelationshipEdge'
import { useCaseGraph, UseCaseGraphResult } from './useCaseGraph'
import { GraphToolbar } from './GraphToolbar'
import { GraphLegend } from './GraphLegend'

/**
 * Extract all user IDs from graph nodes for name resolution
 */
const extractUserIds = (nodes: Node<CaseNodeData>[]): string[] => {
  const ids = new Set<string>()

  nodes.forEach(node => {
    const data = node.data
    // Assignee ID
    if (data?.assigneeId) {
      ids.add(data.assigneeId)
    }
    // Note creators
    if (data?.recentNotes) {
      data.recentNotes.forEach(note => {
        if (note.createdBy) {
          ids.add(note.createdBy)
        }
      })
    }
  })

  return Array.from(ids)
}

/**
 * Enhance node data with name resolution callback
 * The callback is used by CaseNode component at render time to resolve names
 */
const enhanceNodesWithNames = (nodes: Node<CaseNodeData>[], userNames: Map<string, string>): Node<CaseNodeData>[] => {
  // Create a name resolver function that the node can use at render time
  const getUserName = (userId: string): string | undefined => {
    return userNames.get(userId)
  }

  return nodes.map(node => {
    const data = node.data
    if (!data) return node

    // Resolve assignee name directly
    const assigneeName = data.assigneeId ? userNames.get(data.assigneeId) || data.assigneeName : data.assigneeName

    return {
      ...node,
      data: {
        ...data,
        assigneeName,
        // Pass the name resolver function - node will use it at render time
        getUserName
      }
    }
  })
}

/**
 * Props for CaseRelationshipGraph
 */
export interface CaseRelationshipGraphProps {
  /** Current case ID */
  caseId: string
  /** Business app context for API access */
  context: BusinessAppContextProps
  /** Current case data (optional, to avoid extra fetch) */
  currentCase?: Case
  /** Linked cases (optional, to avoid extra fetch) */
  linkedCases?: LinkedCase[]
  /** Callback when a case is selected in the graph */
  onCaseSelect?: (caseId: string) => void
  /** Callback to navigate to a case */
  onNavigateToCase?: (caseId: string) => void
  /** Height of the graph container */
  height?: string | number
  /** Whether to show the minimap */
  showMinimap?: boolean
  /** Whether to show controls */
  showControls?: boolean
  /** Additional className */
  className?: string
}

/**
 * Custom node types for React Flow
 */
const nodeTypes = {
  caseNode: CaseNode
}

/**
 * Custom edge types for React Flow
 */
const edgeTypes = {
  relationshipEdge: RelationshipEdge
}

/**
 * Inner component that uses React Flow hooks
 */
const CaseRelationshipGraphInner: React.FC<{
  graphData: UseCaseGraphResult
  showMinimap: boolean
  showControls: boolean
  isFullscreen: boolean
  onFullscreenToggle: () => void
  height: string | number
  className: string
  context: BusinessAppContextProps
}> = ({ graphData, showMinimap, showControls, isFullscreen, onFullscreenToggle, height, className, context }) => {
  const { fitView, zoomIn, zoomOut } = useReactFlow()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Extract user IDs from nodes for name resolution
  const userIds = useMemo(() => extractUserIds(graphData.nodes as Node<CaseNodeData>[]), [graphData.nodes])

  // Resolve user names
  const { displayNames: userNames, isLoading: namesLoading } = useEmployeeNamesBatch({
    userIds,
    accessToken: context.accessToken,
    enabled: userIds.length > 0
  })

  // Enhance nodes with name resolver callback
  // The callback captures the current userNames map and will be called at render time
  const enhancedNodes = useMemo(() => {
    return enhanceNodesWithNames(graphData.nodes as Node<CaseNodeData>[], userNames)
  }, [graphData.nodes, userNames, namesLoading, userIds.length])

  // Key for forcing re-render of nodes when names resolve
  const nodesKey = `nodes-${userNames.size}-${namesLoading ? 'loading' : 'ready'}`

  // Initialize nodes and edges state with enhanced nodes directly
  // Using key pattern to force re-initialization when names change
  const [nodes, setNodes, onNodesChange] = useNodesState<CaseNodeData>(enhancedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<RelationshipEdgeData>(
    graphData.edges as Edge<RelationshipEdgeData>[]
  )

  // Force update nodes when enhanced nodes change (names resolved)
  useEffect(() => {
    setNodes(enhancedNodes)
  }, [nodesKey, setNodes, enhancedNodes])

  useEffect(() => {
    setEdges(graphData.edges as Edge<RelationshipEdgeData>[])
  }, [graphData.edges, setEdges])

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      // Small delay to ensure nodes are rendered
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, maxZoom: 1 })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [nodes.length, fitView])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await graphData.refresh()
    setIsRefreshing(false)
  }, [graphData])

  // Handle fit view
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, maxZoom: 1 })
  }, [fitView])

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 })
  }, [zoomIn])

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 })
  }, [zoomOut])

  // Empty state
  if (!graphData.loading && graphData.nodes.length === 0) {
    return (
      <div
        className={`gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-dashed ${className}`}
        style={{ height }}
      >
        <FileText className="gba:h-12 gba:w-12 gba:text-muted-foreground gba:mb-4" />
        <p className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">No Related Cases</p>
        <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:max-w-md">
          This case has no linked parent, child, or related cases yet. Link cases from the Related Cases tab to see them
          in the diagram.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`gba:flex gba:flex-col gba:bg-background gba:rounded-lg gba:border gba:overflow-hidden ${
        isFullscreen ? 'gba:fixed gba:inset-4 gba:z-50' : ''
      } ${className}`}
      style={{ height: isFullscreen ? 'auto' : height }}
    >
      {/* Toolbar */}
      <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border-b gba:bg-muted/30">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Case Relationships</h3>
          {graphData.loading && <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin gba:text-muted-foreground" />}
        </div>
        <GraphToolbar
          layoutDirection={graphData.layoutDirection}
          onLayoutChange={graphData.setLayoutDirection}
          isFullscreen={isFullscreen}
          onFullscreenToggle={onFullscreenToggle}
          onFitView={handleFitView}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing || graphData.loading}
        />
      </div>

      {/* Graph Area */}
      <div className="gba:flex-1 gba:relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitViewOptions={{
            padding: 0.2,
            maxZoom: 1
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--color-border-default)" gap={16} size={1} />
          {showControls && (
            <Controls
              showZoom={false}
              showFitView={false}
              showInteractive={false}
              style={{
                display: 'none' // Hide default controls since we have custom toolbar
              }}
            />
          )}
          {showMinimap && (
            <MiniMap
              nodeColor={node => {
                const data = node.data as CaseNodeData
                switch (data?.status) {
                  case 'completed':
                    return '#22c55e'
                  case 'in_progress':
                    return '#f59e0b'
                  case 'blocked':
                    return '#ef4444'
                  case 'cancelled':
                    return '#9ca3af'
                  default:
                    return '#3b82f6'
                }
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
              style={{
                backgroundColor: 'var(--color-surface-primary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: '8px'
              }}
              pannable
              zoomable
            />
          )}
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="gba:border-t gba:p-3 gba:bg-muted/30">
        <GraphLegend compact />
      </div>
    </div>
  )
}

/**
 * Case Relationship Graph Component
 *
 * Visualizes case hierarchies and relationships in an interactive graph.
 * Uses React Flow for rendering and dagre for automatic layout.
 */
export const CaseRelationshipGraph: React.FC<CaseRelationshipGraphProps> = ({
  caseId,
  context,
  currentCase,
  linkedCases,
  onCaseSelect,
  onNavigateToCase,
  height = 500,
  showMinimap = true,
  showControls = true,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Create API client
  const apiClient = useMemo(() => {
    return new CaseApiClient(undefined, context.accessToken)
  }, [context.accessToken])

  // Node click handler
  const handleNodeClick = useCallback(
    (clickedCaseId: string) => {
      onCaseSelect?.(clickedCaseId)
    },
    [onCaseSelect]
  )

  // Navigate handler
  const handleNavigate = useCallback(
    (navCaseId: string) => {
      onNavigateToCase?.(navCaseId)
    },
    [onNavigateToCase]
  )

  // Use the graph hook
  const graphData = useCaseGraph({
    caseId,
    apiClient,
    onNodeClick: handleNodeClick,
    onNavigate: handleNavigate,
    currentCase,
    linkedCases
  })

  // Fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // Handle escape key for fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isFullscreen])

  // Error state
  if (graphData.error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="gba:h-4 gba:w-4" />
        <AlertTitle>Failed to load graph</AlertTitle>
        <AlertDescription>{graphData.error}</AlertDescription>
      </Alert>
    )
  }

  // Loading state
  if (graphData.loading && graphData.nodes.length === 0) {
    return (
      <div
        className={`gba:flex gba:items-center gba:justify-center gba:bg-muted/30 gba:rounded-lg gba:border ${className}`}
        style={{ height }}
      >
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-3">
          <Loader2 className="gba:h-8 gba:w-8 gba:animate-spin gba:text-primary" />
          <p className="gba:text-sm gba:text-muted-foreground">Loading case relationships...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      <ReactFlowProvider>
        <CaseRelationshipGraphInner
          graphData={graphData}
          showMinimap={showMinimap}
          showControls={showControls}
          isFullscreen={isFullscreen}
          onFullscreenToggle={handleFullscreenToggle}
          height={height}
          className={className}
          context={context}
        />
      </ReactFlowProvider>
    </div>
  )
}
