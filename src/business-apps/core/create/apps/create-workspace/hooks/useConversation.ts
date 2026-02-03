/**
 * useConversation - Manage chat message history
 */

import { useState, useCallback } from 'react'
import type { ChatMessageProps } from '../components/conversational'

export interface UseConversationOptions {
  initialMessages?: ChatMessageProps[]
}

export interface UseConversationResult {
  messages: ChatMessageProps[]
  addMessage: (message: Omit<ChatMessageProps, 'id' | 'timestamp'>) => void
  updateLastMessage: (updates: Partial<ChatMessageProps>) => void
  clearMessages: () => void
}

let messageIdCounter = 0

export function useConversation(options: UseConversationOptions = {}): UseConversationResult {
  const [messages, setMessages] = useState<ChatMessageProps[]>(options.initialMessages || [])

  const addMessage = useCallback((message: Omit<ChatMessageProps, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessageProps = {
      ...message,
      id: `msg-${++messageIdCounter}-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    setMessages(prev => [...prev, newMessage])
  }, [])

  const updateLastMessage = useCallback((updates: Partial<ChatMessageProps>) => {
    setMessages(prev => {
      if (prev.length === 0) return prev
      const updated = [...prev]
      updated[updated.length - 1] = { ...updated[updated.length - 1], ...updates }
      return updated
    })
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    addMessage,
    updateLastMessage,
    clearMessages
  }
}
