import {
  FlowTemplate,
  FlowStep,
  FlowStepType,
  InputType,
  TaskAssignment,
  Link
} from '@/common/network/flows/FlowTemplateClient'

export interface SurveyQuestion {
  question: string
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'rating' | 'number'
  required: boolean
  options?: string[] // For radio, checkbox, select
  minRating?: number // For rating questions
  maxRating?: number // For rating questions
  placeholder?: string // For text/textarea inputs
}

export interface SurveyFlowData {
  title: string
  message: string
  surveyType: 'feedback' | 'research' | 'assessment' | 'poll' | 'custom'
  questions: SurveyQuestion[]
  documents: File[]
  assignments: TaskAssignment
  dueDate?: string // ISO date string
  anonymous?: boolean
  // Additional metadata
  priority?: 'low' | 'medium' | 'high'
  department?: string
}

/**
 * Service for generating dynamic survey workflows
 */
export class SurveyFlowService {
  /**
   * Generate a dynamic survey flow template from form data
   */
  static generateFlowTemplate(data: SurveyFlowData): FlowTemplate {
    // Create links for uploaded documents/attachments
    const documentLinks: Link[] = data.documents.map(file => ({
      name: file.name,
      url: `/api/documents/${file.name}`, // Mock URL - would be actual file URL in production
      type: 'document'
    }))

    // Calculate due date/time
    const dueConfig = this.calculateDueConfig(data)

    // Create form fields for survey questions
    const surveyFormFields = data.questions.map((question, index) => {
      // Map survey question type to flow template input type
      let inputType: InputType
      switch (question.type) {
        case 'text':
          inputType = InputType.TEXT
          break
        case 'textarea':
          inputType = InputType.TEXTAREA
          break
        case 'radio':
          inputType = InputType.RADIO
          break
        case 'checkbox':
          inputType = InputType.CHECKBOX
          break
        case 'select':
          inputType = InputType.SELECT
          break
        case 'number':
          inputType = InputType.NUMBER
          break
        case 'rating':
          inputType = InputType.SELECT // Use select for rating
          break
        default:
          inputType = InputType.TEXT
          break
      }

      // Build the form field
      const formField: any = {
        type: inputType,
        name: `survey_question_${index + 1}`,
        label: question.question,
        required: question.required
      }

      // Add options for select/radio/checkbox types
      if (question.options && question.options.length > 0) {
        formField.options = question.options
      }

      // Add rating scale for rating questions
      if (question.type === 'rating') {
        const min = question.minRating || 1
        const max = question.maxRating || 5
        formField.options = Array.from({ length: max - min + 1 }, (_, i) => `${min + i}`)
      }

      // Add placeholder for text inputs
      if (question.placeholder && (question.type === 'text' || question.type === 'textarea')) {
        formField.placeholder = question.placeholder
      }

      return formField
    })

    // Add optional comment field for all survey types
    surveyFormFields.push({
      type: InputType.TEXTAREA,
      name: 'additional_comments',
      label: 'Additional Comments (Optional)',
      required: false
    })

    // Single step: Survey Response Collection
    const step: FlowStep = {
      type: FlowStepType.FORM,
      title: data.title,
      message: data.message,
      form: surveyFormFields,
      links: documentLinks, // Add document links for reference
      assignment: data.assignments,
      ...dueConfig // Either dueInMinutes or dueDate
    }

    // Survey-specific tags
    const tags = {
      solution: 'survey',
      surveyType: data.surveyType,
      anonymous: data.anonymous || false,
      questionCount: data.questions.length
    }

    const template: FlowTemplate = {
      type: 'TEMPLATE',
      name: data.title, // Use user's title directly as workflow name
      description: `Survey: ${data.title} (${data.surveyType})`,
      version: 1,
      steps: [step],
      tags
    }

    return template
  }

  /**
   * Calculate due configuration - either dueDate or dueInMinutes
   */
  private static calculateDueConfig(data: SurveyFlowData): { dueDate?: string; dueInMinutes?: number } {
    if (data.dueDate && data.dueDate.trim() !== '') {
      // Convert YYYY-MM-DD to ISO date string with end of day time
      const formattedDueDate = new Date(data.dueDate + 'T23:59:59.999Z').toISOString()
      return { dueDate: formattedDueDate }
    } else {
      // Fall back to survey type-based minutes
      const dueMinutes = this.calculateDueMinutes(data.surveyType, data.priority || 'medium')
      return { dueInMinutes: dueMinutes }
    }
  }

  /**
   * Calculate due time in minutes based on survey type and priority
   */
  private static calculateDueMinutes(surveyType: string, priority: string): number {
    // Base duration by survey type
    let baseDuration: number
    switch (surveyType) {
      case 'poll':
        baseDuration = 24 * 60 // 1 day for quick polls
        break
      case 'feedback':
        baseDuration = 72 * 60 // 3 days for feedback
        break
      case 'assessment':
        baseDuration = 168 * 60 // 1 week for assessments
        break
      case 'research':
        baseDuration = 336 * 60 // 2 weeks for research
        break
      case 'custom':
      default:
        baseDuration = 168 * 60 // 1 week default
        break
    }

    // Adjust by priority
    switch (priority) {
      case 'high':
        return Math.round(baseDuration * 0.5) // 50% of base duration
      case 'medium':
        return baseDuration
      case 'low':
        return Math.round(baseDuration * 1.5) // 150% of base duration
      default:
        return baseDuration
    }
  }

  /**
   * Create workflow execution payload for conductor
   */
  static createWorkflowExecutionPayload(template: FlowTemplate, initiatorId: string) {
    return {
      name: template.name,
      version: template.version,
      input: {
        initiatorId,
        templateData: template,
        runtimeParameters: {
          createdAt: new Date().toISOString(),
          tags: template.tags
        },
        // Assignment resolution will happen at runtime
        stepAssignments: template.steps.reduce((acc, step, index) => {
          if (step.assignment.targets === null) {
            acc[`step_${index}`] = {
              assignment: step.assignment,
              resolvedConfig: null // Will be resolved by assignment handler
            }
          }
          return acc
        }, {} as any)
      }
    }
  }

  /**
   * Generate survey response analysis template for data collection
   */
  static generateResponseAnalysisData(responses: any[]): {
    totalResponses: number
    responseRate: number
    questionAnalysis: Array<{
      question: string
      responses: any[]
      mostCommonAnswer?: string
      averageRating?: number
    }>
  } {
    const totalResponses = responses.length

    // Extract question patterns from responses
    const questionAnalysis: Array<{
      question: string
      responses: any[]
      mostCommonAnswer?: string
      averageRating?: number
    }> = []

    // Analyze each question across all responses
    if (responses.length > 0) {
      const firstResponse = responses[0]
      Object.keys(firstResponse).forEach(questionKey => {
        if (questionKey.startsWith('survey_question_')) {
          const questionResponses = responses.map(r => r[questionKey]).filter(r => r !== undefined)

          // Find most common answer
          const answerCounts: Record<string, number> = {}
          questionResponses.forEach(answer => {
            const answerStr = String(answer)
            answerCounts[answerStr] = (answerCounts[answerStr] || 0) + 1
          })

          const mostCommonAnswer = Object.entries(answerCounts).sort(([, a], [, b]) => b - a)[0]?.[0]

          // Calculate average rating if numeric
          const numericResponses = questionResponses.map(r => parseFloat(String(r))).filter(n => !isNaN(n))

          const averageRating =
            numericResponses.length > 0
              ? numericResponses.reduce((sum, n) => sum + n, 0) / numericResponses.length
              : undefined

          questionAnalysis.push({
            question: questionKey,
            responses: questionResponses,
            mostCommonAnswer,
            averageRating
          })
        }
      })
    }

    return {
      totalResponses,
      responseRate: 0, // Would need total invited participants to calculate
      questionAnalysis
    }
  }
}
