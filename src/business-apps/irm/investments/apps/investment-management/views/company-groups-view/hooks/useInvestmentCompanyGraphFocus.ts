import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import { getNodesBounds, getViewportForBounds, useReactFlow } from '@xyflow/react'
import {
  INVESTMENT_COMPANY_GRAPH_NODE_HEIGHT,
  INVESTMENT_COMPANY_GRAPH_NODE_WIDTH
} from '../constants/investmentCompanyGraphConstants'
import { layoutInvestmentCompanyGraph } from '../utils/layoutInvestmentCompanyGraph'
import type {
  InvestmentCompanyEdgeViewMode,
  InvestmentCompanyGraphNode,
  InvestmentCompanyOwnershipEdge
} from '../types/companyGroupGraphTypes'

const getLockedNeighborhoodIds = (lockedIds: Set<string>, edges: InvestmentCompanyOwnershipEdge[]): Set<string> => {
  return edges.reduce((visibleIds, edge) => {
    if (lockedIds.has(edge.source) || lockedIds.has(edge.target)) {
      visibleIds.add(edge.source)
      visibleIds.add(edge.target)
    }

    return visibleIds
  }, new Set<string>(lockedIds))
}

const getSizedNodes = (nodes: InvestmentCompanyGraphNode[]): InvestmentCompanyGraphNode[] => {
  return nodes.map(node => ({
    ...node,
    height: node.height ?? INVESTMENT_COMPANY_GRAPH_NODE_HEIGHT,
    width: node.width ?? INVESTMENT_COMPANY_GRAPH_NODE_WIDTH
  }))
}

const runAfterNextPaint = (frameRef: MutableRefObject<number | undefined>, callback: () => void) => {
  const scheduleCallback = () => {
    frameRef.current = globalThis.requestAnimationFrame(callback)
  }

  frameRef.current = globalThis.requestAnimationFrame(scheduleCallback)
}

const centerGraphOnNode = (
  setCenter: ReturnType<typeof useReactFlow>['setCenter'],
  node: InvestmentCompanyGraphNode
) => {
  setCenter(
    node.position.x + INVESTMENT_COMPANY_GRAPH_NODE_WIDTH / 2,
    node.position.y + INVESTMENT_COMPANY_GRAPH_NODE_HEIGHT / 2,
    {
      zoom: 0.9,
      duration: 500
    }
  ).catch(() => undefined)
}

const fitGraphToNodes = (
  setViewport: ReturnType<typeof useReactFlow>['setViewport'],
  graphContainer: HTMLDivElement,
  nodes: InvestmentCompanyGraphNode[]
) => {
  const { clientHeight, clientWidth } = graphContainer
  if (clientHeight === 0 || clientWidth === 0) return

  const bounds = getNodesBounds(getSizedNodes(nodes))
  const viewport = getViewportForBounds(bounds, clientWidth, clientHeight, 0.1, 1, 0.3)

  setViewport(viewport, { duration: 500 }).catch(() => undefined)
}

interface UseInvestmentCompanyGraphFocusArgs {
  edgeViewMode: InvestmentCompanyEdgeViewMode
  edges: InvestmentCompanyOwnershipEdge[]
  graphContainerRef: RefObject<HTMLDivElement | null>
  lockedInvestmentCompanyIds: string[]
  lockedInvestmentCompanyIdSet: Set<string>
  nodes: InvestmentCompanyGraphNode[]
}

export function useInvestmentCompanyGraphFocus({
  edgeViewMode,
  edges,
  graphContainerRef,
  lockedInvestmentCompanyIds,
  lockedInvestmentCompanyIdSet,
  nodes
}: UseInvestmentCompanyGraphFocusArgs) {
  const [focusLockedOnly, setFocusLockedOnly] = useState(false)
  const [focusedGraph, setFocusedGraph] = useState<{
    nodes: InvestmentCompanyGraphNode[]
    edges: InvestmentCompanyOwnershipEdge[]
  } | null>(null)
  const focusFitFrameRef = useRef<number | undefined>()
  const focusReturnFrameRef = useRef<number | undefined>()
  const focusReturnNodeIdRef = useRef<string | undefined>()
  const { setCenter, setViewport } = useReactFlow()

  useEffect(() => {
    return () => {
      if (focusFitFrameRef.current) {
        globalThis.cancelAnimationFrame(focusFitFrameRef.current)
      }
      if (focusReturnFrameRef.current) {
        globalThis.cancelAnimationFrame(focusReturnFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (lockedInvestmentCompanyIds.length === 0) setFocusLockedOnly(false)
  }, [lockedInvestmentCompanyIds.length])

  const focusedNodeIds = useMemo(
    () => getLockedNeighborhoodIds(lockedInvestmentCompanyIdSet, edges),
    [edges, lockedInvestmentCompanyIdSet]
  )

  const shouldFocusLockedOnly = focusLockedOnly && lockedInvestmentCompanyIds.length > 0

  const visibleNodes = useMemo(
    () => (shouldFocusLockedOnly ? nodes.filter(node => focusedNodeIds.has(node.id)) : nodes),
    [focusedNodeIds, nodes, shouldFocusLockedOnly]
  )

  const visibleEdges = useMemo(
    () =>
      shouldFocusLockedOnly
        ? edges.filter(
            edge =>
              focusedNodeIds.has(edge.source) &&
              focusedNodeIds.has(edge.target) &&
              (lockedInvestmentCompanyIdSet.has(edge.source) || lockedInvestmentCompanyIdSet.has(edge.target))
          )
        : edges,
    [edges, focusedNodeIds, lockedInvestmentCompanyIdSet, shouldFocusLockedOnly]
  )

  useEffect(() => {
    if (!shouldFocusLockedOnly || visibleNodes.length === 0) {
      setFocusedGraph(null)
      return
    }

    let isActive = true
    const resetNodes = visibleNodes.map(node => ({ ...node, position: { x: 0, y: 0 } }))

    layoutInvestmentCompanyGraph(resetNodes, visibleEdges, edgeViewMode).then(layoutedGraph => {
      if (!isActive) return
      setFocusedGraph(layoutedGraph)
    })

    return () => {
      isActive = false
    }
  }, [edgeViewMode, shouldFocusLockedOnly, visibleEdges, visibleNodes])

  const renderNodes = shouldFocusLockedOnly && focusedGraph ? focusedGraph.nodes : visibleNodes
  const renderEdges = shouldFocusLockedOnly && focusedGraph ? focusedGraph.edges : visibleEdges

  const handleFocusLockedOnlyChange = useCallback(
    (nextFocusLockedOnly: boolean) => {
      if (!nextFocusLockedOnly) {
        focusReturnNodeIdRef.current = lockedInvestmentCompanyIds[0]
      }

      setFocusLockedOnly(nextFocusLockedOnly)
    },
    [lockedInvestmentCompanyIds]
  )

  useEffect(() => {
    const focusReturnNodeId = focusReturnNodeIdRef.current
    if (shouldFocusLockedOnly || !focusReturnNodeId) return

    const focusReturnNode = renderNodes.find(node => node.id === focusReturnNodeId)
    if (!focusReturnNode) return

    if (focusReturnFrameRef.current) {
      globalThis.cancelAnimationFrame(focusReturnFrameRef.current)
    }

    runAfterNextPaint(focusReturnFrameRef, () => {
      centerGraphOnNode(setCenter, focusReturnNode)
      focusReturnNodeIdRef.current = undefined
    })

    return () => {
      if (focusReturnFrameRef.current) {
        globalThis.cancelAnimationFrame(focusReturnFrameRef.current)
      }
    }
  }, [renderNodes, setCenter, shouldFocusLockedOnly])

  useEffect(() => {
    if (!shouldFocusLockedOnly || renderNodes.length === 0) return
    const graphContainer = graphContainerRef.current
    if (!graphContainer) return

    runAfterNextPaint(focusFitFrameRef, () => {
      fitGraphToNodes(setViewport, graphContainer, renderNodes)
    })

    return () => {
      if (focusFitFrameRef.current) {
        globalThis.cancelAnimationFrame(focusFitFrameRef.current)
      }
    }
  }, [graphContainerRef, renderNodes, setViewport, shouldFocusLockedOnly])

  return {
    focusLockedOnly,
    handleFocusLockedOnlyChange,
    renderEdges,
    renderNodes,
    setFocusLockedOnly,
    shouldFocusLockedOnly
  }
}
