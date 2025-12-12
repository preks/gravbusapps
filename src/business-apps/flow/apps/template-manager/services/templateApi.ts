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
      const allTemplates: FlowTemplate[] = []
      let offset = 0
      const limit = 100 // Fetch 100 per page for efficiency
      let hasMore = true

      // Fetch all pages
      while (hasMore) {
        const response = await axios.get(`${baseUrl}/api/templates`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          params: { offset, limit }
        })

        // Handle different response formats
        let templates: FlowTemplate[] = []

        if (Array.isArray(response.data)) {
          // Response is directly an array
          templates = response.data
          hasMore = false // No pagination info, assume single page
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Response has a data property (paginated format)
          templates = response.data.data
          hasMore = response.data.hasMore || false
        } else if (response.data.templates && Array.isArray(response.data.templates)) {
          // Response has a templates property
          templates = response.data.templates
          hasMore = false // No pagination info
        } else {
          console.error('Unexpected response format:', response.data)
          throw new Error(`Unexpected response format. Expected array of templates, got: ${typeof response.data}`)
        }

        allTemplates.push(...templates)

        // If no more pages or fetched less than limit, stop
        if (!hasMore || templates.length < limit) {
          break
        }

        offset += limit
      }

      return allTemplates
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
   * Delete a template from an instance
   */
  async deleteTemplate(
    baseUrl: string,
    templateId: string,
    apiKey: string,
    userId: string,
    reason: string
  ): Promise<void> {
    try {
      await axios.delete(`${baseUrl}/api/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        data: {
          userId,
          reason
        }
      })
    } catch (error) {
      console.error(`Failed to delete template ${templateId}:`, error)
      const enhancedError = createEnhancedError(error, {
        operation: 'Delete Template',
        templateId,
        url: `${baseUrl}/api/templates/${templateId}`
      })
      throw enhancedError
    }
  },

  /**
   * Get deleted (soft-deleted) templates from an instance
   */
  async getDeletedTemplates(
    baseUrl: string,
    apiKey: string,
    limit = 50,
    offset = 0
  ): Promise<{ data: any[]; count: number; totalCount?: number; hasMore?: boolean }> {
    try {
      const response = await axios.get(`${baseUrl}/api/templates/deleted`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: { limit, offset }
      })

      // Transform the response to flatten metadata.deletionInfo
      const transformedData = (response.data.data || []).map((template: any) => ({
        templateId: template.templateId || template.id,
        name: template.name,
        version: template.version || template.metadata?.databaseInfo?.version || 0,
        deletedAt: template.metadata?.deletionInfo?.deletedAt || template.deletedAt || new Date().toISOString(),
        deletedBy: template.metadata?.deletionInfo?.deletedBy || template.deletedBy || 'Unknown',
        deletionReason:
          template.metadata?.deletionInfo?.deletionReason || template.deletionReason || 'No reason provided'
      }))

      return {
        data: transformedData,
        count: response.data.count || transformedData.length,
        totalCount: response.data.totalCount,
        hasMore: response.data.hasMore
      }
    } catch (error) {
      console.error('Failed to fetch deleted templates:', error)
      const enhancedError = createEnhancedError(error, {
        operation: 'Fetch Deleted Templates',
        url: `${baseUrl}/api/templates/deleted`,
        statusCode: axios.isAxiosError(error) ? error.response?.status : undefined
      })
      throw enhancedError
    }
  },

  /**
   * Restore a soft-deleted template
   */
  async restoreTemplate(baseUrl: string, templateId: string, apiKey: string, userId: string): Promise<void> {
    try {
      await axios.post(
        `${baseUrl}/api/templates/${templateId}/restore`,
        { userId },
        {
          headers: { Authorization: `Bearer ${apiKey}` }
        }
      )
    } catch (error) {
      console.error(`Failed to restore template ${templateId}:`, error)
      const enhancedError = createEnhancedError(error, {
        operation: 'Restore Template',
        templateId,
        url: `${baseUrl}/api/templates/${templateId}/restore`,
        statusCode: axios.isAxiosError(error) ? error.response?.status : undefined
      })
      throw enhancedError
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
