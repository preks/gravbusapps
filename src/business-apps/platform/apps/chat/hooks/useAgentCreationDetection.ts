/**
 * Hook to detect when user is trying to create an agent via @Every
 *
 * Detects patterns like:
 * - "inform me when..." (event-based)
 * - "notify me when..." (event-based)
 * - "send me a list every Monday" (schedule-based)
 * - "remind me every day to..." (schedule-based)
 * - "alert me when..." (event-based)
 *
 * DOES NOT detect one-time reminders:
 * - "remind me to call in 2 minutes" → EveryAI handles this
 * - "remind me tomorrow to..." → EveryAI handles this
 */

import { useCallback } from 'react'

export interface AgentCreationIntent {
  isAgentRequest: boolean
  confidence: number
  prompt: string
}

const AGENT_CREATION_PATTERNS = [
  // Event-based patterns
  /inform\s+me\s+when/i,
  /notify\s+me\s+when/i,
  /alert\s+me\s+when/i,
  /tell\s+me\s+when/i,
  /let\s+me\s+know\s+when/i,
  /watch\s+for/i,
  /monitor/i,

  // Schedule-based patterns (recurring only)
  /send\s+me.*(?:every|each|daily|weekly|monthly)/i,
  /remind\s+me.*(?:every|each|daily|weekly|monthly)/i,
  /remind\s+me.*(?:at|on).*(?:every|each|daily|weekly|monthly)/i,
  /schedule.*(?:report|summary|update)/i,

  // General automation patterns
  /automate/i,
  /automatically/i,
  /create.*agent/i,
  /set\s+up.*automation/i
]

export const useAgentCreationDetection = () => {
  /**
   * Detect if a message to @Every is requesting agent creation
   */
  const detectAgentCreationIntent = useCallback((message: string): AgentCreationIntent => {
    const lowerMessage = message.toLowerCase().trim()

    // Remove @Every mention for analysis
    const cleanMessage = lowerMessage
      .replace(/@every\s*/gi, '')
      .replace(/@ai\s*/gi, '')
      .replace(/@assistant\s*/gi, '')
      .trim()

    // Check for agent creation patterns
    let matchCount = 0
    for (const pattern of AGENT_CREATION_PATTERNS) {
      if (pattern.test(cleanMessage)) {
        matchCount++
      }
    }

    const isAgentRequest = matchCount > 0
    const confidence = Math.min(matchCount / 2, 1) // 2+ matches = 100% confidence

    return {
      isAgentRequest,
      confidence,
      prompt: cleanMessage
    }
  }, [])

  /**
   * Check if message contains @Every mention
   */
  const hasEveryMention = useCallback((message: string): boolean => {
    return /@every\s+/i.test(message) || /@ai\s+/i.test(message) || /@assistant\s+/i.test(message)
  }, [])

  return {
    detectAgentCreationIntent,
    hasEveryMention
  }
}
