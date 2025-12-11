/**
 * Template API Service
 * Handles communication with custom-flow-engine instances for template operations
 */

import axios from 'axios'
import { createEnhancedError } from '../utils/errorHandler'

export interface FlowTemplate {
  id?: string
  name: string
  description?: string
  type: 'TEMPLATE' | 'SELF_SERVICE'
  steps: any[]
  version: number
  tags?: Record<string, any>
  summaryFields?: any[]
  isDraft?: boolean
}

export const templateApi = {
  /**
   * Get all templates from an instance
   */
  async getTemplates(baseUrl: string, apiKey: string): Promise<FlowTemplate[]> {
    try {
      const response = await axios.get(`${baseUrl}/api/templates`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })

      // Handle different response formats
      let templates: FlowTemplate[]

      if (Array.isArray(response.data)) {
        // Response is directly an array
        templates = response.data
      } else if (response.data.templates && Array.isArray(response.data.templates)) {
        // Response has a templates property
        templates = response.data.templates
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Response has a data property
        templates = response.data.data
      } else {
        console.error('Unexpected response format:', response.data)
        throw new Error(`Unexpected response format. Expected array of templates, got: ${typeof response.data}`)
      }

      return templates
    } catch (error) {
      console.error('Error fetching templates:', error)
      const enhancedError = createEnhancedError(error, {
        operation: 'Fetch Templates',
        url: `${baseUrl}/api/templates`
      })
      throw enhancedError
    }
  },

  /**
   * Get a specific template by ID
   */
  async getTemplateById(baseUrl: string, templateId: string, apiKey: string): Promise<FlowTemplate> {
    try {
      const response = await axios.get(`${baseUrl}/api/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })

      // Handle different response formats
      // Format 1: { status: 'success', data: { template } }
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data
      }
      // Format 2: { template: { ... } }
      if (response.data.template) {
        return response.data.template
      }
      // Format 3: Direct template object { id, name, steps, ... }
      return response.data
    } catch (error) {
      console.error(`Failed to fetch template ${templateId}:`, error)
      const enhancedError = createEnhancedError(error, {
        operation: 'Fetch Template by ID',
        templateId,
        url: `${baseUrl}/api/templates/${templateId}`
      })
      throw enhancedError
    }
  },

  /**
   * Create or update a template
   */
  async createOrUpdateTemplate(baseUrl: string, template: FlowTemplate, apiKey: string): Promise<FlowTemplate> {
    try {
      const response = await axios.post(`${baseUrl}/api/templates`, template, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      // Handle different response formats
      if (response.data.template) {
        return response.data.template
      }
      return response.data
    } catch (error) {
      console.error('Failed to sync template:', error)
      const enhancedError = createEnhancedError(error, {
        operation: 'Sync Template',
        templateName: template.name,
        templateId: template.id,
        url: `${baseUrl}/api/templates`,
        statusCode: axios.isAxiosError(error) ? error.response?.status : undefined
      })
      throw enhancedError
    }
  },

  /**
   * Check if template has active workflows (optional endpoint)
   */
  async hasActiveWorkflows(baseUrl: string, templateId: string, apiKey: string): Promise<boolean> {
    try {
      const response = await axios.get(`${baseUrl}/api/workflows/count?templateId=${templateId}&status=RUNNING`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      return (response.data.count || 0) > 0
    } catch {
      // Assume no active workflows if endpoint doesn't exist
      return false
    }
  },

  /**
   * Test instance connection
   */
  async testConnection(baseUrl: string, apiKey: string): Promise<boolean> {
    try {
      const response = await axios.get(`${baseUrl}/api`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 5000
      })
      return response.status === 200
    } catch {
      return false
    }
  }
}
