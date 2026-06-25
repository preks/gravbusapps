/**
 * Trace model — single source of truth for the Agent Mesh and Trace Explorer.
 *
 * Normalizes a list of `AgentStreamEvent`s (whether streamed live over SSE or
 * loaded from REST `session.trace`) into a stable `TraceModel` consisting of:
 *
 *   - `nodes`: every actor that participated (orchestrator, sub-agents,
 *     experts, skills, tools)
 *   - `edges`: directional message links between nodes (delegation, tool
 *     invocation, completion)
 *   - `frames`: a chronological event timeline used by both the replay clock
 *     and the trace explorer Gantt
 *   - `decisions`: discrete branch points the agent committed to
 *   - `summary`: aggregate counters used by the summary strip
 *
 * The model is *additive*: applying the same events twice yields the same
 * shape, so live and replay code paths can share the exact same renderer.
 */

import type {
  AgentChunkEvent,
  AgentDecisionEvent,
  AgentExpertCalledEvent,
  AgentExpertCompletedEvent,
  AgentArtifactCreatedEvent,
  AgentStepCompletedEvent,
  AgentStepStartedEvent,
  AgentStreamEvent,
  AgentSubagentCompletedEvent,
  AgentSubagentSpawnedEvent,
  AgentTerminalEvent,
  CapabilityMissingEvent,
  EnterpriseRuntimeTraceEvent,
  HitlRequestedEvent,
  SkillLoadedEvent,
  SkillScopedEvent
} from '../types/enterpriseAgent'

export type MeshNodeKind = 'orchestrator' | 'subagent' | 'expert' | 'skill' | 'tool'

export type MeshNodeStatus = 'idle' | 'running' | 'done' | 'failed'

export interface MeshNode {
  id: string
  kind: MeshNodeKind
  label: string
  description?: string
  /** When the node first appeared in the trace (ISO). */
  firstSeenAt: string
  /** When the node last produced or received an event (ISO). */
  lastSeenAt: string
  /** First seq the node appeared in. Used for replay show/hide. */
  firstSeenSeq: number
  /** Last seq we recorded activity for. */
  lastSeenSeq: number
  /** Relative offset (ms) from the session's first event; used for replay filtering. */
  offsetMs: number
  /** Relative offset (ms) of the last activity; used for "active" detection during replay. */
  lastOffsetMs: number
  status: MeshNodeStatus
  /** Total ms spent (sum of step / delegation durations attributed to this node). */
  totalDurationMs: number
  /** How many invocations / messages this node received. */
  invocationCount: number
  /** Optional metadata bag (skill category, tool ref, …). */
  metadata?: Record<string, unknown>
}

export type MeshEdgeKind = 'delegation' | 'tool_call' | 'completion' | 'expert_call' | 'skill_load'

export interface MeshEdge {
  id: string
  source: string
  target: string
  kind: MeshEdgeKind
  /** Seq of the originating event — used to highlight active edges during replay. */
  seq: number
  /** ISO timestamp of the originating event. */
  timestamp: string
  /** Relative offset (ms) from the session's first event; used for replay filtering. */
  offsetMs: number
  /** Short label rendered on hover (tool name, sub-task summary, …). */
  label?: string
  /** Set after the matching completion event — used to dim resolved edges. */
  resolvedAt?: string
  /** When `kind === 'completion'`, mirrors `done | failed`. */
  status?: 'done' | 'failed'
}

export type FrameKind =
  | 'step'
  | 'subagent'
  | 'expert'
  | 'tool'
  | 'skill'
  | 'decision'
  | 'hitl'
  | 'capability_missing'
  | 'terminal'
  | 'artifact'

export interface TraceFrame {
  /** Stable id (event_id when available). */
  id: string
  /** Monotonic sequence number from the backend. */
  seq: number
  /** ISO timestamp from the originating event. */
  timestamp: string
  /** Relative offset from session start in ms; useful for the timeline scrubber. */
  offsetMs: number
  kind: FrameKind
  /** Node the frame is attributed to (orchestrator if unknown). */
  nodeId: string
  /** Optional sibling node when the frame is an edge endpoint (delegation target). */
  targetNodeId?: string
  title: string
  /** Optional one-line summary rendered in the timeline / log. */
  summary?: string
  /** Duration in ms when the frame represents a closed range (step, subagent, …). */
  durationMs?: number
  status?: 'running' | 'done' | 'failed'
  /** Raw event reference — kept for inspector panels and debugging. */
  event: AgentStreamEvent
}

export interface MeshDecision {
  id: string
  seq: number
  timestamp: string
  offsetMs: number
  category: string
  title: string
  chosen: string
  rationale: string
  alternatives?: string[]
  confidence?: number
  metadata?: Record<string, unknown>
}

export interface MeshSummary {
  /** Total events normalized. */
  eventCount: number
  /** Distinct nodes (excludes orchestrator — it's always present). */
  participantCount: number
  subagentCount: number
  expertCount: number
  toolCallCount: number
  skillLoadCount: number
  decisionCount: number
  /** Wall clock duration from first to last frame in ms. */
  durationMs: number
  /** Final terminal status if the trace contains one. */
  terminalStatus?: AgentTerminalEvent['status']
  /** Cost summary lifted from the terminal event when present. */
  costSummary?: AgentTerminalEvent['cost_summary'] | null
}

export interface TraceModel {
  nodes: MeshNode[]
  edges: MeshEdge[]
  frames: TraceFrame[]
  decisions: MeshDecision[]
  summary: MeshSummary
  /** ISO timestamp of the very first frame (or `null` when empty). */
  startedAt: string | null
  /** ISO timestamp of the last frame (or `null` when empty). */
  endedAt: string | null
}

export const ORCHESTRATOR_NODE_ID = '__orchestrator__'

const GENERIC_AGENT_NAMES = new Set([
  'task',
  'newwork_ask_expert',
  'newwork_ask_experts_parallel',
  'invoke_agent',
  'subagent',
  'dispatch_agent'
])

function pickName(value: string | undefined | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || GENERIC_AGENT_NAMES.has(trimmed.toLowerCase())) return null
  return trimmed
}

function resolveSpawnName(event: AgentSubagentSpawnedEvent | AgentExpertCalledEvent): string {
  return (
    pickName('expert_name' in event ? event.expert_name : undefined) ??
    pickName('agent_name' in event ? event.agent_name : undefined) ??
    pickName('name' in event ? event.name : undefined) ??
    pickName(event.task_summary) ??
    (event.type === 'expert_called' ? 'Expert' : 'Sub-agent')
  )
}

function safeOffset(ts: string | undefined, baseMs: number): number {
  if (!ts) return 0
  const parsed = Date.parse(ts)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, parsed - baseMs)
}

function isStepStarted(e: AgentStreamEvent): e is AgentStepStartedEvent {
  return e.type === 'step_started'
}
function isStepCompleted(e: AgentStreamEvent): e is AgentStepCompletedEvent {
  return e.type === 'step_completed'
}
function isSubagentSpawned(e: AgentStreamEvent): e is AgentSubagentSpawnedEvent {
  return e.type === 'subagent_spawned'
}
function isSubagentCompleted(e: AgentStreamEvent): e is AgentSubagentCompletedEvent {
  return e.type === 'subagent_completed'
}
function isExpertCalled(e: AgentStreamEvent): e is AgentExpertCalledEvent {
  return e.type === 'expert_called'
}
function isExpertCompleted(e: AgentStreamEvent): e is AgentExpertCompletedEvent {
  return e.type === 'expert_completed'
}
function isSkillLoaded(e: AgentStreamEvent): e is SkillLoadedEvent {
  return e.type === 'skill_loaded'
}
function isSkillScoped(e: AgentStreamEvent): e is SkillScopedEvent {
  return e.type === 'skill_scoped'
}
function isDecision(e: AgentStreamEvent): e is AgentDecisionEvent {
  return e.type === 'decision'
}
function isTerminal(e: AgentStreamEvent): e is AgentTerminalEvent {
  return e.type === 'terminal'
}
function isHitl(e: AgentStreamEvent): e is HitlRequestedEvent {
  return e.type === 'hitl_requested'
}
function isCapabilityMissing(e: AgentStreamEvent): e is CapabilityMissingEvent {
  return e.type === 'capability_missing'
}
function isEnterpriseRuntime(e: AgentStreamEvent): e is EnterpriseRuntimeTraceEvent {
  return e.type === 'expert_selected' || e.type === 'tool_available'
}

type NodeAcc = Omit<MeshNode, 'offsetMs' | 'lastOffsetMs'>

type EdgeAcc = Omit<MeshEdge, 'offsetMs'>

class ModelBuilder {
  private readonly nodes = new Map<string, NodeAcc>()
  private readonly edges: EdgeAcc[] = []
  private readonly frames: TraceFrame[] = []
  private readonly decisions: MeshDecision[] = []
  /** Stack of currently-open agent scopes (orchestrator at bottom). */
  private readonly scopeStack: string[] = [ORCHESTRATOR_NODE_ID]
  /** Maps step_id → owning node for open delegations. */
  private readonly stepOwner = new Map<string, string>()
  /** Maps step_id → owning node for open tool calls (so we can close edges later). */
  private readonly toolStepOwner = new Map<string, { source: string; toolNodeId: string; edgeId: string }>()
  /** Map step_id → spawn edge id so completions can resolve them. */
  private readonly delegationEdgeByStep = new Map<string, string>()
  /** Map skill_id → expert node id (from expert_selected payloads). */
  private readonly skillOwnerBySkillId = new Map<string, string>()
  /** Map skill_id → expert name (from newwork_find_expert). Used for deferred edge rewiring. */
  private readonly skillExpertNameBySkillId = new Map<string, string>()
  /** Map expert name → node id (from expert_selected). Used to unify expert_selected and expert_called. */
  private readonly expertNodeByName = new Map<string, string>()
  /** Unify subagent + expert nodes that share the same display label. */
  private readonly agentNodeByLabel = new Map<string, string>()
  private baseMs = 0
  private terminal?: AgentTerminalEvent

  constructor() {
    this.upsertNode({
      id: ORCHESTRATOR_NODE_ID,
      kind: 'orchestrator',
      label: 'Every',
      description: 'Session orchestrator',
      firstSeenAt: '',
      lastSeenAt: '',
      firstSeenSeq: 0,
      lastSeenSeq: 0,
      status: 'running',
      totalDurationMs: 0,
      invocationCount: 0
    })
  }

  build(events: AgentStreamEvent[]): TraceModel {
    const sorted = [...events].sort((a, b) => {
      const aSeq = 'seq' in a && typeof a.seq === 'number' ? a.seq : 0
      const bSeq = 'seq' in b && typeof b.seq === 'number' ? b.seq : 0
      return aSeq - bSeq
    })

    const firstWithTs = sorted.find(e => 'timestamp' in e && typeof e.timestamp === 'string')
    if (firstWithTs && 'timestamp' in firstWithTs && firstWithTs.timestamp) {
      const parsed = Date.parse(firstWithTs.timestamp)
      this.baseMs = Number.isNaN(parsed) ? 0 : parsed
    }

    for (const event of sorted) {
      this.consume(event)
    }

    if (this.terminal) {
      const terminalStatus = this.terminal.status === 'failed' ? 'failed' : 'done'
      const orchestrator = this.nodes.get(ORCHESTRATOR_NODE_ID)
      if (orchestrator) orchestrator.status = terminalStatus

      // Resolve all unresolved edges — session is finished
      const terminalTs = this.terminal.timestamp ?? ''
      for (const edge of this.edges) {
        if (!edge.resolvedAt && edge.kind !== 'completion') {
          edge.resolvedAt = terminalTs
        }
      }
    }

    // Hydrate offsetMs on nodes and edges using the same baseMs as frames.
    const nodes: MeshNode[] = Array.from(this.nodes.values()).map(n => ({
      ...n,
      offsetMs: safeOffset(n.firstSeenAt, this.baseMs),
      lastOffsetMs: safeOffset(n.lastSeenAt, this.baseMs)
    }))
    const edges: MeshEdge[] = this.edges.map(e => ({
      ...e,
      offsetMs: safeOffset(e.timestamp, this.baseMs)
    }))

    const startedAt = this.frames[0]?.timestamp ?? null
    const endedAt = this.frames[this.frames.length - 1]?.timestamp ?? null

    // Duration must span the full offsetMs domain so the replay clock
    // can reach every frame, decision, node and edge. offsetMs is relative
    // to baseMs (the first event with a timestamp).
    let durationMs = 0
    for (const f of this.frames) {
      if (f.offsetMs > durationMs) durationMs = f.offsetMs
    }
    for (const d of this.decisions) {
      if (d.offsetMs > durationMs) durationMs = d.offsetMs
    }
    for (const n of nodes) {
      if (n.lastOffsetMs > durationMs) durationMs = n.lastOffsetMs
    }
    for (const e of edges) {
      if (e.offsetMs > durationMs) durationMs = e.offsetMs
    }

    const summary: MeshSummary = {
      eventCount: sorted.length,
      participantCount: nodes.filter(n => n.kind !== 'orchestrator').length,
      subagentCount: nodes.filter(n => n.kind === 'subagent').length,
      expertCount: nodes.filter(n => n.kind === 'expert').length,
      toolCallCount: this.frames.filter(f => f.kind === 'tool').length,
      skillLoadCount: nodes.filter(n => n.kind === 'skill').length,
      decisionCount: this.decisions.length,
      durationMs,
      terminalStatus: this.terminal?.status,
      costSummary: this.terminal?.cost_summary ?? null
    }

    return {
      nodes,
      edges,
      frames: this.frames,
      decisions: this.decisions,
      summary,
      startedAt,
      endedAt
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  private consume(event: AgentStreamEvent): void {
    if (isSubagentSpawned(event) || isExpertCalled(event)) {
      this.handleSpawn(event)
      return
    }
    if (isSubagentCompleted(event) || isExpertCompleted(event)) {
      this.handleCompletion(event)
      return
    }
    if (isStepStarted(event)) {
      this.handleStepStarted(event)
      return
    }
    if (isStepCompleted(event)) {
      this.handleStepCompleted(event)
      return
    }
    if (isSkillLoaded(event)) {
      this.handleSkillLoaded(event)
      return
    }
    if (isSkillScoped(event)) {
      this.handleSkillScoped(event)
      return
    }
    if (isDecision(event)) {
      this.handleDecision(event)
      return
    }
    if (isHitl(event)) {
      this.handleHitl(event)
      return
    }
    if (isCapabilityMissing(event)) {
      this.handleCapabilityMissing(event)
      return
    }
    if (isEnterpriseRuntime(event)) {
      this.handleEnterpriseRuntime(event)
      return
    }
    if (isTerminal(event)) {
      this.handleTerminalEvent(event)
      return
    }
    if (event.type === 'agent_chunk' && event.chunk_kind === 'tool' && event.tool_name) {
      this.handleToolChunk(event)
      return
    }
    if (event.type === 'artifact_created') {
      this.handleArtifactCreated(event)
    }
  }

  private handleTerminalEvent(event: AgentTerminalEvent): void {
    this.terminal = event
    this.pushFrame({
      id: this.eventId(event, 'terminal'),
      seq: this.seq(event),
      timestamp: this.timestamp(event),
      kind: 'terminal',
      nodeId: ORCHESTRATOR_NODE_ID,
      title: `Session ${event.status}`,
      summary: event.output?.slice(0, 160) ?? undefined,
      durationMs: event.duration_ms ?? undefined,
      status: event.status === 'failed' ? 'failed' : 'done',
      event
    })
  }

  private handleArtifactCreated(event: AgentArtifactCreatedEvent): void {
    this.pushFrame({
      id: this.eventId(event, 'artifact'),
      seq: this.seq(event),
      timestamp: this.timestamp(event),
      kind: 'artifact',
      nodeId: this.currentScopeId(),
      title: `Created ${event.name}`,
      summary: event.path,
      event
    })
  }

  private handleSpawn(event: AgentSubagentSpawnedEvent | AgentExpertCalledEvent): void {
    const kind: MeshNodeKind = event.type === 'expert_called' ? 'expert' : 'subagent'
    const label = resolveSpawnName(event)
    const fallbackId = `${kind}:${event.subagent_id ?? event.step_id ?? `${event.seq}-${label}`}`
    const nodeId = this.resolveAgentNodeIdByLabel(label, fallbackId)
    const parentId =
      ('parent_step_id' in event ? this.stepOwner.get(event.parent_step_id ?? '') : undefined) ?? this.currentScopeId()

    this.upsertNode({
      id: nodeId,
      kind,
      label,
      description: event.task_summary ?? undefined,
      firstSeenAt: event.timestamp,
      lastSeenAt: event.timestamp,
      firstSeenSeq: event.seq,
      lastSeenSeq: event.seq,
      status: 'running',
      totalDurationMs: 0,
      invocationCount: 1
    })
    this.bumpInvocationCount(nodeId)
    // Register so subsequent calls to the same expert/subagent reuse this node
    this.agentNodeByLabel.set(label, nodeId)
    if (event.type === 'expert_called' || this.nodes.get(nodeId)?.kind === 'expert') {
      this.expertNodeByName.set(label, nodeId)
    }

    if (event.step_id) {
      this.stepOwner.set(event.step_id, nodeId)
      this.scopeStack.push(nodeId)
    }

    const edgeId = `${parentId}->${nodeId}@${event.seq}`
    const edgeKind: MeshEdgeKind = event.type === 'expert_called' ? 'expert_call' : 'delegation'
    this.edges.push({
      id: edgeId,
      source: parentId,
      target: nodeId,
      kind: edgeKind,
      seq: event.seq,
      timestamp: event.timestamp,
      label: event.task_summary ?? label
    })
    if (event.step_id) this.delegationEdgeByStep.set(event.step_id, edgeId)

    // Re-wire skill edges: if newwork_find_expert created skills before this expert existed,
    // move edges from orchestrator to the expert node.
    if (event.type === 'expert_called') {
      for (const [skillId, expertName] of this.skillExpertNameBySkillId) {
        if (expertName !== label) continue
        const skillNodeId = `skill:${skillId}`
        if (!this.nodes.has(skillNodeId)) continue
        // Update ownership
        this.skillOwnerBySkillId.set(skillId, nodeId)
        // Remove orchestrator → skill edge
        const orchIdx = this.edges.findIndex(
          e => e.source === ORCHESTRATOR_NODE_ID && e.target === skillNodeId && e.kind === 'skill_load'
        )
        if (orchIdx !== -1) this.edges.splice(orchIdx, 1)
        // Add expert → skill edge if not already present
        if (!this.edges.some(e => e.source === nodeId && e.target === skillNodeId && e.kind === 'skill_load')) {
          this.edges.push({
            id: `${nodeId}->${skillNodeId}@rewire:${event.seq}`,
            source: nodeId,
            target: skillNodeId,
            kind: 'skill_load',
            seq: event.seq,
            timestamp: event.timestamp,
            label: skillId,
            resolvedAt: event.timestamp
          })
        }
      }
    }

    this.pushFrame({
      id: this.eventId(event, 'spawn'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: event.type === 'expert_called' ? 'expert' : 'subagent',
      nodeId: parentId,
      targetNodeId: nodeId,
      title: `${event.type === 'expert_called' ? 'Calling expert' : 'Delegating to'} ${label}`,
      summary: event.task_summary ?? undefined,
      status: 'running',
      event
    })
  }

  private handleCompletion(event: AgentSubagentCompletedEvent | AgentExpertCompletedEvent): void {
    const nodeId = event.step_id ? this.stepOwner.get(event.step_id) : undefined
    const status = event.status === 'failed' ? 'failed' : 'done'

    if (nodeId) {
      const node = this.nodes.get(nodeId)
      if (node) {
        node.status = status
        node.lastSeenAt = event.timestamp
        node.lastSeenSeq = event.seq
        if (typeof event.duration_ms === 'number') node.totalDurationMs += event.duration_ms
      }

      const idx = this.scopeStack.lastIndexOf(nodeId)
      if (idx > 0) this.scopeStack.splice(idx, 1)

      const spawnEdgeId = event.step_id ? this.delegationEdgeByStep.get(event.step_id) : undefined
      if (spawnEdgeId) {
        const edge = this.edges.find(e => e.id === spawnEdgeId)
        if (edge) edge.resolvedAt = event.timestamp
      }

      const parentId = this.currentScopeId()
      this.edges.push({
        id: `${nodeId}->${parentId}@${event.seq}`,
        source: nodeId,
        target: parentId,
        kind: 'completion',
        seq: event.seq,
        timestamp: event.timestamp,
        label: status === 'failed' ? 'Failed' : 'Completed',
        status
      })

      // Extract skill_ids from expert completion output JSON
      if (event.type === 'expert_completed' && event.output) {
        this.extractSkillsFromOutput(nodeId, event.output, event)
      }
    }

    this.pushFrame({
      id: this.eventId(event, 'completion'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: event.type === 'expert_completed' ? 'expert' : 'subagent',
      nodeId: nodeId ?? this.currentScopeId(),
      targetNodeId: this.currentScopeId(),
      title: `${event.type === 'expert_completed' ? 'Expert' : 'Sub-agent'} ${status}`,
      summary: event.output?.slice(0, 160) ?? undefined,
      durationMs: event.duration_ms ?? undefined,
      status,
      event
    })
  }

  private handleStepStarted(event: AgentStepStartedEvent): void {
    const ownerId = this.ownerIdForStep(event)

    if (event.step_type === 'tool' || (!event.step_type && event.name)) {
      const toolName = event.name ?? 'tool'
      if (GENERIC_AGENT_NAMES.has(toolName.toLowerCase())) {
        return
      }
      const toolNodeId = `tool:${toolName}`
      this.upsertNode({
        id: toolNodeId,
        kind: 'tool',
        label: toolName,
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
        firstSeenSeq: event.seq,
        lastSeenSeq: event.seq,
        status: 'running',
        totalDurationMs: 0,
        invocationCount: 1
      })
      this.bumpInvocationCount(toolNodeId)

      const edgeId = `${ownerId}->${toolNodeId}@${event.seq}`
      this.edges.push({
        id: edgeId,
        source: ownerId,
        target: toolNodeId,
        kind: 'tool_call',
        seq: event.seq,
        timestamp: event.timestamp,
        label: toolName
      })
      this.toolStepOwner.set(event.step_id, { source: ownerId, toolNodeId, edgeId })

      // Skill tool detection: create a skill node when agent calls skill_load/skill_read_file
      if (
        (toolName === 'skill_load' || toolName === 'skill_read_file' || toolName === 'skill_load_policy') &&
        event.input
      ) {
        const skillId = (event.input.skill_id as string) ?? (event.input.name as string)
        if (skillId) {
          const skillNodeId = `skill:${skillId}`
          if (!this.nodes.has(skillNodeId)) {
            this.upsertNode({
              id: skillNodeId,
              kind: 'skill',
              label: skillId,
              firstSeenAt: event.timestamp,
              lastSeenAt: event.timestamp,
              firstSeenSeq: event.seq,
              lastSeenSeq: event.seq,
              status: 'done',
              totalDurationMs: 0,
              invocationCount: 1,
              metadata: { category: 'runtime', was_auto_detected: false }
            })
          }
          this.bumpInvocationCount(skillNodeId)
          const skillEdgeId = `${ownerId}->${skillNodeId}@skill:${event.seq}`
          if (!this.edges.some(e => e.id === skillEdgeId)) {
            this.edges.push({
              id: skillEdgeId,
              source: ownerId,
              target: skillNodeId,
              kind: 'skill_load',
              seq: event.seq,
              timestamp: event.timestamp,
              label: skillId,
              resolvedAt: event.timestamp
            })
          }
        }
      }

      this.pushFrame({
        id: this.eventId(event, 'tool-start'),
        seq: event.seq,
        timestamp: event.timestamp,
        kind: 'tool',
        nodeId: ownerId,
        targetNodeId: toolNodeId,
        title: toolName,
        summary: summariseInput(event.input),
        status: 'running',
        event
      })
      return
    }

    this.pushFrame({
      id: this.eventId(event, 'step-start'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: 'step',
      nodeId: ownerId,
      title: event.name ?? event.step_type ?? 'Step',
      status: 'running',
      event
    })
  }

  private handleStepCompleted(event: AgentStepCompletedEvent): void {
    const toolEntry = this.toolStepOwner.get(event.step_id)
    if (toolEntry) {
      this.handleToolStepCompleted(event, toolEntry)
      return
    }

    this.pushFrame({
      id: this.eventId(event, 'step-end'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: 'step',
      nodeId: this.currentScopeId(),
      title: event.name ?? 'Step completed',
      summary: typeof event.output === 'string' ? event.output.slice(0, 160) : undefined,
      durationMs: event.duration_ms ?? undefined,
      status: event.status === 'failed' ? 'failed' : 'done',
      event
    })
  }

  private updateToolNodeOnCompletion(toolNode: NodeAcc | undefined, event: AgentStepCompletedEvent): void {
    if (!toolNode) return
    toolNode.status = event.status === 'failed' ? 'failed' : 'done'
    toolNode.lastSeenAt = event.timestamp
    toolNode.lastSeenSeq = event.seq
    if (typeof event.duration_ms === 'number') toolNode.totalDurationMs += event.duration_ms
  }

  private extractSkillsFromToolOutput(toolNode: NodeAcc | undefined, event: AgentStepCompletedEvent): void {
    if (!toolNode || !event.output) return
    if (toolNode.label === 'newwork_find_expert') {
      this.extractSkillsFromFindExpert(event.output, event)
      return
    }
    if (toolNode.label === 'newwork_ask_expert') {
      const expertName =
        pickName('expert_name' in event ? (event as { expert_name?: string }).expert_name : undefined) ??
        pickName(toolNode.metadata?.expert as string | undefined)
      const expertNodeId = expertName ? this.expertNodeByName.get(expertName) : undefined
      if (expertNodeId) {
        this.extractSkillsFromOutput(expertNodeId, event.output, event)
      }
    }
  }

  private handleToolStepCompleted(
    event: AgentStepCompletedEvent,
    toolEntry: { source: string; toolNodeId: string; edgeId: string }
  ): void {
    const toolNode = this.nodes.get(toolEntry.toolNodeId)
    this.updateToolNodeOnCompletion(toolNode, event)

    const spawnEdge = this.edges.find(e => e.id === toolEntry.edgeId)
    if (spawnEdge) spawnEdge.resolvedAt = event.timestamp
    this.edges.push({
      id: `${toolEntry.toolNodeId}->${toolEntry.source}@${event.seq}`,
      source: toolEntry.toolNodeId,
      target: toolEntry.source,
      kind: 'completion',
      seq: event.seq,
      timestamp: event.timestamp,
      label: event.status === 'failed' ? 'Failed' : 'Result',
      status: event.status === 'failed' ? 'failed' : 'done'
    })
    this.toolStepOwner.delete(event.step_id)

    this.extractSkillsFromToolOutput(toolNode, event)

    this.pushFrame({
      id: this.eventId(event, 'tool-end'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: 'tool',
      nodeId: toolEntry.source,
      targetNodeId: toolEntry.toolNodeId,
      title: `${event.name ?? toolNode?.label ?? 'tool'} → ${event.status ?? 'done'}`,
      summary: typeof event.output === 'string' ? event.output.slice(0, 160) : undefined,
      durationMs: event.duration_ms ?? undefined,
      status: event.status === 'failed' ? 'failed' : 'done',
      event
    })
  }

  private handleSkillLoaded(event: SkillLoadedEvent): void {
    if (!event.skill?.skill_id) return
    const skillNodeId = `skill:${event.skill.skill_id}`
    const ownerId = this.resolveSkillOwnerId(event.skill.skill_id)
    this.upsertNode({
      id: skillNodeId,
      kind: 'skill',
      label: event.skill.name || event.skill.skill_id,
      description: event.skill.description,
      firstSeenAt: event.timestamp,
      lastSeenAt: event.timestamp,
      firstSeenSeq: event.seq,
      lastSeenSeq: event.seq,
      status: 'done',
      totalDurationMs: 0,
      invocationCount: 1,
      metadata: { category: event.skill.category, was_auto_detected: event.was_auto_detected }
    })
    this.bumpInvocationCount(skillNodeId)

    // Avoid duplicate edge if expert_selected already connected this skill
    const hasDuplicateEdge = this.edges.some(
      e => e.source === ownerId && e.target === skillNodeId && e.kind === 'skill_load'
    )
    if (!hasDuplicateEdge) {
      this.edges.push({
        id: `${ownerId}->${skillNodeId}@${event.seq}`,
        source: ownerId,
        target: skillNodeId,
        kind: 'skill_load',
        seq: event.seq,
        timestamp: event.timestamp,
        label: event.skill.name,
        resolvedAt: event.timestamp
      })
    }

    this.pushFrame({
      id: this.eventId(event, 'skill-load'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: 'skill',
      nodeId: ownerId,
      targetNodeId: skillNodeId,
      title: `Loaded skill ${event.skill.name}`,
      summary: event.skill.description,
      status: 'done',
      event
    })
  }

  /**
   * Phase 3: ``skill_scoped`` is the session-level intent. Surface the
   * skill node so the mesh shows it is available to the run, but do NOT
   * create the ``skill_load`` edge — that stays exclusive to real body
   * injections (factory preload completion or runtime ``skill_load``).
   */
  private handleSkillScoped(event: SkillScopedEvent): void {
    if (!event.skill?.skill_id) return
    const skillNodeId = `skill:${event.skill.skill_id}`
    // Session-start intent only — no mesh node (avoids orphan skills without
    // execution edges). Real loads still surface via ``skill_loaded`` / tools.
    this.pushFrame({
      id: this.eventId(event, 'skill-scoped'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: 'skill',
      nodeId: this.currentScopeId(),
      targetNodeId: skillNodeId,
      title: `Scoped skill ${event.skill.name}`,
      summary: event.skill.description,
      event
    })
  }

  private handleDecision(event: AgentDecisionEvent): void {
    const offsetMs = safeOffset(event.timestamp, this.baseMs)
    this.decisions.push({
      id: event.event_id || `decision-${event.seq}`,
      seq: event.seq,
      timestamp: event.timestamp,
      offsetMs,
      category: event.category,
      title: event.title,
      chosen: event.chosen,
      rationale: event.rationale,
      alternatives: event.alternatives,
      confidence: event.confidence,
      metadata: event.metadata
    })
    this.pushFrame({
      id: this.eventId(event, 'decision'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: 'decision',
      nodeId: this.currentScopeId(),
      title: event.title,
      summary: event.rationale,
      event
    })
  }

  private handleHitl(event: HitlRequestedEvent): void {
    this.pushFrame({
      id: this.eventId(event, 'hitl'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: 'hitl',
      nodeId: this.currentScopeId(),
      title: event.request.title,
      summary: event.request.description ?? undefined,
      event
    })
  }

  private handleCapabilityMissing(event: CapabilityMissingEvent): void {
    this.pushFrame({
      id: this.eventId(event, 'capability-missing'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: 'capability_missing',
      nodeId: this.currentScopeId(),
      title: event.title ?? 'Capability missing',
      summary: event.message,
      status: 'failed',
      event
    })
  }

  /**
   * One expert name must map to one mesh node. ``expert_called`` keys nodes by
   * subagent/step id while ``expert_selected`` keys by registry id — reuse any
   * existing node for the same display name before creating a second expert.
   */
  private resolveExpertNodeId(expertName: string, registryExpertId: string): string {
    return this.resolveAgentNodeIdByLabel(expertName, `expert:${registryExpertId}`)
  }

  /** One display label → one mesh agent node (subagent and expert kinds). */
  private resolveAgentNodeIdByLabel(label: string, fallbackId: string): string {
    const cached = this.agentNodeByLabel.get(label)
    if (cached && this.nodes.has(cached)) return cached

    const fromExpert = this.expertNodeByName.get(label)
    if (fromExpert && this.nodes.has(fromExpert)) {
      this.agentNodeByLabel.set(label, fromExpert)
      return fromExpert
    }

    for (const [id, node] of this.nodes) {
      if ((node.kind === 'subagent' || node.kind === 'expert') && node.label === label) {
        this.agentNodeByLabel.set(label, id)
        if (node.kind === 'expert') this.expertNodeByName.set(label, id)
        return id
      }
    }

    this.agentNodeByLabel.set(label, fallbackId)
    if (fallbackId.startsWith('expert:')) this.expertNodeByName.set(label, fallbackId)
    return fallbackId
  }

  private ownerIdForStep(event: AgentStepStartedEvent): string {
    const parentStepId = event.parent_step_id
    if (parentStepId) {
      const owner = this.stepOwner.get(parentStepId)
      if (owner) return owner
    }
    return this.currentScopeId()
  }

  private ownerIdForToolChunk(event: AgentChunkEvent): string {
    const subagentName = event.metadata?.subagent_name
    if (typeof subagentName === 'string' && subagentName.trim()) {
      const byLabel = this.resolveAgentNodeIdByLabel(subagentName.trim(), `subagent:${subagentName.trim()}`)
      if (this.nodes.has(byLabel)) return byLabel
    }
    return this.currentScopeId()
  }

  private resolveSkillOwnerId(skillId: string): string {
    const mapped = this.skillOwnerBySkillId.get(skillId)
    if (mapped && this.nodes.has(mapped)) return mapped

    const agents = [...this.nodes.values()].filter(
      n => (n.kind === 'subagent' || n.kind === 'expert') && n.status !== 'idle'
    )
    if (agents.length === 1) return agents[0].id

    const anyAgents = [...this.nodes.values()].filter(n => n.kind === 'subagent' || n.kind === 'expert')
    if (anyAgents.length === 1) return anyAgents[0].id

    return this.currentScopeId()
  }

  private handleEnterpriseRuntime(event: EnterpriseRuntimeTraceEvent): void {
    if (event.type === 'expert_selected' && event.expert_id) {
      this.handleExpertSelectedRuntime(event)
      return
    }

    if (event.type === 'tool_available' && event.tool_ref) {
      this.handleToolAvailableRuntime()
    }
  }

  private handleExpertSelectedRuntime(event: EnterpriseRuntimeTraceEvent): void {
    if (!event.expert_id) return

    const expertName = (event.payload?.name as string) || event.expert_id
    const expertNodeId = this.resolveExpertNodeId(expertName, event.expert_id)
    this.expertNodeByName.set(expertName, expertNodeId)
    this.upsertNode({
      id: expertNodeId,
      kind: 'expert',
      label: expertName,
      description: event.payload?.description as string | undefined,
      firstSeenAt: event.timestamp,
      lastSeenAt: event.timestamp,
      firstSeenSeq: event.seq,
      lastSeenSeq: event.seq,
      status: 'idle',
      totalDurationMs: 0,
      invocationCount: 0,
      metadata: { registry_expert_id: event.expert_id }
    })

    const skillIds = event.payload?.skill_ids
    if (Array.isArray(skillIds) && skillIds.length > 0) {
      this.linkExpertSkillsFromSelection(expertNodeId, skillIds, event)
    }
  }

  private linkExpertSkillsFromSelection(
    expertNodeId: string,
    skillIds: unknown[],
    event: EnterpriseRuntimeTraceEvent
  ): void {
    for (const sid of skillIds) {
      if (!sid) continue
      this.skillOwnerBySkillId.set(String(sid), expertNodeId)
      const skillNodeId = `skill:${sid}`
      if (!this.nodes.has(skillNodeId)) {
        this.upsertNode({
          id: skillNodeId,
          kind: 'skill',
          label: String(sid),
          firstSeenAt: event.timestamp,
          lastSeenAt: event.timestamp,
          firstSeenSeq: event.seq,
          lastSeenSeq: event.seq,
          status: 'done',
          totalDurationMs: 0,
          invocationCount: 1,
          metadata: { category: 'enterprise', was_auto_detected: false }
        })
      }
      const hasDuplicateEdge = this.edges.some(
        e => e.source === expertNodeId && e.target === skillNodeId && e.kind === 'skill_load'
      )
      if (!hasDuplicateEdge) {
        this.edges.push({
          id: `${expertNodeId}->${skillNodeId}@${event.seq}`,
          source: expertNodeId,
          target: skillNodeId,
          kind: 'skill_load',
          seq: event.seq,
          timestamp: event.timestamp,
          label: String(sid),
          resolvedAt: event.timestamp
        })
      }
    }
  }

  private handleToolAvailableRuntime(): void {
    // Catalog binding only — not an execution edge. ``prepareMeshTraceEvents``
    // filters these before mesh builds; keep handler as a no-op for callers
    // that invoke ``buildTraceModel`` directly (trace explorer frames).
  }

  private handleToolChunk(event: AgentChunkEvent): void {
    const toolName = event.tool_name!
    if (GENERIC_AGENT_NAMES.has(toolName.toLowerCase())) {
      return
    }
    const ownerId = this.ownerIdForToolChunk(event)
    const toolNodeId = `tool:${toolName}`

    this.upsertNode({
      id: toolNodeId,
      kind: 'tool',
      label: toolName,
      firstSeenAt: event.timestamp,
      lastSeenAt: event.timestamp,
      firstSeenSeq: event.seq,
      lastSeenSeq: event.seq,
      status: 'done',
      totalDurationMs: 0,
      invocationCount: 1
    })
    this.bumpInvocationCount(toolNodeId)

    // Detect skill tool calls and also create a skill node
    if (toolName === 'skill_load' || toolName === 'skill_read_file') {
      const skillId = (event.tool_input?.skill_id as string) ?? (event.tool_input?.name as string)
      if (skillId) {
        const skillNodeId = `skill:${skillId}`
        if (!this.nodes.has(skillNodeId)) {
          this.upsertNode({
            id: skillNodeId,
            kind: 'skill',
            label: skillId,
            firstSeenAt: event.timestamp,
            lastSeenAt: event.timestamp,
            firstSeenSeq: event.seq,
            lastSeenSeq: event.seq,
            status: 'done',
            totalDurationMs: 0,
            invocationCount: 1,
            metadata: { category: 'runtime', was_auto_detected: false }
          })
        }
        this.bumpInvocationCount(skillNodeId)

        // Edge from the current scope (the agent calling the skill tool) to the skill
        const edgeId = `${ownerId}->${skillNodeId}@${event.seq}`
        if (!this.edges.some(e => e.id === edgeId)) {
          this.edges.push({
            id: edgeId,
            source: ownerId,
            target: skillNodeId,
            kind: 'skill_load',
            seq: event.seq,
            timestamp: event.timestamp,
            label: skillId,
            resolvedAt: event.timestamp
          })
        }
      }
    }

    // Edge from scope to tool — agent_chunk is the result, so mark resolved immediately
    if (!this.edges.some(e => e.source === ownerId && e.target === toolNodeId && e.kind === 'tool_call')) {
      this.edges.push({
        id: `${ownerId}->${toolNodeId}@${event.seq}`,
        source: ownerId,
        target: toolNodeId,
        kind: 'tool_call',
        seq: event.seq,
        timestamp: event.timestamp,
        label: toolName,
        resolvedAt: event.timestamp
      })
    }

    this.pushFrame({
      id: this.eventId(event, 'tool'),
      seq: event.seq,
      timestamp: event.timestamp,
      kind: 'tool',
      nodeId: ownerId,
      targetNodeId: toolNodeId,
      title: `${toolName}`,
      summary: event.content?.slice(0, 120) || undefined,
      status: 'done',
      event
    })
  }

  /**
   * Strip the <!--__envelope__:...--> marker emitted by ToolResultEnvelope.to_tool_output()
   * so downstream JSON.parse sees clean payload.
   */
  private stripEnvelopeMarker(raw: string): string {
    if (raw.startsWith('<!--__envelope__:')) {
      const end = raw.indexOf('-->')
      if (end !== -1) return raw.slice(end + 3).trimStart()
    }
    return raw
  }

  /**
   * Parse newwork_find_expert output (JSON array of expert entries with skill_ids)
   * and create skill nodes connected to respective expert nodes.
   * Handles truncated output (backend caps at 500 chars) by extracting
   * skill_ids via regex fallback when JSON.parse fails.
   */
  private extractSkillsFromFindExpert(output: string, event: { seq: number; timestamp: string }): void {
    const cleaned = this.stripEnvelopeMarker(output)
    let experts: Array<{ name?: string; skill_ids?: string[] }> = []
    try {
      const parsed = JSON.parse(cleaned)
      experts = Array.isArray(parsed) ? parsed : []
    } catch {
      // Truncated JSON — extract skill_ids via regex as fallback
      const re = /"name"\s*:\s*"([^"]+)"[^}]*?"skill_ids"\s*:\s*\[([^\]]*)\]/g
      let match: RegExpExecArray | null
      while ((match = re.exec(cleaned)) !== null) {
        const name = match[1]
        const ids = match[2].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) ?? []
        if (name && ids.length > 0) experts.push({ name, skill_ids: ids })
      }
    }
    for (const entry of experts) {
      const expertName = entry?.name
      const skillIds = entry?.skill_ids
      if (!expertName || !Array.isArray(skillIds) || skillIds.length === 0) continue
      const expertNodeId = this.expertNodeByName.get(expertName)
      const ownerId = expertNodeId ?? this.currentScopeId()
      for (const sid of skillIds) {
        if (!sid) continue
        const skillNodeId = `skill:${sid}`
        this.skillExpertNameBySkillId.set(sid, expertName)
        if (!this.nodes.has(skillNodeId)) {
          this.upsertNode({
            id: skillNodeId,
            kind: 'skill',
            label: String(sid),
            firstSeenAt: event.timestamp,
            lastSeenAt: event.timestamp,
            firstSeenSeq: event.seq,
            lastSeenSeq: event.seq,
            status: 'done',
            totalDurationMs: 0,
            invocationCount: 1,
            metadata: { category: 'enterprise', was_auto_detected: false }
          })
        }
        this.bumpInvocationCount(skillNodeId)
        this.skillOwnerBySkillId.set(sid, ownerId)
        if (!this.edges.some(e => e.source === ownerId && e.target === skillNodeId && e.kind === 'skill_load')) {
          this.edges.push({
            id: `${ownerId}->${skillNodeId}@find:${event.seq}`,
            source: ownerId,
            target: skillNodeId,
            kind: 'skill_load',
            seq: event.seq,
            timestamp: event.timestamp,
            label: String(sid),
            resolvedAt: event.timestamp
          })
        }
      }
    }
  }

  /**
   * Parse expert completion output JSON and create skill nodes if skill_ids found.
   */
  private extractSkillsFromOutput(
    expertNodeId: string,
    output: string,
    event: { seq: number; timestamp: string }
  ): void {
    try {
      const cleaned = this.stripEnvelopeMarker(output)
      const parsed = JSON.parse(cleaned)
      const skillIds = parsed?.skill_ids
      if (!Array.isArray(skillIds) || skillIds.length === 0) return
      for (const sid of skillIds) {
        if (!sid) continue
        const skillNodeId = `skill:${sid}`
        if (!this.nodes.has(skillNodeId)) {
          this.upsertNode({
            id: skillNodeId,
            kind: 'skill',
            label: String(sid),
            firstSeenAt: event.timestamp,
            lastSeenAt: event.timestamp,
            firstSeenSeq: event.seq,
            lastSeenSeq: event.seq,
            status: 'done',
            totalDurationMs: 0,
            invocationCount: 1,
            metadata: { category: 'enterprise', was_auto_detected: false }
          })
        }
        this.bumpInvocationCount(skillNodeId)
        const edgeId = `${expertNodeId}->${skillNodeId}@skill-out:${event.seq}`
        if (!this.edges.some(e => e.source === expertNodeId && e.target === skillNodeId && e.kind === 'skill_load')) {
          this.edges.push({
            id: edgeId,
            source: expertNodeId,
            target: skillNodeId,
            kind: 'skill_load',
            seq: event.seq,
            timestamp: event.timestamp,
            label: String(sid),
            resolvedAt: event.timestamp
          })
        }
      }
    } catch {
      // Output is not valid JSON or doesn't contain skill_ids
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private upsertNode(candidate: NodeAcc): void {
    const existing = this.nodes.get(candidate.id)
    if (!existing) {
      this.nodes.set(candidate.id, { ...candidate })
      return
    }
    existing.label = existing.label || candidate.label
    existing.description = existing.description ?? candidate.description
    if (candidate.firstSeenAt && (!existing.firstSeenAt || candidate.firstSeenAt < existing.firstSeenAt)) {
      existing.firstSeenAt = candidate.firstSeenAt
      existing.firstSeenSeq = candidate.firstSeenSeq
    }
    if (candidate.lastSeenAt && candidate.lastSeenAt >= existing.lastSeenAt) {
      existing.lastSeenAt = candidate.lastSeenAt
      existing.lastSeenSeq = candidate.lastSeenSeq
    }
    if (candidate.status === 'failed') existing.status = 'failed'
    else if (candidate.status === 'running' && existing.status !== 'failed') existing.status = 'running'
    else if (candidate.status === 'done' && existing.status === 'idle') existing.status = 'done'
    if (candidate.metadata) existing.metadata = { ...(existing.metadata ?? {}), ...candidate.metadata }
  }

  private bumpInvocationCount(nodeId: string): void {
    const node = this.nodes.get(nodeId)
    if (!node) return
    node.invocationCount += 1
  }

  private currentScopeId(): string {
    return this.scopeStack[this.scopeStack.length - 1] ?? ORCHESTRATOR_NODE_ID
  }

  private pushFrame(frame: Omit<TraceFrame, 'offsetMs'>): void {
    const offsetMs = safeOffset(frame.timestamp, this.baseMs)
    this.frames.push({ ...frame, offsetMs })
  }

  private seq(event: AgentStreamEvent): number {
    return 'seq' in event && typeof event.seq === 'number' ? event.seq : 0
  }

  private timestamp(event: AgentStreamEvent): string {
    if ('timestamp' in event && typeof event.timestamp === 'string') return event.timestamp
    return new Date().toISOString()
  }

  private eventId(event: AgentStreamEvent, suffix: string): string {
    if ('event_id' in event && event.event_id) return `${event.event_id}:${suffix}`
    return `seq-${this.seq(event)}:${suffix}`
  }
}

function summariseInput(input?: Record<string, unknown>): string | undefined {
  if (!input) return undefined
  const entries = Object.entries(input).slice(0, 3)
  if (entries.length === 0) return undefined
  return entries
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v).slice(0, 40)}`)
    .join(' · ')
}

/**
 * Drop catalog-only trace rows that pollute the execution mesh (bound tools,
 * session-start skill intent). Trace Lens collapses these separately.
 */
export function prepareMeshTraceEvents(events: AgentStreamEvent[]): AgentStreamEvent[] {
  return events.filter(event => event.type !== 'tool_available' && event.type !== 'skill_scoped')
}

/** Build a normalized trace model from an SSE / REST event list. */
export function buildTraceModel(events: AgentStreamEvent[]): TraceModel {
  return new ModelBuilder().build(events)
}

/** Mesh / session graph — execution-only events plus graph attribution fixes. */
export function buildMeshTraceModel(events: AgentStreamEvent[]): TraceModel {
  return new ModelBuilder().build(prepareMeshTraceEvents(events))
}

/** Empty model used as a stable placeholder before any events arrive. */
export const EMPTY_TRACE_MODEL: TraceModel = {
  nodes: [
    {
      id: ORCHESTRATOR_NODE_ID,
      kind: 'orchestrator',
      label: 'Every',
      description: 'Session orchestrator',
      firstSeenAt: '',
      lastSeenAt: '',
      firstSeenSeq: 0,
      lastSeenSeq: 0,
      offsetMs: 0,
      lastOffsetMs: 0,
      status: 'idle',
      totalDurationMs: 0,
      invocationCount: 0
    }
  ],
  edges: [],
  frames: [],
  decisions: [],
  summary: {
    eventCount: 0,
    participantCount: 0,
    subagentCount: 0,
    expertCount: 0,
    toolCallCount: 0,
    skillLoadCount: 0,
    decisionCount: 0,
    durationMs: 0
  },
  startedAt: null,
  endedAt: null
}
