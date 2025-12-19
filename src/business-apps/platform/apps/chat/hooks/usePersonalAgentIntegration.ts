/**
 * Integration hook for Personal Agents in Chat
 *
 * Handles agent creation from @Every mentions in chat.
 */

import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePersonalAgents } from '../../personal-agents/hooks/usePersonalAgents'
import { useAgentCreationDetection } from './useAgentCreationDetection'
import type { AgentParseResult, PersonalAgent } from '../../personal-agents/types'

export const usePersonalAgentIntegration = (context: BusinessAppContextProps) => {
  const { parseAgentRequest, createAgent, isLoading } = usePersonalAgents(context)
  const { detectAgentCreationIntent } = useAgentCreationDetection()

  const [showAgentDialog, setShowAgentDialog] = useState(false)
  const [currentParseResult, setCurrentParseResult] = useState<AgentParseResult | null>(null)

  /**
   * Process a message to check if it's an agent creation request
   * Returns true if it should be handled as agent creation, false otherwise
   */
  const processMessageForAgentCreation = useCallback(
    async (message: string, currentModule?: string): Promise<boolean> => {
      // Detect if this is an agent creation request
      const intent = detectAgentCreationIntent(message)

      if (!intent.isAgentRequest) {
        return false // Not an agent request, process normally
      }

      // Parse the agent request using AI
      const parseResult = await parseAgentRequest({ prompt: intent.prompt }, { currentModule, availableEntities: [] })

      // Automatically create the agent without showing dialog
      if (parseResult.success && parseResult.agent && context.userInfo?.id) {
        try {
          const agent = await createAgent({
            ...parseResult.agent,
            userId: context.userInfo.id,
            status: 'active', // Start active immediately
            executionCount: 0,
            errorCount: 0
          } as Omit<PersonalAgent, 'id' | 'createdAt' | 'updatedAt'>)

          // Return the created agent so the chat can show a confirmation message
          setCurrentParseResult({ ...parseResult, createdAgent: agent })
        } catch (error) {
          console.error('Failed to create agent:', error)
          setCurrentParseResult({ ...parseResult, error: 'Failed to create agent' })
        }
      }

      return true // This was handled as an agent request
    },
    [detectAgentCreationIntent, parseAgentRequest, createAgent, context.userInfo?.id]
  )

  /**
   * Confirm and create the agent
   */
  const confirmAgentCreation = useCallback(async (): Promise<PersonalAgent | null> => {
    if (!currentParseResult?.agent || !context.userInfo?.id) {
      return null
    }

    const agent = await createAgent({
      ...currentParseResult.agent,
      userId: context.userInfo.id,
      status: 'paused', // Start paused until user activates
      executionCount: 0,
      errorCount: 0
    } as Omit<PersonalAgent, 'id' | 'createdAt' | 'updatedAt'>)

    if (agent) {
      setShowAgentDialog(false)
      setCurrentParseResult(null)
    }

    return agent
  }, [currentParseResult, createAgent, context.userInfo?.id])

  /**
   * Cancel agent creation
   */
  const cancelAgentCreation = useCallback(() => {
    setShowAgentDialog(false)
    setCurrentParseResult(null)
  }, [])

  return {
    // State
    showAgentDialog,
    currentParseResult,
    isLoading,

    // Actions
    processMessageForAgentCreation,
    confirmAgentCreation,
    cancelAgentCreation
  }
}
