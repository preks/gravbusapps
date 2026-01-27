/**
 * WorkflowStatusSyncService
 *
 * Service for synchronizing workflow statuses with spreadsheet rows.
 * Handles polling, status updates, and workflow completion callbacks.
 */

import type {
  WorkflowRowLink,
  WorkflowStatus,
  WorkflowStepDetail,
  WorkflowCallbackPayload,
  ResultMapping
} from '../types/automation'

// Flow engine API base URL
const FLOW_ENGINE_API = '/flow-engine/api'

/**
 * Parameters for syncing workflow statuses
 */
export interface SyncWorkflowStatusesParams {
  spreadsheetId: string
  sheetId: string
  workflowLinks: WorkflowRowLink[]
}

/**
 * Detailed workflow status response
 */
export interface DetailedWorkflowStatus {
  status: WorkflowStatus
  currentStep: number
  totalSteps: number
  stepDetails?: WorkflowStepDetail[]
  outputData?: Record<string, unknown>
  errorMessage?: string
}

/**
 * Callback handler result
 */
export interface CallbackHandlerResult {
  success: boolean
  rowId: string
  updatedData?: Record<string, unknown>
  error?: string
}

/**
 * Service for managing workflow status synchronization
 */
export class WorkflowStatusSyncService {
  private accessToken: string
  private apiBaseUrl: string
  private pollInterval: number
  private pollingTimer: NodeJS.Timeout | null = null
  private isPolling: boolean = false

  constructor(
    accessToken: string,
    options: {
      apiBaseUrl?: string
      pollInterval?: number
    } = {}
  ) {
    this.accessToken = accessToken
    this.apiBaseUrl = options.apiBaseUrl || FLOW_ENGINE_API
    this.pollInterval = options.pollInterval || 30000 // Default: 30 seconds
  }

  /**
   * Fetch and sync status for all linked workflows in a sheet
   */
  async syncWorkflowStatuses(params: SyncWorkflowStatusesParams): Promise<WorkflowRowLink[]> {
    const { workflowLinks } = params

    if (workflowLinks.length === 0) {
      return []
    }

    // Only sync non-terminal workflows
    const activeLinks = workflowLinks.filter(link => !this.isTerminalStatus(link.workflowStatus))

    if (activeLinks.length === 0) {
      return workflowLinks
    }

    // Fetch status for each active workflow
    const updatedLinks = await Promise.all(
      workflowLinks.map(async link => {
        if (this.isTerminalStatus(link.workflowStatus)) {
          return link
        }

        try {
          const status = await this.getRowWorkflowStatus(link.workflowId)
          if (status) {
            return {
              ...link,
              workflowStatus: status.status,
              currentStepIndex: status.currentStep,
              totalSteps: status.totalSteps,
              stepDetails: status.stepDetails,
              lastUpdatedAt: new Date().toISOString(),
              completedAt: this.isTerminalStatus(status.status) ? new Date().toISOString() : undefined,
              errorMessage: status.errorMessage
            }
          }
        } catch (error) {
          console.error(`[WorkflowStatusSyncService] Failed to sync status for workflow ${link.workflowId}:`, error)
        }
        return link
      })
    )

    return updatedLinks
  }

  /**
   * Get detailed workflow status for a specific row's workflow
   */
  async getRowWorkflowStatus(workflowId: string): Promise<DetailedWorkflowStatus | null> {
    try {
      // Fetch flow overview
      const response = await fetch(`${this.apiBaseUrl}/flows/${workflowId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch workflow status: ${response.status}`)
      }

      const data = await response.json()
      const flow = data.data || data

      // Fetch progress details
      let stepDetails: WorkflowStepDetail[] | undefined

      try {
        const progressResponse = await fetch(`${this.apiBaseUrl}/flows/${workflowId}/progress`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        })

        if (progressResponse.ok) {
          const progressData = await progressResponse.json()
          const progress = progressData.data || progressData

          if (progress.steps) {
            stepDetails = progress.steps.map((step: Record<string, unknown>, index: number) => ({
              index,
              title: step.title as string || `Step ${index + 1}`,
              type: step.type as WorkflowStepDetail['type'] || 'TASK',
              status: this.mapStepStatus(step.status as string),
              assignedTo: step.assignedTo as string,
              completedBy: step.completedBy as string,
              completedAt: step.completedAt as string,
              formData: step.formData as Record<string, unknown>
            }))
          }
        }
      } catch {
        // Progress fetch is optional, continue without it
      }

      return {
        status: this.mapFlowStatus(flow.status),
        currentStep: flow.currentStepIndex ?? flow.progress?.currentStep ?? 0,
        totalSteps: flow.totalSteps ?? flow.progress?.totalSteps ?? flow.steps?.length ?? 1,
        stepDetails,
        outputData: flow.output || flow.outputData,
        errorMessage: flow.errorMessage || flow.error
      }
    } catch (error) {
      console.error('[WorkflowStatusSyncService] Get workflow status error:', error)
      return null
    }
  }

  /**
   * Handle webhook callback when workflow completes
   * Updates spreadsheet data based on result mappings
   */
  async handleWorkflowCallback(
    payload: WorkflowCallbackPayload,
    resultMappings: ResultMapping[],
    currentRowData: Record<string, unknown>
  ): Promise<CallbackHandlerResult> {
    const { workflowId, status, outputData, tags } = payload
    const { rowId } = tags

    try {
      if (status !== 'COMPLETED') {
        // Only process completed workflows for result mapping
        return {
          success: true,
          rowId,
          updatedData: undefined
        }
      }

      // Apply result mappings to update row data
      const updatedData = this.applyResultMappings(outputData, resultMappings, currentRowData)

      return {
        success: true,
        rowId,
        updatedData
      }
    } catch (error) {
      console.error('[WorkflowStatusSyncService] Callback handling error:', error)
      return {
        success: false,
        rowId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Apply result mappings to update row data from workflow output
   */
  applyResultMappings(
    outputData: Record<string, unknown>,
    resultMappings: ResultMapping[],
    currentRowData: Record<string, unknown>
  ): Record<string, unknown> {
    const updatedData = { ...currentRowData }

    for (const mapping of resultMappings) {
      const value = this.getNestedValue(outputData, mapping.workflowOutputPath)

      if (value !== undefined) {
        const currentValue = updatedData[mapping.targetColumnId]

        switch (mapping.aggregation) {
          case 'append':
            // Append to existing value (as array or string)
            if (Array.isArray(currentValue)) {
              updatedData[mapping.targetColumnId] = [...currentValue, value]
            } else if (currentValue) {
              updatedData[mapping.targetColumnId] = `${currentValue}\n${value}`
            } else {
              updatedData[mapping.targetColumnId] = value
            }
            break

          case 'sum':
            // Sum numeric values
            const numericValue = parseFloat(String(value)) || 0
            const currentNumeric = parseFloat(String(currentValue)) || 0
            updatedData[mapping.targetColumnId] = currentNumeric + numericValue
            break

          case 'count':
            // Increment count
            const currentCount = parseInt(String(currentValue)) || 0
            updatedData[mapping.targetColumnId] = currentCount + 1
            break

          case 'avg':
            // For averaging, store sum and count separately
            // This is a simplified version - real implementation might need metadata
            updatedData[mapping.targetColumnId] = value
            break

          case 'latest':
          default:
            // Replace with latest value
            updatedData[mapping.targetColumnId] = value
            break
        }

        // Apply transform if specified
        if (mapping.transform) {
          updatedData[mapping.targetColumnId] = this.applyTransform(
            updatedData[mapping.targetColumnId],
            mapping.transform
          )
        }
      }
    }

    return updatedData
  }

  /**
   * Start polling for workflow status updates
   */
  startPolling(
    params: SyncWorkflowStatusesParams,
    onUpdate: (links: WorkflowRowLink[]) => void
  ): void {
    if (this.isPolling) {
      return
    }

    this.isPolling = true

    const poll = async () => {
      if (!this.isPolling) {
        return
      }

      try {
        const updatedLinks = await this.syncWorkflowStatuses(params)
        onUpdate(updatedLinks)

        // Check if all workflows are in terminal state
        const allTerminal = updatedLinks.every(link => this.isTerminalStatus(link.workflowStatus))

        if (allTerminal) {
          this.stopPolling()
          return
        }
      } catch (error) {
        console.error('[WorkflowStatusSyncService] Polling error:', error)
      }

      // Schedule next poll
      if (this.isPolling) {
        this.pollingTimer = setTimeout(poll, this.pollInterval)
      }
    }

    // Start first poll immediately
    poll()
  }

  /**
   * Stop polling for workflow status updates
   */
  stopPolling(): void {
    this.isPolling = false
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  /**
   * Check if service is currently polling
   */
  isCurrentlyPolling(): boolean {
    return this.isPolling
  }

  /**
   * Get nested value from object using dot notation path
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    // Handle workflow output path format: "step_0.formData.fieldName"
    const normalizedPath = path
      .replace(/^\$steps\./, '') // Remove $steps prefix if present
      .replace(/\.output\./, '.') // Remove .output. if present

    return normalizedPath.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key]
      }
      return undefined
    }, obj)
  }

  /**
   * Apply a transform to a value
   */
  private applyTransform(value: unknown, transform: string): unknown {
    if (value === null || value === undefined) {
      return value
    }

    const stringValue = String(value)

    switch (transform) {
      case 'uppercase':
        return stringValue.toUpperCase()
      case 'lowercase':
        return stringValue.toLowerCase()
      case 'trim':
        return stringValue.trim()
      case 'number':
        return parseFloat(stringValue) || 0
      case 'integer':
        return parseInt(stringValue) || 0
      case 'boolean':
        return ['true', '1', 'yes'].includes(stringValue.toLowerCase())
      case 'date':
        return new Date(stringValue).toISOString().split('T')[0]
      case 'datetime':
        return new Date(stringValue).toISOString()
      default:
        return value
    }
  }

  /**
   * Map flow engine status to WorkflowStatus
   */
  private mapFlowStatus(status: string): WorkflowStatus {
    const statusMap: Record<string, WorkflowStatus> = {
      RUNNING: 'RUNNING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      CANCELED: 'CANCELED',
      TIMED_OUT: 'TIMED_OUT',
      PENDING: 'PENDING',
      IN_PROGRESS: 'RUNNING',
      SCHEDULED: 'PENDING',
      TERMINATED: 'CANCELED'
    }

    return statusMap[status] || 'PENDING'
  }

  /**
   * Map step status string to typed status
   */
  private mapStepStatus(status: string): WorkflowStepDetail['status'] {
    const statusMap: Record<string, WorkflowStepDetail['status']> = {
      SCHEDULED: 'PENDING',
      OPEN: 'PENDING',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      REJECTED: 'REJECTED',
      SKIPPED: 'SKIPPED',
      FAILED: 'REJECTED'
    }

    return statusMap[status] || 'PENDING'
  }

  /**
   * Check if a status is terminal (no more changes expected)
   */
  private isTerminalStatus(status: WorkflowStatus): boolean {
    return ['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT'].includes(status)
  }
}

/**
 * Create an instance of WorkflowStatusSyncService
 */
export function createWorkflowStatusSyncService(
  accessToken: string,
  options?: {
    apiBaseUrl?: string
    pollInterval?: number
  }
): WorkflowStatusSyncService {
  return new WorkflowStatusSyncService(accessToken, options)
}
