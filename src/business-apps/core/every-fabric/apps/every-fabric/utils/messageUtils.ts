import type {
  AgentChunkEvent,
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

const terminalQuestion = (output: unknown, humanQuestion?: string | null): string => {
  if (typeof humanQuestion === 'string' && humanQuestion.trim()) return humanQuestion
  if (typeof output === 'string' && output.trim()) return output
  if (output && typeof output === 'object' && 'question' in output) {
    const question = (output as { question?: unknown }).question
    if (typeof question === 'string' && question.trim()) return question
  }
  return 'The agent needs your input to continue.'
}

type StepCompletion = AgentStepCompletedEvent | AgentSubagentCompletedEvent

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
    case 'subagent_completed':
      // Handled by pairing with step_started / subagent_spawned
      return null

    case 'subagent_spawned': {
      const completed = stepCompletions?.get(event.step_id)
      return {
        id: `subagent-${event.step_id}`,
        type: 'expert_call',
        timestamp: event.timestamp,
        content: {
          agentId: event.subagent_id ?? event.name ?? 'subagent',
          task: event.task_summary ?? event.name ?? '',
          status: completed ? 'done' : 'running',
          durationMs: completed?.duration_ms,
          outputPreview: completed?.output ? String(completed.output).slice(0, 120) : undefined
        }
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
            costSummary: event.cost_summary ?? undefined
          }
        }
      }
      if (event.status === 'waiting_for_human') {
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
    if (event.type === 'step_completed' || event.type === 'subagent_completed') {
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
    if (e.type === 'step_completed' || e.type === 'subagent_completed') {
      stepCompletions.set(e.step_id, e)
    }
  }

  const activityEvents = events
    .filter(
      (e): e is AgentStepStartedEvent | AgentSubagentSpawnedEvent =>
        e.type === 'step_started' || e.type === 'subagent_spawned'
    )
    .map(e => {
      const completed = stepCompletions.get(e.step_id)
      if (e.type === 'subagent_spawned') {
        return {
          id: e.event_id,
          timestamp: e.timestamp,
          type: 'subagent_spawn' as const,
          agent: e.subagent_id ?? e.name,
          summary: e.task_summary ?? e.name ?? 'Sub-agent task',
          durationMs: completed?.duration_ms
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
  const traceMessages = [...(session.trace ?? [])]
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    .map(chunkToMessage)
    .filter((msg): msg is ChatMessage => msg !== null)

  if (traceMessages.length === 0 && session.input) {
    traceMessages.push({
      id: `user-${session.session_id}`,
      type: 'user_input',
      timestamp: session.created_at,
      content: session.input
    })
  }

  const terminalMessages: ChatMessage[] = []

  if (session.status === 'completed') {
    const qualityScore = session.reflection ? (session.reflection.complete ? 1.0 : 0.5) : undefined
    const durationMs = (() => {
      const end = session.completed_at ?? session.updated_at
      const start = session.started_at ?? session.created_at
      if (!end || !start) return undefined
      const diff = Date.parse(end) - Date.parse(start)
      return Number.isNaN(diff) ? undefined : diff
    })()
    const actionsPerformed = (session.trace ?? [])
      .filter(
        (e): e is Record<string, unknown> =>
          typeof e === 'object' && e !== null && (e as Record<string, unknown>).type === 'step_completed'
      )
      .map(e => ({
        step: String(e.name ?? 'Tool call'),
        tool: e.name ? String(e.name) : undefined,
        outcome: String(e.status ?? 'done')
      }))
    terminalMessages.push({
      id: `terminal-${session.session_id}-${session.updated_at}`,
      type: 'final_answer',
      timestamp: session.updated_at,
      content: {
        output: session.output ?? '',
        todos: session.todos,
        recommendations: session.reflection?.missing_steps?.join('\n'),
        qualityScore,
        durationMs,
        actionsPerformed: actionsPerformed.length > 0 ? actionsPerformed : undefined,
        costSummary: session.cost_summary
      }
    })
  }

  if (session.status === 'failed') {
    terminalMessages.push({
      id: `terminal-${session.session_id}-${session.updated_at}`,
      type: 'error',
      timestamp: session.updated_at,
      content: { message: session.output ?? 'Session failed' }
    })
  }

  if (session.status === 'cancelled') {
    terminalMessages.push({
      id: `terminal-${session.session_id}-${session.updated_at}`,
      type: 'error',
      timestamp: session.updated_at,
      content: { message: 'Session was cancelled.' }
    })
  }

  if (session.status === 'waiting_for_human') {
    terminalMessages.push({
      id: `terminal-${session.session_id}-${session.updated_at}`,
      type: 'human_interrupt',
      timestamp: session.updated_at,
      content: { question: terminalQuestion(session.output, session.human_question) }
    })
  }

  return [...traceMessages, ...terminalMessages]
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
    final_answer: 'Completed',
    error: 'Error'
  }
  return labels[type] ?? type
}
