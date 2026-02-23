/**
 * Type definitions for the CREATE Agent chat side panel.
 * Used by useCreateChat hook and chat UI components.
 */

export type ChatMessageRole = 'user' | 'assistant' | 'system'

export type ChatMessageType = 'prompt' | 'refinement' | 'build-command' | 'fix' | 'system' | 'general'

export interface CreateChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: string
  messageType: ChatMessageType
  isStreaming?: boolean
}

export type CanvasTab = 'screen' | 'data-model' | 'functions' | 'task-expert' | 'flow' | 'about'

export interface CanvasTabInfo {
  id: CanvasTab
  label: string
}

export const CANVAS_TABS: CanvasTabInfo[] = [
  { id: 'screen', label: 'Screen' },
  { id: 'data-model', label: 'Data Model' },
  { id: 'functions', label: 'Functions' },
  { id: 'task-expert', label: 'Task Expert' },
  { id: 'flow', label: 'Flow' },
  { id: 'about', label: 'About' }
]
