/**
 * Workflow Status Service
 *
 * Handles all interactions with the custom-flow-engine API for opportunity stage transitions.
 * This service manages workflow execution, status checking, and completion verification.
 */

import { env } from '@/common/env/EnvUtils'
import {
  WorkflowStatus,
  WorkflowExecutionResult,
  WorkflowDetails,
  StageTransitionCondition
} from '../types/stageTransition'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export class WorkflowStatusService {
  private static readonly FLOW_ENGINE_BASE_URL = env('NEXT_PUBLIC_FLOW_ENGINE_URL') || 'http://localhost:3000'

  // Persistent storage for workflow tracking using localStorage
  private static readonly STORAGE_KEY = 'opportunity_workflows'

  /**
   * Get workflows from localStorage
   */
  private static getWorkflowStorage(): Map<string, WorkflowStatus[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const storage = new Map(Object.entries(parsed)) as Map<string, WorkflowStatus[]>

        // Ensure all workflows have proper step structure
        for (const [opportunityId, workflows] of storage.entries()) {
          for (const workflow of workflows as WorkflowStatus[]) {
            if (!workflow.steps || workflow.steps.length === 0) {
              console.warn(`Workflow ${workflow.id} has no steps, adding default steps`)
              workflow.steps = this.getDefaultStepsForTemplate(workflow.templateId)
            }
          }
        }

        return storage
      }
    } catch (error) {
      console.warn('Error reading workflow storage:', error)
    }

    // Return default storage with pre-populated test workflows
    return new Map([
      [
        '8a8a7c88-36d1-496b-8604-420b83fe1e91',
        [
          {
            id: '4e5bcc6a-3325-4645-be1d-21a7eb4d046e',
            templateId: 'flow_highvalue_opportunity_approval',
            status: 'RUNNING',
            createdAt: '2025-07-31T11:58:00.000Z',
            progress: 0,
            steps: [
              { id: 'step_0', name: 'Executive Review', status: 'PENDING' },
              { id: 'step_1', name: 'Risk Assessment', status: 'PENDING' },
              { id: 'step_2', name: 'Final Approval', status: 'PENDING' },
              { id: 'step_3', name: 'Acknowledge', status: 'PENDING' }
            ]
          },
          {
            id: 'd0384042-d667-48f9-a69f-3e86ed4700fe',
            templateId: 'flow_opportunity_stage_approval',
            status: 'RUNNING',
            createdAt: '2025-07-31T12:05:00.000Z',
            progress: 0,
            steps: [
              { id: 'step_0', name: 'Stage Transition Approval', status: 'PENDING' },
              { id: 'step_1', name: 'Approval Complete', status: 'PENDING' }
            ]
          }
        ]
      ]
    ])
  }

  /**
   * Get default steps for a template
   */
  private static getDefaultStepsForTemplate(templateId: string): any[] {
    if (templateId === 'flow_highvalue_opportunity_approval') {
      return [
        { id: 'step_0', name: 'Executive Review', status: 'PENDING' },
        { id: 'step_1', name: 'Risk Assessment', status: 'PENDING' },
        { id: 'step_2', name: 'Final Approval', status: 'PENDING' },
        { id: 'step_3', name: 'Acknowledge', status: 'PENDING' }
      ]
    }

    if (templateId === 'flow_opportunity_stage_approval') {
      return [
        { id: 'step_0', name: 'Stage Transition Approval', status: 'PENDING' },
        { id: 'step_1', name: 'Approval Complete', status: 'PENDING' }
      ]
    }

    // Default fallback
    return [{ id: 'step_0', name: 'Default Approval', status: 'PENDING' }]
  }

  /**
   * Save workflows to localStorage
   */
  private static saveWorkflowStorage(storage: Map<string, WorkflowStatus[]>): void {
    try {
      const obj = Object.fromEntries(storage)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj))
    } catch (error) {
      console.warn('Error saving workflow storage:', error)
    }
  }

  /**
   * Get active workflows for an opportunity
   */
  static async getActiveWorkflows(opportunityId: string, accessToken: string): Promise<WorkflowStatus[]> {
    // First try to get workflows by workflow ID from localStorage
    const storage = this.getWorkflowStorage()
    const storedWorkflows = storage.get(opportunityId) || []

    // If we have stored workflows, return them
    if (storedWorkflows.length > 0) {
      console.log(`Found ${storedWorkflows.length} workflows in localStorage for opportunity ${opportunityId}`)
      return storedWorkflows
    }

    // Fallback: try to get workflows by opportunity ID from the API
    try {
      const response = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/flow/correlation/${opportunityId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`API returned ${result.data?.flows?.length || 0} workflows for opportunity ${opportunityId}`)
        return result.data?.flows || []
      } else {
        console.warn(`Failed to get workflows from API: ${response.status}`)
        return []
      }
    } catch (error) {
      console.error('Error getting workflows from API:', error)
      return []
    }
    try {
      console.log('Getting active workflows for opportunity:', opportunityId)

      // Use the new correlation-based API endpoint
      const response = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/flow/correlation/${opportunityId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`API response for correlation ${opportunityId}:`, data)

        if (data.status === 'success' && data.data?.flows) {
          // Transform the API response to match our WorkflowStatus interface
          const workflows: WorkflowStatus[] = data.data.flows.map((flow: any) => ({
            id: flow.workflow_id,
            templateId: flow.template_id,
            name: flow.workflow_name,
            status: this.mapWorkflowStatus(flow),
            createdAt: flow.started_at,
            progress: flow.progress_percentage || 0,
            steps: [], // We'll need to fetch steps separately if needed
            input: {
              context: flow.context ? JSON.parse(flow.context) : undefined,
              runtimeParameters: flow.runtime_parameters ? JSON.parse(flow.runtime_parameters) : undefined
            },
            currentStep: 0, // Will be calculated from steps
            totalSteps: flow.total_tasks || 0,
            completedSteps: flow.completed_tasks || 0
          }))

          console.log(`Successfully fetched ${workflows.length} workflows for opportunity ${opportunityId}`)
          return workflows
        }
      } else {
        console.warn(`Failed to fetch workflows for correlation ${opportunityId}:`, response.statusText)
      }

      // Fallback to localStorage if API fails
      console.log('Falling back to localStorage data...')
      const storage = this.getWorkflowStorage()
      const storedWorkflows = storage.get(opportunityId) || []
      console.log(`Found ${storedWorkflows.length} stored workflows for opportunity ${opportunityId}`)

      return storedWorkflows
    } catch (error) {
      console.error('Error fetching active workflows:', error)

      // Fallback to localStorage
      const storage = this.getWorkflowStorage()
      const storedWorkflows = storage.get(opportunityId) || []
      console.log(`Using ${storedWorkflows.length} stored workflows as fallback`)
      return storedWorkflows
    }
  }

  /**
   * Map workflow status from API response
   */
  private static mapWorkflowStatus(flow: any): 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TERMINATED' {
    const progress = flow.progress_percentage || 0
    const totalTasks = flow.total_tasks || 0
    const completedTasks = flow.completed_tasks || 0

    if (progress === 100 || completedTasks === totalTasks) {
      return 'COMPLETED'
    }

    // For now, assume RUNNING if not completed
    // In a real implementation, you'd check the actual status from the API
    return 'RUNNING'
  }

  /**
   * Get workflows for a specific stage transition
   */
  static async getStageTransitionWorkflows(
    opportunityId: string,
    fromStage: string,
    toStage: string,
    accessToken: string
  ): Promise<WorkflowStatus[]> {
    try {
      const allWorkflows = await this.getActiveWorkflows(opportunityId, accessToken)

      console.log('getStageTransitionWorkflows - allWorkflows:', allWorkflows)
      console.log('getStageTransitionWorkflows - filtering for:', { opportunityId, fromStage, toStage })

      // Temporarily disable filtering to show all workflows for debugging
      // TODO: Re-enable filtering once workflow data is properly structured
      return allWorkflows

      // Filter workflows for this specific stage transition
      // return allWorkflows.filter(workflow => {
      //   const context = workflow.input?.context;
      //   const params = workflow.input?.runtimeParameters;
      //
      //   // For now, just filter by opportunity ID and transition type
      //   // TODO: Add stage filtering once workflow data includes proper stage info
      //   return context?.entityId === opportunityId &&
      //          context?.transitionType === 'STAGE_CHANGE';
      // });
    } catch (error) {
      console.error('Error fetching stage transition workflows:', error)
      return []
    }
  }

  /**
   * Start workflow for stage transition condition
   */
  static async startStageTransitionWorkflow(
    opportunityId: string,
    condition: StageTransitionCondition,
    opportunityData: any,
    accessToken: string
  ): Promise<WorkflowExecutionResult[]> {
    try {
      const results: WorkflowExecutionResult[] = []

      // Group conditions by template ID to avoid duplicate workflow starts
      const templateGroups = new Map<string, any[]>()

      for (const conditionItem of condition.conditions) {
        const templateId = conditionItem.flowTemplateId
        if (!templateGroups.has(templateId)) {
          templateGroups.set(templateId, [])
        }
        templateGroups.get(templateId)!.push(conditionItem)
      }

      // Start one workflow per template
      for (const [templateId, conditionItems] of templateGroups) {
        const executionParams = this.prepareWorkflowExecutionParams(
          opportunityId,
          condition,
          templateId,
          opportunityData
        )

        const result = await this.executeWorkflow(templateId, executionParams, accessToken)

        results.push(result)
      }

      return results
    } catch (error) {
      console.error('Error starting stage transition workflows:', error)
      throw new Error(
        getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStartError', 'Failed to start approval workflows')
      )
    }
  }

  /**
   * Check if all workflows for a stage transition are completed
   */
  static async checkWorkflowsCompleted(
    opportunityId: string,
    fromStage: string,
    toStage: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const workflows = await this.getStageTransitionWorkflows(opportunityId, fromStage, toStage, accessToken)

      // Check if all workflows are completed
      return workflows.every(workflow => workflow.status === 'COMPLETED')
    } catch (error) {
      console.error('Error checking workflow completion:', error)
      return false
    }
  }

  /**
   * Get detailed workflow information
   */
  static async getWorkflowDetails(workflowId: string, accessToken: string): Promise<WorkflowDetails | null> {
    try {
      const response = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/flow/${workflowId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch workflow details: ${response.statusText}`)
      }

      const workflow = await response.json()

      // Get tasks for this workflow
      const tasksResponse = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/tasks?workflowId=${workflowId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      let tasks: any[] = []
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        tasks = tasksData.tasks || []
      }

      return {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        input: workflow.input,
        tasks: tasks.map(task => ({
          id: task.id,
          name: task.name,
          status: task.status,
          assignedTo: task.assignedTo,
          dueDate: task.dueDate,
          completedAt: task.completedAt
        })),
        startTime: workflow.startTime,
        endTime: workflow.endTime
      }
    } catch (error) {
      console.error('Error fetching workflow details:', error)
      return null
    }
  }

  /**
   * Cancel active workflows for a stage transition
   */
  static async cancelStageTransitionWorkflows(
    opportunityId: string,
    fromStage: string,
    toStage: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const workflows = await this.getStageTransitionWorkflows(opportunityId, fromStage, toStage, accessToken)

      // Cancel each workflow
      for (const workflow of workflows) {
        if (workflow.status === 'RUNNING') {
          await this.cancelWorkflow(workflow.id, accessToken)
        }
      }

      return true
    } catch (error) {
      console.error('Error canceling workflows:', error)
      return false
    }
  }

  /**
   * Prepare workflow execution parameters
   */
  private static prepareWorkflowExecutionParams(
    opportunityId: string,
    condition: StageTransitionCondition,
    templateId: string,
    opportunityData: any
  ): any {
    // Get assignments based on template type
    const assignments = this.getTemplateAssignments(templateId, opportunityData)

    return {
      correlationId: opportunityId, // Add correlationId for workflow tracking
      runtimeParameters: {
        opportunityId,
        opportunityName: opportunityData?.name || 'Unknown Opportunity',
        opportunityValue: opportunityData?.estimatedAmount || 0,
        currency: opportunityData?.currency?.value || 'EUR',
        fromStage: condition.fromStage,
        toStage: condition.toStage,
        ownerEmployeeId: opportunityData?.ownerEmployee?.id || '',
        pipelineId: condition.pipelineId,
        conditionId: condition.id
      },
      initiator: opportunityData?.ownerEmployee?.id || '',
      context: {
        entityType: 'OPPORTUNITY',
        entityId: opportunityId,
        transitionType: 'STAGE_CHANGE',
        conditionId: condition.id
      },
      runtimeAssignments: assignments
    }
  }

  /**
   * Get assignments for specific template
   */
  private static getTemplateAssignments(templateId: string, opportunityData: any): any {
    const ownerId = opportunityData?.ownerEmployee?.id || ''

    if (templateId === 'flow_opportunity_stage_approval') {
      return {
        step_0: {
          targets: {
            users: [ownerId],
            organizationalUnits: ['SALES_MANAGEMENT'],
            capabilities: ['OPPORTUNITY_APPROVAL']
          },
          assignmentMode: 'CLAIM',
          allowReassignment: true
        },
        step_1: {
          targets: {
            users: [ownerId],
            organizationalUnits: ['SALES_MANAGEMENT'],
            capabilities: ['OPPORTUNITY_APPROVAL']
          },
          assignmentMode: 'ASSIGN',
          allowReassignment: false
        }
      }
    }

    if (templateId === 'flow_highvalue_opportunity_approval') {
      return {
        step_0: {
          targets: {
            users: [ownerId],
            organizationalUnits: ['EXECUTIVE'],
            capabilities: ['EXECUTIVE_APPROVAL']
          },
          assignmentMode: 'CLAIM',
          allowReassignment: true
        },
        step_1: {
          targets: {
            users: [ownerId],
            organizationalUnits: ['RISK_MANAGEMENT'],
            capabilities: ['RISK_ASSESSMENT']
          },
          assignmentMode: 'CLAIM',
          allowReassignment: true
        },
        step_2: {
          targets: {
            users: [ownerId],
            organizationalUnits: ['SALES_MANAGEMENT', 'FINANCE'],
            capabilities: ['FINAL_APPROVAL']
          },
          assignmentMode: 'CLAIM',
          allowReassignment: true
        },
        step_3: {
          targets: {
            users: [ownerId]
          },
          assignmentMode: 'ASSIGN',
          allowReassignment: false
        }
      }
    }

    // Default fallback
    return {
      step_0: {
        targets: {
          users: [ownerId],
          organizationalUnits: ['SALES_MANAGEMENT'],
          capabilities: ['OPPORTUNITY_APPROVAL']
        },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      }
    }
  }

  /**
   * Execute workflow via custom-flow-engine API
   */
  private static async executeWorkflow(
    templateId: string,
    executionParams: any,
    accessToken: string
  ): Promise<WorkflowExecutionResult> {
    const response = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/templates/${templateId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(executionParams)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to execute workflow: ${response.statusText}`)
    }

    const result = await response.json()

    // Store workflow information for tracking (as backup)
    const opportunityId = executionParams.runtimeParameters?.opportunityId
    if (opportunityId) {
      const workflowStatus: WorkflowStatus = {
        id: result.data.workflowId,
        templateId: result.data.templateId,
        status: 'RUNNING',
        createdAt: new Date().toISOString(),
        progress: 0,
        steps: this.getDefaultStepsForTemplate(result.data.templateId)
      }

      const storage = this.getWorkflowStorage()
      const existingWorkflows = storage.get(opportunityId) || []
      existingWorkflows.push(workflowStatus)
      storage.set(opportunityId, existingWorkflows)
      this.saveWorkflowStorage(storage)

      console.log(`Stored workflow ${result.data.workflowId} for opportunity ${opportunityId} as backup`)
    }

    return {
      workflowId: result.data.workflowId,
      templateId: result.data.templateId,
      workflowName: result.data.workflowName,
      status: result.data.status
    }
  }

  /**
   * Cancel a specific workflow
   */
  private static async cancelWorkflow(workflowId: string, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/flow/${workflowId}/terminate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'User cancelled stage transition' })
      })

      return response.ok
    } catch (error) {
      console.error('Error canceling workflow:', error)
      return false
    }
  }

  /**
   * Complete a specific step in a workflow (Manual approval)
   */
  static async completeWorkflowStep(
    workflowId: string,
    stepId: string,
    accessToken: string,
    approvalData?: {
      approved: boolean
      comment?: string
      approverId?: string
    }
  ): Promise<boolean> {
    try {
      console.log(`Completing step ${stepId} in workflow ${workflowId}`)

      // For now, we'll simulate step completion by updating localStorage
      // In a real implementation, this would call the custom-flow-engine API
      const storage = this.getWorkflowStorage()

      console.log(`Current storage before update:`, storage)

      // Find the workflow and update the step status
      for (const [opportunityId, workflows] of storage.entries()) {
        const workflow = workflows.find(w => w.id === workflowId)
        if (workflow) {
          console.log(`Found workflow ${workflowId}:`, workflow)
          console.log(`Workflow steps:`, workflow.steps)

          const step = workflow.steps.find(s => s.id === stepId)
          if (step) {
            console.log(`Found step ${stepId}:`, step)

            // Update step status
            step.status = approvalData?.approved ? 'COMPLETED' : 'FAILED'

            // Update workflow progress
            const completedSteps = workflow.steps.filter(s => s.status === 'COMPLETED').length
            const totalSteps = workflow.steps.length
            workflow.progress = Math.round((completedSteps / totalSteps) * 100)

            // Update overall workflow status if all steps are completed
            if (completedSteps === totalSteps) {
              workflow.status = 'COMPLETED'
            }

            // Save updated storage
            this.saveWorkflowStorage(storage)

            console.log(`Step ${stepId} completed. Workflow progress: ${workflow.progress}%`)
            console.log(`Updated workflow:`, workflow)
            return true
          } else {
            console.warn(
              `Step ${stepId} not found in workflow ${workflowId}. Available steps:`,
              workflow.steps.map(s => s.id)
            )
          }
        }
      }

      console.warn(`Step ${stepId} not found in workflow ${workflowId}`)
      return false
    } catch (error) {
      console.error('Error completing workflow step:', error)
      return false
    }
  }

  /**
   * Get available tasks for a user (for manual approval interface)
   */
  static async getAvailableTasks(userId: string, accessToken: string): Promise<WorkflowStatus[]> {
    try {
      const storage = this.getWorkflowStorage()
      const availableWorkflows: WorkflowStatus[] = []

      for (const [opportunityId, workflows] of storage.entries()) {
        for (const workflow of workflows) {
          if (workflow.status === 'RUNNING') {
            // Filter steps that are available for this user
            const availableSteps = workflow.steps.filter(step => {
              // For now, show all pending steps
              // In a real implementation, this would check user permissions
              return step.status === 'PENDING' || step.status === 'SCHEDULED'
            })

            if (availableSteps.length > 0) {
              availableWorkflows.push({
                ...workflow,
                steps: availableSteps
              })
            }
          }
        }
      }

      return availableWorkflows
    } catch (error) {
      console.error('Error getting available tasks:', error)
      return []
    }
  }
}
