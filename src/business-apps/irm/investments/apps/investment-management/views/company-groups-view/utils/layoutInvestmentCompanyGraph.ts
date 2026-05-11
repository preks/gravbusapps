import ELK, { type ElkExtendedEdge, type ElkNode } from 'elkjs/lib/elk.bundled.js'
import { Position } from '@xyflow/react'
import dagre from 'dagre'
import {
  INVESTMENT_COMPANY_GRAPH_NODE_HEIGHT,
  INVESTMENT_COMPANY_GRAPH_NODE_WIDTH
} from '../constants/investmentCompanyGraphConstants'
import type {
  InvestmentCompanyEdgeViewMode,
  InvestmentCompanyGraphNode,
  InvestmentCompanyOwnershipEdge
} from '../types/companyGroupGraphTypes'

const EDGE_LABEL_HEIGHT = 18
const elk = new ELK()

const formatEdgeLabel = (percentage?: number): string => {
  if (percentage === undefined || percentage === null) return 'Ownership'
  return `${percentage}%`
}

const getEdgeLabelWidth = (label: string): number => Math.max(38, label.length * 8 + 16)

const resetEdgeRouting = (edge: InvestmentCompanyOwnershipEdge): InvestmentCompanyOwnershipEdge => ({
  ...edge,
  data: {
    ...edge.data,
    routePoints: undefined,
    labelPosition: undefined
  }
})

function layoutCurvedGraph(
  nodes: InvestmentCompanyGraphNode[],
  edges: InvestmentCompanyOwnershipEdge[]
): { nodes: InvestmentCompanyGraphNode[]; edges: InvestmentCompanyOwnershipEdge[] } {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'TB', nodesep: 90, ranksep: 120, marginx: 40, marginy: 40 })

  nodes.forEach(node =>
    graph.setNode(node.id, {
      width: INVESTMENT_COMPANY_GRAPH_NODE_WIDTH,
      height: INVESTMENT_COMPANY_GRAPH_NODE_HEIGHT
    })
  )
  edges.forEach(edge => graph.setEdge(edge.source, edge.target))
  dagre.layout(graph)

  return {
    nodes: nodes.map(node => {
      const position = graph.node(node.id)
      return {
        ...node,
        position: {
          x: (position?.x ?? 0) - INVESTMENT_COMPANY_GRAPH_NODE_WIDTH / 2,
          y: (position?.y ?? 0) - INVESTMENT_COMPANY_GRAPH_NODE_HEIGHT / 2
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top
      }
    }),
    edges: edges.map(resetEdgeRouting)
  }
}

async function layoutOrthogonalGraph(
  nodes: InvestmentCompanyGraphNode[],
  edges: InvestmentCompanyOwnershipEdge[]
): Promise<{ nodes: InvestmentCompanyGraphNode[]; edges: InvestmentCompanyOwnershipEdge[] }> {
  const elkGraph: ElkNode = {
    id: 'investment-company-graph-view',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.spacing.edgeEdge': '15',
      'elk.spacing.edgeNode': '15',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '15',
      'elk.layered.spacing.edgeNodeBetweenLayers': '20',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.thoroughness': '10',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.edgeLabels.inline': 'false',
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '30',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN'
    },
    children: nodes.map(node => ({
      id: node.id,
      width: INVESTMENT_COMPANY_GRAPH_NODE_WIDTH,
      height: INVESTMENT_COMPANY_GRAPH_NODE_HEIGHT
    })),
    edges: edges.map(edge => {
      const label = formatEdgeLabel(edge.data?.percentage)
      return {
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
        labels: [
          {
            id: `${edge.id}-label`,
            text: label,
            width: getEdgeLabelWidth(label),
            height: EDGE_LABEL_HEIGHT
          }
        ]
      }
    })
  }

  const layouted = await elk.layout(elkGraph)
  const nodePositions = new Map((layouted.children ?? []).map(node => [node.id, node]))
  const edgeRoutes = new Map<string, Array<{ x: number; y: number }> | undefined>()
  const edgeLabelPositions = new Map<string, { x: number; y: number } | undefined>()

  ;(layouted.edges ?? []).forEach(edge => {
    if (!edge.id) return

    const routedEdge = edge as ElkExtendedEdge & {
      sections?: Array<{
        startPoint: { x: number; y: number }
        endPoint: { x: number; y: number }
        bendPoints?: Array<{ x: number; y: number }>
      }>
    }
    const section = routedEdge.sections?.[0]
    const points = section ? [section.startPoint, ...(section.bendPoints || []), section.endPoint] : undefined
    const label = routedEdge.labels?.[0]
    edgeRoutes.set(edge.id, points)
    edgeLabelPositions.set(
      edge.id,
      label
        ? {
            x: (label.x ?? 0) + (label.width ?? 0) / 2,
            y: (label.y ?? 0) + (label.height ?? 0) / 2
          }
        : undefined
    )
  })

  return {
    nodes: nodes.map(node => {
      const position = nodePositions.get(node.id)
      return {
        ...node,
        position: {
          x: position?.x ?? node.position.x,
          y: position?.y ?? node.position.y
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top
      }
    }),
    edges: edges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        routePoints: edgeRoutes.get(edge.id),
        labelPosition: edgeLabelPositions.get(edge.id)
      }
    }))
  }
}

export async function layoutInvestmentCompanyGraph(
  nodes: InvestmentCompanyGraphNode[],
  edges: InvestmentCompanyOwnershipEdge[],
  edgeViewMode: InvestmentCompanyEdgeViewMode
): Promise<{ nodes: InvestmentCompanyGraphNode[]; edges: InvestmentCompanyOwnershipEdge[] }> {
  if (edgeViewMode === 'orthogonal') {
    return layoutOrthogonalGraph(nodes, edges)
  }

  return layoutCurvedGraph(nodes, edges)
}
