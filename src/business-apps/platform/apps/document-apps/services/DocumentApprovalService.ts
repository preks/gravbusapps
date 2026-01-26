/**
 * DocumentApprovalService
 *
 * Handles document approval workflows using the NEWWORK Flow Engine.
 * Integrates with the dynamic template execution API for approval processes.
 */

import { env } from '@/common/env/EnvUtils'
import type { ApprovalWorkflowConfig, DocumentApprovalRequest } from '../types'

/**
 * Assignment mode for workflow steps
 */
enum AssignmentMode {
  ASSIGN = 'ASSIGN',
  CLAIM = 'CLAIM'
}

/**
 * Flow step types
 */
enum FlowStepType {
  TASK = 'TASK',
  APPROVAL = 'APPROVAL'
}

/**
 * Input types for workflow forms
 */
enum InputType {
  CHECKBOX = 'CHECKBOX',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT'
}

/**
 * Create assignment targets structure
 */
function createAssignmentTargets(userIds: string[]) {
  return {
    users: userIds,
    organizationalUnits: [],
    matrixTeams: [],
    companies: [],
    siteLocations: [],
    costCenters: [],
    capabilities: []
  }
}

/**
 * Generate a unique workflow group ID
 */
function generateGroupId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return `doc_approval_${timestamp}_${randomPart}`
}

export class DocumentApprovalService {
  private accessToken: string
  private currentUserId: string
  private baseUrl: string

  constructor(accessToken: string, currentUserId: string) {
    this.accessToken = accessToken
    this.currentUserId = currentUserId
    this.baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine'
  }

  /**
   * Generate the approval workflow template
   */
  private generateApprovalTemplate(config: ApprovalWorkflowConfig) {
    const groupId = generateGroupId()

    return {
      type: 'TEMPLATE',
      name: `Document Approval: ${config.documentTitle}`,
      description: `Approval request for document: ${config.documentTitle}`,
      version: 1,
      tags: {
        app: 'document-apps',
        documentId: config.documentId,
        documentTitle: config.documentTitle,
        documentUrl: config.documentUrl,
        blinkGroupId: groupId,
        workflowType: 'document_approval'
      },
      steps: [
        {
          id: 'step-0',
          type: FlowStepType.APPROVAL,
          title: `Review Document: ${config.documentTitle}`,
          message:
            config.message ||
            `Please review and approve the document "${config.documentTitle}". Click the link below to view the document.`,
          inputs: [
            {
              type: InputType.SELECT,
              name: 'approval_decision',
              label: 'Decision',
              required: true,
              options: [
                { value: 'approved', label: 'Approve' },
                { value: 'rejected', label: 'Reject' },
                { value: 'revision_needed', label: 'Request Revision' }
              ]
            },
            {
              type: InputType.TEXTAREA,
              name: 'approval_comments',
              label: 'Comments',
              required: false
            }
          ],
          links: [
            {
              label: 'View Document',
              url: config.documentUrl,
              type: 'document'
            }
          ],
          assignment: {
            assignmentMode: AssignmentMode.ASSIGN,
            targets: null, // Will be set via stepAssignments
            allowReassignment: false
          },
          dueInMinutes: config.dueDate ? this.calculateDueMinutes(config.dueDate) : 4320 // Default 3 days
        }
      ]
    }
  }

  /**
   * Calculate minutes until due date
   */
  private calculateDueMinutes(dueDate: string): number {
    const due = new Date(dueDate)
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    return Math.max(60, Math.floor(diffMs / 60000)) // Minimum 60 minutes
  }

  /**
   * Send a document for approval
   */
  async sendForApproval(config: ApprovalWorkflowConfig): Promise<DocumentApprovalRequest | null> {
    try {
      const template = this.generateApprovalTemplate(config)
      const workflowIds: string[] = []
      const now = new Date().toISOString()

      // Create individual workflows for each approver
      for (const approverId of config.approvers) {
        const response = await fetch(`${this.baseUrl}/api/templates/execute-dynamic`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`
          },
          body: JSON.stringify({
            templateDefinition: {
              ...template,
              tags: {
                ...template.tags,
                assignedUserId: approverId
              }
            },
            initiatorId: this.currentUserId,
            stepAssignments: {
              step_0: {
                assignment: {
                  assignmentMode: AssignmentMode.ASSIGN,
                  targets: createAssignmentTargets([approverId]),
                  allowReassignment: false
                }
              }
            },
            initialParameters: {
              documentId: config.documentId,
              documentTitle: config.documentTitle,
              documentUrl: config.documentUrl,
              requestedBy: this.currentUserId,
              requestedAt: now
            }
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[DocumentApproval] Failed to create workflow:', errorText)
          continue
        }

        const result = await response.json()
        if (result.data?.workflowId) {
          workflowIds.push(result.data.workflowId)
        }
      }

      if (workflowIds.length === 0) {
        console.error('[DocumentApproval] No workflows created')
        return null
      }

      // Create approval request record
      const approvalRequest: DocumentApprovalRequest = {
        id: generateGroupId(),
        documentId: config.documentId,
        requestedBy: this.currentUserId,
        requestedAt: now,
        approvers: config.approvers.map(userId => ({
          userId,
          status: 'pending'
        })),
        status: 'pending',
        dueDate: config.dueDate,
        message: config.message,
        workflowId: workflowIds[0] // Store first workflow ID for reference
      }

      console.log('[DocumentApproval] Created approval workflows:', workflowIds)
      return approvalRequest
    } catch (error) {
      console.error('[DocumentApproval] Error sending for approval:', error)
      return null
    }
  }

  /**
   * Cancel an approval request
   * Uses /api/flows/{flowId}/cancel endpoint
   */
  async cancelApproval(approvalRequestId: string, workflowId?: string): Promise<boolean> {
    if (!workflowId) {
      console.warn('[DocumentApproval] No workflow ID provided for cancellation')
      return false
    }

    try {
      // Use /api/flows endpoint (not /api/workflows)
      const response = await fetch(`${this.baseUrl}/api/flows/${workflowId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          reason: 'Cancelled by document owner',
          cancelledBy: this.currentUserId
        })
      })

      if (!response.ok) {
        console.error('[DocumentApproval] Failed to cancel workflow')
        return false
      }

      return true
    } catch (error) {
      console.error('[DocumentApproval] Error cancelling approval:', error)
      return false
    }
  }

  /**
   * Check approval status (queries workflow status)
   * Uses /api/flows/{flowId} endpoint
   */
  async getApprovalStatus(workflowId: string): Promise<'pending' | 'approved' | 'rejected' | 'cancelled' | null> {
    try {
      // Use /api/flows endpoint (not /api/workflows)
      const response = await fetch(`${this.baseUrl}/api/flows/${workflowId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn('[DocumentApproval] Failed to get flow status:', response.status)
        return null
      }

      const flowData = await response.json()
      // Flow data is returned directly (not under .data)
      const status = flowData?.status?.toLowerCase()

      console.log('[DocumentApproval] Flow status:', { workflowId, status, flowData })

      if (status === 'completed' || status === 'done') {
        // Check the steps for approval decision
        const steps = flowData?.steps || []
        const lastStep = steps[steps.length - 1]
        const formData = lastStep?.formData || {}
        const decision = formData?.approval_decision || formData?.decision

        if (decision === 'rejected') return 'rejected'
        return 'approved' // Default to approved if completed
      }

      if (status === 'cancelled' || status === 'terminated') return 'cancelled'
      return 'pending'
    } catch (error) {
      console.error('[DocumentApproval] Error getting approval status:', error)
      return null
    }
  }

  /**
   * Get detailed workflow status including completion info
   * Uses /api/flows/{flowId} endpoint
   */
  async getWorkflowDetails(workflowId: string): Promise<{
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    completedAt?: string
    completedBy?: string
    comments?: string
  } | null> {
    try {
      // Use /api/flows endpoint (not /api/workflows)
      const response = await fetch(`${this.baseUrl}/api/flows/${workflowId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn('[DocumentApproval] Failed to get flow details:', response.status)
        return null
      }

      const flowData = await response.json()
      // Flow data is returned directly (not under .data)
      const flowStatus = flowData?.status?.toLowerCase()

      console.log('[DocumentApproval] Flow details:', { workflowId, flowStatus, flowData })

      if (flowStatus === 'completed' || flowStatus === 'done') {
        // Get step data for form values and completion info
        const steps = flowData?.steps || []
        const lastStep = steps[steps.length - 1]
        const formData = lastStep?.formData || {}

        const decision = formData?.approval_decision || formData?.decision
        const comments = formData?.approval_comments || formData?.comments || formData?.reason

        return {
          status: decision === 'rejected' ? 'rejected' : 'approved',
          completedAt: flowData?.endTime || flowData?.updatedAt || new Date().toISOString(),
          completedBy: lastStep?.completedBy || lastStep?.assignee,
          comments
        }
      }

      if (flowStatus === 'cancelled' || flowStatus === 'terminated') {
        return {
          status: 'cancelled',
          completedAt: flowData?.endTime || flowData?.updatedAt
        }
      }

      return { status: 'pending' }
    } catch (error) {
      console.error('[DocumentApproval] Error getting workflow details:', error)
      return null
    }
  }

  /**
   * Sync approval status for a document
   * Checks all workflow statuses and updates the approval request accordingly
   */
  private getApproverWorkflowId(
    approvalRequest: DocumentApprovalRequest,
    approverIndex: number,
    approver: DocumentApprovalRequest['approvers'][number]
  ): string | undefined {
    return (
      approver.workflowId || approvalRequest.workflowIds?.[approverIndex] || approvalRequest.workflowId || undefined
    )
  }

  private applyApproverWorkflowResult(
    approver: DocumentApprovalRequest['approvers'][number],
    details: { status: 'approved' | 'rejected' | 'cancelled'; completedAt?: string; comments?: string }
  ): DocumentApprovalRequest['approvers'][number] {
    return {
      ...approver,
      status: details.status === 'cancelled' ? 'rejected' : details.status,
      respondedAt: details.completedAt,
      comments: details.comments
    }
  }

  private computeOverallApprovalStatus(
    approvers: DocumentApprovalRequest['approvers']
  ): 'pending' | 'approved' | 'rejected' | 'cancelled' {
    const anyRejected = approvers.some(a => a.status === 'rejected')
    if (anyRejected) return 'rejected'

    const allApproved = approvers.every(a => a.status === 'approved')
    const allResponded = approvers.every(a => a.status !== 'pending')
    if (allApproved && allResponded) return 'approved'

    return 'pending'
  }

  async syncApprovalStatus(approvalRequest: DocumentApprovalRequest): Promise<DocumentApprovalRequest | null> {
    if (!approvalRequest || !approvalRequest.approvers?.length) {
      return null
    }

    try {
      const updatedApprovers = [...approvalRequest.approvers]
      let hasChanges = false

      // Check each approver's workflow status
      for (let i = 0; i < updatedApprovers.length; i++) {
        const approver = updatedApprovers[i]

        // Skip if already has a final status
        if (approver.status !== 'pending') {
          continue
        }

        const workflowId = this.getApproverWorkflowId(approvalRequest, i, approver)
        if (!workflowId) continue

        const details = await this.getWorkflowDetails(workflowId)
        if (details && details.status !== 'pending') {
          updatedApprovers[i] = this.applyApproverWorkflowResult(approver, details)
          hasChanges = true
        }
      }

      if (!hasChanges) {
        return null // No changes needed
      }

      const overallStatus = this.computeOverallApprovalStatus(updatedApprovers)

      return {
        ...approvalRequest,
        approvers: updatedApprovers,
        status: overallStatus
      }
    } catch (error) {
      console.error('[DocumentApproval] Error syncing approval status:', error)
      return null
    }
  }
}
