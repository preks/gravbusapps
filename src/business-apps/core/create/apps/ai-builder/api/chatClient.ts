/**
 * Chat History Client
 *
 * Handles saving and loading conversation history from the AI builder service
 */

import { ENV } from '../config/environment'

const AI_SERVICE_API_URL = ENV.AI_SERVICE_API_URL

export interface ToolCall {
  tool: string
  args?: string
  result?: string
  status: 'running' | 'complete'
  id: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  thinkingLog?: string
}

/**
 * Load chat history for a session
 */
export async function loadChatHistory(repoId: string, sessionId: string): Promise<ChatMessage[]> {
  try {
    const response = await fetch(`${AI_SERVICE_API_URL}/api/chat/history?repoId=${repoId}&sessionId=${sessionId}`)

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.messages || []
  } catch {
    return []
  }
}

/**
 * Save chat history for a session
 */
export async function saveChatHistory(repoId: string, sessionId: string, messages: ChatMessage[]): Promise<boolean> {
  try {
    const response = await fetch(`${AI_SERVICE_API_URL}/api/chat/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repoId,
        sessionId,
        messages
      })
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Clear chat history for a session
 */
export async function clearChatHistory(repoId: string, sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${AI_SERVICE_API_URL}/api/chat/history?repoId=${repoId}&sessionId=${sessionId}`, {
      method: 'DELETE'
    })

    return response.ok
  } catch {
    return false
  }
}
