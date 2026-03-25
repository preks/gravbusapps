import dagre from 'dagre'

const NODE_WIDTH = 220
const NODE_HEIGHT = 100

export interface MeshLayoutAgent {
  id: string
}

export interface MeshLayoutConnection {
  caller_id: string
  callee_id: string
}

/**
 * Compute dagre layout positions for agents and their connections.
 * Pure function; used by both the full Agent Mesh dashboard and the orchestrator preview.
 */
export function getLayoutedPositions(
  agents: MeshLayoutAgent[],
  connections: MeshLayoutConnection[]
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 160 })
  g.setDefaultEdgeLabel(() => ({}))

  agents.forEach(a => g.setNode(a.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  connections.forEach(c => g.setEdge(c.caller_id, c.callee_id))
  dagre.layout(g)

  const positions: Record<string, { x: number; y: number }> = {}
  agents.forEach(a => {
    const node = g.node(a.id)
    if (node) {
      positions[a.id] = { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 }
    }
  })
  return positions
}
