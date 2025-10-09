import {
  FlowTemplate,
  FlowStep,
  FlowStepType,
  InputType,
  TaskAssignment,
  Link
} from '@/common/network/flows/FlowTemplateClient'

export interface ComplianceFlowData {
  title: string
  message: string
  documents: File[]
  assignments: TaskAssignment
  dueDate?: string // ISO date string
  // Additional metadata
  complianceType?: string
  priority?: 'low' | 'medium' | 'high'
  department?: string
  riskLevel?: 'low' | 'medium' | 'high'
}

/**
 * Service for generating dynamic compliance workflows
 */
export class ComplianceFlowService {
  /**
   * Generate a dynamic compliance flow template from form data
   */
  static generateFlowTemplate(data: ComplianceFlowData): FlowTemplate {
    // Create links for uploaded documents
    const documentLinks: Link[] = data.documents.map(file => ({
      name: file.name,
      url: `/api/documents/${file.name}`, // Mock URL - would be actual file URL in production
      type: 'document'
    }))

    // Calculate due date/time
    const dueConfig = this.calculateDueConfig(data)

    // Single step: Document Review and Acknowledgment
    const step: FlowStep = {
      type: FlowStepType.ACKNOWLEDGE,
      title: data.title,
      message: data.message,
      form: [
        {
          type: InputType.SIGNATURE,
          name: 'digital_signature',
          label: 'Digital Signature',
          required: true
        }
      ],
      links: documentLinks, // Add document links for review
      assignment: data.assignments,
      ...dueConfig // Either dueInMinutes or dueDate
    }

    // Simple static tag for compliance solution
    const tags = {
      solution: 'compliance'
    }

    const template: FlowTemplate = {
      type: 'TEMPLATE',
      name: data.title, // Use user's title directly as workflow name
      description: `Compliance workflow: ${data.title}`,
      version: 1,
      steps: [step],
      tags
    }

    return template
  }

  /**
   * Calculate due configuration - either dueDate or dueInMinutes
   */
  private static calculateDueConfig(data: ComplianceFlowData): { dueDate?: string; dueInMinutes?: number } {
    if (data.dueDate && data.dueDate.trim() !== '') {
      // Convert YYYY-MM-DD to ISO date string with end of day time
      const formattedDueDate = new Date(data.dueDate + 'T23:59:59.999Z').toISOString()
      return { dueDate: formattedDueDate }
    } else {
      // Fall back to priority-based minutes
      const dueMinutes = this.calculateDueMinutes(data.priority || 'medium')
      return { dueInMinutes: dueMinutes }
    }
  }

  /**
   * Calculate due time in minutes based on priority
   */
  private static calculateDueMinutes(priority: string): number {
    switch (priority) {
      case 'high':
        return 24 * 60 // 1 day
      case 'medium':
        return 72 * 60 // 3 days
      case 'low':
        return 168 * 60 // 1 week
      default:
        return 72 * 60
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
}
