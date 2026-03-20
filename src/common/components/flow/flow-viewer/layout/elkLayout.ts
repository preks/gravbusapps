/**
 * ELK.js auto-layout engine for the FlowViewer.
 * Computes node positions and edge routing for complex flow graphs
 * including branching, parallel paths, and backward (rework) edges.
 */

import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js'
import {
  getNodeDimensions,
  CIRCULAR_NODE_SIZE,
  DECISION_NODE_SIZE,
  TASK_NODE_WIDTH,
  TASK_NODE_HEIGHT,
  BAR_NODE_WIDTH,
  BAR_NODE_HEIGHT
} from '../nodes/nodeDimensions'
import type { FlowGraphDefinition } from '../types/viewerTypes'

const elk = new ELK()

export interface LayoutOptions {
  /** Layout direction: top-to-bottom or left-to-right */
  direction?: 'TB' | 'LR'
  /** When true, only forward edges are used for layer ranking; backward (rework) edges do not affect layout. */
  useForwardEdgesOnlyForRanking?: boolean
  /** Spacing between nodes on the same layer */
  nodeSpacing?: number
  /** Spacing between layers */
  layerSpacing?: number
  /** Minimal distance between edges and nodes */
  edgeNodeSpacing?: number
  /** Minimal distance between parallel edges */
  edgeEdgeSpacing?: number
  /** Node dimensions */
  nodeWidth?: number
  nodeHeight?: number
  /** Start/end node dimensions (circular) */
  circularNodeSize?: number
  /** Decision node dimensions */
  decisionNodeSize?: number
  /** Fork/join bar dimensions */
  barWidth?: number
  barHeight?: number
}

export const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  direction: 'TB',
  useForwardEdgesOnlyForRanking: true,
  nodeSpacing: 60,
  layerSpacing: 100,
  edgeNodeSpacing: 24,
  edgeEdgeSpacing: 16,
  nodeWidth: TASK_NODE_WIDTH,
  nodeHeight: TASK_NODE_HEIGHT,
  circularNodeSize: CIRCULAR_NODE_SIZE,
  decisionNodeSize: DECISION_NODE_SIZE,
  barWidth: BAR_NODE_WIDTH,
  barHeight: BAR_NODE_HEIGHT
}

export interface LayoutResult {
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>
  edges: Array<{
    id: string
    points: Array<{ x: number; y: number }>
  }>
}

export async function computeLayout(definition: FlowGraphDefinition, options?: LayoutOptions): Promise<LayoutResult> {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options }

  const elkChildren: ElkNode[] = definition.nodes.map(node => {
    const dims = getNodeDimensions(node.type)
    return {
      id: node.id,
      width: dims.width,
      height: dims.height
    }
  })

  const edgesForRanking =
    opts.useForwardEdgesOnlyForRanking === true
      ? definition.edges.filter(e => e.direction !== 'backward')
      : definition.edges

  const elkEdges: ElkExtendedEdge[] = edgesForRanking.map(edge => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target]
  }))

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': opts.direction === 'TB' ? 'DOWN' : 'RIGHT',
      'elk.spacing.nodeNode': String(opts.nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.layerSpacing),
      // Keep a minimum clearance around nodes so orthogonal edge routes don't hug boxes.
      'elk.spacing.edgeNode': String(opts.edgeNodeSpacing),
      'elk.layered.spacing.edgeNodeBetweenLayers': String(opts.edgeNodeSpacing),
      // Avoid edges being rendered too tightly when multiple routes run in parallel.
      'elk.spacing.edgeEdge': String(opts.edgeEdgeSpacing),
      'elk.layered.spacing.edgeEdgeBetweenLayers': String(opts.edgeEdgeSpacing),
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.alignment': 'CENTER',
      'elk.contentAlignment': 'H_CENTER'
    },
    children: elkChildren,
    edges: elkEdges
  }

  const layouted = await elk.layout(elkGraph)

  const nodes: LayoutResult['nodes'] = (layouted.children ?? []).map(child => ({
    id: child.id,
    x: child.x ?? 0,
    y: child.y ?? 0,
    width: child.width ?? opts.nodeWidth,
    height: child.height ?? opts.nodeHeight
  }))

  const edges: LayoutResult['edges'] = (layouted.edges ?? []).map(edge => {
    const elkEdge = edge as ElkExtendedEdge & {
      sections?: Array<{
        startPoint: { x: number; y: number }
        endPoint: { x: number; y: number }
        bendPoints?: Array<{ x: number; y: number }>
      }>
    }
    const points: Array<{ x: number; y: number }> = []

    if (elkEdge.sections && elkEdge.sections.length > 0) {
      const section = elkEdge.sections[0]
      points.push(section.startPoint)
      if (section.bendPoints) {
        points.push(...section.bendPoints)
      }
      points.push(section.endPoint)
    }

    return { id: edge.id, points }
  })

  return { nodes, edges }
}
