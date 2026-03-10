/**
 * Orchestrator stream parsers - Shared SSE parsing for fix and refine flows.
 * Extracts duplicated logic from OrchestratorViewConversational.
 */

import type { CreateChatMessage } from '../types/chat'
import type { ChatMessageBlock, ToolCall as ChatMessageToolCall } from '@/common/network/ai/builder/BuilderClient'

/** Assistant message partial for streaming updates */
export type AssistantStreamPartial = Partial<{
  content: string
  messageType: CreateChatMessage['messageType']
  blocks: ChatMessageBlock[]
  toolCalls: ChatMessageToolCall[]
  thinkingLog?: string
  thinkingCollapsed?: boolean
}>

const MUTATION_TOOLS = new Set([
  'write_file',
  'delete_file',
  'screen_build',
  'screen_publish',
  'run_command',
  'propose_change',
  'create_entity',
  'create_flow_template',
  'create_function',
  'create_agent'
])

type DisplayStep = 'call' | 'progress' | 'result'

function parseDisplayKind(value: unknown): ChatMessageToolCall['displayKind'] {
  return value === 'info' || value === 'success' || value === 'warning' || value === 'error' ? value : undefined
}

function parseDisplayStep(value: unknown): ChatMessageToolCall['displayStep'] {
  return value === 'call' || value === 'progress' || value === 'result' ? (value as DisplayStep) : undefined
}

function isSuccessResult(resultRecord: Record<string, unknown> | undefined): boolean {
  return !(resultRecord?.success === false || typeof resultRecord?.error === 'string')
}

function sanitizeVisibleResponseText(value: string): string {
  if (!value) return ''
  return value.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').replace(/<\/?thinking>/gi, '')
}

function stringifyToolArgs(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() ? value : undefined
  if (!value || typeof value !== 'object') return undefined
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}

function deriveResponseContent(blocks: ChatMessageBlock[]): string {
  return blocks
    .filter(block => block.type === 'response')
    .map(block => block.content)
    .join('')
}

function deriveThinkingLog(blocks: ChatMessageBlock[]): string | undefined {
  const content = blocks
    .filter(block => block.type === 'thinking')
    .map(block => block.content)
    .join('\n\n')
    .trim()
  return content || undefined
}

function getNextTimelineOrder(blocks: ChatMessageBlock[], toolCalls: ChatMessageToolCall[]): number {
  let maxOrder = 0
  for (const block of blocks) {
    const order = typeof block.order === 'number' && Number.isFinite(block.order) ? block.order : 0
    if (order > maxOrder) maxOrder = order
  }
  for (const toolCall of toolCalls) {
    const order = typeof toolCall.order === 'number' && Number.isFinite(toolCall.order) ? toolCall.order : 0
    if (order > maxOrder) maxOrder = order
  }
  return maxOrder + 1
}

function appendAssistantBlock(
  blocks: ChatMessageBlock[],
  toolCalls: ChatMessageToolCall[],
  type: 'thinking' | 'response',
  chunk: string
): void {
  const normalizedChunk = type === 'response' ? sanitizeVisibleResponseText(chunk) : chunk
  if (!normalizedChunk) return
  const latestToolOrder = toolCalls.reduce((max, item) => Math.max(max, item.order ?? 0), 0)
  const last = blocks.length > 0 ? blocks[blocks.length - 1] : null
  const lastOrder = typeof last?.order === 'number' && Number.isFinite(last?.order) ? last.order : 0
  if (last?.type === type && lastOrder >= latestToolOrder) {
    last.content += normalizedChunk
    return
  }
  blocks.push({
    type,
    content: normalizedChunk,
    collapsed: type === 'thinking' ? false : undefined,
    order: getNextTimelineOrder(blocks, toolCalls)
  })
}

function findLatestRunningToolCall(
  toolCalls: ChatMessageToolCall[],
  toolName: string
): ChatMessageToolCall | undefined {
  for (let index = toolCalls.length - 1; index >= 0; index -= 1) {
    const toolCall = toolCalls[index]
    if (toolCall.tool === toolName && toolCall.status === 'running') return toolCall
  }
  return undefined
}

function createToolCallTitle(toolName: string, fallback: string): string {
  if (fallback.trim()) return fallback
  return toolName || 'tool'
}

function getDisplayKindForResult(success: boolean): 'success' | 'error' {
  return success ? 'success' : 'error'
}

interface StreamParserOptions {
  messageType: 'fix' | 'refinement'
  errorMessage: string
  fallbackContent: string
  trackMutations: boolean
}

async function parseAssistantStream(
  stream: ReadableStream<Uint8Array>,
  options: StreamParserOptions,
  onPartial?: (partial: AssistantStreamPartial) => void
): Promise<{
  assistantMessage: AssistantStreamPartial & { content: string; messageType: 'fix' | 'refinement' }
  hasMutation?: boolean
}> {
  const { messageType, errorMessage, fallbackContent, trackMutations } = options
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let hasMutation = false
  const blocks: ChatMessageBlock[] = []
  const toolCalls: ChatMessageToolCall[] = []

  const emitPartial = () => {
    onPartial?.({
      content: deriveResponseContent(blocks),
      messageType,
      blocks: blocks.map(block => ({ ...block })),
      toolCalls: toolCalls.map(toolCall => ({
        ...toolCall,
        progressLines: Array.isArray(toolCall.progressLines) ? [...toolCall.progressLines] : undefined
      })),
      thinkingLog: deriveThinkingLog(blocks),
      thinkingCollapsed: true
    })
  }

  const handleToolResultEvent = (eventData: Record<string, unknown>) => {
    const toolName = typeof eventData.toolName === 'string' ? eventData.toolName : 'tool'
    const resultPayload =
      typeof eventData?.toolResult === 'object' && eventData.toolResult != null ? eventData.toolResult : undefined
    const resultContent =
      typeof eventData.content === 'string' ? eventData.content : resultPayload ? JSON.stringify(resultPayload) : ''
    const resultRecord = resultPayload as Record<string, unknown> | undefined
    const resultSuccess = isSuccessResult(resultRecord)
    if (trackMutations && MUTATION_TOOLS.has(toolName) && resultSuccess) {
      hasMutation = true
    }
    const toolCall = findLatestRunningToolCall(toolCalls, toolName)
    const displayTitle =
      typeof eventData.displayTitle === 'string' && eventData.displayTitle.trim() ? eventData.displayTitle : toolName

    const displayKindDefault = getDisplayKindForResult(resultSuccess)
    if (toolCall) {
      toolCall.status = 'complete'
      toolCall.result = resultContent
      toolCall.displayTitle = displayTitle
      toolCall.displayDetail =
        typeof eventData.displayDetail === 'string' ? eventData.displayDetail : toolCall.displayDetail
      toolCall.displayKind = parseDisplayKind(eventData.displayKind) ?? toolCall.displayKind ?? displayKindDefault
      toolCall.displayStep = parseDisplayStep(eventData.displayStep) ?? 'result'
    } else {
      toolCalls.push({
        tool: toolName,
        status: 'complete',
        id: crypto.randomUUID(),
        order: getNextTimelineOrder(blocks, toolCalls),
        result: resultContent,
        displayTitle,
        displayDetail: typeof eventData.displayDetail === 'string' ? eventData.displayDetail : undefined,
        displayKind: parseDisplayKind(eventData.displayKind) ?? displayKindDefault,
        displayStep: parseDisplayStep(eventData.displayStep) ?? 'result',
        progressLines: []
      })
    }
  }

  const handleToolCallEvent = (eventData: Record<string, unknown>) => {
    const toolName = typeof eventData.toolName === 'string' ? eventData.toolName : 'tool'
    if (trackMutations && MUTATION_TOOLS.has(toolName)) hasMutation = true
    toolCalls.push({
      tool: toolName,
      args: stringifyToolArgs(eventData.toolArgs),
      status: 'running',
      id: crypto.randomUUID(),
      order: getNextTimelineOrder(blocks, toolCalls),
      displayTitle: createToolCallTitle(
        toolName,
        typeof eventData.displayTitle === 'string' ? eventData.displayTitle : ''
      ),
      displayDetail: typeof eventData.displayDetail === 'string' ? eventData.displayDetail : undefined,
      displayKind: parseDisplayKind(eventData.displayKind) ?? 'info',
      displayStep: parseDisplayStep(eventData.displayStep) ?? 'call',
      progressLines: []
    })
  }

  const handleToolProgressEvent = (eventData: Record<string, unknown>) => {
    const toolName = typeof eventData.toolName === 'string' ? eventData.toolName : ''
    const content = typeof eventData.content === 'string' ? eventData.content.trim() : ''
    if (!toolName || !content) return
    const toolCall = findLatestRunningToolCall(toolCalls, toolName)
    if (!toolCall) return
    const progressLines = [...(toolCall.progressLines ?? [])]
    if (!progressLines.includes(content)) progressLines.push(content)
    toolCall.progressLines = progressLines
    if (!toolCall.displayTitle) toolCall.displayTitle = createToolCallTitle(toolName, content)
  }

  const processEvent = (eventData: Record<string, unknown>) => {
    const eventType = typeof eventData.type === 'string' ? eventData.type : ''
    if (eventType === 'error') {
      const message = typeof eventData.content === 'string' ? eventData.content : errorMessage
      throw new Error(message)
    }
    if (eventType === 'thinking' && typeof eventData.content === 'string') {
      appendAssistantBlock(blocks, toolCalls, 'thinking', eventData.content)
      emitPartial()
      return
    }
    if ((eventType === 'token' || eventType === 'response') && typeof eventData.content === 'string') {
      appendAssistantBlock(blocks, toolCalls, 'response', eventData.content)
      emitPartial()
      return
    }
    if (eventType === 'tool_call') {
      handleToolCallEvent(eventData)
      emitPartial()
      return
    }
    if (eventType === 'tool_progress') {
      handleToolProgressEvent(eventData)
      emitPartial()
      return
    }
    if (eventType === 'tool_result') {
      handleToolResultEvent(eventData)
      emitPartial()
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        processEvent(JSON.parse(payload) as Record<string, unknown>)
      } catch (error_) {
        if (!(error_ instanceof Error && error_.message !== errorMessage)) {
          throw error_
        }
      }
    }
  }

  const remaining = buffer.trim()
  if (remaining.startsWith('data:')) {
    const payload = remaining.slice(5).trim()
    if (payload && payload !== '[DONE]') {
      try {
        processEvent(JSON.parse(payload) as Record<string, unknown>)
      } catch (error_) {
        if (!(error_ instanceof Error && error_.message !== errorMessage)) {
          throw error_
        }
      }
    }
  }

  for (let index = 0; index < blocks.length - 1; index += 1) {
    if (blocks[index].type === 'thinking' && blocks[index + 1].type === 'response') {
      blocks[index].collapsed = true
    }
  }

  const content = deriveResponseContent(blocks).trim()
  emitPartial()

  const assistantMessage: AssistantStreamPartial & { content: string; messageType: 'fix' | 'refinement' } = {
    content: content || fallbackContent,
    messageType,
    blocks,
    toolCalls,
    thinkingLog: deriveThinkingLog(blocks),
    thinkingCollapsed: true
  }

  if (trackMutations) {
    return { assistantMessage, hasMutation }
  }
  return { assistantMessage }
}

/** Parse fix stream for AI builder screen fixes (tracks mutations) */
export async function parseFixAssistantFromStream(
  stream: ReadableStream<Uint8Array>,
  onPartial?: (partial: AssistantStreamPartial) => void
): Promise<{
  assistantMessage: AssistantStreamPartial & { content: string; messageType: 'fix' }
  hasMutation: boolean
}> {
  const result = await parseAssistantStream(
    stream,
    {
      messageType: 'fix',
      errorMessage: 'Fix request failed',
      fallbackContent: 'Applied. Review the updated preview on the canvas.',
      trackMutations: true
    },
    onPartial
  )
  return {
    assistantMessage: result.assistantMessage as AssistantStreamPartial & { content: string; messageType: 'fix' },
    hasMutation: result.hasMutation ?? false
  }
}

/** Parse refine stream for plan refinement (no mutation tracking) */
export async function parseRefineAssistantFromStream(
  stream: ReadableStream<Uint8Array>,
  onPartial?: (partial: AssistantStreamPartial) => void
): Promise<AssistantStreamPartial & { content: string; messageType: 'refinement' }> {
  const result = await parseAssistantStream(
    stream,
    {
      messageType: 'refinement',
      errorMessage: 'Refine request failed',
      fallbackContent: 'Plan updated based on your feedback. Review the updated components on the canvas.',
      trackMutations: false
    },
    onPartial
  )
  return result.assistantMessage as AssistantStreamPartial & { content: string; messageType: 'refinement' }
}
