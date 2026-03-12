/**
 * Chat message conversion between Create chat format and Builder API format.
 * Used for persisting and restoring chat history.
 */

import type { CreateChatMessage } from '../types/chat'
import type { ChatMessage as BuilderChatMessage } from '@/common/network/ai/builder/BuilderClient'

export const ORCHESTRATOR_SYSTEM_AUTHOR = 'orchestrator-system'

function parseDecisionPromptFromToolCalls(
  toolCalls: BuilderChatMessage['toolCalls']
): CreateChatMessage['decisionPrompt'] | undefined {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return undefined
  }

  for (let index = toolCalls.length - 1; index >= 0; index -= 1) {
    const toolCall = toolCalls[index]
    if (!toolCall || typeof toolCall !== 'object') continue
    if (toolCall.tool !== 'schema_resolution_options' && toolCall.tool !== 'apply_schema_change') continue
    if (typeof toolCall.result !== 'string' || !toolCall.result.trim().startsWith('{')) continue

    try {
      const parsed = JSON.parse(toolCall.result) as Record<string, unknown>
      const options = Array.isArray(parsed.options)
        ? parsed.options
            .map(option => {
              if (!option || typeof option !== 'object') return null
              const record = option as Record<string, unknown>
              const id = typeof record.id === 'string' ? record.id : ''
              const title = typeof record.title === 'string' ? record.title : ''
              const description = typeof record.description === 'string' ? record.description : ''
              if (!id || !title) return null
              return {
                id,
                title,
                description,
                riskLevel:
                  record.riskLevel === 'low' || record.riskLevel === 'medium' || record.riskLevel === 'high'
                    ? record.riskLevel
                    : undefined,
                destructive: record.destructive === true,
                requiresExplicitConsent: record.requiresExplicitConsent === true
              }
            })
            .filter(
              (
                option
              ): option is {
                id: string
                title: string
                description: string
                riskLevel?: 'low' | 'medium' | 'high'
                destructive?: boolean
                requiresExplicitConsent?: boolean
              } => option != null
            )
        : []

      if (options.length === 0) continue

      const availableTools = Array.isArray(parsed.availableTools)
        ? parsed.availableTools
            .map(tool => {
              if (!tool || typeof tool !== 'object') return null
              const record = tool as Record<string, unknown>
              const name = typeof record.name === 'string' ? record.name : ''
              const description = typeof record.description === 'string' ? record.description : ''
              if (!name || !description) return null
              return { name, description }
            })
            .filter((tool): tool is { name: string; description: string } => tool != null)
        : undefined

      return {
        options,
        riskSummary: typeof parsed.riskSummary === 'string' ? parsed.riskSummary : undefined,
        availableTools
      }
    } catch {
      continue
    }
  }

  return undefined
}

export function toPersistedChatMessages(messages: CreateChatMessage[]): BuilderChatMessage[] {
  return messages.map(message => {
    const m = message as CreateChatMessage & Partial<BuilderChatMessage>
    return {
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
      toolCalls: m.toolCalls,
      thinkingLog: m.thinkingLog,
      thinkingCollapsed: m.thinkingCollapsed,
      blocks: m.blocks,
      createdBy: message.role === 'system' ? ORCHESTRATOR_SYSTEM_AUTHOR : m.createdBy,
      editHistory: m.editHistory,
      messageId: message.id,
      createdAt: message.createdAt,
      serverCreatedAt: m.serverCreatedAt
    }
  })
}

export function deriveRoleFromMessage(message: BuilderChatMessage): CreateChatMessage['role'] {
  if (message.role === 'user') return 'user'
  const isSystem = message.role === 'assistant' && message.createdBy === ORCHESTRATOR_SYSTEM_AUTHOR
  return isSystem ? 'system' : 'assistant'
}

export function deriveMessageType(role: CreateChatMessage['role']): CreateChatMessage['messageType'] {
  if (role === 'user') return 'prompt'
  if (role === 'system') return 'system'
  return 'general'
}

export function fromPersistedChatMessages(messages: BuilderChatMessage[]): CreateChatMessage[] {
  return messages.map(message => {
    const role = deriveRoleFromMessage(message)
    const decisionPrompt = message.decisionPrompt ?? parseDecisionPromptFromToolCalls(message.toolCalls)
    return {
      id: message.messageId || crypto.randomUUID(),
      role,
      content: message.content || '',
      createdAt: message.serverCreatedAt || message.createdAt || new Date().toISOString(),
      messageType: deriveMessageType(role),
      toolCalls: message.toolCalls,
      thinkingLog: message.thinkingLog,
      thinkingCollapsed: message.thinkingCollapsed,
      blocks: message.blocks,
      decisionPrompt,
      createdBy: message.createdBy,
      editHistory: message.editHistory,
      serverCreatedAt: message.serverCreatedAt
    }
  })
}
