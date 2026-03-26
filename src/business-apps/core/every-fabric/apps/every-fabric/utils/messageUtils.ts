import type {
  AgentChunkEvent,
  AgentStreamEvent,
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

  return null
}

export function eventToMessage(event: AgentStreamEvent): ChatMessage | null {
  switch (event.type) {
    case 'agent_chunk':
      return chunkToMessage(event)
    case 'terminal':
      if (event.status === 'completed') {
        return {
          id: event.event_id,
          type: 'final_answer',
          timestamp: new Date().toISOString(),
          content: {
            output: event.output ?? '',
            todos: event.todos,
            recommendations: event.reflection?.missing_steps?.join('\n')
          }
        }
      }
      if (event.status === 'waiting_for_human') {
        return {
          id: event.event_id,
          type: 'human_interrupt',
          timestamp: new Date().toISOString(),
          content: { question: terminalQuestion(event.output, event.human_question) }
        }
      }
      return {
        id: event.event_id,
        type: 'error',
        timestamp: new Date().toISOString(),
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
  return events.map(eventToMessage).filter((msg): msg is ChatMessage => msg !== null)
}

export function sessionToMessages(session: DeepAgentSession): ChatMessage[] {
  const traceMessages = (session.trace ?? []).map(chunkToMessage).filter((msg): msg is ChatMessage => msg !== null)

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
    terminalMessages.push({
      id: `terminal-${session.session_id}-${session.updated_at}`,
      type: 'final_answer',
      timestamp: session.updated_at,
      content: {
        output: session.output ?? '',
        todos: session.todos,
        recommendations: session.reflection?.missing_steps?.join('\n')
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
