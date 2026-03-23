/**
 * Agent Parser Service
 *
 * Uses AI Task Expert (Prompt Manager) to parse natural language
 * agent requests into structured configurations.
 */

import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { AgentParseResult, CreateAgentRequest, PersonalAgent } from '../types'
import { AGENT_PARSER_USER_PROMPT } from '../prompts/agent-parser-prompt'

// This will be created in Prompt Manager as a Task Expert
const AGENT_PARSER_PROMPT_ID = 'agent_parser_v1'

export class AgentParserService {
  constructor(private readonly promptManagerClient: PromptManagerClient) {}

  /**
   * Parse natural language agent request using AI
   */
  async parseAgentRequest(
    request: CreateAgentRequest,
    userId: string,
    context?: {
      currentModule?: string
      availableEntities?: string[]
    }
  ): Promise<AgentParseResult> {
    try {
      // Try AI parsing first
      try {
        // Prepare parameters for the prompt
        const userPrompt = AGENT_PARSER_USER_PROMPT.replace('{userRequest}', request.prompt)
          .replace('{userId}', userId)
          .replace('{currentModule}', context?.currentModule || 'unknown')
          .replace('{availableEntities}', JSON.stringify(context?.availableEntities || []))

        // Create FormData for prompt execution
        const formData = new FormData()
        formData.append('system_params', JSON.stringify({}))
        formData.append('user_params', JSON.stringify({ prompt: userPrompt }))

        // Execute the AI Task Expert prompt
        const response = await this.promptManagerClient.executePromptById(AGENT_PARSER_PROMPT_ID, formData)

        // Parse AI response
        const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
        const parsed = JSON.parse(content)

        return {
          success: true,
          confidence: parsed.confidence || 0,
          agent: {
            ...parsed.agent,
            userId,
            originalPrompt: request.prompt,
            parsedBy: 'ai',
            status: 'paused',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            executionCount: 0,
            errorCount: 0
          } as Partial<PersonalAgent>,
          suggestions: parsed.suggestions
        }
      } catch (promptError) {
        console.warn('AI parsing failed, using fallback parser:', promptError)
        // Use fallback parser if AI parsing fails
        return this.fallbackParser(request.prompt, userId)
      }
    } catch (error) {
      console.error('Agent parsing error:', error)
      return {
        success: false,
        confidence: 0,
        agent: {},
        error: error instanceof Error ? error.message : 'Failed to parse agent request'
      }
    }
  }

  /**
   * Fallback parser for when AI parsing is unavailable
   */
  private fallbackParser(prompt: string, userId: string): AgentParseResult {
    const lowerPrompt = prompt.toLowerCase()

    // Detect trigger type
    const isSchedule =
      /every|each|daily|weekly|monthly|monday|tuesday|wednesday|thursday|friday|at \d+:\d+|at \d+am|at \d+pm/i.test(
        lowerPrompt
      )
    const isEvent = /when|inform me|notify me|alert me|tell me/i.test(lowerPrompt)

    // Extract entity type from prompt
    let entityType = 'activity'
    if (lowerPrompt.includes('account')) entityType = 'account'
    else if (lowerPrompt.includes('opportunity') || lowerPrompt.includes('opportunities')) entityType = 'opportunity'
    else if (lowerPrompt.includes('lead')) entityType = 'lead'
    else if (lowerPrompt.includes('contact')) entityType = 'contact'
    else if (lowerPrompt.includes('expense')) entityType = 'expense'
    else if (lowerPrompt.includes('absence')) entityType = 'absence'

    // Generate agent name
    const name = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Monitor`

    const agent: Partial<PersonalAgent> = {
      name,
      description: `Monitors ${entityType} based on: "${prompt}"`,
      userId,
      originalPrompt: prompt,
      parsedBy: 'ai',
      status: 'paused',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionCount: 0,
      errorCount: 0
    }

    if (isSchedule) {
      // Schedule-based agent
      agent.triggerType = 'schedule'
      agent.scheduleConfig = {
        type: 'weekly',
        dayOfWeek: 1, // Monday
        time: '10:00',
        cronExpression: '0 10 * * 1'
      }
    } else if (isEvent) {
      // Event-based agent
      agent.triggerType = 'event'
      agent.eventConfig = {
        entityType,
        eventType: 'updated',
        filters: {}
      }
    } else {
      // Manual trigger
      agent.triggerType = 'manual'
    }

    // Add default actions
    agent.actions = [
      {
        type: 'query',
        entityType,
        query: `query { ${entityType}s { id name status } }`,
        variables: {}
      },
      {
        type: 'notify',
        channel: 'blink',
        template: `New ${entityType} activity detected`,
        priority: 'normal'
      }
    ]

    return {
      success: true,
      confidence: 0.7, // Lower confidence for fallback
      agent,
      suggestions: [
        'This agent was created using basic pattern matching.',
        'For better results, ensure the AI Task Expert prompt is registered in Prompt Manager.'
      ]
    }
  }

  /**
   * Validate parsed agent configuration
   */
  static validateAgentConfig(agent: Partial<PersonalAgent>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!agent.name) errors.push('Agent name is required')
    if (!agent.description) errors.push('Agent description is required')
    if (!agent.triggerType) errors.push('Trigger type is required')

    if (agent.triggerType === 'schedule' && !agent.scheduleConfig) {
      errors.push('Schedule configuration is required for scheduled agents')
    }

    if (agent.triggerType === 'event' && !agent.eventConfig) {
      errors.push('Event configuration is required for event-based agents')
    }

    if (!agent.actions || agent.actions.length === 0) {
      errors.push('At least one action is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate human-readable summary of agent configuration
   */
  static generateAgentSummary(agent: Partial<PersonalAgent>): string {
    const parts: string[] = []

    // Trigger description
    if (agent.triggerType === 'schedule' && agent.scheduleConfig) {
      const schedule = agent.scheduleConfig
      if (schedule.type === 'daily') {
        parts.push(`Runs daily at ${schedule.time}`)
      } else if (schedule.type === 'weekly') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        parts.push(`Runs every ${days[schedule.dayOfWeek || 0]} at ${schedule.time}`)
      } else if (schedule.type === 'monthly') {
        parts.push(`Runs on day ${schedule.dayOfMonth} of each month at ${schedule.time}`)
      }
    } else if (agent.triggerType === 'event' && agent.eventConfig) {
      const event = agent.eventConfig
      parts.push(`Triggers when ${event.entityType} is ${event.eventType}`)
      if (event.filters && Object.keys(event.filters).length > 0) {
        parts.push(`Filters: ${JSON.stringify(event.filters)}`)
      }
    }

    // Actions description
    if (agent.actions) {
      const actionDescriptions = agent.actions.map(action => {
        if (action.type === 'query') {
          return `Queries ${action.entityType} data`
        } else if (action.type === 'notify') {
          return `Sends notification via ${action.channel}`
        }
        return 'Performs custom action'
      })
      parts.push(`Actions: ${actionDescriptions.join(', ')}`)
    }

    return parts.join('. ')
  }
}
