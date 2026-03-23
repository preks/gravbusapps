export function useEligibleSendBackTargets(
  nodes: Array<{ id: string; type: string; label?: string }>,
  edges: Array<{ source: string; target: string; direction?: string }>,
  nodeId: string
): Array<{ id: string; label: string }> {
  const forwardEdges = edges.filter(e => String((e as any).direction ?? 'forward').toLowerCase() === 'forward')
  const nextBySource = new Map<string, string[]>()
  for (const edge of forwardEdges) {
    nextBySource.set(edge.source, [...(nextBySource.get(edge.source) ?? []), edge.target])
  }

  const order: string[] = []
  const visited = new Set<string>()
  const start = nodes.find(n => n.type === 'start')?.id
  const queue = [start].filter(Boolean) as string[]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    order.push(current)
    for (const next of nextBySource.get(current) ?? []) queue.push(next)
  }

  const indexById = new Map(order.map((id, i) => [id, i] as const))
  const decisionIndex = indexById.get(nodeId) ?? Number.MAX_SAFE_INTEGER

  return nodes
    .filter(n => n.type === 'task')
    .map(n => ({ id: n.id, label: String(n.label ?? '') }))
    .filter(t => (indexById.get(t.id) ?? Number.MAX_SAFE_INTEGER) < decisionIndex)
}
