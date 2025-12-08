/**
 * Agent Registry Service
 *
 * Manages agent storage, CRUD operations, and lifecycle.
 * This service would connect to a backend API for persistence.
 */

import { env } from '@/common/env/EnvUtils'
import type { PersonalAgent, AgentListResponse, AgentExecutionResult, AgentExecutionHistoryResponse } from '../types'

export class AgentRegistryService {
  private accessToken: string
  private baseUrl: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
    // Agent service would be part of custom-flow-engine or a separate microservice
    this.baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
  }

  /**
   * Create a new personal agent
   */
  async createAgent(agent: Omit<PersonalAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonalAgent> {
    // Transform frontend format to backend format
    // Backend expects: { config: { triggerType, scheduleConfig, eventConfig, actions } }
    // Frontend has: { triggerType, scheduleConfig, eventConfig, actions }
    const backendPayload = {
      userId: agent.userId,
      name: agent.name,
      description: agent.description,
      originalPrompt: agent.originalPrompt,
      parsedBy: agent.parsedBy,
      config: {
        triggerType: agent.triggerType,
        scheduleConfig: agent.scheduleConfig,
        eventConfig: agent.eventConfig,
        actions: agent.actions
      }
    }

    const response = await fetch(`${this.baseUrl}/api/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(backendPayload)
    })

    if (!response.ok) {
      throw new Error(`Failed to create agent: ${response.statusText}`)
    }

    const backendAgent = await response.json()

    // Transform backend format back to frontend format
    return {
      ...backendAgent,
      ...backendAgent.config
    }
  }

  /**
   * Get all agents for a user
   */
  async getUserAgents(
    userId: string,
    params?: {
      status?: 'active' | 'paused' | 'error'
      limit?: number
      offset?: number
    }
  ): Promise<AgentListResponse> {
    const searchParams = new URLSearchParams()
    searchParams.append('userId', userId)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())

    const response = await fetch(`${this.baseUrl}/api/agents?${searchParams}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get agents: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get a specific agent by ID
   */
  async getAgent(agentId: string): Promise<PersonalAgent> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get agent: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Update an existing agent
   */
  async updateAgent(agentId: string, updates: Partial<PersonalAgent>): Promise<PersonalAgent> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error(`Failed to update agent: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to delete agent: ${response.statusText}`)
    }
  }

  /**
   * Activate an agent
   */
  async activateAgent(agentId: string): Promise<PersonalAgent> {
    return this.updateAgent(agentId, { status: 'active' })
  }

  /**
   * Pause an agent
   */
  async pauseAgent(agentId: string): Promise<PersonalAgent> {
    return this.updateAgent(agentId, { status: 'paused' })
  }

  /**
   * Test an agent (run once manually)
   */
  async testAgent(agentId: string): Promise<AgentExecutionResult> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to test agent: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get execution history for an agent
   */
  async getAgentExecutionHistory(
    agentId: string,
    params?: {
      limit?: number
      offset?: number
      status?: 'success' | 'error' | 'partial'
    }
  ): Promise<AgentExecutionHistoryResponse> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    if (params?.status) searchParams.append('status', params.status)

    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/executions?${searchParams}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get execution history: ${response.statusText}`)
    }

    return response.json()
  }
}
