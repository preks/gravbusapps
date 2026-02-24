import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { FlowGraphDefinition, FlowGraphEdge, FlowNodeType } from '@/common/components/flow/flow-viewer'
import type { FlowTags } from '@/business-apps/flow/types'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type {
  DesignerMode,
  FlowStudioActions,
  FlowStudioSnapshot,
  FlowStudioState,
  StudioNode,
  StudioNodeConfig
} from '../types/studioTypes'
import { createEdge, createNode, END_ID, nodeToMetadata, normalizeGraph, START_ID } from '../utils/graphStoreUtils'

const MAX_UNDO = 50
const initialGraph = normalizeGraph([createNode('start'), createNode('end')], [createEdge('start_node', 'end_node')])

const initialState: FlowStudioState = {
  mode: 'simple',
  nodes: initialGraph.nodes,
  edges: initialGraph.edges,
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedEdgePanel: 'details',
  edgePanelLock: null,
  templateName: 'Untitled Flow',
  templateTags: {},
  templateVersion: 1,
  isDirty: false,
  isLoading: false,
  pendingDelete: null,
  undoStack: [],
  redoStack: []
}

function setDirtyGraph(
  set: (partial: Partial<FlowStudioState & FlowStudioActions>) => void,
  next: { nodes: StudioNode[]; edges: FlowGraphEdge[] },
  extra?: Partial<FlowStudioState & FlowStudioActions>
) {
  set({ ...next, isDirty: true, redoStack: [], ...extra })
}

function collectReachableNodes(edges: FlowGraphEdge[], startId: string): Set<string> {
  const adjacency = new Map<string, string[]>()
  for (const e of edges) {
    if (e.direction !== 'forward') continue
    const list = adjacency.get(e.source) ?? []
    list.push(e.target)
    adjacency.set(e.source, list)
  }

  const reachable = new Set<string>()
  const stack: string[] = [startId]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (reachable.has(current)) continue
    reachable.add(current)
    const next = adjacency.get(current) ?? []
    for (const id of next) stack.push(id)
  }
  return reachable
}

function orphanedNodeIdsAfterEdgeRemoval(
  nodes: StudioNode[],
  edges: FlowGraphEdge[],
  removedEdgeIds: string[]
): string[] {
  const remainingEdges = edges.filter(e => !removedEdgeIds.includes(e.id))
  const reachable = collectReachableNodes(remainingEdges, START_ID)
  return nodes.filter(n => n.id !== START_ID && n.id !== END_ID && !reachable.has(n.id)).map(n => n.id)
}

export const useFlowStudioStore = create<FlowStudioState & FlowStudioActions>((set, get) => ({
  ...initialState,
  setMode: (mode: DesignerMode) => set({ mode }),
  addNode: (type: FlowNodeType) => {
    const state = get()
    state.pushSnapshot()
    const node = createNode(type)
    const next = normalizeGraph([...state.nodes, node], state.edges)
    setDirtyGraph(set, next)
    return node.id
  },
  removeNode: (nodeId: string) => {
    const state = get()
    const node = state.nodes.find(n => n.id === nodeId)
    if (!node || node.type === 'start') return
    state.pushSnapshot()
    const next = normalizeGraph(
      state.nodes.filter(n => n.id !== nodeId),
      state.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    )
    setDirtyGraph(set, next, {
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      selectedEdgeId: null,
      pendingDelete: null
    })
  },
  requestDeleteNode: (nodeId: string) => {
    const state = get()
    const node = state.nodes.find(n => n.id === nodeId)
    if (!node || node.type === 'start') return
    set({ pendingDelete: { kind: 'node', id: nodeId, label: node.label } })
  },
  updateNode: (nodeId: string, updates: Partial<StudioNode>) => {
    set({ nodes: get().nodes.map(n => (n.id === nodeId ? { ...n, ...updates } : n)), isDirty: true })
  },
  updateNodeConfig: (nodeId: string, config: Partial<StudioNodeConfig>) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === nodeId ? { ...n, config: { ...n.config, ...config } as StudioNodeConfig } : n
      ),
      isDirty: true
    })
  },
  duplicateNode: (nodeId: string) => {
    const state = get()
    const source = state.nodes.find(n => n.id === nodeId)
    if (!source) return null
    state.pushSnapshot()
    const clone: StudioNode = { ...structuredClone(source), id: uuid(), label: `${source.label} (copy)` }
    const next = normalizeGraph([...state.nodes, clone], state.edges)
    setDirtyGraph(set, next)
    return clone.id
  },
  selectNode: (nodeId: string | null) =>
    set({ selectedNodeId: nodeId, selectedEdgeId: null, selectedEdgePanel: 'details', edgePanelLock: null }),
  selectEdge: (edgeId: string | null) =>
    set({ selectedEdgeId: edgeId, selectedNodeId: null, selectedEdgePanel: 'details', edgePanelLock: null }),
  openEdgeDetails: (edgeId: string) =>
    set(state => {
      const lock = state.edgePanelLock
      const now = Date.now()
      // If we just opened the insert panel from the plus button,
      // ignore the next edge click that ReactFlow fires.
      if (lock?.edgeId === edgeId && now < (lock?.until ?? Infinity)) {
        return state
      }
      return {
        selectedEdgeId: edgeId,
        selectedNodeId: null,
        selectedEdgePanel: 'details',
        edgePanelLock: null
      }
    }),
  openEdgeInsert: (edgeId: string) =>
    set({
      selectedEdgeId: edgeId,
      selectedNodeId: null,
      selectedEdgePanel: 'insert',
      edgePanelLock: { edgeId, until: Date.now() + 600 }
    }),
  addEdge: (source: string, target: string, label?: string, direction: 'forward' | 'backward' = 'forward') => {
    const state = get()
    state.pushSnapshot()
    const edge = createEdge(source, target, label, direction)
    const next = normalizeGraph(state.nodes, [...state.edges, edge])
    setDirtyGraph(set, next)
    return edge.id
  },
  removeEdge: (edgeId: string) => {
    const state = get()
    state.pushSnapshot()
    const next = normalizeGraph(
      state.nodes,
      state.edges.filter(e => e.id !== edgeId)
    )
    setDirtyGraph(set, next, {
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
      pendingDelete: null
    })
  },
  requestDeleteEdge: (edgeId: string) => {
    const state = get()
    const edge = state.edges.find(e => e.id === edgeId)
    if (!edge) return
    const affectedNodeIds = orphanedNodeIdsAfterEdgeRemoval(state.nodes, state.edges, [edgeId])
    const label = edge.label ? `“${edge.label}”` : `${edge.source} → ${edge.target}`
    set({ pendingDelete: { kind: 'edge', id: edgeId, label, edgeIds: [edgeId], affectedNodeIds } })
  },
  requestDeleteEdges: (edgeIds: string[], label?: string) => {
    const state = get()
    const unique = Array.from(new Set(edgeIds)).filter(Boolean)
    if (unique.length === 0) return
    const affectedNodeIds = orphanedNodeIdsAfterEdgeRemoval(state.nodes, state.edges, unique)
    const resolvedLabel =
      label ??
      (unique.length === 1
        ? (() => {
            const edge = state.edges.find(e => e.id === unique[0])
            return edge?.label ? `“${edge.label}”` : `${edge?.source ?? ''} → ${edge?.target ?? ''}`
          })()
        : `${unique.length} branches`)
    set({ pendingDelete: { kind: 'edge', id: unique[0], label: resolvedLabel, edgeIds: unique, affectedNodeIds } })
  },
  updateEdge: (edgeId: string, updates: Partial<FlowGraphEdge>) => {
    const state = get()
    const next = normalizeGraph(
      state.nodes,
      state.edges.map(e => (e.id === edgeId ? { ...e, ...updates } : e))
    )
    set({ ...next, isDirty: true })
  },
  confirmPendingDelete: () => {
    const state = get()
    const pending = state.pendingDelete
    if (!pending) return
    if (pending.kind === 'node') {
      state.removeNode(pending.id)
      return
    }
    // Branch/connection removal: remove the edge(s) and any now-unreachable nodes.
    state.pushSnapshot()
    const edgeIds = pending.edgeIds?.length ? pending.edgeIds : [pending.id]
    const nodeIds = pending.affectedNodeIds ?? orphanedNodeIdsAfterEdgeRemoval(state.nodes, state.edges, edgeIds)
    const next = normalizeGraph(
      state.nodes.filter(n => !nodeIds.includes(n.id)),
      state.edges.filter(e => !edgeIds.includes(e.id) && !nodeIds.includes(e.source) && !nodeIds.includes(e.target))
    )
    setDirtyGraph(set, next, { pendingDelete: null, selectedEdgeId: null, selectedNodeId: null })
  },
  cancelPendingDelete: () => set({ pendingDelete: null }),
  insertNodeOnEdge: (
    edgeId: string,
    type: FlowNodeType,
    taskStepType?: FlowStepType | { stepType: FlowStepType; preset?: 'HYBRID' }
  ) => {
    const state = get()
    const edge = state.edges.find(e => e.id === edgeId)
    if (!edge) return null
    state.pushSnapshot()

    const remainingEdges = state.edges.filter(e => e.id !== edgeId)

    // Fork: create full parallel structure with join
    if (type === 'fork') {
      const forkNode = createNode('fork')
      const joinNode = createNode('join')
      joinNode.config = { nodeType: 'join', joinCondition: 'ALL', forkReference: forkNode.id }
      const branch1 = createNode('task')
      branch1.label = 'Branch 1 Task'
      const branch2 = createNode('task')
      branch2.label = 'Branch 2 Task'
      const newNodes = [...state.nodes, forkNode, branch1, branch2, joinNode]
      const newEdges = [
        ...remainingEdges,
        createEdge(edge.source, forkNode.id, edge.label, edge.direction),
        createEdge(forkNode.id, branch1.id, 'Branch 1'),
        createEdge(forkNode.id, branch2.id, 'Branch 2'),
        createEdge(branch1.id, joinNode.id),
        createEdge(branch2.id, joinNode.id),
        createEdge(joinNode.id, edge.target)
      ]
      const next = normalizeGraph(newNodes, newEdges)
      setDirtyGraph(set, next, { selectedNodeId: forkNode.id, selectedEdgeId: null })
      return forkNode.id
    }

    // Decision: create node with two branch edges to the original target
    // Default decision type is APPROVAL, so use Approve/Reject labels
    if (type === 'decision') {
      const decisionNode = createNode('decision')
      const newNodes = [...state.nodes, decisionNode]
      const newEdges = [
        ...remainingEdges,
        createEdge(edge.source, decisionNode.id, edge.label, edge.direction),
        createEdge(decisionNode.id, edge.target, 'Approve'),
        createEdge(decisionNode.id, edge.target, 'Reject')
      ]
      const next = normalizeGraph(newNodes, newEdges)
      setDirtyGraph(set, next, { selectedNodeId: decisionNode.id, selectedEdgeId: null })
      return decisionNode.id
    }

    // Default: simple inline insertion (task, etc.)
    const node = createNode(type)
    const stepType = (() => {
      if (!taskStepType) return undefined
      return typeof taskStepType === 'object' ? taskStepType.stepType : taskStepType
    })()
    const preset = typeof taskStepType === 'object' ? taskStepType.preset : undefined

    if (type === 'task' && node.config.nodeType === 'task' && stepType) {
      const isAutomation = [FlowStepType.FUNCTION, FlowStepType.AI_AGENT, FlowStepType.AI_TASK_EXPERT].includes(
        stepType
      )
      const titleForStepType = stepType === FlowStepType.TASK ? node.config.title : 'New Task'
      node.config = {
        ...node.config,
        stepType,
        kind: isAutomation ? 'SYSTEM' : 'USER',
        title: titleForStepType,
        permissionContext:
          stepType === FlowStepType.AI_AGENT
            ? (node.config.permissionContext ?? { contextType: 'USER', permissions: ['read', 'write', 'execute'] })
            : undefined,
        simpleAIConfig:
          state.mode === 'simple' && stepType === FlowStepType.AI_TASK_EXPERT
            ? { instruction: node.config.simpleAIConfig?.instruction ?? '' }
            : undefined
      }
      if (preset === 'HYBRID') {
        node.config = {
          ...node.config,
          title: 'Hybrid Task'
        }
        node.label = 'Hybrid Task'
      } else {
        node.label = node.config.title
      }
    }
    const next = normalizeGraph(
      [...state.nodes, node],
      [
        ...remainingEdges,
        createEdge(edge.source, node.id, edge.label, edge.direction),
        createEdge(node.id, edge.target, undefined, edge.direction)
      ]
    )
    setDirtyGraph(set, next, { selectedNodeId: node.id, selectedEdgeId: null })
    return node.id
  },
  addNodeAfter: (sourceNodeId: string, type: FlowNodeType) => {
    const state = get()
    const source = state.nodes.find(n => n.id === sourceNodeId)
    if (!source) return null
    const firstOutgoing = state.edges.find(e => e.source === sourceNodeId && e.direction === 'forward')
    if (firstOutgoing) return get().insertNodeOnEdge(firstOutgoing.id, type)
    state.pushSnapshot()
    const node = createNode(type)
    const endNode = state.nodes.find(n => n.type === 'end')
    const next = normalizeGraph(
      [...state.nodes, node],
      [...state.edges, createEdge(sourceNodeId, node.id), ...(endNode ? [createEdge(node.id, endNode.id)] : [])]
    )
    setDirtyGraph(set, next, { selectedNodeId: node.id, selectedEdgeId: null })
    return node.id
  },
  setTemplateMetadata: metadata => {
    set({
      templateName: metadata.name ?? get().templateName,
      templateDescription: metadata.description ?? get().templateDescription,
      isDirty: true
    })
  },
  setTemplateTags: (tags: FlowTags) => {
    set({
      templateTags: tags,
      isDirty: true
    })
  },
  loadTemplate: (templateId, nodes, edges, metadata) => {
    const next = normalizeGraph(nodes, edges)
    set({
      templateId,
      ...next,
      templateName: metadata.name,
      templateDescription: metadata.description,
      templateTags: metadata.tags ?? {},
      templateVersion: metadata.version,
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
      isLoading: false,
      undoStack: [],
      redoStack: []
    })
  },
  resetStore: () => set({ ...initialState, nodes: initialGraph.nodes, edges: initialGraph.edges }),
  pushSnapshot: () => {
    const snapshot: FlowStudioSnapshot = { nodes: structuredClone(get().nodes), edges: structuredClone(get().edges) }
    set({ undoStack: [...get().undoStack, snapshot].slice(-MAX_UNDO) })
  },
  undo: () => {
    const { undoStack, nodes, edges } = get()
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    const current: FlowStudioSnapshot = { nodes: structuredClone(nodes), edges: structuredClone(edges) }
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, current],
      isDirty: true
    })
  },
  redo: () => {
    const { redoStack, nodes, edges } = get()
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    const current: FlowStudioSnapshot = { nodes: structuredClone(nodes), edges: structuredClone(edges) }
    set({
      nodes: next.nodes,
      edges: next.edges,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, current],
      isDirty: true
    })
  },
  markClean: () => set({ isDirty: false }),
  toGraphDefinition: (): FlowGraphDefinition => ({
    nodes: get().nodes.map(n => ({ id: n.id, type: n.type, label: n.label, metadata: nodeToMetadata(n) })),
    edges: get().edges
  })
}))
