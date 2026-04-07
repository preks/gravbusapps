import type {
  ActivityEvent,
  AgentChunkEvent,
  AgentExpertCalledEvent,
  AgentExpertCompletedEvent,
  AgentStepCompletedEvent,
  AgentStepStartedEvent,
  AgentStreamEvent,
  AgentSubagentCompletedEvent,
  AgentSubagentSpawnedEvent,
  AgentTerminalEvent,
  ChatMessage,
  ChatMessageType,
  DeepAgentSession
} from '../types/enterpriseAgent'
import { resolveRendererType } from '../types/fabric'

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

  if (chunk.role === 'ai') {
    return {
      id: chunk.event_id,
      type: 'agent_thinking' as ChatMessageType,
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
          status: completed ? (completed.status === 'failed' ? 'failed' : 'done') : 'running',
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
          status: completed ? (completed.status === 'failed' ? 'failed' : 'done') : 'running',
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
          status: completed ? (completed.status === 'failed' ? 'failed' : 'done') : 'running',
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

    case 'terminal':
      if (event.status === 'completed') {
        const qualityScore = event.reflection ? (event.reflection.complete ? 1.0 : 0.5) : undefined
        const actionsPerformed = stepCompletions
          ? [...stepCompletions.values()]
              .filter(s => s.type === 'step_completed')
              .map(s => ({ step: s.name ?? 'Tool call', tool: s.name, outcome: s.status ?? 'done' }))
          : undefined
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
            workspaceDocuments: event.workspace_documents
          }
        }
      }
      if (event.status === 'waiting_for_human') {
        // Check if there's a structured input request
        if (event.structured_input_request) {
          console.log(
            '[eventToMessage] Converting terminal to structured_input_request:',
            event.structured_input_request.form_id
          )
          return {
            id: event.event_id,
            type: 'structured_input_request',
            timestamp: event.timestamp ?? new Date().toISOString(),
            content: event.structured_input_request
          }
        }
        // Fall back to plain text interrupt
        console.log('[eventToMessage] Converting terminal to human_interrupt')
        return {
          id: event.event_id,
          type: 'human_interrupt',
          timestamp: event.timestamp ?? new Date().toISOString(),
          content: { question: terminalQuestion(event.output, event.human_question) }
        }
      }
      return {
        id: event.event_id,
        type: 'error',
        timestamp: event.timestamp ?? new Date().toISOString(),
        content: {
          message: event.status === 'cancelled' ? 'Session was cancelled.' : (event.output ?? 'Session failed')
        }
      }

    case 'error':
      return {
        id: `error-${Date.now()}`,
        type: 'error',
        timestamp: new Date().toISOString(),
        content: { message: event.message }
      }

    default:
      return null
  }
}

export function deriveMessagesFromEvents(events: AgentStreamEvent[]): ChatMessage[] {
  const seenIds = new Set<string>()
  const messages: ChatMessage[] = []
  const sortedEvents = [...events].sort((a, b) => {
    const aSeq = 'seq' in a && typeof a.seq === 'number' ? a.seq : Number.MAX_SAFE_INTEGER
    const bSeq = 'seq' in b && typeof b.seq === 'number' ? b.seq : Number.MAX_SAFE_INTEGER
    if (aSeq !== bSeq) return aSeq - bSeq
    return toEpoch('timestamp' in a ? a.timestamp : undefined) - toEpoch('timestamp' in b ? b.timestamp : undefined)
  })

  // Build a map of step completions so step_started messages can be fully resolved
  const stepCompletions = new Map<string, StepCompletion>()
  for (const event of sortedEvents) {
    if (event.type === 'step_completed' || event.type === 'subagent_completed' || event.type === 'expert_completed') {
      stepCompletions.set(event.step_id, event)
    }
  }

  for (const event of sortedEvents) {
    const message = eventToMessage(event, stepCompletions)
    if (!message || seenIds.has(message.id)) continue
    seenIds.add(message.id)
    messages.push(message)
  }

  return messages
}

const MEMORY_TOOLS = new Set(['save_memory', 'search_memory'])

/** Derive activity events from the raw SSE event stream. */
export function deriveActivityFromEvents(events: AgentStreamEvent[]) {
  const stepCompletions = new Map<string, StepCompletion>()
  for (const e of events) {
    if (e.type === 'step_completed' || e.type === 'subagent_completed' || e.type === 'expert_completed') {
      stepCompletions.set(e.step_id, e)
    }
  }

  const activityEvents: ActivityEvent[] = events
    .filter(
      (e): e is AgentStepStartedEvent | AgentSubagentSpawnedEvent | AgentExpertCalledEvent =>
        e.type === 'step_started' || e.type === 'subagent_spawned' || e.type === 'expert_called'
    )
    .map(e => {
      const completed = stepCompletions.get(e.step_id)
      if (e.type === 'subagent_spawned' || e.type === 'expert_called') {
        const completed = stepCompletions.get(e.step_id)
        const agentName = resolveDelegatedAgentName(e, completed)
        const delegationStatus =
          completed && (completed.type === 'subagent_completed' || completed.type === 'expert_completed')
            ? completed.status === 'failed'
              ? ('failed' as const)
              : ('done' as const)
            : ('running' as const)
        return {
          id: e.event_id,
          timestamp: e.timestamp,
          type: 'subagent_spawn' as const,
          agent: agentName,
          summary: e.task_summary ?? agentName,
          durationMs: completed?.duration_ms,
          delegationStatus
        }
      }
      const isMemoryTool = MEMORY_TOOLS.has(e.name ?? '')
      return {
        id: e.event_id,
        timestamp: e.timestamp,
        type: isMemoryTool ? ('memory_access' as const) : ('tool_call' as const),
        toolName: e.name,
        summary: isMemoryTool
          ? `${e.name === 'save_memory' ? 'Saved to' : 'Searched'} memory`
          : `${e.name ?? 'Tool'} ${completed ? '— done' : '— running'}`,
        durationMs: completed?.duration_ms
      }
    })

  // Append a reflection activity row when the terminal event includes reflection data
  const terminalEvent = events.find((e): e is AgentTerminalEvent => e.type === 'terminal' && e.status === 'completed')
  if (terminalEvent?.reflection) {
    const gapCount = terminalEvent.reflection.missing_steps?.length ?? 0
    const issueCount = terminalEvent.reflection.quality_issues?.length ?? 0
    activityEvents.push({
      id: `reflection-${terminalEvent.event_id}`,
      timestamp: terminalEvent.timestamp ?? new Date().toISOString(),
      type: 'reflection' as const,
      toolName: undefined,
      summary: terminalEvent.reflection.complete
        ? `Reflection complete — output quality confirmed`
        : `Reflection: ${gapCount} gap(s), ${issueCount} quality issue(s) found`,
      durationMs: undefined
    })
  }

  return activityEvents
}

export function sessionToMessages(session: DeepAgentSession): ChatMessage[] {
  // Just return trace messages - they already have everything from SSE stream
  // No need to create synthetic terminal messages from session.status
  const traceMessages = deriveMessagesFromEvents(session.trace ?? []).filter(
    message => !(message.type === 'user_input' && message.content === session.input)
  )

  const initialUserMessage = session.input
    ? ({
        id: `user-${session.session_id}`,
        type: 'user_input',
        timestamp: session.created_at,
        content: session.input
      } satisfies ChatMessage)
    : null

  return [...(initialUserMessage ? [initialUserMessage] : []), ...traceMessages]
}

export function messageTypeLabel(type: ChatMessageType): string {
  const labels: Record<ChatMessageType, string> = {
    user_input: 'You',
    agent_thinking: 'Thinking',
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
