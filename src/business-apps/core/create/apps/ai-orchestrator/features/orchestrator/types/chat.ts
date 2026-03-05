/**
 * Type definitions for the CREATE Agent chat side panel.
 * Used by useCreateChat hook and chat UI components.
 */

export type ChatMessageRole = 'user' | 'assistant' | 'system'

export type ChatMessageType = 'prompt' | 'refinement' | 'build-command' | 'fix' | 'system' | 'general'

export interface ChatMessageBlock {
  type: 'thinking' | 'response'
  content: string
  collapsed?: boolean
  order?: number
}

export interface ChatMessageToolCall {
  tool: string
  args?: string
  result?: string
  status: 'running' | 'complete'
  id: string
  order?: number
  displayTitle?: string
  displayDetail?: string
  displayKind?: 'info' | 'success' | 'warning' | 'error'
  displayStep?: 'call' | 'progress' | 'result'
  progressLines?: string[]
}

export interface CreateChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: string
  messageType: ChatMessageType
  isStreaming?: boolean
  toolCalls?: ChatMessageToolCall[]
  thinkingLog?: string
  thinkingCollapsed?: boolean
  blocks?: ChatMessageBlock[]
  createdBy?: string
  editHistory?: Array<{
    userId: string
    editedAt: string
  }>
  serverCreatedAt?: string
}

export type CanvasTab =
  | 'build-plan'
  | 'data-flow'
  | 'screen'
  | 'data-model'
  | 'functions'
  | 'task-expert'
  | 'flow'
  | 'about'

export interface CanvasTabInfo {
  id: CanvasTab
  label: string
}

export const CANVAS_TABS: CanvasTabInfo[] = [
  { id: 'build-plan', label: 'Build Plan' },
  { id: 'screen', label: 'Screen' },
  { id: 'data-model', label: 'Data Model' },
  { id: 'functions', label: 'Functions' },
  { id: 'task-expert', label: 'Task Expert' },
  { id: 'flow', label: 'Flow' },
  { id: 'data-flow', label: 'Architecture' },
  { id: 'about', label: 'About' }
]
