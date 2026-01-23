/**
 * Chat History Client
 *
 * Handles saving and loading conversation history from the AI builder service
 */

import { ENV } from '../config/environment'

const AI_SERVICE_API_URL = ENV.AI_SERVICE_API_URL

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: any
  thinkingLog?: string
}

/**
 * Load chat history for a session
 */
export async function loadChatHistory(repoId: string, sessionId: string): Promise<ChatMessage[]> {
  try {
    const response = await fetch(`${AI_SERVICE_API_URL}/api/chat/history?repoId=${repoId}&sessionId=${sessionId}`)

    if (!response.ok) {
      console.warn('Failed to load chat history:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.messages || []
  } catch (error) {
    console.error('Error loading chat history:', error)
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

    if (!response.ok) {
      console.warn('Failed to save chat history:', response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving chat history:', error)
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

    if (!response.ok) {
      console.warn('Failed to clear chat history:', response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error clearing chat history:', error)
    return false
  }
}
