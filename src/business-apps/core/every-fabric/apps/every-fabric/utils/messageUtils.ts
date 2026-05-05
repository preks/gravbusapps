import type {
  ActivityEvent,
  AgentChunkEvent,
  AgentExpertCalledEvent,
  AgentExpertCompletedEvent,
  AgentStepCompletedEvent,
  AgentStreamEvent,
  AgentSubagentCompletedEvent,
  AgentSubagentSpawnedEvent,
  AgentTerminalEvent,
  ChatMessage,
  ChatMessageType,
  DeepAgentSession
} from '../types/enterpriseAgent'
import { resolveRendererType } from '../types/fabric'
import { extractLatestTodosFromEvents, isTodoListToolName } from './fabricTodoStream'
import { humanizeSkillId } from './skillUtils'

export const FABRIC_LIVE_PLAN_MESSAGE_ID = 'fabric-live-plan'

const terminalQuestion = (output: unknown, humanQuestion?: string | null): string => {
  if (typeof humanQuestion === 'string' && humanQuestion.trim()) return humanQuestion
  if (typeof output === 'string' && output.trim()) return output
  if (output && typeof output === 'object' && 'question' in output) {
    const question = (output as { question?: unknown }).question
    if (typeof question === 'string' && question.trim()) return question
  }
  return 'The agent needs your input to continue.'
}

type StepCompletion = AgentStepCompletedEvent | AgentSubagentCompletedEvent | AgentExpertCompletedEvent

const GENERIC_DELEGATION_NAMES = new Set(['task', 'newwork_ask_expert', 'invoke_agent', 'subagent', 'dispatch_agent'])

const pickDisplayName = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return GENERIC_DELEGATION_NAMES.has(trimmed.toLowerCase()) ? null : trimmed
}

const inferDelegatedAgentName = (taskSummary?: string | null): string | null => {
  if (typeof taskSummary !== 'string') return null
  const compact = taskSummary.trim()
  if (!compact) return null
  const normalized = compact.toLowerCase()

  if (/\b(market|competitor|industry|research|trend)\b/.test(normalized)) return 'Market research'
  if (/\b(vpn|access|it\b|infrastructure|security|diagnos|troubleshoot)\b/.test(normalized)) return 'IT support'
  if (/\b(hr|human resources|manager|employee|role|permission|admin)\b/.test(normalized)) return 'HR operations'
  if (/\b(salary|bonus|stock|compensation|budget|pay|allocation)\b/.test(normalized)) return 'Compensation'
  if (/\b(expense|spend|cost|finance|financial|pricing|revenue)\b/.test(normalized)) return 'Finance'
  if (/\b(workflow|approval|process|orchestrat|submission)\b/.test(normalized)) return 'Workflow design'
  if (/\b(report|write|summary|brief|document)\b/.test(normalized)) return 'Writing'
  if (/\b(chart|diagram|visual|analysis|analytics|data)\b/.test(normalized)) return 'Data analysis'

  return null
}

const resolveDelegatedAgentName = (
  event: AgentSubagentSpawnedEvent | AgentSubagentCompletedEvent | AgentExpertCalledEvent | AgentExpertCompletedEvent,
  completion?: StepCompletion
): string =>
  pickDisplayName('expert_name' in event ? event.expert_name : undefined) ||
  pickDisplayName('agent_name' in event ? event.agent_name : undefined) ||
  pickDisplayName('name' in event ? event.name : undefined) ||
  pickDisplayName(completion && 'expert_name' in completion ? completion.expert_name : undefined) ||
  pickDisplayName(completion && 'agent_name' in completion ? completion.agent_name : undefined) ||
  pickDisplayName(completion && 'name' in completion ? completion.name : undefined) ||
  inferDelegatedAgentName('task_summary' in event ? event.task_summary : undefined) ||
  inferDelegatedAgentName(completion && 'task_summary' in completion ? completion.task_summary : undefined) ||
  event.subagent_id ||
  (completion && 'subagent_id' in completion ? completion.subagent_id : undefined) ||
  'Sub-agent'

const parseToolOutput = (output?: string): unknown => {
  if (typeof output !== 'string') return output
  const trimmed = output.trim()
  if (!trimmed) return output

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return output
    }
  }

  return output
}

const toArtifactRefsFromMeta = (
  artifacts?: Array<{
    name: string
    path: string
    mime_type: string
    size: number
  }>
): Array<{
  name: string
  path: string
  mime_type: string
  size: number
  rendererType: ReturnType<typeof resolveRendererType>
}> =>
  (artifacts ?? []).map(artifact => ({
    name: artifact.name,
    path: artifact.path || artifact.name,
    mime_type: artifact.mime_type ?? '',
    size: artifact.size ?? 0,
    rendererType: resolveRendererType(artifact.mime_type, artifact.name)
  }))

const chunkToMessage = (chunk: AgentChunkEvent): ChatMessage | null => {
  if (chunk.role === 'human') {
    return {
      id: chunk.event_id,
      type: 'user_input',
      timestamp: chunk.timestamp,
      content: chunk.content
    }
  }

  if (chunk.chunk_kind === 'response_stream') {
    return null
  }

  if (chunk.role === 'ai' || chunk.role === 'system') {
    // Status updates get their own message type
    const isStatus = chunk.chunk_kind === 'status'
    return {
      id: chunk.event_id,
      type: isStatus ? 'agent_status' : 'agent_thinking',
      timestamp: chunk.timestamp,
      content: chunk.content,
      isStreaming: chunk.chunk_kind !== 'final'
    }
  }

  // tool role chunks — rendered via step events; skip to avoid duplication
  return null
}

const toEpoch = (value?: string): number => {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const readEventSeq = (event?: AgentStreamEvent): number | undefined => {
  if (!event || !('seq' in event) || typeof event.seq !== 'number') {
    return undefined
  }

  return event.seq
}

function toolCallMessageStatus(completed: StepCompletion | undefined): 'failed' | 'done' | 'running' {
  if (!completed) return 'running'
  return completed.status === 'failed' ? 'failed' : 'done'
}

type DelegationStatus = 'running' | 'done' | 'failed'

interface ExpertCallContent {
  agentId: string
  task: string
  status: DelegationStatus
  durationMs?: number
  outputPreview?: string
}

/**
 * Collapses multiple backend spawns of the same logical expert/sub-agent
 * (same agent name + same task summary but different `step_id`s — e.g. retries
 * across turns) into a single transcript bubble, and merges their status so
 * a completion from any one spawn wins over a still-running one.
 *
 * Status ranking: `done` > `failed` > `running` (a successful completion is
 * the most informative signal to show the user).
 */
const DELEGATION_STATUS_RANK: Record<DelegationStatus, number> = {
  done: 3,
  failed: 2,
  running: 1
}

const expertCallDedupeKey = (content: ExpertCallContent): string =>
  `${content.agentId.trim().toLowerCase()}::${content.task.trim().toLowerCase()}`

const mergeExpertCallContent = (existing: ExpertCallContent, incoming: ExpertCallContent): ExpertCallContent => {
  const existingRank = DELEGATION_STATUS_RANK[existing.status]
  const incomingRank = DELEGATION_STATUS_RANK[incoming.status]
  const richer = incomingRank > existingRank ? incoming : existing
  return {
    agentId: existing.agentId,
    task: existing.task,
    status: richer.status,
    durationMs: richer.durationMs ?? existing.durationMs ?? incoming.durationMs,
    outputPreview: richer.outputPreview ?? existing.outputPreview ?? incoming.outputPreview
  }
}

/**
 * Once a session has emitted a terminal event, any still-"running" expert /
 * tool call bubbles are orphaned — the backend may have skipped the
 * completion event (or the completion's `step_id` didn't match), and the
 * spinner would otherwise spin forever. Mirror the right-panel rule
 * (`resolveActivityDelegationStatus`): if the stream is no longer live,
 * treat remaining in-flight delegations / tool calls as finished.
 */
const finalizeRunningMessagesOnTerminal = (events: AgentStreamEvent[], messages: ChatMessage[]): void => {
  const terminal = events.find(
    (e): e is AgentTerminalEvent =>
      e.type === 'terminal' && (e.status === 'completed' || e.status === 'failed' || e.status === 'cancelled')
  )
  if (!terminal) return

  const resolved: DelegationStatus = terminal.status === 'failed' ? 'failed' : 'done'

  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i]
    if (msg.type !== 'expert_call' && msg.type !== 'tool_call') continue
    const content = msg.content as { status?: DelegationStatus }
    if (!content || content.status !== 'running') continue
    messages[i] = {
      ...msg,
      content: { ...(msg.content as object), status: resolved }
    }
  }
}

function terminalCompletedToChatMessage(
  event: AgentTerminalEvent,
  stepCompletions: Map<string, StepCompletion> | undefined
): ChatMessage {
  let qualityScore: number | undefined
  if (event.reflection) {
    qualityScore = event.reflection.complete ? 1 : 0.5
  }
  const actionsPerformed = stepCompletions
    ? [...stepCompletions.values()]
        .filter(s => s.type === 'step_completed')
        .map(s => ({ step: s.name ?? 'Tool call', tool: s.name, outcome: s.status ?? 'done' }))
    : undefined
  const hasArtifacts = !!event.artifacts && event.artifacts.length > 0
  const hasWorkspaceDocs = !!event.workspace_documents && event.workspace_documents.length > 0
  const hasActions = !!actionsPerformed && actionsPerformed.length > 0
  // Instant replies (greeting / capability fast-path) come back with duration_ms=0
  // and no side-effect artifacts; reveal them progressively so they don't slam
  // into view like a wall of text.
  const isInstant = event.duration_ms === 0 && !hasArtifacts && !hasWorkspaceDocs && !hasActions
  return {
    id: event.event_id,
    type: 'final_answer',
    timestamp: event.timestamp ?? new Date().toISOString(),
    content: {
      output: event.output ?? '',
      todos: event.todos,
      recommendations: event.reflection?.missing_steps?.join('\n'),
      qualityScore,
      actionsPerformed,
      durationMs: event.duration_ms,
      costSummary: event.cost_summary ?? undefined,
      artifacts: toArtifactRefsFromMeta(event.artifacts),
      workspaceDocuments: event.workspace_documents,
      isInstant
    }
  }
}

function terminalWaitingToChatMessage(event: AgentTerminalEvent): ChatMessage {
  if (event.structured_input_request) {
    return {
      id: event.event_id,
      type: 'structured_input_request',
      timestamp: event.timestamp ?? new Date().toISOString(),
      content: event.structured_input_request
    }
  }
  return {
    id: event.event_id,
    type: 'human_interrupt',
    timestamp: event.timestamp ?? new Date().toISOString(),
    content: { question: terminalQuestion(event.output, event.human_question) }
  }
}

function terminalOtherToChatMessage(event: AgentTerminalEvent): ChatMessage {
  return {
    id: event.event_id,
    type: 'error',
    timestamp: event.timestamp ?? new Date().toISOString(),
    content: {
      message: event.status === 'cancelled' ? 'Session was cancelled.' : (event.output ?? 'Session failed')
    }
  }
}

function terminalEventToChatMessage(
  event: AgentTerminalEvent,
  stepCompletions?: Map<string, StepCompletion>
): ChatMessage {
  if (event.status === 'completed') {
    return terminalCompletedToChatMessage(event, stepCompletions)
  }
  if (event.status === 'waiting_for_human') {
    return terminalWaitingToChatMessage(event)
  }
  return terminalOtherToChatMessage(event)
}

function sortAgentEventsBySeq(events: AgentStreamEvent[]): AgentStreamEvent[] {
  return [...events].sort((a, b) => {
    const aSeq = 'seq' in a && typeof a.seq === 'number' ? a.seq : Number.MAX_SAFE_INTEGER
    const bSeq = 'seq' in b && typeof b.seq === 'number' ? b.seq : Number.MAX_SAFE_INTEGER
    if (aSeq !== bSeq) return aSeq - bSeq
    return toEpoch('timestamp' in a ? a.timestamp : undefined) - toEpoch('timestamp' in b ? b.timestamp : undefined)
  })
}

function collectStepCompletions(sortedEvents: AgentStreamEvent[]): Map<string, StepCompletion> {
  const stepCompletions = new Map<string, StepCompletion>()
  for (const event of sortedEvents) {
    if (event.type === 'step_completed' || event.type === 'subagent_completed' || event.type === 'expert_completed') {
      stepCompletions.set(event.step_id, event)
    }
  }
  return stepCompletions
}

function resolveLatestPlanTimestamp(sortedEvents: AgentStreamEvent[]): string {
  let planTimestamp = new Date().toISOString()
  for (let i = sortedEvents.length - 1; i >= 0; i -= 1) {
    const e = sortedEvents[i]
    if ('timestamp' in e && typeof (e as { timestamp?: string }).timestamp === 'string') {
      const ts = (e as { timestamp: string }).timestamp
      if (ts) {
        planTimestamp = ts
        break
      }
    }
  }
  return planTimestamp
}

function delegationActivityStatus(completed: StepCompletion | undefined): 'failed' | 'done' | 'running' {
  if (!completed || (completed.type !== 'subagent_completed' && completed.type !== 'expert_completed')) {
    return 'running'
  }
  return completed.status === 'failed' ? 'failed' : 'done'
}

function appendLivePlanIfNeeded(sortedEvents: AgentStreamEvent[], messages: ChatMessage[], seenIds: Set<string>): void {
  const todoSnapshot = extractLatestTodosFromEvents(sortedEvents)
  if (!todoSnapshot || todoSnapshot.length === 0 || seenIds.has(FABRIC_LIVE_PLAN_MESSAGE_ID)) {
    return
  }
  const planTimestamp = resolveLatestPlanTimestamp(sortedEvents)
  const terminalClosed = sortedEvents.some(
    (e): e is AgentTerminalEvent =>
      e.type === 'terminal' && (e.status === 'completed' || e.status === 'failed' || e.status === 'cancelled')
  )
  messages.push({
    id: FABRIC_LIVE_PLAN_MESSAGE_ID,
    type: 'plan',
    timestamp: planTimestamp,
    content: { todos: todoSnapshot },
    isStreaming: !terminalClosed
  })
}

export function eventToMessage(
  event: AgentStreamEvent,
  stepCompletions?: Map<string, StepCompletion>
): ChatMessage | null {
  switch (event.type) {
    case 'agent_chunk':
      return chunkToMessage(event)

    case 'step_started': {
      const completed = stepCompletions?.get(event.step_id)
      return {
        id: `tool-${event.step_id}`,
        type: 'tool_call',
        timestamp: event.timestamp,
        content: {
          toolName: event.name ?? 'unknown',
          input: event.input ?? {},
          callId: event.step_id,
          status: toolCallMessageStatus(completed),
          durationMs: completed?.duration_ms,
          resultPreview: completed?.output ? String(completed.output).slice(0, 120) : undefined
        }
      }
    }

    case 'step_completed':
      return {
        id: `tool-result-${event.step_id}`,
        type: 'tool_result',
        timestamp: event.timestamp,
        content: {
          callId: event.step_id,
          toolName: event.name ?? 'unknown',
          result: parseToolOutput(event.output),
          durationMs: event.duration_ms ?? 0,
          cached: false
        }
      }

    case 'expert_completed':
    case 'subagent_completed':
      return null

    case 'expert_called': {
      const completed = stepCompletions?.get(event.step_id)
      const agentName = resolveDelegatedAgentName(event, completed)
      return {
        id: `expert-${event.step_id}`,
        type: 'expert_call',
        timestamp: event.timestamp,
        content: {
          agentId: agentName,
          task: event.task_summary ?? agentName,
          status: toolCallMessageStatus(completed),
          durationMs: completed?.duration_ms,
          outputPreview: completed?.output ? String(completed.output).slice(0, 120) : undefined
        }
      }
    }

    case 'subagent_spawned': {
      const completed = stepCompletions?.get(event.step_id)
      const agentName = resolveDelegatedAgentName(event, completed)
      return {
        id: `subagent-${event.step_id}`,
        type: 'expert_call',
        timestamp: event.timestamp,
        content: {
          agentId: agentName,
          task: event.task_summary ?? agentName,
          status: toolCallMessageStatus(completed),
          durationMs: completed?.duration_ms,
          outputPreview: completed?.output ? String(completed.output).slice(0, 120) : undefined
        }
      }
    }

    case 'structured_input_request': {
      return {
        id: event.event_id,
        type: 'structured_input_request',
        timestamp: event.timestamp,
        content: event
      }
    }

    case 'hitl_requested': {
      const payload = event.request.payload ?? {}
      const fields = Array.isArray(payload.fields) ? payload.fields : null
      if (fields) {
        return {
          id: event.event_id,
          type: 'structured_input_request',
          timestamp: event.timestamp,
          content: {
            type: 'structured_input_request',
            seq: event.seq,
            event_id: event.event_id,
            timestamp: event.timestamp,
            form_id: String(payload.form_id ?? event.request.request_id),
            title: event.request.title,
            description: event.request.description ?? '',
            fields,
            allow_partial_submit: Boolean(payload.allow_partial_submit),
            tool_ref: typeof payload.tool_ref === 'string' ? payload.tool_ref : undefined,
            request_status: event.request.status === 'pending' ? undefined : event.request.status
          }
        }
      }
      return {
        id: event.event_id,
        type: 'human_interrupt',
        timestamp: event.timestamp,
        content: { question: event.request.description || event.request.title }
      }
    }

    case 'terminal':
      return terminalEventToChatMessage(event, stepCompletions)

    case 'error':
      return {
        id: `error-${Date.now()}`,
        type: 'error',
        timestamp: new Date().toISOString(),
        content: { message: event.message }
      }

    case 'capability_missing':
      // Capability-gap signals are surfaced in the debug trace and the
      // expert delegation card; the main agent is expected to fall back
      // to direct tools and produce a final answer. We deliberately do
      // NOT emit a top-level error chat message here — it would render
      // as a "Session failed" banner even when the session completes.
      return null

    default:
      return null
  }
}

export function deriveMessagesFromEvents(events: AgentStreamEvent[]): ChatMessage[] {
  const seenIds = new Set<string>()
  const messages: ChatMessage[] = []
  const sortedEvents = sortAgentEventsBySeq(events)
  const stepCompletions = collectStepCompletions(sortedEvents)

  // Same logical expert (same agent + same task) may be spawned several times
  // (e.g. retries across HITL turns) with different `step_id`s, producing
  // distinct messages that the user perceives as duplicates — and some of
  // those spawns never receive a matching completion, leaving spinners spinning
  // forever. We keep only the first occurrence and merge subsequent spawns'
  // status into it so the richest outcome wins.
  const expertCallIndexByKey = new Map<string, number>()

  for (const event of sortedEvents) {
    const message = eventToMessage(event, stepCompletions)
    if (!message || seenIds.has(message.id)) continue

    if (message.type === 'expert_call') {
      const content = message.content as ExpertCallContent
      const key = expertCallDedupeKey(content)
      const existingIdx = expertCallIndexByKey.get(key)
      if (existingIdx !== undefined) {
        const existing = messages[existingIdx]
        const existingContent = existing.content as ExpertCallContent
        messages[existingIdx] = {
          ...existing,
          content: mergeExpertCallContent(existingContent, content)
        }
        seenIds.add(message.id)
        continue
      }
      expertCallIndexByKey.set(key, messages.length)
    }

    seenIds.add(message.id)
    messages.push(message)
  }

  finalizeRunningMessagesOnTerminal(sortedEvents, messages)
  appendLivePlanIfNeeded(sortedEvents, messages, seenIds)

  return messages
}

const MEMORY_TOOLS = new Set(['save_memory', 'search_memory'])

function memoryActivitySummary(toolName?: string): string {
  const action = toolName === 'save_memory' ? 'Saved to' : 'Searched'
  return `${action} memory`
}

function toolActivitySummary(toolName: string | undefined, hasCompleted: boolean): string {
  return `${toolName ?? 'Tool'} ${hasCompleted ? '— done' : '— running'}`
}

function reflectionActivitySummary(isComplete: boolean, gapCount: number, issueCount: number): string {
  if (isComplete) return 'Reflection complete — output quality confirmed'
  return `Reflection: ${gapCount} gap(s), ${issueCount} quality issue(s) found`
}

function toolResultSummary(toolName: string | undefined, status: 'done' | 'failed'): string {
  const verb = status === 'failed' ? '— failed' : '— done'
  return `${toolName ?? 'Tool'} ${verb}`
}

/**
 * Derive activity rows from the raw SSE event stream.
 *
 * Activity is strictly a chronology of tool invocations and delegations:
 *   - `tool_call` rows from `step_started` (excluding todo-plan tools).
 *   - `tool_result` rows from `step_completed` (excluding todo-plan tools
 *     and subagent/expert completions, which are represented by their
 *     spawn rows with `delegationStatus`).
 *   - `memory_access` rows for `save_memory` / `search_memory` tools.
 *   - `subagent_spawn` rows for `subagent_spawned` / `expert_called`.
 *   - A single `reflection` row derived from `terminal.reflection`.
 *
 * Todo-list tooling (`write_todos`, `update_todos`, `*_todos`) is
 * suppressed here because it is represented in the dedicated Plan panel.
 */
function stepStartedActivity(
  e: Extract<AgentStreamEvent, { type: 'step_started' }>,
  stepCompletions: Map<string, StepCompletion>
): ActivityEvent | null {
  if (isTodoListToolName(e.name)) return null
  const completed = stepCompletions.get(e.step_id)
  const isMemoryTool = MEMORY_TOOLS.has(e.name ?? '')
  const isSkillLoad = e.name === 'skill_load'
  const rawSkillId = isSkillLoad ? e.input?.skill_id : undefined
  const skillId = typeof rawSkillId === 'string' && rawSkillId.trim().length > 0 ? rawSkillId.trim() : undefined
  return {
    id: e.event_id,
    timestamp: e.timestamp,
    type: isMemoryTool ? 'memory_access' : 'tool_call',
    toolName: e.name,
    summary: isMemoryTool ? memoryActivitySummary(e.name) : toolActivitySummary(e.name, !!completed),
    durationMs: completed?.duration_ms,
    skillId,
    skillName: skillId ? humanizeSkillId(skillId) : undefined
  }
}

function stepCompletedActivity(e: Extract<AgentStreamEvent, { type: 'step_completed' }>): ActivityEvent | null {
  if (isTodoListToolName(e.name)) return null
  const isMemoryTool = MEMORY_TOOLS.has(e.name ?? '')
  // Memory tools already got a single summary row on start; we omit
  // the result row to keep the feed concise (the duration on the
  // start row reflects completion).
  if (isMemoryTool) return null
  const resultStatus: 'done' | 'failed' = e.status === 'failed' ? 'failed' : 'done'
  return {
    id: `${e.event_id}:result`,
    timestamp: e.timestamp,
    type: 'tool_result',
    toolName: e.name,
    summary: toolResultSummary(e.name, resultStatus),
    durationMs: e.duration_ms,
    resultStatus,
    parentStepId: e.step_id
  }
}

function delegationActivity(
  e: Extract<AgentStreamEvent, { type: 'subagent_spawned' | 'expert_called' }>,
  stepCompletions: Map<string, StepCompletion>
): ActivityEvent {
  const completed = stepCompletions.get(e.step_id)
  const agentName = resolveDelegatedAgentName(e, completed)
  return {
    id: e.event_id,
    timestamp: e.timestamp,
    type: 'subagent_spawn',
    agent: agentName,
    summary: e.task_summary ?? agentName,
    durationMs: completed?.duration_ms,
    delegationStatus: delegationActivityStatus(completed)
  }
}

function reflectionActivity(events: AgentStreamEvent[]): ActivityEvent | null {
  const terminalEvent = events.find((e): e is AgentTerminalEvent => e.type === 'terminal' && e.status === 'completed')
  if (!terminalEvent?.reflection) return null
  const gapCount = terminalEvent.reflection.missing_steps?.length ?? 0
  const issueCount = terminalEvent.reflection.quality_issues?.length ?? 0
  return {
    id: `reflection-${terminalEvent.event_id}`,
    timestamp: terminalEvent.timestamp ?? new Date().toISOString(),
    type: 'reflection',
    toolName: undefined,
    summary: reflectionActivitySummary(terminalEvent.reflection.complete, gapCount, issueCount),
    durationMs: undefined
  }
}

export function deriveActivityFromEvents(events: AgentStreamEvent[]): ActivityEvent[] {
  const stepCompletions = collectStepCompletions(events)
  const activityEvents: ActivityEvent[] = []

  for (const e of events) {
    let row: ActivityEvent | null = null
    if (e.type === 'step_started') {
      row = stepStartedActivity(e, stepCompletions)
    } else if (e.type === 'step_completed') {
      row = stepCompletedActivity(e)
    } else if (e.type === 'subagent_spawned' || e.type === 'expert_called') {
      row = delegationActivity(e, stepCompletions)
    }
    if (row) activityEvents.push(row)
  }

  const reflection = reflectionActivity(events)
  if (reflection) activityEvents.push(reflection)

  return activityEvents
}

export function sessionToMessages(session: DeepAgentSession): ChatMessage[] {
  // Derive messages from the trace - the server's authoritative record.
  // The trace is already in correct chronological/seq order from the backend.
  // Do NOT re-sort or add synthetic messages - trust the server order.
  const traceMessages = deriveMessagesFromEvents(session.trace ?? [])

  // If the trace doesn't include the initial user message (older sessions),
  // prepend it. But check if it's already in the trace first.
  const hasInitialUserMessage = traceMessages.some(msg => msg.type === 'user_input' && msg.content === session.input)

  if (!hasInitialUserMessage && session.input) {
    // Find the first seq in the trace to create a proper ID for sorting
    const firstSeq = readEventSeq(session.trace?.[0])
    const syntheticSeq = typeof firstSeq === 'number' ? firstSeq - 1 : 0
    const initialUserMessage: ChatMessage = {
      id: `${session.session_id}:${syntheticSeq}`,
      type: 'user_input',
      timestamp: session.created_at,
      content: session.input
    }
    return [initialUserMessage, ...traceMessages]
  }

  return traceMessages
}

export function messageTypeLabel(type: ChatMessageType): string {
  const labels: Record<ChatMessageType, string> = {
    user_input: 'You',
    agent_thinking: 'Thinking',
    agent_status: 'Status',
    plan: 'Plan created',
    tool_call: 'Tool called',
    tool_result: 'Tool result',
    expert_call: 'Expert delegated',
    reflection: 'Reflection',
    human_interrupt: 'Waiting for input',
    structured_input_request: 'Form input required',
    final_answer: 'Completed',
    error: 'Error'
  }
  return labels[type] ?? type
}
