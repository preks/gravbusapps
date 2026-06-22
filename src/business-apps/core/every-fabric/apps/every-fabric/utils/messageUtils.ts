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
  AgentTurnSnapshotEvent,
  ChatMessage,
  ChatMessageType,
  DeepAgentSession,
  EnterpriseRuntimeTraceEvent,
  HitlRequestedEvent,
  MessageAttachmentRef,
  SessionAttachment,
  StructuredInputRequestEvent
} from '../types/enterpriseAgent'
import { resolveRendererType } from '../types/fabric'
import { extractLatestTodosFromEvents, isTodoListToolName } from './fabricTodoStream'
import { humanizeSkillId } from './skillUtils'

export const FABRIC_LIVE_PLAN_MESSAGE_ID = 'fabric-live-plan'

/**
 * Build a clean one-line preview from an expert sub-agent's `output` field.
 *
 * Expert outputs frequently contain raw HTML (e.g. an email draft like
 * `Subject: Welcome aboard\nHTML body:\n<p>Hi John...</p>`), embedded JSON
 * envelopes, or other markup that reads as garbage in a single-line preview.
 * We strip tags and collapse whitespace so the preview line shows readable
 * text instead of literal angle brackets / line-break artifacts.
 *
 * This is preview-only — the full card branch (`output` rendered via
 * `MarkdownWithChipsRenderer`) still gets the original payload.
 */
// Cap the input we run regex sanitization over to keep the work bounded and
// avoid any pathological backtracking / DoS risk on very large strings.
const SUMMARIZE_MAX_INPUT_CHARS = 4000

const PSEUDO_TOOL_CALL_RE = /\b(?:function|enterprise)_[a-z][a-z0-9_]*\s*\([^)]*\)/gi

const summarizeExpertOutput = (output: unknown, maxChars = 120): string | undefined => {
  if (typeof output !== 'string') return undefined
  const bounded = output.length > SUMMARIZE_MAX_INPUT_CHARS ? output.slice(0, SUMMARIZE_MAX_INPUT_CHARS) : output
  const stripped = bounded
    .replace(PSEUDO_TOOL_CALL_RE, '')
    .replace(/<\/?(?:br|p|div|li|tr)\b[^>]{0,200}>/gi, ' ') // block-ish tags -> space
    .replace(/<[^>]{1,200}>/g, '') // remaining tags -> nothing
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
  if (!stripped) return undefined
  return stripped.length > maxChars ? `${stripped.slice(0, maxChars - 1).trimEnd()}…` : stripped
}

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

export const resolveDelegatedAgentName = (
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
    rendererType: resolveRendererType(artifact.mime_type, artifact.path || artifact.name)
  }))

function humanizeFieldId(fieldId: string): string {
  return fieldId
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function structuredInputResponseToText(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const payload = JSON.parse(trimmed) as {
      type?: unknown
      values?: unknown
    }
    if (payload.type !== 'structured_input_response' || !payload.values || typeof payload.values !== 'object') {
      return null
    }
    const values = Object.entries(payload.values as Record<string, unknown>)
    if (values.length === 0) return 'Submitted form response.'
    const rendered = values.map(([key, value]) => `${humanizeFieldId(key)}: ${String(value)}`).join(', ')
    return `Submitted confirmation: ${rendered}`
  } catch {
    return null
  }
}

const chunkToMessage = (chunk: AgentChunkEvent): ChatMessage | null => {
  if (chunk.role === 'human') {
    // Rehydrate attachment refs stored in the chunk metadata (set by reply endpoint).
    const storedRefs = chunk.metadata?.attachment_refs
    const attachments =
      Array.isArray(storedRefs) && storedRefs.length > 0 ? (storedRefs as MessageAttachmentRef[]) : undefined
    return {
      id: chunk.event_id,
      type: 'user_input',
      timestamp: chunk.timestamp,
      content: structuredInputResponseToText(chunk.content) ?? chunk.content,
      presentationMode: chunk.presentation_mode,
      ...(attachments ? { attachments } : {})
    }
  }

  if (chunk.chunk_kind === 'response_stream') {
    return null
  }

  // Phase 4 UX: live_status events feed the pill via liveStatusHeadline only.
  // They must NOT enter the messages array (no transcript bubble, no stacking).
  if (chunk.chunk_kind === 'live_status') {
    return null
  }

  // Phase 4+ UX: ack / plan_reveal / plan_update feed the grounded plan
  // reveal card via dedicated hook memos. None of these should enter the
  // messages array (no transcript bubble, no row in lists).
  if (chunk.chunk_kind === 'ack' || chunk.chunk_kind === 'plan_reveal' || chunk.chunk_kind === 'plan_update') {
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
      presentationMode: chunk.presentation_mode,
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

function isDefinitionLookupTool(toolName?: string): boolean {
  return typeof toolName === 'string' && toolName.startsWith('definition:')
}

type DelegationStatus = 'running' | 'done' | 'failed'

interface ExpertCallContent {
  agentId: string
  task: string
  description?: string
  status: DelegationStatus
  durationMs?: number
  outputPreview?: string
  /**
   * Backend `step_id` of the delegation this pill represents. Lets the pill
   * open the exact `DelegatedAgentDetail` by stable id instead of matching on
   * display name. Absent for native-agent pills (which have no delegation
   * lifecycle / step_id).
   */
  delegationStepId?: string
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
    description: existing.description ?? incoming.description,
    status: richer.status,
    durationMs: richer.durationMs ?? existing.durationMs ?? incoming.durationMs,
    outputPreview: richer.outputPreview ?? existing.outputPreview ?? incoming.outputPreview,
    delegationStepId: existing.delegationStepId ?? incoming.delegationStepId
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
const isCompletedTurnEvent = (e: AgentStreamEvent): e is AgentTerminalEvent | AgentTurnSnapshotEvent =>
  (e.type === 'terminal' || e.type === 'turn_snapshot') &&
  (e.status === 'completed' || e.status === 'failed' || e.status === 'cancelled')

const finalizeRunningMessagesOnTerminal = (events: AgentStreamEvent[], messages: ChatMessage[]): void => {
  const terminal = events.find(isCompletedTurnEvent)
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
  stepCompletions: Map<string, StepCompletion> | undefined,
  previouslyShownArtifactKeys?: Set<string>
): ChatMessage {
  let qualityScore: number | undefined
  if (event.reflection) {
    qualityScore = event.reflection.complete ? 1 : 0.5
  }
  const actionsPerformed = stepCompletions
    ? [...stepCompletions.values()]
        .filter((s): s is AgentStepCompletedEvent => s.type === 'step_completed')
        .filter(s => !isDefinitionLookupTool(s.name))
        .map(s => ({ step: s.name ?? 'Tool call', tool: s.name, outcome: s.status ?? 'done' }))
    : undefined
  const turnArtifacts = previouslyShownArtifactKeys
    ? (event.artifacts ?? []).filter(a => {
        const key = a.path || a.name
        return key ? !previouslyShownArtifactKeys.has(key) : true
      })
    : (event.artifacts ?? [])
  const hasArtifacts = turnArtifacts.length > 0
  const hasWorkspaceDocs = !!event.workspace_documents && event.workspace_documents.length > 0
  const hasPdfAttachments = (event.session_attachments ?? []).some(
    a => (a.mime_type || '').toLowerCase() === 'application/pdf'
  )
  const hasActions = !!actionsPerformed && actionsPerformed.length > 0
  const isInstant = event.duration_ms === 0 && !hasArtifacts && !hasWorkspaceDocs && !hasPdfAttachments && !hasActions
  return {
    id: event.event_id,
    type: 'final_answer',
    timestamp: event.timestamp ?? new Date().toISOString(),
    presentationMode: event.presentation_mode,
    content: {
      output: event.output ?? '',
      presentationMode: event.presentation_mode,
      todos: event.todos,
      recommendations: event.reflection?.missing_steps?.join('\n'),
      qualityScore,
      actionsPerformed,
      durationMs: event.duration_ms,
      costSummary: event.cost_summary ?? undefined,
      artifacts: toArtifactRefsFromMeta(turnArtifacts),
      workspaceDocuments: event.workspace_documents,
      sessionAttachments: event.session_attachments,
      references: event.references,
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
      content: event.structured_input_request,
      presentationMode: event.presentation_mode
    }
  }
  return {
    id: event.event_id,
    type: 'human_interrupt',
    timestamp: event.timestamp ?? new Date().toISOString(),
    content: { question: terminalQuestion(event.output, event.human_question) },
    presentationMode: event.presentation_mode
  }
}

function terminalOtherToChatMessage(event: AgentTerminalEvent): ChatMessage {
  return {
    id: event.event_id,
    type: 'error',
    timestamp: event.timestamp ?? new Date().toISOString(),
    content: {
      message: event.status === 'cancelled' ? 'Session was cancelled.' : (event.output ?? 'Session failed')
    },
    presentationMode: event.presentation_mode
  }
}

function terminalEventToChatMessage(
  event: AgentTerminalEvent,
  stepCompletions?: Map<string, StepCompletion>,
  previouslyShownArtifactKeys?: Set<string>
): ChatMessage {
  if (event.status === 'completed') {
    return terminalCompletedToChatMessage(event, stepCompletions, previouslyShownArtifactKeys)
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
  const terminalClosed = sortedEvents.some(isCompletedTurnEvent)
  messages.push({
    id: FABRIC_LIVE_PLAN_MESSAGE_ID,
    type: 'plan',
    timestamp: planTimestamp,
    content: { todos: todoSnapshot },
    isStreaming: !terminalClosed
  })
}

function hitlRequestedToMessage(event: HitlRequestedEvent): ChatMessage {
  const payload = event.request.payload ?? {}
  const fields = Array.isArray(payload.fields) ? payload.fields : null
  if (!fields) {
    return {
      id: event.event_id,
      type: 'human_interrupt',
      timestamp: event.timestamp,
      content: { question: event.request.description || event.request.title },
      presentationMode: event.presentation_mode
    }
  }
  const requestStatus = event.request.status === 'pending' ? undefined : event.request.status
  return {
    id: event.event_id,
    type: 'structured_input_request',
    timestamp: event.timestamp,
    presentationMode: event.presentation_mode,
    content: {
      // Spread the full backend payload first so form-specific extras
      // (e.g. `email_draft` / `email_accounts` for compose_email,
      // `action_requests` / `review_configs` for tool_permission) are
      // preserved. Without this the EmailComposerBubble would fall back
      // to the generic StructuredInputForm (empty fields → useless
      // Submit button) because `email_draft` was being dropped.
      ...payload,
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
      request_status: requestStatus
    } as unknown as StructuredInputRequestEvent
  }
}

function expertSelectedToMessage(event: EnterpriseRuntimeTraceEvent): ChatMessage | null {
  // Native agents run inline on the main graph and never emit
  // `expert_called`, so they are tagged `source: 'native'` on the
  // selection event and rendered as the same blue agent bubble. Other
  // `expert_selected` events feed the mesh only and stay out of chat.
  const payload = event.payload ?? {}
  if (payload.source !== 'native') return null
  const agentName = pickDisplayName(payload.name as string | undefined) ?? event.expert_id ?? 'Agent'
  const specialty = typeof payload.specialty === 'string' ? payload.specialty : ''
  const description = typeof payload.description === 'string' ? payload.description : specialty
  return {
    id: `native-agent-${event.event_id}`,
    type: 'expert_call',
    timestamp: event.timestamp,
    content: {
      agentId: agentName,
      task: specialty || agentName,
      description: description || undefined,
      status: 'done'
    }
  }
}

export function eventToMessage(
  event: AgentStreamEvent,
  stepCompletions?: Map<string, StepCompletion>,
  previouslyShownArtifactKeys?: Set<string>
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
          description: event.agent_description,
          status: toolCallMessageStatus(completed),
          durationMs: completed?.duration_ms,
          outputPreview: summarizeExpertOutput(completed?.output),
          delegationStepId: event.step_id
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
          description: event.agent_description,
          status: toolCallMessageStatus(completed),
          durationMs: completed?.duration_ms,
          outputPreview: summarizeExpertOutput(completed?.output),
          delegationStepId: event.step_id
        }
      }
    }

    case 'structured_input_request': {
      return {
        id: event.event_id,
        type: 'structured_input_request',
        timestamp: event.timestamp,
        content: event,
        presentationMode: event.presentation_mode
      }
    }

    case 'hitl_requested':
      return hitlRequestedToMessage(event)

    case 'terminal':
    case 'turn_snapshot':
      return terminalEventToChatMessage(
        { ...event, type: 'terminal' } as AgentTerminalEvent,
        stepCompletions,
        previouslyShownArtifactKeys
      )

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

    case 'expert_selected':
      return expertSelectedToMessage(event)

    default:
      return null
  }
}

function trackShownArtifacts(event: AgentStreamEvent, shownKeys: Set<string>): void {
  if (
    (event.type === 'terminal' || event.type === 'turn_snapshot') &&
    event.status === 'completed' &&
    event.artifacts
  ) {
    for (const a of event.artifacts) {
      const key = a.path || a.name
      if (key) shownKeys.add(key)
    }
  }
}

function dedupeExpertCall(
  message: ChatMessage,
  messages: ChatMessage[],
  expertCallIndexByKey: Map<string, number>,
  seenIds: Set<string>
): boolean {
  if (message.type !== 'expert_call') return false
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
    return true
  }
  expertCallIndexByKey.set(key, messages.length)
  return false
}

export function deriveMessagesFromEvents(events: AgentStreamEvent[]): ChatMessage[] {
  const seenIds = new Set<string>()
  const messages: ChatMessage[] = []
  const sortedEvents = sortAgentEventsBySeq(events)
  const stepCompletions = collectStepCompletions(sortedEvents)

  // Backend emits HITL pauses twice: once as an explicit `hitl_requested`
  // (or `structured_input_request`) event, and again as a `terminal` event
  // with `status: 'waiting_for_human'`. Both have distinct event_ids, so
  // dedupe-by-id can't catch them and the chat renders two identical
  // "Agent has a question" bubbles. When an explicit HITL event exists in
  // the same stream, suppress the terminal-derived HITL bubble — the
  // explicit event carries richer info (title, description, fields).
  const hasExplicitHitlEvent = sortedEvents.some(
    e => e.type === 'hitl_requested' || e.type === 'structured_input_request'
  )

  const expertCallIndexByKey = new Map<string, number>()
  const shownArtifactKeys = new Set<string>()

  for (const event of sortedEvents) {
    if (
      (event.type === 'terminal' || event.type === 'turn_snapshot') &&
      event.status === 'waiting_for_human' &&
      hasExplicitHitlEvent
    ) {
      continue
    }
    const message = eventToMessage(event, stepCompletions, shownArtifactKeys)
    if (!message || seenIds.has(message.id)) continue
    if (dedupeExpertCall(message, messages, expertCallIndexByKey, seenIds)) continue

    seenIds.add(message.id)
    messages.push(message)
    trackShownArtifacts(event, shownArtifactKeys)
  }

  finalizeRunningMessagesOnTerminal(sortedEvents, messages)
  appendLivePlanIfNeeded(sortedEvents, messages, seenIds)

  return messages
}

const MEMORY_TOOLS = new Set(['save_memory', 'search_memory', 'forget_memory', 'forget_about'])

function memoryActivitySummary(toolName?: string): string {
  if (toolName === 'save_memory') return 'Saved to memory'
  if (toolName === 'forget_memory' || toolName === 'forget_about') return 'Removed from memory'
  return 'Searched memory'
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
  if (isDefinitionLookupTool(e.name)) return null
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

function stepCompletedActivity(
  e: Extract<AgentStreamEvent, { type: 'step_completed' }>,
  startedStepIds: Set<string>
): ActivityEvent | null {
  if (isTodoListToolName(e.name)) return null
  if (isDefinitionLookupTool(e.name)) return null
  // The started row already merges completion status and duration through
  // collectStepCompletions(). Emitting the completion again makes one real
  // tool call appear as two identical "tool — done" activity rows.
  if (startedStepIds.has(e.step_id)) return null
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
    delegationStatus: delegationActivityStatus(completed),
    delegationStepId: e.step_id
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
  const startedStepIds = new Set(
    events
      .filter((e): e is Extract<AgentStreamEvent, { type: 'step_started' }> => e.type === 'step_started')
      .map(e => e.step_id)
  )
  const activityEvents: ActivityEvent[] = []

  for (const e of events) {
    let row: ActivityEvent | null = null
    if (e.type === 'step_started') {
      row = stepStartedActivity(e, stepCompletions)
    } else if (e.type === 'step_completed') {
      row = stepCompletedActivity(e, startedStepIds)
    } else if (e.type === 'subagent_spawned' || e.type === 'expert_called') {
      row = delegationActivity(e, stepCompletions)
    }
    if (row) activityEvents.push(row)
  }

  const reflection = reflectionActivity(events)
  if (reflection) activityEvents.push(reflection)

  return activityEvents
}

function sessionAttachmentsToRefs(
  attachments?: Array<SessionAttachment | MessageAttachmentRef>
): MessageAttachmentRef[] | undefined {
  if (!attachments || attachments.length === 0) return undefined
  // Filter out attachments produced by agent tools (e.g. PDF exports). Those
  // belong to the composer / deliverable cards and must not be rendered as
  // "user-attached" chips on the initial user_input bubble.
  const userAttachments = attachments.filter(a => (a as SessionAttachment).origin !== 'agent_generated')
  if (userAttachments.length === 0) return undefined
  return userAttachments.map(a => ({
    id: a.id,
    name: a.name,
    mime_type: a.mime_type,
    size: a.size,
    indexing_status: a.indexing_status,
    // preview_url is client-only and survives on MessageAttachmentRef snapshots;
    // it won't be present on server-reloaded sessions (accepted limitation).
    preview_url: a.preview_url
  }))
}

function suppressRepeatedUserAttachmentRefs(messages: ChatMessage[]): ChatMessage[] {
  const seenAttachmentIds = new Set<string>()

  return messages.map(msg => {
    if (msg.type !== 'user_input' || !msg.attachments?.length) return msg

    const nextAttachments = msg.attachments.filter(att => !seenAttachmentIds.has(att.id))
    msg.attachments.forEach(att => seenAttachmentIds.add(att.id))

    if (nextAttachments.length === msg.attachments.length) return msg

    if (nextAttachments.length > 0) {
      return { ...msg, attachments: nextAttachments }
    }

    const messageWithoutAttachments = { ...msg }
    delete messageWithoutAttachments.attachments
    return messageWithoutAttachments
  })
}

export function sessionToMessages(session: DeepAgentSession): ChatMessage[] {
  // Derive messages from the trace - the server's authoritative record.
  // The trace is already in correct chronological/seq order from the backend.
  // Do NOT re-sort or add synthetic messages - trust the server order.
  const traceMessages = deriveMessagesFromEvents(session.trace ?? [])

  const sessionAttachmentRefs = sessionAttachmentsToRefs(session.session_attachments)

  // If the trace doesn't include the initial user message (older sessions),
  // prepend it. But check if it's already in the trace first.
  const hasInitialUserMessage = traceMessages.some(msg => msg.type === 'user_input' && msg.content === session.input)

  if (!hasInitialUserMessage && session.input) {
    // Find the first seq in the trace to create a proper ID for sorting
    const firstSeq = readEventSeq(session.trace?.[0])
    const syntheticSeq = typeof firstSeq === 'number' ? firstSeq - 1 : 0
    // Snapshot current session attachments onto the synthesised first
    // user_input so the chip survives the brief window between
    // `startSession()` returning and the real trace arriving. On full
    // reload the trace doesn't carry per-turn attachments — that's the
    // accepted Option-A limitation (see C4 in the doc-ux plan).
    const initialUserMessage: ChatMessage = {
      id: `${session.session_id}:${syntheticSeq}`,
      type: 'user_input',
      timestamp: session.created_at,
      content: session.input,
      ...(sessionAttachmentRefs ? { attachments: sessionAttachmentRefs } : {})
    }
    return [initialUserMessage, ...traceMessages]
  }

  // The trace has the initial user message but lacks attachment refs (they are
  // not persisted in the server event stream). Enrich the first user_input
  // message with the session's attachment list so the chips always render.
  let messages = traceMessages
  if (sessionAttachmentRefs && sessionAttachmentRefs.length > 0) {
    let enriched = false
    messages = messages.map(msg => {
      if (!enriched && msg.type === 'user_input') {
        enriched = true
        if (msg.attachments) return msg
        return { ...msg, attachments: sessionAttachmentRefs }
      }
      return msg
    })
  }

  messages = suppressRepeatedUserAttachmentRefs(messages)

  // Backfill `final_answer` rows whose terminal event was emitted before
  // backend started embedding `session_attachments` / `workspace_documents`
  // in the trace. Without this, reloading the session — or even the live
  // first render against a not-yet-restarted prompt-manager — never
  // surfaces the deliverable cards (workspace doc + PDF download) and we
  // fall back to the LLM's plain-text markdown which has no clickable
  // download. Server-loaded session has the authoritative attachment +
  // workspace-document lists at the top level; copy them onto the last
  // `final_answer` message so `FinalAnswerRenderer` can render the cards.
  const fullSessionAttachments = session.session_attachments
  const fullWorkspaceDocs = (session as { workspace_documents?: unknown }).workspace_documents
  const fullReferences = (session as { references?: unknown }).references
  const hasFullAttachments = Array.isArray(fullSessionAttachments) && fullSessionAttachments.length > 0
  const hasFullWorkspaceDocs = Array.isArray(fullWorkspaceDocs) && fullWorkspaceDocs.length > 0
  const hasFullReferences = Array.isArray(fullReferences) && fullReferences.length > 0
  if (hasFullAttachments || hasFullWorkspaceDocs || hasFullReferences) {
    messages = messages.map(msg => {
      if (msg.type !== 'final_answer') return msg
      const content = (msg.content ?? {}) as Record<string, unknown>
      const patch: Record<string, unknown> = {}
      if (hasFullAttachments) {
        const existing = content.sessionAttachments
        if (!Array.isArray(existing) || existing.length === 0) {
          patch.sessionAttachments = fullSessionAttachments
        }
      }
      if (hasFullWorkspaceDocs) {
        const existing = content.workspaceDocuments
        if (!Array.isArray(existing) || existing.length === 0) {
          patch.workspaceDocuments = fullWorkspaceDocs
        }
      }
      if (hasFullReferences) {
        const existing = content.references
        if (!Array.isArray(existing) || existing.length === 0) {
          patch.references = fullReferences
        }
      }
      if (Object.keys(patch).length === 0) return msg
      return { ...msg, content: { ...content, ...patch } }
    })
  }

  return messages
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
