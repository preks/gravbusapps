/**
 * useAiEditProvider Hook
 *
 * Manages Fast/Smart LLM provider preference for the document AI editor.
 * Persists choice to localStorage per user, matching the Nexus pattern.
 */

import { useState, useEffect, useCallback } from 'react'

export type LlmProvider = 'openai' | 'groq'

const STORAGE_KEY = 'document-ai-edit:llm-provider'

export function useAiEditProvider(userId?: string) {
  const storageKey = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY

  const [llmProvider, setLlmProviderState] = useState<LlmProvider>(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      return stored === 'groq' ? 'groq' : 'openai'
    } catch {
      return 'openai'
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, llmProvider)
    } catch {
      // Ignore storage errors
    }
  }, [llmProvider, storageKey])

  const setLlmProvider = useCallback((provider: LlmProvider) => {
    setLlmProviderState(provider)
  }, [])

  return { llmProvider, setLlmProvider }
}
