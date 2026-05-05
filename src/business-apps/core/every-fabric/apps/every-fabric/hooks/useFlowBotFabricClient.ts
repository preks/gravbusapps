import { useCallback, useMemo } from 'react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import type { AgentStreamEvent, DeepAgentSession, SessionConfig, StartSessionResponse } from '../types/enterpriseAgent'
import { appendSessionStreamEvents, ensureSessionStreamEntry } from './sessionStreamRegistry'

interface RuntimeSessionState {
  session: DeepAgentSession
  seq: number
  streamText: string
  stepNames: Map<string, string>
}

interface FlowBotTextBlock {
  type?: 'textBlock'
  text?: string
}

interface FlowBotTableBlock {
  type?: 'table'
  title?: string
  description?: string
  columnsTitles?: string[]
  rowsContents?: string[][]
}

type FlowBotDisplayBlock = FlowBotTextBlock | FlowBotTableBlock | { type?: string; [key: string]: unknown }

interface FlowBotAnswerOutput {
  type: 'answer'
  displayData?: FlowBotDisplayBlock[]
}

interface FlowBotToolOutput {
  type: 'tool'
  name: string
  reason?: string
}

interface FlowBotReasoningStepOutput {
  type: 'reasoning_step'
  id: string
  kind?: string
  title: string
  args?: unknown
  started_at?: number
}

interface FlowBotReasoningStepUpdateOutput {
  type: 'reasoning_step_update'
  id: string
  status?: 'done' | 'error' | 'running'
  result?: unknown
  error?: string
  ended_at?: number
}

interface FlowBotTextDeltaOutput {
  type: 'text_delta'
  delta: string
  run_id?: string
}

type FlowBotOutputItem =
  | FlowBotAnswerOutput
  | FlowBotToolOutput
  | FlowBotReasoningStepOutput
  | FlowBotReasoningStepUpdateOutput
  | FlowBotTextDeltaOutput
  | { type: string; [key: string]: unknown }

const sessions = new Map<string, RuntimeSessionState>()

const nowIso = (): string => new Date().toISOString()

const createSessionId = (): string => {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  return `fabric-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const nextSeq = (state: RuntimeSessionState): number => {
  state.seq += 1
  return state.seq
}

const escapeMarkdownTableCell = (value: unknown): string =>
  String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br />')
    .trim()

const tableBlockToMarkdown = (block: FlowBotTableBlock): string => {
  const columns = Array.isArray(block.columnsTitles) ? block.columnsTitles : []
  const rows = Array.isArray(block.rowsContents) ? block.rowsContents : []
  if (columns.length === 0 || rows.length === 0) return ''

  const title = block.title?.trim()
  const description = block.description?.trim()
  const header = `| ${columns.map(escapeMarkdownTableCell).join(' | ')} |`
  const separator = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows
    .map(row => {
      const padded = columns.map((_, index) => escapeMarkdownTableCell(row[index] ?? ''))
      return `| ${padded.join(' | ')} |`
    })
    .join('\n')

  return [title ? `### ${title}` : '', description ?? '', header, separator, body].filter(Boolean).join('\n')
}

const outputText = (item: FlowBotAnswerOutput): string => {
  const blocks = item.displayData ?? []
  return blocks
    .map(block => {
      if (block.type === 'textBlock' && typeof (block as FlowBotTextBlock).text === 'string') {
        return (block as FlowBotTextBlock).text?.trim() ?? ''
      }
      if (block.type === 'table') {
        return tableBlockToMarkdown(block as FlowBotTableBlock)
      }
      return ''
    })
    .filter(Boolean)
    .join('\n\n')
}

const eventTimeFromUnix = (value?: number): string => {
  if (typeof value !== 'number') return nowIso()
  return new Date(value * 1000).toISOString()
}

const mapOutputItemToEvents = (
  sessionId: string,
  state: RuntimeSessionState,
  item: FlowBotOutputItem
): AgentStreamEvent[] => {
  const timestamp = nowIso()
  switch (item.type) {
    case 'text_delta': {
      state.streamText += item.delta
      return [
        {
          type: 'agent_chunk',
          seq: nextSeq(state),
          event_id: `${sessionId}:delta:${state.seq}`,
          role: 'ai',
          content: state.streamText,
          timestamp,
          chunk_kind: 'response_stream',
          metadata: { stream_key: item.run_id ?? 'flowbot' }
        }
      ]
    }
    case 'tool':
      return [
        {
          type: 'step_started',
          seq: nextSeq(state),
          event_id: `${sessionId}:tool:${state.seq}`,
          step_id: `${sessionId}:tool:${state.seq}`,
          step_type: 'tool',
          name: item.name,
          input: item.reason ? { reason: item.reason } : undefined,
          timestamp
        }
      ]
    case 'reasoning_step':
      state.stepNames.set(item.id, item.title)
      if (item.kind === 'handoff') {
        return [
          {
            type: 'expert_called',
            seq: nextSeq(state),
            event_id: `${sessionId}:expert:${item.id}`,
            step_id: item.id,
            expert_name: item.title.replace(/^Handoff to\s+/i, ''),
            task_summary: item.title,
            timestamp: eventTimeFromUnix(item.started_at)
          }
        ]
      }
      return [
        {
          type: 'step_started',
          seq: nextSeq(state),
          event_id: `${sessionId}:step:${item.id}`,
          step_id: item.id,
          step_type: item.kind === 'thought' ? 'thinking' : 'tool',
          name: item.title,
          input: item.args && typeof item.args === 'object' ? (item.args as Record<string, unknown>) : undefined,
          timestamp: eventTimeFromUnix(item.started_at)
        }
      ]
    case 'reasoning_step_update':
      const stepName = state.stepNames.get(item.id)
      return [
        {
          type: 'step_completed',
          seq: nextSeq(state),
          event_id: `${sessionId}:step-done:${item.id}`,
          step_id: item.id,
          status: item.status === 'error' ? 'failed' : 'done',
          name: stepName,
          output:
            typeof item.error === 'string'
              ? item.error
              : item.result === undefined
                ? undefined
                : JSON.stringify(item.result),
          timestamp: eventTimeFromUnix(item.ended_at)
        }
      ]
    case 'answer': {
      const text = outputText(item)
      state.session.status = 'completed'
      state.session.output = text
      state.session.completed_at = timestamp
      state.session.updated_at = timestamp
      return [
        {
          type: 'terminal',
          seq: nextSeq(state),
          event_id: `${sessionId}:terminal:${state.seq}`,
          timestamp,
          status: 'completed',
          output: text
        }
      ]
    }
    default:
      return []
  }
}

const applyEvents = (sessionId: string, events: AgentStreamEvent[], accessToken: string): void => {
  if (events.length === 0) return
  const state = sessions.get(sessionId)
  if (state) {
    state.session.trace = [...(state.session.trace ?? []), ...events]
    state.session.updated_at = nowIso()
  }
  appendSessionStreamEvents(sessionId, events, accessToken)
}

const parseSseFrames = (chunk: string, onFrame: (event: string, data: string) => void): string => {
  const parts = chunk.split('\n\n')
  const remainder = parts.pop() ?? ''
  for (const frame of parts) {
    let event = 'message'
    let data = ''
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      if (line.startsWith('data:')) data += line.slice(5).trimStart()
    }
    if (data) onFrame(event, data)
  }
  return remainder
}

const buildFormData = (
  sessionId: string,
  message: string,
  config?: SessionConfig,
  activeEnterpriseSkillId?: string,
  fallbackSkillId?: string
): FormData => {
  const form = new FormData()
  form.set('session_id', sessionId)
  form.set('user_input_text', message)
  form.set('use_presearch', 'true')
  form.set('fabricAgentType', 'flow')
  const expertId = config?.selectedAgent?.id
  if (expertId) form.set('fabricExpertIds', JSON.stringify([expertId]))
  const skillIds = [activeEnterpriseSkillId, fallbackSkillId, config?.selectedEnterpriseSkill?.skill_id].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  )
  if (skillIds.length > 0) form.set('fabricSkillIds', JSON.stringify(skillIds))
  return form
}

const streamFlowBotTurn = async (
  sessionId: string,
  accessToken: string,
  message: string,
  config?: SessionConfig,
  activeEnterpriseSkillId?: string,
  fallbackSkillId?: string
): Promise<void> => {
  const state = sessions.get(sessionId)
  if (!state) return

  try {
    const response = await fetch(`${resolveFlowbotBaseUrl()}/flowbot/api/agent/v2/chat`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${accessToken}`
      },
      body: buildFormData(sessionId, message, config, activeEnterpriseSkillId, fallbackSkillId),
      credentials: 'same-origin',
      mode: 'cors'
    })

    if (!response.ok || !response.body) {
      throw new Error(`FlowBot stream failed with status ${response.status}`)
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    const handleFrame = (event: string, data: string) => {
      if (event !== 'output-item') return
      const item = JSON.parse(data) as FlowBotOutputItem
      applyEvents(sessionId, mapOutputItemToEvents(sessionId, state, item), accessToken)
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer = parseSseFrames(buffer + value, handleFrame)
    }
    if (buffer.trim()) {
      parseSseFrames(`${buffer}\n\n`, handleFrame)
    }
  } catch (error) {
    state.session.status = 'failed'
    const messageText = error instanceof Error ? error.message : 'FlowBot stream failed'
    applyEvents(
      sessionId,
      [
        {
          type: 'terminal',
          seq: nextSeq(state),
          event_id: `${sessionId}:failed:${state.seq}`,
          timestamp: nowIso(),
          status: 'failed',
          output: messageText
        }
      ],
      accessToken
    )
  }
}

export const useFlowBotFabricClient = (accessToken: string) => {
  const startSession = useCallback(
    async (
      task: string,
      config?: SessionConfig,
      _activeExternalConnectionIds?: string[],
      activeEnterpriseSkillId?: string,
      fallbackSkillId?: string
    ): Promise<StartSessionResponse> => {
      const sessionId = createSessionId()
      const timestamp = nowIso()
      const session: DeepAgentSession = {
        session_id: sessionId,
        input: task,
        status: 'running',
        created_at: timestamp,
        updated_at: timestamp,
        config,
        trace: []
      }
      const state: RuntimeSessionState = { session, seq: 0, streamText: '', stepNames: new Map() }
      sessions.set(sessionId, state)
      ensureSessionStreamEntry(sessionId, accessToken)
      applyEvents(
        sessionId,
        [
          {
            type: 'agent_chunk',
            seq: nextSeq(state),
            event_id: `${sessionId}:user:${state.seq}`,
            role: 'human',
            content: task,
            timestamp
          }
        ],
        accessToken
      )
      void streamFlowBotTurn(sessionId, accessToken, task, config, activeEnterpriseSkillId, fallbackSkillId)
      return { session_id: sessionId, status: 'running', session }
    },
    [accessToken]
  )

  const getSession = useCallback(async (sessionId: string): Promise<DeepAgentSession> => {
    const state = sessions.get(sessionId)
    if (!state) throw new Error(`FlowBot Fabric session '${sessionId}' was not found`)
    return state.session
  }, [])

  const replyToInterrupt = useCallback(
    async (sessionId: string, message?: string, structuredInput?: Record<string, unknown>) => {
      const state = sessions.get(sessionId)
      if (!state) throw new Error(`FlowBot Fabric session '${sessionId}' was not found`)
      const text = message?.trim() || JSON.stringify(structuredInput ?? {})
      state.session.status = 'running'
      state.session.updated_at = nowIso()
      state.streamText = ''
      state.stepNames.clear()
      applyEvents(
        sessionId,
        [
          {
            type: 'agent_chunk',
            seq: nextSeq(state),
            event_id: `${sessionId}:user:${state.seq}`,
            role: 'human',
            content: text,
            timestamp: nowIso()
          }
        ],
        accessToken
      )
      void streamFlowBotTurn(sessionId, accessToken, text, state.session.config)
    },
    [accessToken]
  )

  const stopSession = useCallback(async (sessionId: string) => {
    const state = sessions.get(sessionId)
    if (state) {
      state.session.status = 'cancelled'
      state.session.updated_at = nowIso()
    }
  }, [])

  return useMemo(
    () => ({
      startSession,
      getSession,
      replyToInterrupt,
      stopSession
    }),
    [getSession, replyToInterrupt, startSession, stopSession]
  )
}
