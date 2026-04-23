/**
 * Type definitions for the CREATE Agent chat side panel.
 * Used by useCreateChat hook and chat UI components.
 */

import type { ComponentSpec } from './components'

export type ChatMessageRole = 'user' | 'assistant' | 'system'

export type ChatMessageType = 'prompt' | 'refinement' | 'build-command' | 'fix' | 'system' | 'general'

/**
 * Post-build composer: explicit routing for CREATE Agent messages (replaces LLM-only `auto` intent).
 * - screen → ui_mutate (UI-only)
 * - app → plan_refine (data, flows, functions, logic)
 * - ask → plan_refine (same path; downstream treats read-only Q&A)
 */
export type OrchestratorFixComposerScope = 'screen' | 'app' | 'ask'

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

export interface DecisionOptionChoice {
  id: string
  title: string
  description: string
  riskLevel?: 'low' | 'medium' | 'high'
  destructive?: boolean
  requiresExplicitConsent?: boolean
}

export interface DecisionToolDescriptor {
  name: string
  description: string
}

export interface DecisionPromptState {
  decisionId?: string
  riskSummary?: string
  options: DecisionOptionChoice[]
  availableTools?: DecisionToolDescriptor[]
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
  decisionPrompt?: DecisionPromptState
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
  | 'agent-mesh'
  | 'about'

export interface CanvasTabInfo {
  id: CanvasTab
  label: string
}

export const CANVAS_TABS: CanvasTabInfo[] = [
  { id: 'build-plan', label: 'Overview' },
  { id: 'screen', label: 'Screen' },
  { id: 'data-model', label: 'Data Model' },
  { id: 'functions', label: 'Functions' },
  { id: 'task-expert', label: 'Agent' },
  { id: 'agent-mesh', label: 'Agent Mesh' },
  { id: 'flow', label: 'Flow' },
  { id: 'about', label: 'About' }
]

/**
 * Returns which canvas tabs should be visible based on the plan's components.
 * Hides tabs that have no corresponding component type (e.g. no data model → hide Data Model tab).
 */
export function getVisibleCanvasTabs(components: ComponentSpec[]): CanvasTabInfo[] {
  const hasScreen = components.some(c => c.type === 'screen')
  const hasDataModel = components.some(c => c.type === 'data_model')
  const hasFunction = components.some(c => c.type === 'function')
  const hasAgent = components.some(c => c.type === 'agent')
  const hasFlow = components.some(c => c.type === 'flow')

  return CANVAS_TABS.filter(tab => {
    switch (tab.id) {
      case 'build-plan':
      case 'about':
        return true
      case 'screen':
        return hasScreen
      case 'data-model':
        return hasDataModel
      case 'functions':
        return hasFunction
      case 'task-expert':
        return hasAgent
      case 'flow':
        return hasFlow
      case 'agent-mesh':
        return false
      default:
        return true
    }
  })
}
