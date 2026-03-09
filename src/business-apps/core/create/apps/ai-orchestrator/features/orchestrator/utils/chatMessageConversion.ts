/**
 * Chat message conversion between Create chat format and Builder API format.
 * Used for persisting and restoring chat history.
 */

import type { CreateChatMessage } from '../types/chat'
import type { ChatMessage as BuilderChatMessage } from '@/common/network/ai/builder/BuilderClient'

export const ORCHESTRATOR_SYSTEM_AUTHOR = 'orchestrator-system'

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
      createdBy: message.createdBy,
      editHistory: message.editHistory,
      serverCreatedAt: message.serverCreatedAt
    }
  })
}
