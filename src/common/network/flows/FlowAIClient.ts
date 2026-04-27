import { FlowTemplate } from './FlowTemplateClient'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

/**
 * AI API response interface (raw from API)
 */
interface RawAIFlowResponse {
  id?: string | null
  name: string
  description: string
  type: string
  version: number
  steps: RawAIFlowStep[]
  initStep?: any
}

/**
 * Raw AI flow step interface (from API)
 */
interface RawAIFlowStep {
  type: string
  title: string
  message: string
  inputs?: RawAIStepInput[] | null
  links?: any[] | null
  assignmentMode: string
  assignment?: any // Will be ignored for now
}

/**
 * Raw AI step input interface (from API)
 */
interface RawAIStepInput {
  type: string
  name: string
  label: string
  required?: boolean | null
  options?: Array<{
    value: string
    label: string
  }> | null
}

/**
 * Client for AI-powered flow template generation
 */
export class FlowAIClient {
  /**
   * Generate a flow template using AI based on user prompt
   */
  async generateFlowTemplate(prompt: string, accessToken: string): Promise<FlowTemplate> {
    try {
      const baseUrl = resolveFlowbotBaseUrl()

      const formData = new URLSearchParams()
      formData.append('input_data', prompt)

      const response = await fetch(`${baseUrl}/flowbot/cflow/create_flow_template`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status} ${response.statusText}`)
      }

      const rawData: RawAIFlowResponse = await response.json()

      // Sanitize and transform the response to match FlowTemplate structure
      return this.sanitizeAIResponse(rawData)
    } catch (error) {
      console.error('Error calling AI flow generation API:', error)
      throw new Error(`Failed to generate flow template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Sanitize AI API response to match FlowTemplate structure
   */
  private sanitizeAIResponse(rawData: RawAIFlowResponse): FlowTemplate {
    return {
      id: rawData.id || this.generateTempId(),
      name: rawData.name || 'Untitled Flow',
      description: rawData.description || 'AI Generated Flow Template',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'AI Assistant', // Placeholder for AI-generated templates
      steps: rawData.steps?.map((step, index) => this.sanitizeStep(step, index)) || [],
      // Set default values for FlowTemplate properties not provided by AI
      isActive: true,
      tags: ['ai-generated'],
      category: 'general'
    }
  }

  /**
   * Sanitize individual step from AI response
   */
  private sanitizeStep(rawStep: RawAIFlowStep, index: number): any {
    const sanitizedStep: any = {
      id: `step_${index + 1}`,
      type: rawStep.type || 'TASK',
      title: rawStep.title || `Step ${index + 1}`,
      message: rawStep.message || '',
      assignmentMode: rawStep.assignmentMode || 'CLAIM'
    }

    // Add inputs if present
    if (rawStep.inputs && Array.isArray(rawStep.inputs) && rawStep.inputs.length > 0) {
      sanitizedStep.inputs = rawStep.inputs.map((input, inputIndex) => this.sanitizeInput(input, inputIndex))
    }

    // Add links if present
    if (rawStep.links && Array.isArray(rawStep.links) && rawStep.links.length > 0) {
      sanitizedStep.links = rawStep.links
    }

    // For now, ignore assignment details from AI response as requested
    // Only keep assignmentMode

    return sanitizedStep
  }

  /**
   * Sanitize step input from AI response
   */
  private sanitizeInput(rawInput: RawAIStepInput, index: number): any {
    const sanitizedInput: any = {
      id: `input_${index + 1}`,
      type: rawInput.type || 'TEXT',
      name: rawInput.name || `input_${index + 1}`,
      label: rawInput.label || `Input ${index + 1}`,
      required: Boolean(rawInput.required)
    }

    // Add options if present (for SELECT inputs)
    if (rawInput.options && Array.isArray(rawInput.options) && rawInput.options.length > 0) {
      sanitizedInput.options = rawInput.options.map(option => ({
        value: option.value || '',
        label: option.label || option.value || ''
      }))
    }

    return sanitizedInput
  }

  /**
   * Generate a temporary ID for AI-generated templates
   */
  private generateTempId(): string {
    return `ai_temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const flowAIClient = new FlowAIClient()
