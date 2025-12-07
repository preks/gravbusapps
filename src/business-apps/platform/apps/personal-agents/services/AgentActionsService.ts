/**
 * Agent Actions Service
 * 
 * Executes agent actions like queries, notifications, updates.
 */

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { AgentAction, QueryAction, NotifyAction, AgentExecutionResult } from '../types'

export interface BlinkNotification {
  userId: string
  title: string
  message: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  data?: any
  actionUrl?: string
}

export class AgentActionsService {
  private accessToken: string
  private baseUrl: string

  constructor(accessToken: string, baseUrl: string) {
    this.accessToken = accessToken
    this.baseUrl = baseUrl
  }

  /**
   * Execute all actions for an agent
   */
  async executeActions(
    agentId: string,
    userId: string,
    actions: AgentAction[],
    context?: Record<string, any>
  ): Promise<AgentExecutionResult> {
    const executionId = `exec_${Date.now()}_${agentId}`
    const startTime = new Date().toISOString()
    let notificationsSent = 0
    const results: any[] = []

    try {
      for (const action of actions) {
        if (action.type === 'query') {
          const queryResult = await this.executeQueryAction(action as QueryAction, context)
          results.push(queryResult)
        } else if (action.type === 'notify') {
          await this.executeNotifyAction(action as NotifyAction, userId, context, results)
          notificationsSent++
        }
      }

      return {
        agentId,
        executionId,
        startTime,
        endTime: new Date().toISOString(),
        status: 'success',
        data: results,
        notificationsSent
      }
    } catch (error) {
      return {
        agentId,
        executionId,
        startTime,
        endTime: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        data: results,
        notificationsSent
      }
    }
  }

  /**
   * Execute a GraphQL query action
   */
  private async executeQueryAction(action: QueryAction, context?: Record<string, any>): Promise<any> {
    const graphqlClient = useGraphQLClient(this.accessToken)

    // Resolve variables with context
    const variables = { ...action.variables }
    if (context) {
      Object.keys(variables).forEach(key => {
        const value = variables[key]
        if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
          const contextKey = value.slice(2, -2)
          variables[key] = context[contextKey]
        }
      })
    }

    try {
      const result = await graphqlClient.request(action.query, variables)
      return {
        action: 'query',
        entityType: action.entityType,
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Query action failed:', error)
      throw error
    }
  }

  /**
   * Execute a notify action
   */
  private async executeNotifyAction(
    action: NotifyAction,
    userId: string,
    context?: Record<string, any>,
    queryResults?: any[]
  ): Promise<void> {
    // Prepare message with template variables
    let message = action.template

    // Replace context variables
    if (context) {
      Object.keys(context).forEach(key => {
        message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(context[key]))
      })
    }

    // Replace query result variables
    if (queryResults && queryResults.length > 0) {
      queryResults.forEach((result, index) => {
        const resultData = result.data
        if (resultData) {
          // Support {{results.0.fieldName}} syntax
          Object.keys(resultData).forEach(key => {
            const value = this.formatQueryResultForMessage(resultData[key])
            message = message.replace(new RegExp(`\\{\\{results\\.${index}\\.${key}\\}\\}`, 'g'), value)
          })
        }
      })
    }

    if (action.channel === 'blink') {
      await this.sendBlinkNotification({
        userId,
        title: 'Agent Notification',
        message,
        priority: action.priority || 'normal'
      })
    } else if (action.channel === 'email') {
      // TODO: Implement email notifications
      console.log('Email notification not yet implemented')
    } else if (action.channel === 'chat') {
      // TODO: Implement chat notifications
      console.log('Chat notification not yet implemented')
    }
  }

  /**
   * Send a Blink notification to user's EveryBox
   */
  private async sendBlinkNotification(notification: BlinkNotification): Promise<void> {
    // This would integrate with the Blink/notification service
    // For now, using a REST API call
    const response = await fetch(`${this.baseUrl}/api/notifications/blink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(notification)
    })

    if (!response.ok) {
      throw new Error(`Failed to send Blink notification: ${response.statusText}`)
    }
  }

  /**
   * Format query results for message display
   */
  private formatQueryResultForMessage(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return 'No results'
      if (data.length === 1) return String(data[0])
      return `${data.length} items`
    }
    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data, null, 2)
    }
    return String(data)
  }

  /**
   * Build GraphQL query for common entity types
   */
  static buildEntityQuery(entityType: string, filters?: Record<string, any>): { query: string; variables: Record<string, any> } {
    // Example queries for common entities
    switch (entityType) {
      case 'opportunity':
        return {
          query: `
            query GetOpportunities($limit: Int, $offset: Int, $search: String) {
              opportunities(limit: $limit, offset: $offset, search: $search) {
                id
                name
                stage
                amount
                closeDate
                account {
                  name
                }
              }
            }
          `,
          variables: { limit: 10, offset: 0, ...filters }
        }
      
      case 'account':
        return {
          query: `
            query GetAccounts($limit: Int, $accountId: String) {
              accounts(limit: $limit, where: { id: { _eq: $accountId } }) {
                id
                name
                industry
                status
                activities {
                  id
                  type
                  description
                  createdAt
                }
              }
            }
          `,
          variables: { limit: 10, ...filters }
        }
      
      case 'expense':
        return {
          query: `
            query GetExpenses($limit: Int, $status: String) {
              expenses(limit: $limit, where: { status: { _eq: $status } }) {
                id
                title
                amount
                currency
                status
                createdAt
              }
            }
          `,
          variables: { limit: 10, ...filters }
        }
      
      default:
        throw new Error(`Unsupported entity type: ${entityType}`)
    }
  }
}

