/**
 * Template API Service
 * Handles communication with custom-flow-engine instances for template operations
 */

import axios from 'axios'

interface FlowTemplate {
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
      console.log(`Fetching templates from: ${baseUrl}/api/templates`)
      const response = await axios.get(`${baseUrl}/api/templates`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })

      console.log('Template API response:', response.data)

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

      console.log(`Successfully fetched ${templates.length} templates`)
      return templates
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', error.response?.status, error.response?.data)
        throw new Error(`Failed to fetch templates: ${error.message}`)
      }
      throw error
    }
  },

  /**
   * Get a specific template by ID
   */
  async getTemplateById(baseUrl: string, templateId: string, apiKey: string): Promise<FlowTemplate> {
    try {
      console.log(`Fetching template by ID from: ${baseUrl}/api/templates/${templateId}`)
      const response = await axios.get(`${baseUrl}/api/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      console.log('Template fetched successfully:', response.data)

      // Handle different response formats
      // Format 1: { status: 'success', data: { template } }
      if (response.data.status === 'success' && response.data.data) {
        console.log('Extracting template from response.data.data:', response.data.data)
        return response.data.data
      }
      // Format 2: { template: { ... } }
      if (response.data.template) {
        console.log('Extracting template from response.data.template')
        return response.data.template
      }
      // Format 3: Direct template object { id, name, steps, ... }
      console.log('Using response.data directly as template')
      return response.data
    } catch (error) {
      console.error(`Failed to fetch template ${templateId}:`, error)
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch template ${templateId}: ${error.response?.status} ${error.message}`)
      }
      throw error
    }
  },

  /**
   * Create or update a template
   */
  async createOrUpdateTemplate(baseUrl: string, template: FlowTemplate, apiKey: string): Promise<FlowTemplate> {
    try {
      console.log(`Syncing template to: ${baseUrl}/api/templates`, {
        templateName: template.name,
        version: template.version,
        isDraft: template.isDraft
      })

      const response = await axios.post(`${baseUrl}/api/templates`, template, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Template synced successfully:', response.data)

      // Handle different response formats
      if (response.data.template) {
        return response.data.template
      }
      return response.data
    } catch (error) {
      console.error('Failed to sync template:', error)
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const errorData = error.response?.data
        console.error('Sync error details:', { status, errorData })
        throw new Error(`Failed to sync template: ${status} - ${error.message}`)
      }
      throw error
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
