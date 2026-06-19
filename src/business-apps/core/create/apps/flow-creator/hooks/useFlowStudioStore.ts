import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { FlowGraphDefinition, FlowGraphEdge, FlowNodeType } from '@/common/components/flow/flow-viewer'
import type { FlowTags } from '@/business-apps/flow/types'
import { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type {
  DesignerMode,
  FlowStudioActions,
  FlowStudioSnapshot,
  FlowStudioState,
  StudioNode,
  StudioNodeConfig
} from '../types/studioTypes'
import { createEdge, createNode, END_ID, nodeToMetadata, normalizeGraph, START_ID } from '../utils/graphStoreUtils'
import {
  applyStepKindChange,
  applyStepKindToNode,
  buildDecisionConfigForPayload,
  payloadForStepKind
} from '../components/step-picker/applyStepKind'
import { resolveStepKind } from '../components/step-picker/resolveStepKind'
import { isStepKindChangeAllowed } from '../components/step-picker/stepKindSwitchImpact'
import type { StepKindId } from '../components/step-picker/stepKindTypes'
import { buildLegacyTaskIndexByNodeId, buildStepIndexByNodeId } from '../utils/studioStepOrder'

const MAX_UNDO = 50
const initialGraph = normalizeGraph([createNode('start'), createNode('end')], [createEdge('start_node', 'end_node')])

const initialState: FlowStudioState = {
  mode: 'simple',
  nodes: initialGraph.nodes,
  edges: initialGraph.edges,
  chatMessages: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedEdgePanel: 'details',
  configPanelView: 'config',
  edgePanelLock: null,
  templateId: undefined,
  templateName: 'Untitled Flow',
  templateDescription: '',
  templateTags: {},
  templateVersion: 1,
  isDirty: false,
  webhookConfigRefreshKey: 0,
  isLoading: false,
  pendingDelete: null,
  undoStack: [],
  redoStack: []
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rewriteDeep(value: any, rewriteString: (s: string) => string): any {
  if (typeof value === 'string') {
    const next = rewriteString(value)
    return next === value ? value : next
  }
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map(v => {
      const nv = rewriteDeep(v, rewriteString)
      if (nv !== v) changed = true
      return nv
    })
    return changed ? next : value
  }
  if (value && typeof value === 'object') {
    let changed = false
    const entries = Object.entries(value)
    const nextObj: any = Array.isArray(value) ? [] : {}
    for (const [k, v] of entries) {
      const nv = rewriteDeep(v, rewriteString)
      if (nv !== v) changed = true
      nextObj[k] = nv
    }
    return changed ? nextObj : value
  }
  return value
}

function rewriteExpressionStringsInGraph(
  nodes: StudioNode[],
  edges: FlowGraphEdge[],
  rewriteString: (s: string) => string
): { nodes: StudioNode[]; edges: FlowGraphEdge[] } {
  const nextNodes = nodes.map(n => {
    const nextConfig = rewriteDeep(n.config, rewriteString) as StudioNodeConfig
    return nextConfig === n.config ? n : { ...n, config: nextConfig }
  })
  const nextEdges = edges.map(e => {
    const nextMetadata =
      e.metadata && typeof e.metadata === 'object'
        ? (rewriteDeep(e.metadata, rewriteString) as FlowGraphEdge['metadata'])
        : e.metadata
    return nextMetadata === e.metadata ? e : { ...e, metadata: nextMetadata }
  })
  return { nodes: nextNodes, edges: nextEdges }
}

function resolveStepType(
  taskStepType?: FlowStepType | { stepType: FlowStepType; preset?: 'HYBRID' }
): FlowStepType | undefined {
  if (!taskStepType) return undefined
  return typeof taskStepType === 'object' ? taskStepType.stepType : taskStepType
}

function applyTaskNodeStepType(
  node: StudioNode,
  stepType: FlowStepType,
  preset: 'HYBRID' | undefined,
  mode: DesignerMode
): void {
  if (node.config.nodeType !== 'task') return
  const automationTypes = [
    FlowStepType.FUNCTION,
    FlowStepType.AI_AGENT,
    FlowStepType.AI_TASK_EXPERT,
    FlowStepType.CUSTOM_DATA_MUTATION
  ]
  const isAutomation = automationTypes.includes(stepType)
  node.config = {
    ...node.config,
    stepType,
    kind: isAutomation ? 'SYSTEM' : 'USER',
    title: stepType === FlowStepType.TASK ? node.config.title : 'New Task',
    permissionContext:
      stepType === FlowStepType.AI_AGENT
        ? (node.config.permissionContext ?? { contextType: 'USER', permissions: ['read', 'write', 'execute'] })
        : undefined,
    customDataConfig:
      stepType === FlowStepType.CUSTOM_DATA_MUTATION
        ? (node.config.customDataConfig ?? {
            target: 'ENTITY',
            operation: 'create',
            namespace: 'default',
            values: {}
          })
        : undefined,
    simpleAIConfig:
      mode === 'simple' && stepType === FlowStepType.AI_TASK_EXPERT
        ? { instruction: node.config.simpleAIConfig?.instruction ?? '' }
        : undefined
  }
  if (preset === 'HYBRID') {
    node.config = { ...node.config, title: 'Hybrid Task' }
    node.label = 'Hybrid Task'
  } else {
    node.label = node.config.title
  }
}

function setDirtyGraph(
  set: (partial: Partial<FlowStudioState & FlowStudioActions>) => void,
  next: { nodes: StudioNode[]; edges: FlowGraphEdge[] },
  extra?: Partial<FlowStudioState & FlowStudioActions>
) {
  set({ ...next, isDirty: true, redoStack: [], ...extra })
}

function isDeepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
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

function reconnectForwardEdgesAroundNode(edges: FlowGraphEdge[], nodeId: string): FlowGraphEdge[] {
  const remainingEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId)
  const incomingForward = edges.filter(e => e.target === nodeId && e.direction === 'forward')
  const outgoingForward = edges.filter(e => e.source === nodeId && e.direction === 'forward')
  const existingConnections = new Set(
    remainingEdges.map(edge =>
      JSON.stringify({
        source: edge.source,
        target: edge.target,
        direction: edge.direction,
        label: edge.label ?? null,
        metadata: edge.metadata ?? null
      })
    )
  )
  const bridgedEdges: FlowGraphEdge[] = []

  for (const incoming of incomingForward) {
    for (const outgoing of outgoingForward) {
      if (incoming.source === outgoing.target) continue
      if (incoming.source === nodeId || outgoing.target === nodeId) continue

      const signature = JSON.stringify({
        source: incoming.source,
        target: outgoing.target,
        direction: outgoing.direction,
        label: outgoing.label ?? incoming.label ?? null,
        metadata: outgoing.metadata ?? incoming.metadata ?? null
      })
      if (existingConnections.has(signature)) continue

      existingConnections.add(signature)
      bridgedEdges.push({
        ...createEdge(incoming.source, outgoing.target, outgoing.label ?? incoming.label, outgoing.direction),
        ...(outgoing.metadata || incoming.metadata
          ? { metadata: (outgoing.metadata ?? incoming.metadata) as FlowGraphEdge['metadata'] }
          : {})
      })
    }
  }

  return [...remainingEdges, ...bridgedEdges]
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
    if (!node || node.type === 'start' || node.type === 'end') return
    state.pushSnapshot()
    const nextEdges = reconnectForwardEdgesAroundNode(state.edges, nodeId)
    const next = normalizeGraph(
      state.nodes.filter(n => n.id !== nodeId),
      nextEdges
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
    if (!node || node.type === 'start' || node.type === 'end') return
    set({ pendingDelete: { kind: 'node', id: nodeId, label: node.label } })
  },
  updateNode: (nodeId: string, updates: Partial<StudioNode>, options = {}) => {
    const state = get()
    let changed = false
    const nodes = state.nodes.map(n => {
      if (n.id !== nodeId) return n
      const next = { ...n, ...updates }
      if (isDeepEqual(n, next)) return n
      changed = true
      return next
    })
    if (!changed) return
    set({ nodes, isDirty: state.isDirty || (options.markDirty ?? true) })
  },
  updateNodeConfig: (nodeId: string, config: Partial<StudioNodeConfig>, options = {}) => {
    const state = get()
    let changed = false
    const nodes = state.nodes.map(n => {
      if (n.id !== nodeId) return n
      const nextConfig = { ...n.config, ...config } as StudioNodeConfig
      if (isDeepEqual(n.config, nextConfig)) return n
      changed = true
      return { ...n, config: nextConfig }
    })
    if (!changed) return
    set({ nodes, isDirty: state.isDirty || (options.markDirty ?? true) })
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
    set({
      selectedNodeId: nodeId,
      selectedEdgeId: null,
      selectedEdgePanel: 'details',
      configPanelView: 'config',
      edgePanelLock: null
    }),
  selectEdge: (edgeId: string | null) =>
    set({
      selectedEdgeId: edgeId,
      selectedNodeId: null,
      selectedEdgePanel: 'details',
      configPanelView: 'config',
      edgePanelLock: null
    }),
  openChangeStepKind: () => {
    const state = get()
    if (!state.selectedNodeId) return
    const node = state.nodes.find(n => n.id === state.selectedNodeId)
    if (!node || node.type === 'start' || node.type === 'end' || node.type === 'join') return
    set({ configPanelView: 'change-step' })
  },
  closeChangeStepKind: () => set({ configPanelView: 'config' }),
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
      configPanelView: 'config',
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
    let changed = false
    const next = normalizeGraph(
      state.nodes,
      state.edges.map(e => {
        if (e.id !== edgeId) return e
        const nextEdge = { ...e, ...updates }
        if (isDeepEqual(e, nextEdge)) return e
        changed = true
        return nextEdge
      })
    )
    if (!changed) return
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
    const selectedNodeId = state.selectedNodeId
    const keepNodeSelection =
      selectedNodeId != null &&
      !nodeIds.includes(selectedNodeId) &&
      edgeIds.every(edgeId => state.edges.find(edge => edge.id === edgeId)?.source === selectedNodeId)
    const nextSelectedEdgeId =
      state.selectedEdgeId && edgeIds.includes(state.selectedEdgeId) ? null : state.selectedEdgeId
    setDirtyGraph(set, next, {
      pendingDelete: null,
      selectedEdgeId: nextSelectedEdgeId,
      selectedNodeId: keepNodeSelection ? selectedNodeId : null
    })
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
    const stepType = resolveStepType(taskStepType)
    const preset = typeof taskStepType === 'object' ? taskStepType.preset : undefined

    if (type === 'task' && stepType) {
      applyTaskNodeStepType(node, stepType, preset, state.mode)
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
  insertNodeOnEdgeByKind: (edgeId: string, kindId: StepKindId) => {
    const payload = payloadForStepKind(kindId)
    if (payload.nodeType === 'fork') {
      return get().insertNodeOnEdge(edgeId, 'fork')
    }
    if (payload.nodeType === 'decision') {
      const state = get()
      const edge = state.edges.find(e => e.id === edgeId)
      if (!edge) return null
      state.pushSnapshot()
      const remainingEdges = state.edges.filter(e => e.id !== edgeId)
      const decisionNode = createNode('decision')
      const decisionConfig = buildDecisionConfigForPayload(payload)
      decisionNode.config = decisionConfig
      decisionNode.label = payload.userDecisionPreset === 'APPROVAL' ? 'Approval' : 'Decision'
      const branchLabels = decisionConfig.branches.map(branch => branch.label ?? 'Outcome')
      const newNodes = [...state.nodes, decisionNode]
      const newEdges = [
        ...remainingEdges,
        createEdge(edge.source, decisionNode.id, edge.label, edge.direction),
        createEdge(decisionNode.id, edge.target, branchLabels[0] ?? 'Approve'),
        createEdge(decisionNode.id, edge.target, branchLabels[1] ?? 'Reject')
      ]
      const next = normalizeGraph(newNodes, newEdges)
      setDirtyGraph(set, next, { selectedNodeId: decisionNode.id, selectedEdgeId: null })
      return decisionNode.id
    }
    const taskPayload = payload
    const insertArg =
      taskPayload.preset !== undefined
        ? { stepType: taskPayload.stepType, preset: taskPayload.preset }
        : taskPayload.stepType
    const nodeId = get().insertNodeOnEdge(edgeId, 'task', insertArg)
    if (!nodeId) return null
    const state = get()
    const node = state.nodes.find(n => n.id === nodeId)
    if (!node || node.config.nodeType !== 'task') return nodeId
    const { node: nextNode } = applyStepKindToNode(node, kindId, state.mode)
    const nodes = state.nodes.map(n => (n.id === nodeId ? nextNode : n))
    set({ nodes, isDirty: true })
    return nodeId
  },
  changeNodeStepKind: (nodeId: string, kindId: StepKindId) => {
    const state = get()
    const node = state.nodes.find(n => n.id === nodeId)
    if (!node || node.type === 'start' || node.type === 'end' || node.type === 'fork' || node.type === 'join') {
      return
    }
    const currentKind = resolveStepKind(node)
    if (currentKind && !isStepKindChangeAllowed(currentKind, kindId)) return
    const payload = payloadForStepKind(kindId)
    if (payload.nodeType === 'fork') return

    state.pushSnapshot()

    const endNodeId = state.nodes.find(n => n.type === 'end')?.id ?? END_ID
    const { node: nextNode, edges: nextEdges } = applyStepKindChange(node, state.edges, kindId, state.mode, {
      endNodeId
    })
    const nextNodes = state.nodes.map(n => (n.id === nodeId ? nextNode : n))
    setDirtyGraph(set, normalizeGraph(nextNodes, nextEdges), { configPanelView: 'config' })
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
    const state = get()
    const nextName = metadata.name ?? state.templateName
    const nextDescription = metadata.description ?? state.templateDescription
    if (state.templateName === nextName && state.templateDescription === nextDescription) return
    set({
      templateName: nextName,
      templateDescription: nextDescription,
      isDirty: true
    })
  },
  setTemplateTags: (tags: FlowTags) => {
    if (isDeepEqual(get().templateTags, tags)) return
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
  resetStore: () =>
    set({
      ...initialState,
      templateId: undefined,
      templateDescription: '',
      nodes: initialGraph.nodes,
      edges: initialGraph.edges,
      chatMessages: [],
      webhookConfigRefreshKey: 0
    }),
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
  rewriteExpressionsForStartFieldRename: (oldKey, newKey, options = {}) => {
    const oldK = String(oldKey || '').trim()
    const newK = String(newKey || '').trim()
    if (!oldK || !newK || oldK === newK) return

    const inputValuesPattern = new RegExp(
      `(\\$workflow\\.input\\.inputValues\\.)${escapeRegExp(oldK)}(?=$|[^a-zA-Z0-9_])`,
      'g'
    )
    const legacyFormDataPattern = new RegExp(
      `(\\$workflow\\.input\\.formData\\.)${escapeRegExp(oldK)}(?=$|[^a-zA-Z0-9_])`,
      'g'
    )
    const { nodes, edges, isDirty } = get()
    const next = rewriteExpressionStringsInGraph(nodes, edges, s => {
      if (!s.includes('$workflow.')) return s
      return s.replace(inputValuesPattern, `$1${newK}`).replace(legacyFormDataPattern, `$1${newK}`)
    })
    // Only set when something changed.
    if (next.nodes.every((n, i) => n === nodes[i]) && next.edges.every((e, i) => e === edges[i])) return
    set({ ...next, isDirty: isDirty || (options.markDirty ?? true) })
  },
  rewriteExpressionsForTaskFieldRename: (taskNodeId, oldKey, newKey, options = {}) => {
    const oldK = String(oldKey || '').trim()
    const newK = String(newKey || '').trim()
    const nodeId = String(taskNodeId || '').trim()
    if (!nodeId || !oldK || !newK || oldK === newK) return

    const { nodes, edges, isDirty } = get()
    const stepIndexByNodeId = buildStepIndexByNodeId(nodes, edges)
    const legacyTaskIndexByNodeId = buildLegacyTaskIndexByNodeId(nodes)

    const indices = new Set<number>()
    const primary = stepIndexByNodeId.get(nodeId)
    if (typeof primary === 'number' && !Number.isNaN(primary)) indices.add(primary)
    const legacy = legacyTaskIndexByNodeId.get(nodeId)
    if (typeof legacy === 'number' && !Number.isNaN(legacy)) indices.add(legacy)
    if (indices.size === 0) return

    const res = Array.from(indices).map(
      idx => new RegExp(`(\\$steps\\.step_${idx}\\.formData\\.)${escapeRegExp(oldK)}(?=$|[^a-zA-Z0-9_])`, 'g')
    )

    const next = rewriteExpressionStringsInGraph(nodes, edges, s => {
      if (!s.includes('$steps.')) return s
      let out = s
      for (const re of res) out = out.replace(re, `$1${newK}`)
      return out
    })
    if (next.nodes.every((n, i) => n === nodes[i]) && next.edges.every((e, i) => e === edges[i])) return
    set({ ...next, isDirty: isDirty || (options.markDirty ?? true) })
  },
  toGraphDefinition: (): FlowGraphDefinition => ({
    nodes: get().nodes.map(n => ({ id: n.id, type: n.type, label: n.label, metadata: nodeToMetadata(n) })),
    edges: get().edges
  }),
  setChatMessages: messages =>
    set(state => ({
      chatMessages: typeof messages === 'function' ? messages(state.chatMessages) : messages
    }))
}))
