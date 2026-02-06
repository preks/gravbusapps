/**
 * useCaseGraph Hook
 *
 * Fetches case data and transforms it into React Flow nodes and edges
 * with dagre-based hierarchical layout for visualization.
 *
 * Features:
 * - Automatic dagre layout (TB/LR)
 * - Extended node data for Mini Case Preview
 * - Live status animation flags
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Node, Edge, MarkerType, Position } from 'reactflow'
import dagre from 'dagre'
import { CaseApiClient } from '../../services/caseApiClient'
import { Case, LinkedCase, CaseStatus, CasePriority, LinkedFlow, CaseNote } from '../../types'
import { CaseNodeData, NotePreview } from './CaseNode'
import { RelationshipEdgeData } from './RelationshipEdge'

/**
 * Check if a date is within the last N hours
 */
const isWithinHours = (dateString: string | undefined, hours: number): boolean => {
  if (!dateString) return false
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours <= hours
}

/**
 * Convert CaseNote to NotePreview for display
 */
const notesToPreview = (notes: CaseNote[] | undefined): NotePreview[] => {
  if (!notes || notes.length === 0) return []
  return notes
    .slice(-3) // Get last 3 notes
    .reverse() // Most recent first
    .map(note => ({
      content: note.content,
      createdBy: note.createdBy,
      createdAt: note.createdAt
    }))
}

/**
 * Check if case needs attention (blocked, overdue, stale)
 */
const checkNeedsAttention = (caseData: Case): boolean => {
  const metadata = caseData.state?.metadata
  if (!metadata) return false

  // Blocked status always needs attention
  if (metadata.status === 'blocked') return true

  // Check if overdue
  if (metadata.dueDate && new Date(metadata.dueDate) < new Date()) {
    return true
  }

  // Check if high/critical priority and not progressing
  if (['high', 'critical'].includes(metadata.priority || '')) {
    const linkedFlows = caseData.state?.linkedFlows || []
    const activeFlows = linkedFlows.filter(f => !f.removedAt)
    const hasStuckFlow = activeFlows.some(
      f => f.status === 'IN_PROGRESS' && f.completedSteps === 0 && isWithinHours(f.startTime, -48)
    )
    if (hasStuckFlow) return true
  }

  return false
}

/**
 * Check if case has actively running flows
 */
const checkHasActiveFlows = (linkedFlows: LinkedFlow[] | undefined): boolean => {
  if (!linkedFlows) return false
  return linkedFlows.some(
    f => !f.removedAt && ['IN_PROGRESS', 'RUNNING'].includes(f.status || '') && f.completedSteps !== f.totalSteps
  )
}

/**
 * Layout direction options
 */
export type LayoutDirection = 'TB' | 'LR' // Top-to-bottom or Left-to-right

/**
 * Graph node dimensions
 */
const NODE_WIDTH = 220
const NODE_HEIGHT = 140

/**
 * Configuration for dagre layout
 */
const DAGRE_CONFIG = {
  rankdir: 'TB' as const, // Top to bottom layout
  nodesep: 80, // Horizontal spacing between nodes
  ranksep: 100, // Vertical spacing between ranks
  edgesep: 20, // Spacing between edges
  marginx: 40,
  marginy: 40
}

/**
 * Calculate progress for a case based on linked flows
 */
const calculateCaseProgress = (linkedFlows: LinkedFlow[] | undefined): number => {
  if (!linkedFlows || linkedFlows.length === 0) return 0

  // Filter out removed flows
  const activeFlows = linkedFlows.filter(f => !f.removedAt)
  if (activeFlows.length === 0) return 0

  // Calculate average progress
  const totalProgress = activeFlows.reduce((sum, flow) => {
    return sum + (flow.progressPercentage || 0)
  }, 0)

  return totalProgress / activeFlows.length
}

/**
 * Count active flows in a case
 */
const countActiveFlows = (linkedFlows: LinkedFlow[] | undefined): number => {
  if (!linkedFlows) return 0
  return linkedFlows.filter(f => !f.removedAt).length
}

/**
 * Apply dagre layout to nodes and edges
 */
const applyDagreLayout = (
  nodes: Node<CaseNodeData>[],
  edges: Edge<RelationshipEdgeData>[],
  direction: LayoutDirection = 'TB'
): Node<CaseNodeData>[] => {
  const dagreGraph = new dagre.graphlib.Graph()

  // Set graph options
  dagreGraph.setGraph({
    ...DAGRE_CONFIG,
    rankdir: direction
  })

  // Prevent edge label placement issues
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  // Add nodes to dagre
  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  // Add edges to dagre
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Run layout algorithm
  dagre.layout(dagreGraph)

  // Apply positions from dagre to nodes
  return nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id)

    // Center the node based on dagre's positioning
    const newNode = {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2
      },
      // Update source/target positions based on layout direction
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top
    }

    return newNode
  })
}

/**
 * Transform a case to a graph node with extended preview data
 */
const caseToNode = (
  caseData: Case,
  isCurrent: boolean,
  onClick: (caseId: string) => void,
  onNavigate?: (caseId: string) => void,
  assigneeNameMap?: Map<string, string>
): Node<CaseNodeData> => {
  const metadata = caseData.state?.metadata
  const linkedFlows = caseData.state?.linkedFlows

  // Resolve assignee name
  const assigneeId = metadata?.assignedTo
  const assigneeName = assigneeId && assigneeNameMap?.has(assigneeId) ? assigneeNameMap.get(assigneeId) : undefined

  return {
    id: caseData.caseId,
    type: 'caseNode',
    position: { x: 0, y: 0 }, // Will be set by dagre
    data: {
      caseId: caseData.caseId,
      title: metadata?.title || 'Untitled Case',
      description: metadata?.description,
      status: (metadata?.status as CaseStatus) || 'open',
      priority: (metadata?.priority as CasePriority) || 'medium',
      progress: calculateCaseProgress(linkedFlows),
      isCurrent,
      flowCount: countActiveFlows(linkedFlows),
      onClick,
      onNavigate,

      // Extended preview data
      assigneeId,
      assigneeName,
      dueDate: metadata?.dueDate,
      updatedAt: caseData.updatedAt,
      recentNotes: notesToPreview(metadata?.notes),
      notesCount: metadata?.notes?.length || 0,

      // Animation flags
      isRecentlyUpdated: isWithinHours(caseData.updatedAt, 24),
      needsAttention: checkNeedsAttention(caseData),
      hasActiveFlows: checkHasActiveFlows(linkedFlows)
    }
  }
}

/**
 * Transform linked case info to a graph node
 * Note: This is a minimal version with limited data
 * Full details are fetched separately when available
 */
const linkedCaseToNode = (
  linkedCase: LinkedCase,
  onClick: (caseId: string) => void,
  onNavigate?: (caseId: string) => void
): Node<CaseNodeData> => {
  return {
    id: linkedCase.caseId,
    type: 'caseNode',
    position: { x: 0, y: 0 }, // Will be set by dagre
    data: {
      caseId: linkedCase.caseId,
      title: linkedCase.title || 'Linked Case',
      status: (linkedCase.status as CaseStatus) || 'open',
      priority: 'medium', // Default since LinkedCase doesn't have priority
      progress: 0, // Would need to fetch full case data to know
      isCurrent: false,
      flowCount: 0, // Would need to fetch full case data to know
      onClick,
      onNavigate,

      // Minimal preview data (no full details without extra fetch)
      isRecentlyUpdated: false,
      needsAttention: linkedCase.status === 'blocked',
      hasActiveFlows: false
    }
  }
}

/**
 * Create edge between cases based on relationship
 */
const createEdge = (
  sourceId: string,
  targetId: string,
  relationship: 'parent' | 'child' | 'related',
  layoutDirection: LayoutDirection = 'TB'
): Edge<RelationshipEdgeData> => {
  const isHierarchical = relationship === 'parent' || relationship === 'child'

  // Determine handle IDs based on layout direction
  const sourceHandle = layoutDirection === 'LR' ? 'right' : 'bottom'
  const targetHandle = layoutDirection === 'LR' ? 'left' : 'top'

  return {
    id: `${sourceId}-${targetId}-${layoutDirection}`,
    source: relationship === 'parent' ? targetId : sourceId, // Parent points to child
    target: relationship === 'parent' ? sourceId : targetId,
    sourceHandle,
    targetHandle,
    type: 'relationshipEdge',
    data: {
      relationship: relationship === 'parent' ? 'child' : relationship,
      showLabel: true,
      animated: false
    },
    animated: false,
    style: {
      strokeWidth: isHierarchical ? 2 : 1.5
    },
    markerEnd: isHierarchical
      ? {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6'
        }
      : undefined
  }
}

/**
 * Hook return type
 */
export interface UseCaseGraphResult {
  /** React Flow nodes */
  nodes: Node<CaseNodeData>[]
  /** React Flow edges */
  edges: Edge<RelationshipEdgeData>[]
  /** Loading state */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Current layout direction */
  layoutDirection: LayoutDirection
  /** Set layout direction */
  setLayoutDirection: (direction: LayoutDirection) => void
  /** Refresh the graph data */
  refresh: () => Promise<void>
}

/**
 * Hook props
 */
export interface UseCaseGraphProps {
  /** Current case ID */
  caseId: string
  /** API client instance */
  apiClient: CaseApiClient
  /** Callback when a node is clicked */
  onNodeClick?: (caseId: string) => void
  /** Callback to navigate to a case */
  onNavigate?: (caseId: string) => void
  /** Current case data (optional, avoids extra fetch) */
  currentCase?: Case
  /** Linked cases data (optional, avoids extra fetch) */
  linkedCases?: LinkedCase[]
}

/**
 * useCaseGraph Hook
 *
 * Manages the case relationship graph data and layout.
 * Fetches linked cases and transforms them into React Flow format
 * with automatic dagre layout.
 */
export const useCaseGraph = ({
  caseId,
  apiClient,
  onNodeClick,
  onNavigate,
  currentCase,
  linkedCases: initialLinkedCases
}: UseCaseGraphProps): UseCaseGraphResult => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR')
  const [caseData, setCaseData] = useState<Case | null>(currentCase || null)
  const [linkedCases, setLinkedCases] = useState<LinkedCase[]>(initialLinkedCases || [])
  const [linkedCaseDetails, setLinkedCaseDetails] = useState<Map<string, Case>>(new Map())

  /**
   * Merge progress data from flows endpoint into case data
   * Uses the flows array directly since it has all the progress data
   */
  const mergeCaseWithFlowProgress = (caseData: Case, flows: LinkedFlow[]): Case => {
    // If no flows from API, keep original linkedFlows
    if (!flows || flows.length === 0) {
      return caseData
    }

    // Use flows array directly - it has all the progress data we need
    // The flows from getLinkedFlows already contain workflowId, status, progress, etc.
    return {
      ...caseData,
      state: {
        ...caseData.state,
        linkedFlows: flows
      }
    }
  }

  /**
   * Fetch graph data including flow progress
   */
  const fetchGraphData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch current case if not provided
      let currentCaseData = currentCase
      if (!currentCaseData) {
        currentCaseData = await apiClient.getCaseById(caseId)
      }

      // Fetch linked flows with progress data for current case
      const currentCaseFlows = await apiClient.getLinkedFlows(caseId)
      currentCaseData = mergeCaseWithFlowProgress(currentCaseData, currentCaseFlows)
      setCaseData(currentCaseData)

      // Fetch linked cases if not provided
      let linkedCasesData = initialLinkedCases
      if (!linkedCasesData || linkedCasesData.length === 0) {
        linkedCasesData = await apiClient.getLinkedCases(caseId)
      }
      setLinkedCases(linkedCasesData)

      // Fetch full details for linked cases (including flow progress)
      const detailsMap = new Map<string, Case>()
      const fetchPromises = linkedCasesData.map(async linkedCase => {
        try {
          // Fetch case details and flow progress in parallel
          const [details, flows] = await Promise.all([
            apiClient.getCaseById(linkedCase.caseId),
            apiClient.getLinkedFlows(linkedCase.caseId)
          ])
          // Merge progress data into case details
          detailsMap.set(linkedCase.caseId, mergeCaseWithFlowProgress(details, flows))
        } catch (err) {
          // Silently fail for individual case fetches
          console.warn(`Failed to fetch details for case ${linkedCase.caseId}:`, err)
        }
      })

      await Promise.all(fetchPromises)
      setLinkedCaseDetails(detailsMap)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load graph data'
      setError(message)
      console.error('Error fetching graph data:', err)
    } finally {
      setLoading(false)
    }
  }, [caseId, apiClient, currentCase, initialLinkedCases])

  // Initial fetch
  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  /**
   * Transform data to nodes and edges with extended preview data
   */
  const { nodes, edges } = useMemo(() => {
    if (!caseData) {
      return { nodes: [], edges: [] }
    }

    const handleNodeClick = (clickedCaseId: string) => {
      onNodeClick?.(clickedCaseId)
    }

    const handleNavigate = (navCaseId: string) => {
      onNavigate?.(navCaseId)
    }

    // Note: Assignee names could be resolved with an employee cache hook
    // For now we pass undefined - the UI will show IDs or fallback
    const assigneeNameMap: Map<string, string> | undefined = undefined

    // Create node for current case with full preview data
    const currentNode = caseToNode(caseData, true, handleNodeClick, handleNavigate, assigneeNameMap)

    // Create nodes for linked cases
    const linkedNodes: Node<CaseNodeData>[] = linkedCases.map(linkedCase => {
      // Check if we have full details (includes preview data)
      const fullDetails = linkedCaseDetails.get(linkedCase.caseId)
      if (fullDetails) {
        return caseToNode(fullDetails, false, handleNodeClick, handleNavigate, assigneeNameMap)
      }
      // Fallback to minimal node data
      return linkedCaseToNode(linkedCase, handleNodeClick, handleNavigate)
    })

    // Combine all nodes
    const allNodes = [currentNode, ...linkedNodes]

    // Create edges with correct handles based on layout direction
    const allEdges: Edge<RelationshipEdgeData>[] = linkedCases.map(linkedCase => {
      return createEdge(caseData.caseId, linkedCase.caseId, linkedCase.relationship, layoutDirection)
    })

    // Apply dagre layout
    const layoutedNodes = applyDagreLayout(allNodes, allEdges, layoutDirection)

    return {
      nodes: layoutedNodes,
      edges: allEdges
    }
  }, [caseData, linkedCases, linkedCaseDetails, layoutDirection, onNodeClick, onNavigate])

  return {
    nodes,
    edges,
    loading,
    error,
    layoutDirection,
    setLayoutDirection,
    refresh: fetchGraphData
  }
}
