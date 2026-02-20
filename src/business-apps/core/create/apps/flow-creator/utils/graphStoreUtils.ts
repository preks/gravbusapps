import { v4 as uuid } from 'uuid'
import { AssignmentMode, FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { FlowGraphEdge, FlowNodeType } from '@/common/components/flow/flow-viewer'
import type {
  DecisionNodeConfig,
  EndNodeConfig,
  ForkNodeConfig,
  JoinNodeConfig,
  StartNodeConfig,
  StudioNode,
  StudioNodeConfig,
  TaskNodeConfig
} from '../types/studioTypes'

export const START_ID = 'start_node'
export const END_ID = 'end_node'

export function createDefaultConfig(type: FlowNodeType): StudioNodeConfig {
  switch (type) {
    case 'start':
      return { nodeType: 'start', triggerType: 'MANUAL_FORM', form: [] } satisfies StartNodeConfig
    case 'task':
      return {
        nodeType: 'task',
        stepType: FlowStepType.TASK,
        kind: 'USER',
        title: 'New Task',
        form: [],
        assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
      } satisfies TaskNodeConfig
    case 'decision':
      return {
        nodeType: 'decision',
        decisionMode: 'USER',
        branches: [
          { id: uuid(), label: 'Approve' },
          { id: uuid(), label: 'Reject' }
        ],
        userConfig: {
          userDecisionType: 'APPROVAL',
          assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM },
          options: [
            { id: 'approve', label: 'Approve' },
            { id: 'reject', label: 'Reject' }
          ]
        }
      } satisfies DecisionNodeConfig
    case 'fork':
      return {
        nodeType: 'fork',
        branches: [
          { id: uuid(), label: 'Branch 1', steps: [] },
          { id: uuid(), label: 'Branch 2', steps: [] }
        ]
      } satisfies ForkNodeConfig
    case 'join':
      return { nodeType: 'join', joinCondition: 'ALL', forkReference: '' } satisfies JoinNodeConfig
    case 'end':
      return { nodeType: 'end', summaryFields: [] } satisfies EndNodeConfig
  }
}

export function labelForType(type: FlowNodeType): string {
  switch (type) {
    case 'start':
      return 'Start'
    case 'task':
      return 'New Task'
    case 'decision':
      return 'Decision'
    case 'fork':
      return 'Parallel Split'
    case 'join':
      return 'Parallel Merge'
    case 'end':
      return 'End'
  }
}

export function createNode(type: FlowNodeType): StudioNode {
  return {
    id: type === 'start' ? START_ID : type === 'end' ? END_ID : uuid(),
    type,
    label: labelForType(type),
    config: createDefaultConfig(type)
  }
}

export function createEdge(
  source: string,
  target: string,
  label?: string,
  direction: 'forward' | 'backward' = 'forward'
): FlowGraphEdge {
  return { id: uuid(), source, target, direction, ...(label ? { label } : {}) }
}

function ensureGraphInvariants(
  nodes: StudioNode[],
  edges: FlowGraphEdge[]
): { nodes: StudioNode[]; edges: FlowGraphEdge[] } {
  const normalizedNodes = [...nodes]
  if (!normalizedNodes.some(n => n.type === 'start')) normalizedNodes.unshift(createNode('start'))
  if (!normalizedNodes.some(n => n.type === 'end')) normalizedNodes.push(createNode('end'))

  const startNode = normalizedNodes.find(n => n.type === 'start')!
  const endNode = normalizedNodes.find(n => n.type === 'end')!
  const nodeIdSet = new Set(normalizedNodes.map(n => n.id))
  const seenIds = new Set<string>()
  const normalizedEdges: FlowGraphEdge[] = []

  const normalizeDirection = (value: unknown): 'forward' | 'backward' => {
    const v = String(value ?? 'forward').toLowerCase()
    return v === 'backward' ? 'backward' : 'forward'
  }

  for (const edge of edges) {
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) continue
    if (edge.target === startNode.id || edge.source === endNode.id) continue
    // Deduplicate by edge id (each edge is a distinct entity)
    if (seenIds.has(edge.id)) continue
    seenIds.add(edge.id)
    normalizedEdges.push({
      ...edge,
      direction: normalizeDirection((edge as any).direction)
    })
  }

  const outForward = new Map<string, number>()
  for (const edge of normalizedEdges) {
    if (edge.direction !== 'forward') continue
    outForward.set(edge.source, (outForward.get(edge.source) ?? 0) + 1)
  }

  if ((outForward.get(startNode.id) ?? 0) === 0) {
    normalizedEdges.push(createEdge(startNode.id, endNode.id))
  }

  for (const node of normalizedNodes) {
    if (node.id === endNode.id) continue
    const hasOutgoing = normalizedEdges.some(e => e.source === node.id && e.direction === 'forward')
    if (!hasOutgoing) normalizedEdges.push(createEdge(node.id, endNode.id))
  }

  return { nodes: normalizedNodes, edges: normalizedEdges }
}

function syncDecisionAndForkConfigs(nodes: StudioNode[], edges: FlowGraphEdge[]): StudioNode[] {
  return nodes.map(node => {
    if (node.config.nodeType === 'decision') {
      // Decision branches are represented by outgoing edges (forward or backward).
      // Backward edges are used for "send back / rework" outcomes.
      const outgoing = edges.filter(e => e.source === node.id)
      const branches = outgoing.map((edge, i) => {
        const previous = node.config.branches.find(b => b.id === edge.id)
        return {
          id: edge.id,
          label: edge.label ?? previous?.label ?? `Branch ${i + 1}`,
          targetNodeId: edge.target,
          condition: typeof edge.metadata?.condition === 'string' ? edge.metadata.condition : previous?.condition
        }
      })
      return {
        ...node,
        config: {
          ...node.config,
          branches,
          defaultBranch:
            node.config.defaultBranch && branches.some(b => b.id === node.config.defaultBranch)
              ? node.config.defaultBranch
              : branches[0]?.id
        }
      }
    }

    if (node.config.nodeType === 'fork') {
      const outgoing = edges.filter(e => e.source === node.id && e.direction === 'forward')
      return {
        ...node,
        config: {
          ...node.config,
          branches: outgoing.map((edge, i) => ({
            id: edge.id,
            label: edge.label ?? `Branch ${i + 1}`,
            steps: [edge.target]
          }))
        }
      }
    }

    return node
  })
}

export function normalizeGraph(
  nodes: StudioNode[],
  edges: FlowGraphEdge[]
): { nodes: StudioNode[]; edges: FlowGraphEdge[] } {
  const invariant = ensureGraphInvariants(nodes, edges)
  return { nodes: syncDecisionAndForkConfigs(invariant.nodes, invariant.edges), edges: invariant.edges }
}

export function nodeToMetadata(node: StudioNode): Record<string, unknown> {
  const config = node.config
  switch (config.nodeType) {
    case 'start':
      return { triggerType: config.triggerType }
    case 'task':
      return {
        taskVariant: config.stepType,
        assignmentMode: config.assignment.assignmentMode,
        isSystem: config.kind === 'SYSTEM',
        description: config.message,
        permissionContext: config.permissionContext
      }
    case 'decision':
      return { decisionMode: config.decisionMode, branchCount: config.branches.length }
    case 'fork':
      return { branchCount: config.branches.length }
    case 'join':
      return { joinCondition: config.joinCondition }
    case 'end':
      return { summaryFieldsCount: config.summaryFields?.length ?? 0 }
    default:
      return {}
  }
}
