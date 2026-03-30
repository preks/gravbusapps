import {
  FlowTemplate,
  FlowStep,
  FlowStepType,
  TaskAssignment,
  Link,
  AssignmentMode
} from '@/common/network/flows/FlowTemplateClient'
import { resolveExecuteDynamicUrl } from '@/common/network/flows/flowEngineUrl'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { QuickTaskFormData } from '../types'

export interface QuickTaskFlowData {
  title: string
  message: string
  uploadResults?: any[] // Upload results from file service
  assignments: TaskAssignment
  dueDate?: string // ISO date string
  // Additional metadata
  priority?: 'low' | 'medium' | 'high'
  // Entity reference (to be added to links)
  entityType?: string
  entityId?: string
  entityName?: string
  entityDisplayUrl?: string
}

export interface ExecuteQuickTaskOptions {
  formData: QuickTaskFormData
  uploadResults?: any[]
  accessToken: string
  initiatorId: string
  /** Flow engine API root; defaults to {@link CUSTOM_FLOW_ENGINE_API_URL}. */
  apiBaseUrl?: string
}

/**
 * Helper function to create standard assignment targets structure
 * Reduces duplication of the assignment targets object
 * @param userIds - Array of user IDs to assign
 * @returns Standard assignment targets object
 */
export const createAssignmentTargets = (userIds: string[]) => ({
  users: userIds,
  capabilities: [],
  organizationalUnits: [],
  companies: [],
  siteLocations: [],
  costCenters: [],
  matrixTeams: []
})

/**
 * Service for generating dynamic Quick Task workflows
 */
export class QuickTaskFlowService {
  /**
   * Generate a dynamic Quick Task template from form data
   */
  static generateFlowTemplate(data: QuickTaskFlowData): FlowTemplate {
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
        downloadUrl = `/files/api/v1/tenant/downloads/quick-task/${fileInfo?.fileId}`
      }

      const link = {
        name: fileMetadata?.originalFileName || fileInfo?.fileName || 'Attachment',
        url: downloadUrl || `/files/api/v1/tenant/downloads/unknown`,
        type: `document:${fileInfo?.fileId || 'unknown'}` // Include fileId in type for reference
      }

      return link
    })

    // Add entity reference as a special link (if provided)
    const allLinks: Link[] = [...documentLinks]
    if (data.entityType && data.entityId && data.entityName && data.entityDisplayUrl) {
      const entityLink: Link = {
        name: data.entityName,
        url: data.entityDisplayUrl,
        type: `entity:${data.entityType}`,
        metadata: {
          entityType: data.entityType,
          entityId: data.entityId
        }
      }
      allLinks.push(entityLink)
    }

    // Calculate due date/time
    const dueConfig = this.calculateDueConfig(data)

    // Single step: Simple Task
    const step: FlowStep = {
      type: FlowStepType.TASK,
      title: data.title,
      message: data.message,
      form: [], // No form inputs - just a simple task to complete
      links: allLinks, // Add all links (documents + entity reference)
      assignment: data.assignments,
      ...dueConfig // Either dueInMinutes or dueDate
    }

    // Tag for blink app filtering
    const tags = {
      app: 'quick-task'
    }

    const template: FlowTemplate = {
      type: 'TEMPLATE',
      name: data.title, // Use user's title directly as workflow name
      description: `Quick Task: ${data.title}`,
      version: 1,
      steps: [step],
      tags
    }

    return template
  }

  /**
   * Calculate due configuration - either dueDate or dueInMinutes
   */
  private static calculateDueConfig(data: QuickTaskFlowData): { dueDate?: string; dueInMinutes?: number } {
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

  /**
   * Execute a Quick Task - creates and submits the workflow
   * This method encapsulates the common logic for creating and executing quick tasks
   * Supports multiple assignees by creating separate workflow instances grouped together
   */
  static async executeQuickTask(options: ExecuteQuickTaskOptions): Promise<any> {
    const { formData, uploadResults = [], accessToken, initiatorId, apiBaseUrl = CUSTOM_FLOW_ENGINE_API_URL } = options

    const userIds = formData.assignedUserIds || []
    if (!userIds || userIds.length === 0) {
      throw new Error('Invalid employee selection - at least one employee must be selected')
    }

    // Generate a unique group ID for this multi-assignee blink
    const blinkGroupId = `blink_group_${Date.now()}_${initiatorId}`

    // Create one workflow instance for each assignee, all tagged with the same group ID
    const workflowPromises = userIds.map(async userId => {
      // Generate dynamic workflow template for this assignee
      const flowTemplate = this.generateFlowTemplate({
        ...formData,
        uploadResults,
        priority: 'medium',
        assignments: {
          assignmentMode: AssignmentMode.ASSIGN,
          targets: null,
          allowReassignment: false
        }
      })

      // Add the group ID, assigned user ID, and entity references to the template tags
      // NOTE: Entity references are stored in BOTH links (for inbox) and tags (for outbox list view)
      const tagsWithGroup = {
        ...(flowTemplate.tags || {}),
        app: 'quick-task',
        blinkGroupId, // Group ID to link all workflows from the same blink
        assignedUserId: userId, // User ID to identify who this workflow is for
        // Entity reference fields (for outbox - list API doesn't return links)
        ...(formData.entityType &&
          formData.entityId && {
            entityType: formData.entityType,
            entityId: formData.entityId,
            entityName: formData.entityName,
            entityDisplayUrl: formData.entityDisplayUrl
          })
      }

      // Execute the workflow for this assignee
      const response = await fetch(resolveExecuteDynamicUrl(apiBaseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          templateDefinition: {
            ...flowTemplate,
            tags: tagsWithGroup
          },
          initiatorId,
          stepAssignments: {
            step_0: {
              assignment: {
                assignmentMode: AssignmentMode.ASSIGN,
                targets: createAssignmentTargets([userId]),
                allowReassignment: false
              }
            }
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to create Quick Task for user ${userId}: ${errorData.message || 'Unknown error'}`)
      }

      const result = await response.json()
      return {
        ...result,
        assignedUserId: userId // Track which user this workflow is for
      }
    })

    // Wait for all workflows to be created
    const results = await Promise.all(workflowPromises)

    // Return summary of created workflows
    return {
      success: true,
      count: results.length,
      workflows: results,
      blinkGroupId, // Return the group ID so we can track it
      assigneeCount: userIds.length
    }
  }
}
