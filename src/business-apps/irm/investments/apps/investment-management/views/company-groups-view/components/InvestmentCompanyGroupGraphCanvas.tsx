import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Spinner } from '@newwork/nw-design-system'
import { InvestmentCompanyGraphLockedSummary } from './InvestmentCompanyGraphLockedSummary'
import { InvestmentCompanyNode } from './InvestmentCompanyNode'
import { InvestmentCompanyGraphToolbar } from './InvestmentCompanyGraphToolbar'
import { OwnershipEdge } from './OwnershipEdge'
import { layoutInvestmentCompanyGraph } from '../utils/layoutInvestmentCompanyGraph'
import {
  INVESTMENT_COMPANY_GRAPH_NODE_HEIGHT,
  INVESTMENT_COMPANY_GRAPH_NODE_WIDTH,
  SEARCH_HIGHLIGHT_DURATION_MS
} from '../constants/investmentCompanyGraphConstants'
import { useInvestmentCompanyGraphDisplay } from '../hooks/useInvestmentCompanyGraphDisplay'
import { useInvestmentCompanyGraphFocus } from '../hooks/useInvestmentCompanyGraphFocus'
import { useInvestmentCompanyGraphLocks } from '../hooks/useInvestmentCompanyGraphLocks'
import type {
  InvestmentCompanyEdgeViewMode,
  InvestmentCompanyGraphNode,
  InvestmentCompanyOwnershipEdge,
  InvestmentCompanyRelationshipDisplayMode
} from '../types/companyGroupGraphTypes'

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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchHighlightedInvestmentCompanyId, setSearchHighlightedInvestmentCompanyId] = useState<string | undefined>()
  const [relationshipDisplayMode, setRelationshipDisplayMode] =
    useState<InvestmentCompanyRelationshipDisplayMode>('locked')
  const [edgeViewMode, setEdgeViewMode] = useState<InvestmentCompanyEdgeViewMode>('curved')
  const graphContainerRef = useRef<HTMLDivElement | null>(null)
  const searchHighlightTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>()
  const { fitView, setCenter } = useReactFlow()

  const handleNodesChange = useCallback(
    (changes: NodeChange<InvestmentCompanyGraphNode>[]) => {
      onNodesChange(changes.filter(change => change.type !== 'position'))
    },
    [onNodesChange]
  )

  const centerOnNode = useCallback(
    (node: InvestmentCompanyGraphNode) => {
      setCenter(
        node.position.x + INVESTMENT_COMPANY_GRAPH_NODE_WIDTH / 2,
        node.position.y + INVESTMENT_COMPANY_GRAPH_NODE_HEIGHT / 2,
        {
          zoom: 0.9,
          duration: 500
        }
      ).catch(() => undefined)
    },
    [setCenter]
  )

  useEffect(() => {
    let isActive = true

    layoutInvestmentCompanyGraph(inputNodes, inputEdges, edgeViewMode).then(layoutedGraph => {
      if (!isActive) return

      setNodes(layoutedGraph.nodes)
      setEdges(layoutedGraph.edges)
    })

    return () => {
      isActive = false
    }
  }, [edgeViewMode, inputEdges, inputNodes, setEdges, setNodes])

  useEffect(() => {
    if (inputNodes.length === 0) return
    const fitTimer = globalThis.setTimeout(() => fitView({ padding: 0.25, maxZoom: 1 }), 100)
    return () => globalThis.clearTimeout(fitTimer)
  }, [fitView, inputNodes.length])

  useEffect(() => {
    return () => {
      if (searchHighlightTimerRef.current) {
        globalThis.clearTimeout(searchHighlightTimerRef.current)
      }
    }
  }, [])

  const {
    activeInvestmentCompanyIds,
    clearLockInteractionState,
    handleHoverCompany,
    handleLockCompany,
    handleUnlockAllCompanies,
    handleUnlockCompany,
    highlightedInvestmentCompanyIds,
    lockedInvestmentCompanies,
    lockedInvestmentCompanyIds,
    lockedInvestmentCompanyIdSet
  } = useInvestmentCompanyGraphLocks({
    edges,
    nodes,
    onCenterNode: centerOnNode,
    searchHighlightedInvestmentCompanyId
  })

  const { focusLockedOnly, handleFocusLockedOnlyChange, renderEdges, renderNodes, setFocusLockedOnly } =
    useInvestmentCompanyGraphFocus({
      edgeViewMode,
      edges,
      graphContainerRef,
      lockedInvestmentCompanyIds,
      lockedInvestmentCompanyIdSet,
      nodes
    })

  const handleEdgeViewModeChange = useCallback(
    (mode: InvestmentCompanyEdgeViewMode) => {
      setEdgeViewMode(mode)
      if (mode === 'curved' && relationshipDisplayMode === 'allPercentages') {
        setRelationshipDisplayMode('all')
      }
    },
    [relationshipDisplayMode]
  )

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return []

    return nodes
      .filter(node => {
        const name = node.data.name.toLowerCase()
        const code = node.data.code?.toLowerCase() || ''
        return name.includes(normalizedQuery) || code.includes(normalizedQuery)
      })
      .slice(0, 8)
  }, [nodes, searchQuery])

  const handleJumpToCompany = useCallback(
    (investmentCompanyId: string) => {
      const node = nodes.find(currentNode => currentNode.id === investmentCompanyId)
      if (!node) return

      clearLockInteractionState()
      setFocusLockedOnly(false)
      setSearchHighlightedInvestmentCompanyId(investmentCompanyId)
      centerOnNode(node)

      if (searchHighlightTimerRef.current) {
        globalThis.clearTimeout(searchHighlightTimerRef.current)
      }
      searchHighlightTimerRef.current = globalThis.setTimeout(() => {
        setSearchHighlightedInvestmentCompanyId(undefined)
      }, SEARCH_HIGHLIGHT_DURATION_MS)
    },
    [centerOnNode, clearLockInteractionState, nodes, setFocusLockedOnly]
  )

  const handleJumpToFirstNode = useCallback(() => {
    const [firstNode] = [...renderNodes].sort((first, second) => {
      const verticalDistance = first.position.y - second.position.y
      if (verticalDistance !== 0) return verticalDistance
      return first.position.x - second.position.x
    })

    if (firstNode) centerOnNode(firstNode)
  }, [centerOnNode, renderNodes])

  const { displayedEdges, displayedNodes } = useInvestmentCompanyGraphDisplay({
    activeInvestmentCompanyIds,
    edgeViewMode,
    highlightedInvestmentCompanyIds,
    lockedInvestmentCompanyIds,
    lockedInvestmentCompanyIdSet,
    relationshipDisplayMode,
    renderEdges,
    renderNodes,
    onHoverCompany: handleHoverCompany,
    onLockCompany: handleLockCompany,
    onUnlockCompany: handleUnlockCompany
  })

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
      ref={graphContainerRef}
      className="gba:relative gba:h-full gba:min-h-96 gba:w-full gba:overflow-hidden gba:rounded-xl gba:bg-muted/30"
      data-testid="company-group-ownership-graph"
    >
      <InvestmentCompanyGraphToolbar
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchResultCount={searchResults.length}
        relationshipDisplayMode={relationshipDisplayMode}
        edgeViewMode={edgeViewMode}
        onSearchOpenChange={setSearchOpen}
        onSearchQueryChange={setSearchQuery}
        onJumpToCompany={handleJumpToCompany}
        onJumpToFirstNode={handleJumpToFirstNode}
        onRelationshipDisplayModeChange={setRelationshipDisplayMode}
        onEdgeViewModeChange={handleEdgeViewModeChange}
      />
      {lockedInvestmentCompanyIds.length > 0 && (
        <InvestmentCompanyGraphLockedSummary
          investmentCompanies={lockedInvestmentCompanies}
          focusLockedOnly={focusLockedOnly}
          onFocusLockedOnlyChange={handleFocusLockedOnlyChange}
          onUnlock={handleUnlockCompany}
          onUnlockAll={handleUnlockAllCompanies}
        />
      )}
      <ReactFlow
        nodes={displayedNodes}
        edges={displayedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        proOptions={proOptions}
        nodesDraggable={false}
        onlyRenderVisibleElements
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        className="gba:bg-muted/30"
      >
        <Background gap={24} size={1} className="gba:opacity-70" />
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
