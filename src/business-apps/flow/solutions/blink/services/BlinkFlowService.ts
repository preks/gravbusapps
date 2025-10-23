import { FlowTemplate, FlowStep, FlowStepType, TaskAssignment, Link } from '@/common/network/flows/FlowTemplateClient'

export interface BlinkFlowData {
  title: string
  message: string
  uploadResults?: any[] // Upload results from file service
  assignments: TaskAssignment
  dueDate?: string // ISO date string
  // Additional metadata
  priority?: 'low' | 'medium' | 'high'
}

/**
 * Service for generating dynamic Blink task workflows
 */
export class BlinkFlowService {
  /**
   * Generate a dynamic Blink task template from form data
   */
  static generateFlowTemplate(data: BlinkFlowData): FlowTemplate {
    // Create links for uploaded documents using actual file service results
    const documentLinks: Link[] = (data.uploadResults || []).map(result => {
      const fileInfo = result?.fileInfo || result
      const fileMetadata = fileInfo?.fileMetadata || {}

      // Construct proper download URL with /files prefix
      // Pattern: /files/api/v1/tenant/downloads/{appName}/{folderPath}/{fileId}
      let downloadUrl = fileInfo?.path || fileInfo?.downloadPath

      // If the URL doesn't start with /files, prepend it
      if (downloadUrl && !downloadUrl.startsWith('/files')) {
        downloadUrl = `/files${downloadUrl}`
      }

      // Fallback if no path is provided
      if (!downloadUrl && fileInfo?.fileId) {
        downloadUrl = `/files/api/v1/tenant/downloads/blink/${fileInfo?.fileId}`
      }

      return {
        name: fileMetadata?.originalFileName || fileInfo?.fileName || 'Attachment',
        url: downloadUrl || `/files/api/v1/tenant/downloads/unknown`,
        type: `document:${fileInfo?.fileId || 'unknown'}` // Include fileId in type for reference
      }
    })

    // Calculate due date/time
    const dueConfig = this.calculateDueConfig(data)

    // Single step: Simple Task
    const step: FlowStep = {
      type: FlowStepType.TASK,
      title: data.title,
      message: data.message,
      form: [], // No form inputs - just a simple task to complete
      links: documentLinks, // Add document links for reference
      assignment: data.assignments,
      ...dueConfig // Either dueInMinutes or dueDate
    }

    // Tag for blink app filtering
    const tags = {
      app: 'blink'
    }

    const template: FlowTemplate = {
      type: 'TEMPLATE',
      name: data.title, // Use user's title directly as workflow name
      description: `Blink task: ${data.title}`,
      version: 1,
      steps: [step],
      tags
    }

    return template
  }

  /**
   * Calculate due configuration - either dueDate or dueInMinutes
   */
  private static calculateDueConfig(data: BlinkFlowData): { dueDate?: string; dueInMinutes?: number } {
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
