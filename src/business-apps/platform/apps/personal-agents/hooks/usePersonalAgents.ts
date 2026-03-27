/**
 * React hook for managing personal agents
 */

import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { AgentParserService } from '../services/AgentParserService'
import { AgentRegistryService } from '../services/AgentRegistryService'
import type { PersonalAgent, CreateAgentRequest, AgentParseResult } from '../types'

export const usePersonalAgents = (context: BusinessAppContextProps) => {
  const [agents, setAgents] = useState<PersonalAgent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const promptManagerClient = usePromptManagerClient(context.accessToken)

  const parserService = new AgentParserService(promptManagerClient)
  const registryService = new AgentRegistryService(context.accessToken)

  // Load user's agents
  const loadAgents = useCallback(async () => {
    if (!context.userInfo?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await registryService.getUserAgents(context.userInfo.id)
      setAgents(response.agents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }, [context.userInfo?.id, context.accessToken])

  // Parse natural language agent request
  const parseAgentRequest = useCallback(
    async (
      request: CreateAgentRequest,
      currentContext?: { currentModule?: string; availableEntities?: string[] }
    ): Promise<AgentParseResult> => {
      if (!context.userInfo?.id) {
        return {
          success: false,
          confidence: 0,
          agent: {},
          error: 'User ID not found'
        }
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await parserService.parseAgentRequest(request, context.userInfo.id, currentContext)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse agent request')
        return {
          success: false,
          confidence: 0,
          agent: {},
          error: err instanceof Error ? err.message : 'Failed to parse agent request'
        }
      } finally {
        setIsLoading(false)
      }
    },
    [context.userInfo?.id, context.accessToken]
  )

  // Create agent from parsed config
  const createAgent = useCallback(
    async (agent: Omit<PersonalAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonalAgent | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const newAgent = await registryService.createAgent(agent)
        setAgents(prev => [...prev, newAgent])
        return newAgent
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create agent')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken]
  )

  // Update agent
  const updateAgent = useCallback(
    async (agentId: string, updates: Partial<PersonalAgent>): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const updatedAgent = await registryService.updateAgent(agentId, updates)
        setAgents(prev => prev.map(a => (a.id === agentId ? updatedAgent : a)))
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update agent')
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken]
  )

  // Delete agent
  const deleteAgent = useCallback(
    async (agentId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        await registryService.deleteAgent(agentId)
        setAgents(prev => prev.filter(a => a.id !== agentId))
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete agent')
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken]
  )

  // Activate agent
  const activateAgent = useCallback(
    async (agentId: string): Promise<boolean> => {
      return updateAgent(agentId, { status: 'active' })
    },
    [updateAgent]
  )

  // Pause agent
  const pauseAgent = useCallback(
    async (agentId: string): Promise<boolean> => {
      return updateAgent(agentId, { status: 'paused' })
    },
    [updateAgent]
  )

  // Test agent
  const testAgent = useCallback(
    async (agentId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        await registryService.testAgent(agentId)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to test agent')
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken]
  )

  // Load agents on mount
  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  return {
    agents,
    isLoading,
    error,
    loadAgents,
    parseAgentRequest,
    createAgent,
    updateAgent,
    deleteAgent,
    activateAgent,
    pauseAgent,
    testAgent
  }
}
