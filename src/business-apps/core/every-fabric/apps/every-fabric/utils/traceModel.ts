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
  AgentStepCompletedEvent,
  AgentStepStartedEvent,
  AgentStreamEvent,
  AgentSubagentCompletedEvent,
  AgentSubagentSpawnedEvent,
  AgentTerminalEvent,
  CapabilityMissingEvent,
  EnterpriseRuntimeTraceEvent,
  HitlRequestedEvent,
  SkillLoadedEvent
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
    pickName(event.name) ??
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

type NodeAcc = MeshNode

class ModelBuilder {
  private readonly nodes = new Map<string, NodeAcc>()
  private readonly edges: MeshEdge[] = []
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

    const nodes = Array.from(this.nodes.values())
    const startedAt = this.frames[0]?.timestamp ?? null
    const endedAt = this.frames[this.frames.length - 1]?.timestamp ?? null
    const durationMs = startedAt && endedAt ? Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) : 0

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
      edges: this.edges,
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
      return
    }
    if (event.type === 'agent_chunk' && event.chunk_kind === 'tool' && event.tool_name) {
      this.handleToolChunk(event)
      return
    }
    if (event.type === 'artifact_created') {
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
  }

  private handleSpawn(event: AgentSubagentSpawnedEvent | AgentExpertCalledEvent): void {
    const kind: MeshNodeKind = event.type === 'expert_called' ? 'expert' : 'subagent'
    const label = resolveSpawnName(event)
    // Reuse existing expert node by name (from expert_selected or prior expert_called)
    let existingExpertNodeId: string | undefined
    if (event.type === 'expert_called') {
      existingExpertNodeId = this.expertNodeByName.get(label)
      if (!existingExpertNodeId) {
        // Fallback: find any existing expert node with the same label
        for (const [id, node] of this.nodes) {
          if (node.kind === 'expert' && node.label === label) {
            existingExpertNodeId = id
            break
          }
        }
      }
    }
    const nodeId = existingExpertNodeId ?? `${kind}:${event.subagent_id ?? event.step_id ?? `${event.seq}-${label}`}`
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
    // Register so subsequent calls to the same expert reuse this node
    if (event.type === 'expert_called') this.expertNodeByName.set(label, nodeId)

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
    const ownerId = this.currentScopeId()

    if (event.step_type === 'tool' || (!event.step_type && event.name)) {
      const toolName = event.name ?? 'tool'
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
      const toolNode = this.nodes.get(toolEntry.toolNodeId)
      if (toolNode) {
        toolNode.status = event.status === 'failed' ? 'failed' : 'done'
        toolNode.lastSeenAt = event.timestamp
        toolNode.lastSeenSeq = event.seq
        if (typeof event.duration_ms === 'number') toolNode.totalDurationMs += event.duration_ms
      }
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

      // Extract skills from newwork_find_expert output (JSON array with skill_ids per expert)
      if (toolNode?.label === 'newwork_find_expert' && event.output) {
        this.extractSkillsFromFindExpert(event.output, event)
      }

      // Extract skills from newwork_ask_expert output (capability_gap JSON may contain skill context)
      if (toolNode?.label === 'newwork_ask_expert' && event.output) {
        const expertName =
          ((event as Record<string, unknown>).expert_name as string | undefined) ??
          (toolNode.metadata?.expert as string | undefined)
        const expertNodeId = expertName ? this.expertNodeByName.get(expertName) : undefined
        if (expertNodeId) {
          this.extractSkillsFromOutput(expertNodeId, event.output, event)
        }
      }

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

  private handleSkillLoaded(event: SkillLoadedEvent): void {
    if (!event.skill?.skill_id) return
    const skillNodeId = `skill:${event.skill.skill_id}`
    // Prefer the owning expert (from expert_selected) over the current scope
    const ownerId = this.skillOwnerBySkillId.get(event.skill.skill_id) ?? this.currentScopeId()
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

  private handleEnterpriseRuntime(event: EnterpriseRuntimeTraceEvent): void {
    if (event.type === 'expert_selected' && event.expert_id) {
      const expertNodeId = `expert:${event.expert_id}`
      const expertName = (event.payload?.name as string) || event.expert_id
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
        invocationCount: 0
      })

      // Create skill nodes from the expert's skill_ids when present
      const skillIds = event.payload?.skill_ids
      if (Array.isArray(skillIds) && skillIds.length > 0) {
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
    } else if (event.type === 'tool_available' && event.tool_ref) {
      const nodeId = `tool:${event.tool_ref}`
      this.upsertNode({
        id: nodeId,
        kind: 'tool',
        label: event.tool_ref,
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
        firstSeenSeq: event.seq,
        lastSeenSeq: event.seq,
        status: 'idle',
        totalDurationMs: 0,
        invocationCount: 0
      })
    }
  }

  private handleToolChunk(event: AgentChunkEvent): void {
    const toolName = event.tool_name!
    const ownerId = this.currentScopeId()
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

/** Build a normalized trace model from an SSE / REST event list. */
export function buildTraceModel(events: AgentStreamEvent[]): TraceModel {
  return new ModelBuilder().build(events)
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
