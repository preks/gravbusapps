/**
 * Type definitions for AI Builder
 */

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  cost?: {
    inputTokens: number
    outputTokens: number
    totalCost: number
  }
}

export interface GeneratedFile {
  path: string
  content: string
  changeType: 'create' | 'modify' | 'delete'
}

export interface BuildSession {
  id: string
  repoId: string
  messages: Message[]
  files: GeneratedFile[]
  status: 'idle' | 'building' | 'ready' | 'published'
  createdAt: Date
  updatedAt: Date
}

export interface RepositoryInfo {
  id: string
  name: string
  url: string
  status: 'connected' | 'disconnected' | 'indexing'
  totalFiles: number
  lastIndexed: string
}

export interface UsageStatistics {
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  sessionsCount: number
  screensGenerated: number
  screensPublished: number
}

export interface StreamEvent {
  type: 'token' | 'response' | 'tool_call' | 'tool_result' | 'thinking' | 'usage' | 'iteration_complete'
  content?: string
  toolName?: string
  progress?: {
    current: number
    total: number
  }
}
