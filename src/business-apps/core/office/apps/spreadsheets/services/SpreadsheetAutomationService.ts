/**
 * SpreadsheetAutomationService
 *
 * Core service for executing spreadsheet automations.
 * Handles row-level workflows, bulk execution, and dynamic template generation.
 */

import type {
  SpreadsheetAutomation,
  AutomationFlowTemplate,
  AutomationFlowStep,
  AutomationExecutionResult,
  WorkflowRowLink,
  WorkflowStatus,
  SpreadsheetWorkflowTags,
  ColumnWorkflowMapping,
  AutomationFormInput
} from '../types/automation'
import { isUuid } from '../types/automation'
import { env } from '@/common/env/EnvUtils'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { getSpreadsheetBasePath } from '../utils/spreadsheetPaths'
import { fetchBulkCollectionEntitySelectOptions } from '../utils/entitySelectOptionsResolver'

// execute-dynamic lives at /templates/execute-dynamic on the flow engine API
const getExecuteDynamicUrl = () => `${CUSTOM_FLOW_ENGINE_API_URL}/templates/execute-dynamic`

const isSpreadsheetAutomationDebugEnabled = (): boolean => {
  try {
    return (
      typeof globalThis.localStorage !== 'undefined' &&
      globalThis.localStorage.getItem('debug:spreadsheet-automations') === '1'
    )
  } catch {
    return false
  }
}

const automationDebug = (...args: unknown[]) => {
  if (isSpreadsheetAutomationDebugEnabled()) {
    console.debug(...args)
  }
}

const TRUTHY_STRING_VALUES = new Set(['true', '1', 'yes'])

const maskIdentifier = (value: string | null | undefined): string => {
  const normalized = String(value || '').trim()
  if (!normalized) return 'n/a'
  if (normalized.length <= 8) return normalized
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`
}

/**
 * Parameters for executing a workflow for a single row
 */
export interface ExecuteRowWorkflowParams {
  automation: SpreadsheetAutomation
  row: Record<string, unknown>
  rowId: string
  spreadsheetId: string
  sheetId: string
  initiatorId: string
  accessToken: string
  bulkGroupId?: string // For bulk collection, tracks all workflows in a batch
}

/**
 * Parameters for bulk workflow execution (row-based)
 */
export interface ExecuteBulkWorkflowsParams {
  automation: SpreadsheetAutomation
  rows: Array<{ rowId: string; data: Record<string, unknown> }>
  spreadsheetId: string
  sheetId: string
  initiatorId: string
  accessToken: string
}

/**
 * Parameters for bulk collection execution (recipient-based)
 */
export interface ExecuteBulkCollectionParams {
  automation: SpreadsheetAutomation
  recipients: string[]
  spreadsheetId: string
  sheetId: string
  initiatorId: string
  accessToken: string
}

/**
 * Parameters for excel collection execution (duplicate template per recipient)
 */
export interface ExecuteExcelCollectionParams {
  automation: SpreadsheetAutomation
  recipients: string[]
  spreadsheetId: string
  sheetId: string
  initiatorId: string
  accessToken: string
}

/**
 * Parameters for sheet approval execution
 */
export interface ExecuteSheetApprovalParams {
  automation: SpreadsheetAutomation
  rows: Array<{ rowId: string; data: Record<string, unknown> }>
  spreadsheetId: string
  sheetId: string
  initiatorId: string
  accessToken: string
}

/**
 * Unified parameters for running any automation
 */
export interface RunAutomationParams {
  automation: SpreadsheetAutomation
  rows?: Array<{ rowId: string; data: Record<string, unknown> }>
  recipients?: string[]
  spreadsheetId: string
  sheetId: string
  initiatorId: string
  accessToken: string
}

/**
 * Result of a single workflow execution
 */
export interface WorkflowExecutionResult {
  success: boolean
  workflowId?: string
  error?: string
}

/**
 * Service for managing spreadsheet automations
 */
export class SpreadsheetAutomationService {
  private readonly accessToken: string
  private readonly apiBaseUrl: string

  constructor(accessToken: string, apiBaseUrl?: string) {
    this.accessToken = accessToken
    this.apiBaseUrl = apiBaseUrl || CUSTOM_FLOW_ENGINE_API_URL
    automationDebug('[SpreadsheetAutomationService] Initialized with API URL:', this.apiBaseUrl)
  }

  /**
   * Execute a workflow for a single row
   */
  async executeRowWorkflow(params: ExecuteRowWorkflowParams): Promise<WorkflowExecutionResult> {
    const { automation, row, rowId, spreadsheetId, sheetId, initiatorId, bulkGroupId } = params

    try {
      // Generate the dynamic template with row data mapped
      const template = this.generateDynamicTemplate(automation, row)

      // Build tags for workflow-spreadsheet linking
      const tags = this.buildWorkflowTags({
        spreadsheetId,
        sheetId,
        rowId,
        automationId: automation.id,
        automationType: automation.type,
        bulkGroupId // Include bulk group ID for batch tracking
      })

      // Add tags to template
      template.tags = { ...template.tags, ...tags }

      // Execute the workflow via flow engine API (uses /api/templates/execute-dynamic, not /api/v1)
      const url = getExecuteDynamicUrl()
      const payload = {
        templateDefinition: template,
        initiatorId,
        // Map step assignments from automation config - pass initiatorId as default assignee
        stepAssignments: this.buildStepAssignments(automation, row, initiatorId)
      }

      automationDebug('[SpreadsheetAutomationService] Executing workflow:', {
        url,
        automationName: automation.name,
        rowId,
        hasTemplate: !!template,
        templateName: template.name
      })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage: string
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorText || response.statusText}`
        }
        console.error('[SpreadsheetAutomationService] API error:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          url
        })
        throw new Error(errorMessage)
      }

      const result = await response.json()
      automationDebug('[SpreadsheetAutomationService] Workflow started:', result)

      return {
        success: true,
        workflowId: result.data?.workflowId || result.workflowId
      }
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Execute row workflow error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute dynamic template'
      }
    }
  }

  /**
   * Execute workflows for multiple rows (bulk execution)
   */
  async executeBulkRowWorkflows(params: ExecuteBulkWorkflowsParams): Promise<AutomationExecutionResult> {
    const { automation, rows, spreadsheetId, sheetId, initiatorId, accessToken } = params
    const bulkGroupId = `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const executedAt = new Date().toISOString()

    const workflows: Array<{ rowId: string; workflowId: string; status: WorkflowStatus }> = []
    const failedRows: string[] = []

    // Execute workflows in parallel with concurrency limit
    const CONCURRENCY_LIMIT = 5
    const chunks = this.chunkArray(rows, CONCURRENCY_LIMIT)

    for (const chunk of chunks) {
      const promises = chunk.map(async ({ rowId, data }) => {
        const result = await this.executeRowWorkflow({
          automation,
          row: data,
          rowId,
          spreadsheetId,
          sheetId,
          initiatorId,
          accessToken,
          bulkGroupId // Pass bulk group ID for tracking all workflows in this batch
        })

        if (result.success && result.workflowId) {
          workflows.push({
            rowId,
            workflowId: result.workflowId,
            status: 'RUNNING'
          })
        } else {
          failedRows.push(rowId)
        }
      })

      await Promise.all(promises)
    }

    return {
      success: failedRows.length === 0,
      error: failedRows.length > 0 ? `Failed to execute ${failedRows.length} workflows` : undefined,
      workflows,
      executedAt,
      totalRows: rows.length,
      failedRows: failedRows.length > 0 ? failedRows : undefined
    }
  }

  /**
   * Main dispatcher for running any automation type
   * Routes to the correct execution method based on automation type
   */
  async runAutomation(params: RunAutomationParams): Promise<AutomationExecutionResult> {
    const { automation, rows, recipients, spreadsheetId, sheetId, initiatorId, accessToken } = params
    const executedAt = new Date().toISOString()

    automationDebug('[SpreadsheetAutomationService] Running automation:', {
      type: automation.type,
      name: automation.name,
      rowCount: rows?.length,
      recipientCount: recipients?.length,
      collectionConfigRecipients: automation.collectionConfig?.recipients?.length,
      hasCollectionConfig: !!automation.collectionConfig
    })

    if (automation.type === 'bulk_collection') {
      const resolved = await this.resolveCollectionRecipients(automation, recipients, initiatorId, 'bulk_collection')
      if (!resolved.success) {
        return this.createExecutionErrorResult(resolved.error, executedAt)
      }
      return this.executeBulkCollection({
        automation,
        recipients: resolved.recipients,
        spreadsheetId,
        sheetId,
        initiatorId,
        accessToken
      })
    }

    if (automation.type === 'excel_collection') {
      if (!automation.collectionConfig?.templateSpreadsheetId) {
        return this.createExecutionErrorResult(
          'No template spreadsheet configured for Excel Collection. Please edit the automation.',
          executedAt
        )
      }

      const resolved = await this.resolveCollectionRecipients(automation, recipients, initiatorId, 'excel_collection')
      if (!resolved.success) {
        return this.createExecutionErrorResult(resolved.error, executedAt)
      }
      return this.executeExcelCollection({
        automation,
        recipients: resolved.recipients,
        spreadsheetId,
        sheetId,
        initiatorId,
        accessToken
      })
    }

    if (automation.type === 'sheet_approval') {
      return this.executeSheetApproval({
        automation,
        rows: rows || [],
        spreadsheetId,
        sheetId,
        initiatorId,
        accessToken
      })
    }

    if (!rows || rows.length === 0) {
      return this.createExecutionErrorResult('No rows specified for row-based automation', executedAt)
    }
    return this.executeBulkRowWorkflows({
      automation,
      rows,
      spreadsheetId,
      sheetId,
      initiatorId,
      accessToken
    })
  }

  private createExecutionErrorResult(error: string, executedAt: string): AutomationExecutionResult {
    return {
      success: false,
      error,
      workflows: [],
      executedAt,
      totalRows: 0
    }
  }

  private async resolveCollectionRecipients(
    automation: SpreadsheetAutomation,
    recipients: string[] | undefined,
    initiatorId: string,
    mode: 'bulk_collection' | 'excel_collection'
  ): Promise<{ success: true; recipients: string[] } | { success: false; error: string }> {
    let resolvedRecipients = recipients || automation.collectionConfig?.recipients || []
    const recipientType = automation.collectionConfig?.recipientType || 'specific'

    if ((recipientType === 'team' || recipientType === 'department') && resolvedRecipients.length === 0) {
      try {
        resolvedRecipients = await this.resolveRecipientsByType(recipientType, initiatorId)
        automationDebug('[SpreadsheetAutomationService] Resolved recipients by type:', {
          mode,
          recipientType,
          count: resolvedRecipients.length
        })
      } catch (error) {
        console.error('[SpreadsheetAutomationService] Failed to resolve recipients:', error)
        return {
          success: false,
          error: `Failed to resolve ${recipientType} members. Please try again or select specific people.`
        }
      }
    }

    if (recipientType === 'specific' && resolvedRecipients.length > 0) {
      try {
        const normalized = await this.resolveEmployeeIdsToUserIds(resolvedRecipients)
        if (normalized.length > 0) {
          resolvedRecipients = normalized
        }
      } catch (error) {
        console.warn('[SpreadsheetAutomationService] Could not resolve recipients to user IDs:', error)
      }
    }

    if (resolvedRecipients.length === 0) {
      let errorMessage: string
      if (recipientType !== 'specific') {
        errorMessage = `No ${recipientType} members found. Please check your team/department membership.`
      } else if (mode === 'excel_collection') {
        errorMessage = 'No recipients configured for Excel Collection. Please edit the automation.'
      } else {
        errorMessage = 'No recipients specified for bulk collection. Please edit this automation and select recipients.'
      }
      return {
        success: false,
        error: errorMessage
      }
    }

    return { success: true, recipients: resolvedRecipients }
  }

  /**
   * Execute bulk collection - creates one workflow per RECIPIENT
   * Each recipient receives a task to fill out a form, responses become new rows
   */
  async executeBulkCollection(params: ExecuteBulkCollectionParams): Promise<AutomationExecutionResult> {
    const { automation, recipients, spreadsheetId, sheetId, initiatorId, accessToken } = params
    const executedAt = new Date().toISOString()

    let backendId: string
    try {
      backendId = await this.ensureBackendAutomationId(automation, { spreadsheetId, sheetId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to ensure backend automation'
      console.error('[SpreadsheetAutomationService]', msg)
      return {
        success: false,
        error: msg,
        workflows: [],
        executedAt,
        totalRows: recipients.length
      }
    }

    const bulkGroupId = `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const workflows: Array<{ rowId: string; workflowId: string; status: WorkflowStatus }> = []
    const failedRecipients: string[] = []

    automationDebug(`[SpreadsheetAutomationService] Executing bulk collection for ${recipients.length} recipients`)

    // Execute workflows in parallel with concurrency limit
    const CONCURRENCY_LIMIT = 5
    const chunks = this.chunkArray(recipients, CONCURRENCY_LIMIT)

    for (const chunk of chunks) {
      const promises = chunk.map(async recipientId => {
        try {
          const result = await this.executeRecipientWorkflow({
            automation,
            recipientId,
            spreadsheetId,
            sheetId,
            initiatorId,
            accessToken,
            bulkGroupId,
            tagAutomationId: backendId
          })

          if (result.success && result.workflowId) {
            // For bulk collection, we use recipientId as rowId since new rows will be created
            workflows.push({
              rowId: `recipient_${recipientId}`,
              workflowId: result.workflowId,
              status: 'RUNNING'
            })
          } else {
            failedRecipients.push(recipientId)
          }
        } catch (error) {
          console.error(
            `[SpreadsheetAutomationService] Failed to execute workflow for recipient ${recipientId}:`,
            error
          )
          failedRecipients.push(recipientId)
        }
      })

      await Promise.all(promises)
    }

    const hadClientOnlyId = !automation.backendId && !isUuid(automation.id)

    return {
      success: failedRecipients.length === 0,
      error: failedRecipients.length > 0 ? `Failed to send to ${failedRecipients.length} recipients` : undefined,
      workflows,
      executedAt,
      totalRows: recipients.length,
      failedRows: failedRecipients.length > 0 ? failedRecipients : undefined,
      ...(hadClientOnlyId ? { backendId } : {})
    }
  }

  /**
   * Create or update the automation row in document-service so GET /automations/app/:id lists it
   * (required for bulk/form collection parity with excel_collection).
   */
  async syncAutomationRecordOnBackend(
    automation: SpreadsheetAutomation,
    spreadsheetId: string,
    sheetId: string,
    options?: { persistMode?: 'upsert' | 'create-only' }
  ): Promise<string | null> {
    const persistMode = options?.persistMode ?? 'upsert'
    const docBase = getDocumentServiceApiUrl().replace(/\/+$/, '')
    const spreadsheetAppId = automation.collectionConfig?.templateSpreadsheetId || spreadsheetId

    const backendCandidate =
      (typeof automation.backendId === 'string' && automation.backendId.trim()) ||
      (isUuid(automation.id) ? automation.id : null)

    const payload = {
      spreadsheetAppId,
      sheetId,
      name: automation.name,
      description: automation.description,
      type: automation.type,
      trigger: automation.trigger ?? 'manual',
      workflowConfig: automation.workflowConfig ?? {},
      triggerConfig: automation.triggerConfig ?? {},
      approvalConfig: automation.approvalConfig,
      collectionConfig: automation.collectionConfig ?? {}
    }

    if (backendCandidate) {
      if (persistMode === 'create-only') {
        return backendCandidate
      }
      const res = await fetch(`${docBase}/automations/${backendCandidate}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) return null
      return backendCandidate
    }

    const createRes = await fetch(`${docBase}/automations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(payload)
    })
    if (!createRes.ok) return null
    const created = await createRes.json()
    const id = created.data?.id ?? created.id
    if (!id || !isUuid(String(id))) return null
    return String(id)
  }

  /**
   * Ensure automation exists in document-service and return its UUID.
   * Creates the automation if it has a client-side id (auto_xxx) and no backendId.
   */
  private async ensureBackendAutomationId(
    automation: SpreadsheetAutomation,
    params: Pick<ExecuteExcelCollectionParams, 'spreadsheetId' | 'sheetId'>
  ): Promise<string> {
    const id = await this.syncAutomationRecordOnBackend(automation, params.spreadsheetId, params.sheetId, {
      persistMode: 'create-only'
    })
    if (!id) {
      throw new Error('Failed to create automation in document-service')
    }
    return id
  }

  /**
   * Execute excel collection - calls BE endpoint which handles duplication and workflow creation
   * The BE now handles:
   * - Creating an AutomationRun record to track this execution
   * - Duplicating the template spreadsheet for each recipient (with parentAppId and automationRunId)
   * - Creating workflow tasks with richer content for each recipient
   */
  async executeExcelCollection(params: ExecuteExcelCollectionParams): Promise<AutomationExecutionResult> {
    const { automation, recipients } = params
    const executedAt = new Date().toISOString()

    const docBase = getDocumentServiceApiUrl().replace(/\/+$/, '')

    let backendId: string
    try {
      backendId = await this.ensureBackendAutomationId(automation, params)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to ensure backend automation'
      console.error('[SpreadsheetAutomationService]', msg)
      return {
        success: false,
        error: msg,
        workflows: [],
        executedAt,
        totalRows: recipients.length
      }
    }

    const wasCreated = !automation.backendId && !isUuid(automation.id)

    automationDebug('[SpreadsheetAutomationService] Executing excel collection via BE endpoint:', {
      automationId: backendId,
      recipientCount: recipients.length,
      templateId: automation.collectionConfig?.templateSpreadsheetId
    })

    // Resolve display names so each copy is named "Template - Recipient Name"
    const recipientNames = await this.resolveRecipientDisplayNames(recipients)

    try {
      const response = await fetch(`${docBase}/automations/${backendId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(this.buildExcelCollectionRunPayload(automation, recipients, recipientNames))
      })

      if (!response.ok) {
        const errorMessage = await this.getErrorMessageFromResponse(response)
        console.error('[SpreadsheetAutomationService] BE excel collection run failed:', {
          status: response.status,
          errorMessage
        })
        const isTemplateMissing =
          (response.status === 404 || errorMessage.toLowerCase().includes('not found')) &&
          errorMessage.toLowerCase().includes('template')
        return {
          success: false,
          error: isTemplateMissing
            ? 'Template spreadsheet not found. If using a local document-service, ensure the spreadsheet app exists there. Check NEXT_PUBLIC_DOCUMENT_SERVICE_DEBUG_URL.'
            : errorMessage,
          workflows: [],
          executedAt,
          totalRows: recipients.length
        }
      }

      const result = await response.json()
      const mapped = this.mapExcelCollectionRunResult(
        result,
        recipients.length,
        executedAt,
        wasCreated ? backendId : undefined
      )
      console.info('[SpreadsheetAutomationService] Excel collection run result', {
        automationId: maskIdentifier(backendId),
        recipients: recipients.length,
        workflowCount: mapped.workflows?.length || 0,
        failedCount: mapped.failedRows?.length || 0,
        success: mapped.success
      })
      return mapped
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Excel collection execution error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute excel collection',
        workflows: [],
        executedAt,
        totalRows: recipients.length
      }
    }
  }

  private buildExcelCollectionRunPayload(
    automation: SpreadsheetAutomation,
    recipients: string[],
    recipientNames: Record<string, string>
  ): Record<string, unknown> {
    return {
      recipients,
      message: automation.collectionConfig?.message,
      baseUrl: globalThis.location?.origin || env('NEXT_PUBLIC_BASE_URL') || '',
      managerDisplayName: 'Manager',
      recipientNames
    }
  }

  private async getErrorMessageFromResponse(response: Response): Promise<string> {
    const errorText = await response.text()
    try {
      const errorData = JSON.parse(errorText)
      return errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
    } catch {
      return `HTTP ${response.status}: ${errorText || response.statusText}`
    }
  }

  private mapExcelCollectionRunResult(
    result: Record<string, unknown>,
    recipientCount: number,
    executedAt: string,
    backendId?: string
  ): AutomationExecutionResult {
    const runData = (result.data || result) as Record<string, unknown>
    automationDebug('[SpreadsheetAutomationService] Excel collection run started:', {
      runId: (runData.run as Record<string, unknown> | undefined)?.id || runData.runId,
      recipientCount:
        (runData.run as Record<string, unknown> | undefined)?.recipientCount ||
        runData.recipientCount ||
        recipientCount,
      successCount: runData.successCount,
      failedCount: runData.failureCount ?? runData.failedCount
    })

    const runCopies = (runData.copies || runData.results || []) as Array<{
      recipientId: string
      workflowId?: string
    }>
    const workflows: Array<{ rowId: string; workflowId: string; status: WorkflowStatus }> = runCopies.map(copy => ({
      rowId: `recipient_${copy.recipientId}`,
      workflowId: copy.workflowId || '',
      status: copy.workflowId ? 'RUNNING' : 'FAILED'
    }))
    const failedRows = runCopies.filter(copy => !copy.workflowId).map(copy => copy.recipientId)

    return {
      success: failedRows.length === 0,
      error: failedRows.length > 0 ? `Failed to send to ${failedRows.length} recipients` : undefined,
      workflows,
      executedAt,
      totalRows: recipientCount,
      failedRows: failedRows.length > 0 ? failedRows : undefined,
      ...(backendId ? { backendId } : {})
    }
  }

  /**
   * Generate template for excel collection - task with link to spreadsheet copy
   * @deprecated This is now handled by the BE in POST /automations/:id/run.
   * Kept for potential fallback scenarios or legacy support.
   */
  private generateExcelCollectionTemplate(
    automation: SpreadsheetAutomation,
    recipientId: string,
    copyAppId: string
  ): AutomationFlowTemplate {
    const origin = globalThis.location?.origin ?? ''
    const copyUrl = `${origin}${getSpreadsheetBasePath()}?appId=${encodeURIComponent(copyAppId)}&view=viewer&excel_collection=1`

    return {
      type: 'TEMPLATE',
      name: `${automation.name} - Excel Collection`,
      description: automation.description || 'Fill out your copy and submit when done.',
      version: 1,
      steps: [
        {
          type: 'TASK',
          title: 'Complete your spreadsheet',
          message:
            automation.collectionConfig?.message?.trim() || 'Open your copy, fill it in, and click Submit when done.',
          links: [{ name: 'Open your copy', url: copyUrl, type: 'spreadsheet' }],
          assignment: {
            targets: { users: [recipientId] },
            assignmentMode: 'ASSIGN'
          }
        }
      ],
      tags: {
        app: 'spreadsheet-automation',
        automationType: 'excel_collection',
        copyAppId
      }
    }
  }

  /**
   * Execute a workflow for a single recipient (used by bulk collection)
   */
  private async executeRecipientWorkflow(params: {
    automation: SpreadsheetAutomation
    recipientId: string
    spreadsheetId: string
    sheetId: string
    initiatorId: string
    accessToken: string
    bulkGroupId: string
    /** Document-service automation UUID (flows must tag this for aggregate + hub listing). */
    tagAutomationId: string
  }): Promise<WorkflowExecutionResult> {
    const { automation, recipientId, spreadsheetId, sheetId, initiatorId, bulkGroupId, tagAutomationId } = params

    try {
      // Generate a template specifically for bulk collection (async: entity-backed SELECT options)
      const template = await this.generateBulkCollectionTemplate(automation, recipientId, initiatorId)

      // Build tags for workflow-spreadsheet linking
      const tags = this.buildWorkflowTags({
        spreadsheetId,
        sheetId,
        rowId: `pending_${recipientId}`, // Row will be created when completed
        automationId: tagAutomationId,
        automationType: automation.type,
        bulkGroupId,
        recipientId // Track which recipient this is for
      })

      template.tags = { ...template.tags, ...tags }

      const url = getExecuteDynamicUrl()
      const payload = {
        templateDefinition: template,
        initiatorId,
        // Assign the task to the specific recipient
        stepAssignments: {
          step_0: {
            assignment: {
              assignmentMode: 'ASSIGN',
              targets: { users: [recipientId] },
              allowReassignment: true
            }
          }
        }
      }

      automationDebug('[SpreadsheetAutomationService] Executing bulk collection workflow:', {
        recipientId,
        templateName: template.name
      })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage: string
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorText || response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return {
        success: true,
        workflowId: result.data?.workflowId || result.workflowId
      }
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Execute recipient workflow error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute workflow'
      }
    }
  }

  /**
   * Build form inputs for bulk collection, resolving entity-backed SELECT options when configured.
   */
  private async buildBulkCollectionFormInputs(
    automation: SpreadsheetAutomation,
    initiatorId: string
  ): Promise<AutomationFormInput[]> {
    const formFields = automation.collectionConfig?.formFields || []
    const formInputs: AutomationFormInput[] = []

    for (const field of formFields) {
      const inputType = field.inputType || 'TEXT'
      const base: AutomationFormInput = {
        name: field.columnId || field.id,
        label: field.label,
        type: inputType,
        required: field.required ?? true
      }

      if (inputType === 'SELECT') {
        const inferredSource =
          field.selectOptionsSource ??
          (field.entitySelect?.entityType && field.entitySelect?.valueField && field.entitySelect?.labelField
            ? 'entity'
            : 'static')

        if (inferredSource === 'entity' && field.entitySelect) {
          base.options = await fetchBulkCollectionEntitySelectOptions(this.accessToken, field.entitySelect, initiatorId)
        } else {
          base.options = field.options?.map(opt => ({ value: opt, label: opt }))
        }
      }

      formInputs.push(base)
    }

    if (formInputs.length === 0) {
      formInputs.push({
        name: 'response',
        label: 'Your Response',
        type: 'TEXTAREA',
        required: true
      })
    }

    return formInputs
  }

  /**
   * Generate a template for bulk collection with form fields
   */
  private async generateBulkCollectionTemplate(
    automation: SpreadsheetAutomation,
    recipientId: string,
    initiatorId: string
  ): Promise<AutomationFlowTemplate> {
    const formInputs = await this.buildBulkCollectionFormInputs(automation, initiatorId)

    return {
      type: 'TEMPLATE',
      name: `${automation.name} - Collection`,
      description: automation.description || 'Please submit your response',
      version: 1,
      steps: [
        {
          type: 'TASK',
          title: 'Submit Your Response',
          message:
            automation.collectionConfig?.message?.trim() ||
            automation.description ||
            'Please fill out the requested information and submit.',
          form: formInputs,
          assignment: {
            targets: { users: [recipientId] },
            assignmentMode: 'ASSIGN'
          }
        }
      ],
      tags: {
        app: 'spreadsheet-automation',
        automationType: 'bulk_collection'
      }
    }
  }

  /**
   * Execute sheet approval - creates ONE workflow for the entire sheet
   */
  async executeSheetApproval(params: ExecuteSheetApprovalParams): Promise<AutomationExecutionResult> {
    const { automation, rows, spreadsheetId, sheetId, initiatorId } = params
    const executedAt = new Date().toISOString()

    try {
      // Generate template for sheet approval
      const template = this.generateSheetApprovalTemplate(automation, rows)

      // Build tags
      const tags = this.buildWorkflowTags({
        spreadsheetId,
        sheetId,
        rowId: 'sheet_approval',
        automationId: automation.id,
        automationType: automation.type
      })

      template.tags = { ...template.tags, ...tags }

      const url = getExecuteDynamicUrl()
      const payload = {
        templateDefinition: template,
        initiatorId,
        stepAssignments: this.buildApprovalStepAssignments(automation, initiatorId)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage: string
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorText || response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      const workflowId = result.data?.workflowId || result.workflowId

      return {
        success: true,
        workflows: [
          {
            rowId: 'sheet_approval',
            workflowId,
            status: 'RUNNING'
          }
        ],
        executedAt,
        totalRows: rows.length
      }
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Execute sheet approval error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit for approval',
        workflows: [],
        executedAt,
        totalRows: rows.length
      }
    }
  }

  /**
   * Generate a template for sheet approval
   */
  private generateSheetApprovalTemplate(
    automation: SpreadsheetAutomation,
    rows: Array<{ rowId: string; data: Record<string, unknown> }>
  ): AutomationFlowTemplate {
    const approvalSteps = automation.approvalConfig?.approvalSteps || []

    // Build steps from approval config
    const steps: AutomationFlowStep[] =
      approvalSteps.length > 0
        ? approvalSteps.map(step => ({
            type: 'APPROVAL',
            title: step.title,
            message: step.message || `Please review and approve ${rows.length} items`,
            form: [
              {
                name: 'approvalDecision',
                label: 'Decision',
                type: 'SELECT',
                required: true,
                options: [
                  { value: 'approve', label: 'Approve' },
                  { value: 'reject', label: 'Reject' }
                ]
              },
              {
                name: 'comments',
                label: 'Comments',
                type: 'TEXTAREA',
                required: false
              }
            ],
            assignment: step.approvers
          }))
        : [
            {
              type: 'APPROVAL',
              title: 'Review & Approve',
              message: `Please review and approve ${rows.length} items`,
              form: [
                {
                  name: 'approvalDecision',
                  label: 'Decision',
                  type: 'SELECT',
                  required: true,
                  options: [
                    { value: 'approve', label: 'Approve' },
                    { value: 'reject', label: 'Reject' }
                  ]
                },
                {
                  name: 'comments',
                  label: 'Comments',
                  type: 'TEXTAREA',
                  required: false
                }
              ],
              assignment: {
                targets: null,
                assignmentMode: 'ASSIGN'
              }
            }
          ]

    return {
      type: 'TEMPLATE',
      name: `${automation.name} - Sheet Approval`,
      description: automation.description || `Approval request for ${rows.length} items`,
      version: 1,
      steps,
      tags: {
        app: 'spreadsheet-automation',
        automationType: 'sheet_approval',
        rowCount: String(rows.length)
      }
    }
  }

  /**
   * Build step assignments for approval workflows
   */
  private buildApprovalStepAssignments(
    automation: SpreadsheetAutomation,
    initiatorId: string
  ): Record<
    string,
    { assignment: { targets: { users: string[] }; assignmentMode: string; allowReassignment: boolean } }
  > {
    const approvalSteps = automation.approvalConfig?.approvalSteps || []
    const assignments: Record<
      string,
      { assignment: { targets: { users: string[] }; assignmentMode: string; allowReassignment: boolean } }
    > = {}

    approvalSteps.forEach((step, index) => {
      const stepKey = `step_${index}`
      if (step.approvers?.targets?.users && step.approvers.targets.users.length > 0) {
        assignments[stepKey] = {
          assignment: {
            targets: { users: step.approvers.targets.users },
            assignmentMode: step.approvers.assignmentMode || 'ASSIGN',
            allowReassignment: step.approvers.allowReassignment ?? true
          }
        }
      } else {
        // Default to initiator if no approvers specified
        assignments[stepKey] = {
          assignment: {
            targets: { users: [initiatorId] },
            assignmentMode: 'ASSIGN',
            allowReassignment: true
          }
        }
      }
    })

    // If no approval steps, create default
    if (Object.keys(assignments).length === 0) {
      assignments['step_0'] = {
        assignment: {
          targets: { users: [initiatorId] },
          assignmentMode: 'ASSIGN',
          allowReassignment: true
        }
      }
    }

    return assignments
  }

  /**
   * Generate a dynamic FlowTemplate from automation config and row data
   */
  generateDynamicTemplate(automation: SpreadsheetAutomation, rowData: Record<string, unknown>): AutomationFlowTemplate {
    const { workflowConfig } = automation

    // If using an existing template, we don't generate dynamically
    // (the template ID would be used directly in execution)
    if (workflowConfig.templateId && !workflowConfig.dynamicTemplate) {
      throw new Error('Cannot generate dynamic template when templateId is specified without dynamicTemplate')
    }

    // Start with the dynamic template or create a default one
    const baseTemplate = workflowConfig.dynamicTemplate || this.createDefaultTemplate(automation)

    // Clone the template to avoid mutating the original
    const template: AutomationFlowTemplate = structuredClone(baseTemplate)

    // Apply column mappings to inject row data into template
    template.steps = template.steps.map(step =>
      this.applyColumnMappingsToStep(step, workflowConfig.columnMappings, rowData)
    )

    // Update template name to include row identifier
    const rowIdentifier = rowData._id || rowData.id || 'unknown'
    template.name = `${template.name} - Row ${rowIdentifier}`

    return template
  }

  /**
   * Apply column mappings to a workflow step
   */
  private applyColumnMappingsToStep(
    step: AutomationFlowStep,
    mappings: ColumnWorkflowMapping[],
    rowData: Record<string, unknown>
  ): AutomationFlowStep {
    const updatedStep = { ...step }

    // Update step message with row data
    if (updatedStep.message) {
      updatedStep.message = this.interpolateRowData(updatedStep.message, rowData)
    }

    // Update step title with row data
    if (updatedStep.title) {
      updatedStep.title = this.interpolateRowData(updatedStep.title, rowData)
    }

    // Update form field default values based on mappings
    if (updatedStep.form) {
      updatedStep.form = updatedStep.form.map(input => {
        // Find mapping for this input
        const mapping = mappings.find(
          m => m.workflowParameter === `formData.${input.name}` && m.direction !== 'fromWorkflow'
        )

        if (mapping) {
          const value = rowData[mapping.columnName]
          if (value !== undefined) {
            return {
              ...input,
              defaultValue: this.transformValue(value, mapping.transform)
            }
          }
        }

        // Check for valueExpression
        if (input.valueExpression) {
          const value = this.resolveExpression(input.valueExpression, rowData)
          if (value !== undefined) {
            return {
              ...input,
              defaultValue: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
            }
          }
        }

        return input
      })
    }

    // Add row data as links for reference
    const rowDataLink = {
      name: 'Source Row Data',
      url: '#row-data',
      type: 'spreadsheet-row'
    }

    updatedStep.links = [...(updatedStep.links || []), rowDataLink]

    return updatedStep
  }

  /**
   * Interpolate row data into a string template
   * Supports {{columnName}} syntax
   */
  private interpolateRowData(template: string, rowData: Record<string, unknown>): string {
    return template.replaceAll(/\{\{(\w+)\}\}/g, (match, columnName) => {
      const value = rowData[columnName]
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * Resolve an expression path to a value from row data
   */
  private resolveExpression(expression: string, rowData: Record<string, unknown>): unknown {
    // Handle simple column references
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
      const path = expression.slice(2, -2).trim()
      return this.getNestedValue(rowData, path)
    }
    return undefined
  }

  /**
   * Get a nested value from an object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key]
      }
      return undefined
    }, obj)
  }

  /**
   * Transform a value based on the mapping transform
   */
  private transformValue(value: unknown, transform?: string): string {
    if (value === null || value === undefined) return ''

    const stringValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)

    switch (transform) {
      case 'uppercase':
        return stringValue.toUpperCase()
      case 'lowercase':
        return stringValue.toLowerCase()
      case 'trim':
        return stringValue.trim()
      case 'number':
        return String(Number.parseFloat(stringValue) || 0)
      case 'date':
        return new Date(stringValue).toISOString()
      case 'boolean':
        return String(TRUTHY_STRING_VALUES.has(stringValue.toLowerCase()))
      default:
        return stringValue
    }
  }

  /**
   * Create a default template for an automation based on its type.
   * Each automation type has a distinct purpose and workflow structure.
   *
   * @param automation - The automation configuration
   * @param initiatorId - The user triggering the workflow (used as default assignee)
   */
  private createDefaultTemplate(automation: SpreadsheetAutomation, initiatorId?: string): AutomationFlowTemplate {
    const defaultTargets = initiatorId ? { users: [initiatorId] } : null
    const stepBuilders: Partial<Record<SpreadsheetAutomation['type'], () => AutomationFlowStep[]>> = {
      row_workflow: () => this.buildRowWorkflowDefaultSteps(defaultTargets),
      sheet_approval: () => this.buildSheetApprovalDefaultSteps(defaultTargets),
      line_approval: () => this.buildLineApprovalDefaultSteps(defaultTargets),
      bulk_collection: () => this.buildBulkCollectionDefaultSteps(defaultTargets)
    }
    const steps = stepBuilders[automation.type]?.() ?? this.buildLineApprovalDefaultSteps(defaultTargets)

    return {
      type: 'TEMPLATE',
      name: automation.name,
      description: automation.description || this.getDefaultDescription(automation.type),
      version: 1,
      steps
    }
  }

  private buildRowWorkflowDefaultSteps(defaultTargets: { users: string[] } | null): AutomationFlowStep[] {
    return [
      {
        type: 'TASK',
        title: 'Review Row Data',
        message: 'Review the data in this row and verify it is complete and accurate.\n\nRow Details:\n{{rowSummary}}',
        form: [
          {
            type: 'SELECT',
            name: 'reviewStatus',
            label: 'Review Status',
            required: true,
            options: [
              { label: 'Data Complete', value: 'complete' },
              { label: 'Needs Updates', value: 'needs_updates' },
              { label: 'Invalid Data', value: 'invalid' }
            ]
          },
          {
            type: 'TEXTAREA',
            name: 'reviewNotes',
            label: 'Review Notes',
            required: false,
            placeholder: 'Add any notes about your review...'
          }
        ],
        assignment: {
          targets: defaultTargets,
          assignmentMode: 'ASSIGN',
          allowReassignment: true
        },
        dueInMinutes: 1440
      },
      {
        type: 'TASK',
        title: 'Process Row',
        message: 'Complete any required processing for this row based on the review.',
        form: [
          {
            type: 'SELECT',
            name: 'processingResult',
            label: 'Processing Result',
            required: true,
            options: [
              { label: 'Processed Successfully', value: 'success' },
              { label: 'Processing Failed', value: 'failed' },
              { label: 'Skipped', value: 'skipped' }
            ]
          }
        ],
        assignment: {
          targets: defaultTargets,
          assignmentMode: 'ASSIGN',
          allowReassignment: true
        },
        dueInMinutes: 2880
      }
    ]
  }

  private buildSheetApprovalDefaultSteps(defaultTargets: { users: string[] } | null): AutomationFlowStep[] {
    return [
      {
        type: 'INFORMATION',
        title: 'Sheet Submitted for Approval',
        message:
          'The spreadsheet "{{sheetName}}" has been submitted for approval.\n\nTotal rows: {{rowCount}}\nSubmitted by: {{submittedBy}}\nSubmission date: {{submissionDate}}',
        assignment: {
          targets: defaultTargets,
          assignmentMode: 'ASSIGN',
          allowReassignment: false
        }
      },
      {
        type: 'APPROVAL',
        title: 'Approve Spreadsheet',
        message:
          'Review the entire spreadsheet and approve or reject it.\n\nPlease verify:\n- All data is accurate\n- Calculations are correct\n- Required fields are complete',
        form: [
          {
            type: 'TEXTAREA',
            name: 'approvalComments',
            label: 'Approval Comments',
            required: false,
            placeholder: 'Add any comments about your decision...'
          },
          {
            type: 'SELECT',
            name: 'approvalCondition',
            label: 'Approval Condition',
            required: false,
            options: [
              { label: 'Unconditional Approval', value: 'unconditional' },
              { label: 'Approved with Minor Changes', value: 'minor_changes' },
              { label: 'Approved Pending Corrections', value: 'pending_corrections' }
            ]
          }
        ],
        assignment: {
          targets: defaultTargets,
          assignmentMode: 'ASSIGN',
          allowReassignment: true
        },
        dueInMinutes: 4320
      }
    ]
  }

  private buildLineApprovalDefaultSteps(defaultTargets: { users: string[] } | null): AutomationFlowStep[] {
    return [
      {
        type: 'APPROVAL',
        title: 'Approve Line Item',
        message: 'Review and approve or reject this line item.\n\n{{rowSummary}}',
        form: [
          {
            type: 'NUMBER',
            name: 'approvedAmount',
            label: 'Approved Amount (if different)',
            required: false,
            placeholder: 'Leave blank to approve as-is'
          },
          {
            type: 'SELECT',
            name: 'rejectionReason',
            label: 'Rejection Reason (if rejecting)',
            required: false,
            options: [
              { label: 'Policy Violation', value: 'policy_violation' },
              { label: 'Budget Exceeded', value: 'budget_exceeded' },
              { label: 'Missing Documentation', value: 'missing_docs' },
              { label: 'Duplicate Entry', value: 'duplicate' },
              { label: 'Other', value: 'other' }
            ]
          },
          {
            type: 'TEXTAREA',
            name: 'approverComments',
            label: 'Comments',
            required: false,
            placeholder: 'Add any comments about your decision...'
          }
        ],
        assignment: {
          targets: defaultTargets,
          assignmentMode: 'ASSIGN',
          allowReassignment: true
        },
        dueInMinutes: 2880
      }
    ]
  }

  private buildBulkCollectionDefaultSteps(defaultTargets: { users: string[] } | null): AutomationFlowStep[] {
    return [
      {
        type: 'TASK',
        title: 'Submit Your Response',
        message:
          'Please complete this form. Your response will be added to the collection.\n\n{{collectionDescription}}',
        form: [
          {
            type: 'TEXTAREA',
            name: 'response',
            label: 'Your Response',
            required: true,
            placeholder: 'Enter your response here...'
          },
          {
            type: 'SELECT',
            name: 'confidence',
            label: 'Confidence Level',
            required: false,
            options: [
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' }
            ]
          },
          {
            type: 'TEXTAREA',
            name: 'additionalNotes',
            label: 'Additional Notes',
            required: false,
            placeholder: 'Any additional information...'
          }
        ],
        assignment: {
          targets: defaultTargets,
          assignmentMode: 'ASSIGN',
          allowReassignment: false
        },
        dueInMinutes: 10080
      }
    ]
  }

  /**
   * Get default description for automation type
   */
  private getDefaultDescription(type: string): string {
    const descriptions: Record<string, string> = {
      row_workflow: 'Process each row through a review and processing workflow',
      sheet_approval: 'Submit the entire spreadsheet for approval',
      line_approval: 'Approve or reject each line item individually',
      bulk_collection: 'Collect responses from multiple users into the spreadsheet'
    }
    return descriptions[type] || 'Spreadsheet automation workflow'
  }

  /**
   * Build step assignments for workflow execution
   * Uses initiatorId as the default assignee if no specific assignments are configured
   */
  private buildStepAssignments(
    automation: SpreadsheetAutomation,
    rowData: Record<string, unknown>,
    initiatorId?: string
  ): Record<string, unknown> {
    const assignments: Record<string, unknown> = {}

    // Default assignment to initiator
    const defaultAssignment = initiatorId
      ? {
          targets: { users: [initiatorId] },
          assignmentMode: 'ASSIGN',
          allowReassignment: true
        }
      : null

    // If approval config exists, use its approvers
    if (automation.approvalConfig?.approvalSteps) {
      automation.approvalConfig.approvalSteps.forEach((step, index) => {
        assignments[`step_${index}`] = {
          assignment: step.approvers
        }
      })
      return assignments
    }

    // For row workflows with dynamic template
    if (automation.workflowConfig.dynamicTemplate?.steps) {
      automation.workflowConfig.dynamicTemplate.steps.forEach((step, index) => {
        assignments[`step_${index}`] = {
          assignment: this.resolveStepAssignment(step.assignment, rowData, defaultAssignment)
        }
      })
      return assignments
    }

    // For default templates (no dynamic template configured), provide assignments for each step
    // Number of steps depends on automation type
    const stepCount = this.getDefaultStepCount(automation.type)
    for (let i = 0; i < stepCount; i++) {
      assignments[`step_${i}`] = {
        assignment: defaultAssignment
      }
    }

    return assignments
  }

  private resolveStepAssignment(
    assignment: AutomationFlowStep['assignment'] | undefined,
    rowData: Record<string, unknown>,
    defaultAssignment:
      | {
          targets: { users: string[] }
          assignmentMode: string
          allowReassignment: boolean
        }
      | null
      | undefined
  ): unknown {
    if (!assignment) return defaultAssignment
    if (!assignment.targets) {
      return {
        ...assignment,
        targets: defaultAssignment?.targets || assignment.targets
      }
    }
    const resolvedTargets = this.resolveAssignmentTargets(
      assignment.targets as unknown as Record<string, unknown>,
      rowData
    )
    return {
      ...assignment,
      targets: resolvedTargets
    }
  }

  /**
   * Get the number of steps in the default template for an automation type
   */
  private getDefaultStepCount(type: string): number {
    const stepCounts: Record<string, number> = {
      row_workflow: 2,
      sheet_approval: 2,
      line_approval: 1,
      bulk_collection: 1
    }
    return stepCounts[type] || 1
  }

  /**
   * Resolve assignment targets that may contain expressions
   */
  private resolveAssignmentTargets(
    targets: Record<string, unknown>,
    rowData: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(targets)) {
      if (Array.isArray(value)) {
        resolved[key] = value.map(v => {
          if (typeof v === 'string' && v.startsWith('{{') && v.endsWith('}}')) {
            return this.resolveExpression(v, rowData)
          }
          return v
        })
      } else {
        resolved[key] = value
      }
    }

    return resolved
  }

  /**
   * Build workflow tags for spreadsheet linking
   */
  buildWorkflowTags(params: {
    spreadsheetId: string
    sheetId: string
    rowId: string
    automationId: string
    automationType: string
    bulkGroupId?: string
    recipientId?: string
  }): SpreadsheetWorkflowTags {
    return {
      app: 'spreadsheet-automation',
      spreadsheetId: params.spreadsheetId,
      sheetId: params.sheetId,
      rowId: params.rowId,
      automationId: params.automationId,
      automationType: params.automationType as SpreadsheetWorkflowTags['automationType'],
      ...(params.bulkGroupId ? { bulkGroupId: params.bulkGroupId } : {}),
      ...(params.recipientId ? { recipientId: params.recipientId } : {})
    }
  }

  /**
   * Get workflow status for a specific workflow ID
   */
  async getWorkflowStatus(workflowId: string): Promise<{
    status: WorkflowStatus
    currentStep: number
    totalSteps: number
    outputData?: Record<string, unknown>
  } | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/flows/${workflowId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      const flow = data.data || data

      return {
        status: this.mapFlowStatus(flow.status),
        currentStep: flow.currentStepIndex ?? flow.progress?.currentStep ?? 0,
        totalSteps: flow.totalSteps ?? flow.progress?.totalSteps ?? 1,
        outputData: flow.output || flow.outputData
      }
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Get workflow status error:', error)
      return null
    }
  }

  /**
   * Get workflow links for all rows with active workflows in a sheet
   */
  async getWorkflowLinksForSheet(params: { spreadsheetId: string; sheetId: string }): Promise<WorkflowRowLink[]> {
    try {
      // Query flows by tags to find all workflows for this sheet
      const response = await fetch(
        `${this.apiBaseUrl}/flows/list?tags.app=spreadsheet-automation&tags.spreadsheetId=${params.spreadsheetId}&tags.sheetId=${params.sheetId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      )

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      const flows = data.data?.flows || data.flows || []

      return flows.map((flow: Record<string, unknown>) => ({
        rowId: (flow.tags as Record<string, string>)?.rowId || '',
        workflowId: (flow.workflowId as string) || (flow.id as string),
        workflowStatus: this.mapFlowStatus(flow.status as string),
        currentStepIndex: (flow.progress as Record<string, number>)?.currentStep ?? 0,
        totalSteps: (flow.progress as Record<string, number>)?.totalSteps ?? 1,
        startedAt: (flow.startedAt as string) || (flow.createdAt as string),
        completedAt: flow.completedAt as string,
        lastUpdatedAt: (flow.updatedAt as string) || (flow.startedAt as string),
        automationId: (flow.tags as Record<string, string>)?.automationId || ''
      }))
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Get workflow links error:', error)
      return []
    }
  }

  /**
   * Fetch completed bulk collection responses
   * Returns form data from completed workflows to be added as new rows
   */
  async fetchBulkCollectionResponses(params: {
    spreadsheetId: string
    sheetId: string
    automationId: string
    bulkGroupId?: string
    automationType?: 'bulk_collection' | 'excel_collection'
  }): Promise<
    Array<{
      workflowId: string
      responderId: string
      responderName: string
      responderEmail?: string
      submittedAt: string
      formData: Record<string, unknown>
      status: 'COMPLETED' | 'PENDING' | 'FAILED'
    }>
  > {
    try {
      // Document-service lists flows and filters by tags (supports bulk_collection + excel_collection).
      const aggregateUrl = `${getDocumentServiceApiUrl().replace(/\/+$/, '')}/automations/webhooks/spreadsheet/aggregate-bulk`

      const queryParams = new URLSearchParams({
        spreadsheetId: params.spreadsheetId,
        sheetId: params.sheetId,
        automationId: params.automationId,
        ...(params.bulkGroupId && { bulkGroupId: params.bulkGroupId })
      })

      const response = await fetch(`${aggregateUrl}?${queryParams}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          spreadsheetId: params.spreadsheetId,
          sheetId: params.sheetId,
          automationId: params.automationId,
          bulkGroupId: params.bulkGroupId || params.automationId,
          automationType: params.automationType || 'bulk_collection'
        })
      })

      if (!response.ok) {
        automationDebug('[SpreadsheetAutomationService] aggregate-bulk endpoint failed, using fallback')
        // If no aggregation endpoint, fall back to querying flows directly
        return this.fetchBulkResponsesFromFlows({
          ...params,
          automationType: params.automationType || 'bulk_collection'
        })
      }

      const data = await response.json()
      automationDebug('[SpreadsheetAutomationService] aggregate-bulk response:', {
        totalWorkflows: data.totalWorkflows,
        completedCount: data.completedResults?.length || 0
      })

      // If aggregate-bulk returns empty results, fall back to flow-based query ONLY for bulk_collection.
      // For excel_collection the document-service is the source of truth; an empty response means
      // no submissions yet and we must NOT hit the flow engine (which may not track these workflows).
      if (!data.completedResults || data.completedResults.length === 0) {
        if (params.automationType === 'excel_collection') {
          return []
        }
        automationDebug('[SpreadsheetAutomationService] aggregate-bulk returned empty, using fallback')
        return this.fetchBulkResponsesFromFlows({
          ...params,
          automationType: params.automationType || 'bulk_collection'
        })
      }

      return (data.completedResults || []).map((result: Record<string, unknown>) =>
        this.mapCompletedBulkResult(result, params.automationType)
      )
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Fetch bulk responses error:', error)
      // Fall back to querying flows directly
      return this.fetchBulkResponsesFromFlows({
        ...params,
        automationType: params.automationType || 'bulk_collection'
      })
    }
  }

  private mapCompletedBulkResult(
    result: Record<string, unknown>,
    automationType?: 'bulk_collection' | 'excel_collection'
  ): {
    workflowId: string
    responderId: string
    responderName: string
    responderEmail?: string
    submittedAt: string
    formData: Record<string, unknown>
    status: 'COMPLETED'
  } {
    const outputData = (result.outputData as Record<string, unknown>) || {}
    const tags = (result.tags as Record<string, string>) || {}
    const formDataBase = (outputData.formData as Record<string, unknown>) || outputData

    const workflowId = String(
      result.workflowId ||
        result.flowId ||
        result.id ||
        (result.data as Record<string, unknown> | undefined)?.workflowId ||
        ''
    ).trim()

    const responderIdRaw =
      (outputData.responderId as string) ||
      (outputData.userId as string) ||
      (outputData.recipientId as string) ||
      (outputData.assignedTo as string) ||
      (outputData.ownerId as string) ||
      (formDataBase.responderId as string) ||
      (formDataBase.recipientId as string) ||
      (formDataBase.userId as string) ||
      (formDataBase.ownerId as string) ||
      tags.recipientId ||
      tags.userId ||
      tags.ownerId ||
      ''
    const responderId = responderIdRaw && String(responderIdRaw).trim() ? String(responderIdRaw).trim() : ''

    let formData = formDataBase
    if (automationType === 'excel_collection') {
      const outputContext = (outputData.context as Record<string, unknown>) || {}
      formData = this.enrichExcelCollectionFormData(formData, tags, outputData, outputContext, formDataBase)
    }

    return {
      workflowId,
      responderId,
      responderName:
        (outputData.responderName as string) ||
        (formDataBase.responderName as string) ||
        (outputData.ownerName as string) ||
        'Unknown',
      responderEmail:
        (outputData.responderEmail as string) ||
        (formDataBase.responderEmail as string) ||
        (outputData.ownerEmail as string),
      submittedAt: (result.completedAt as string) || new Date().toISOString(),
      formData,
      status: 'COMPLETED'
    }
  }

  private enrichExcelCollectionFormData(
    formData: Record<string, unknown>,
    tags: Record<string, string>,
    outputData: Record<string, unknown>,
    outputContext: Record<string, unknown>,
    formDataBase: Record<string, unknown>
  ): Record<string, unknown> {
    const copyAppId = String(
      tags.copyAppId ||
        tags.copy_app_id ||
        (outputData.copyAppId as string) ||
        (outputData.copy_app_id as string) ||
        (outputContext.copyAppId as string) ||
        (outputContext.copy_app_id as string) ||
        (formDataBase.copyAppId as string) ||
        (formDataBase.copy_app_id as string) ||
        ''
    ).trim()
    const copyUrl = String(
      (outputData.copyUrl as string) ||
        (outputData.copyURL as string) ||
        (outputData.copyLink as string) ||
        (outputData.copy_link as string) ||
        (outputContext.copyUrl as string) ||
        (outputContext.copyURL as string) ||
        (outputContext.copyLink as string) ||
        (outputContext.copy_link as string) ||
        (formDataBase.copyUrl as string) ||
        (formDataBase.copyURL as string) ||
        (formDataBase.copyLink as string) ||
        (formDataBase.copy_link as string) ||
        ''
    ).trim()
    if (copyAppId || copyUrl) {
      return {
        ...formData,
        ...(copyAppId ? { copyAppId } : {}),
        ...(copyUrl ? { copyUrl } : {})
      }
    }
    return formData
  }

  /**
   * Fallback: Fetch bulk responses directly from flow data
   */
  private async fetchBulkResponsesFromFlows(params: {
    spreadsheetId: string
    sheetId: string
    automationId: string
    automationType?: 'bulk_collection' | 'excel_collection'
  }): Promise<
    Array<{
      workflowId: string
      responderId: string
      responderName: string
      responderEmail?: string
      submittedAt: string
      formData: Record<string, unknown>
      status: 'COMPLETED' | 'PENDING' | 'FAILED'
    }>
  > {
    try {
      // Query flows by tags - this is a POLLING fallback, minimal logging to avoid console spam
      let flows: Array<Record<string, unknown>> = []

      // Try GET /flows/list - the most commonly available endpoint
      try {
        const listResponse = await fetch(`${this.apiBaseUrl}/flows/list`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        })

        if (listResponse.ok) {
          const listData = await listResponse.json()
          const allFlows = listData.data?.flows || listData.flows || (Array.isArray(listData) ? listData : [])

          // Filter flows by tags manually (support both bulk_collection and excel_collection)
          const automationType = params.automationType || 'bulk_collection'
          flows = allFlows.filter((flow: Record<string, unknown>) => {
            const tags = (flow.tags as Record<string, string>) || {}
            const baseMatch =
              tags.app === 'spreadsheet-automation' &&
              tags.automationType === automationType &&
              tags.automationId === params.automationId &&
              flow.status === 'COMPLETED'
            // excel_collection flows from document-service don't set spreadsheetId in tags; automationId is sufficient
            if (automationType === 'excel_collection') return baseMatch
            return baseMatch && tags.spreadsheetId === params.spreadsheetId
          })
        }
      } catch {
        // Silently ignore - polling will retry
      }

      if (flows.length === 0) {
        // No completed flows found - this is normal during polling
        return []
      }

      // Fetch detailed output for each completed flow
      const results = await Promise.all(
        flows.map(async (flow: Record<string, unknown>) => {
          // Try all possible property names for flow ID
          const flowId =
            (flow.id as string) || (flow.workflowId as string) || (flow.flowId as string) || (flow._id as string)
          const tags = (flow.tags as Record<string, string>) || {}
          const recipientId = tags.recipientId

          automationDebug('[SpreadsheetAutomationService] Processing flow:', {
            flowId,
            flowKeys: Object.keys(flow),
            status: flow.status,
            recipientId
          })

          if (!flowId) {
            console.warn('[SpreadsheetAutomationService] Flow has no ID, skipping:', flow)
            return null
          }
          let formData = await this.resolveBulkFlowFormData(flowId, recipientId)
          // For excel_collection, ensure copyAppId from tags is in formData for the copy link
          if (params.automationType === 'excel_collection' && tags.copyAppId) {
            formData = { ...formData, copyAppId: tags.copyAppId }
          }
          automationDebug('[SpreadsheetAutomationService] Final form data for flow', flowId, ':', formData)

          return {
            workflowId: flowId,
            responderId: recipientId || '',
            responderName: 'Unknown',
            responderEmail: undefined,
            submittedAt: (flow.completedAt as string) || new Date().toISOString(),
            formData,
            status: 'COMPLETED' as const
          }
        })
      )

      // Filter out null results (flows with no ID)
      const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null)
      automationDebug('[SpreadsheetAutomationService] Returning', validResults.length, 'completed responses')
      return validResults
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Fetch flows fallback error:', error)
      return []
    }
  }

  private async resolveBulkFlowFormData(flowId: string, recipientId?: string): Promise<Record<string, unknown>> {
    const fromStep0 = await this.fetchFormDataFromStep0(flowId)
    if (fromStep0 && Object.keys(fromStep0).length > 0) return fromStep0

    const fromTasks = recipientId ? await this.fetchFormDataFromCompletedTasks(flowId, recipientId) : null
    if (fromTasks && Object.keys(fromTasks).length > 0) return fromTasks

    const fromFlowDetail = await this.fetchFormDataFromFlowDetail(flowId)
    return fromFlowDetail && Object.keys(fromFlowDetail).length > 0 ? fromFlowDetail : {}
  }

  private async fetchFormDataFromStep0(flowId: string): Promise<Record<string, unknown> | null> {
    try {
      const stepDataResponse = await fetch(`${this.apiBaseUrl}/flows/${flowId}/steps/step_0/data`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      })
      if (!stepDataResponse.ok) return null

      const stepData = await stepDataResponse.json()
      const dataEntries = stepData.data || []
      if (!Array.isArray(dataEntries) || dataEntries.length === 0) return null

      const latestEntry = dataEntries[dataEntries.length - 1] as Record<string, unknown>
      // Primary: formData or inputData from step export
      let formData = (latestEntry.formData || latestEntry.inputData) as Record<string, unknown> | undefined
      if (formData && Object.keys(formData).length > 0) return formData

      // Fallback: extract from output_data / outputData (raw task output)
      const rawOutput =
        (latestEntry.output_data as Record<string, unknown>) || (latestEntry.outputData as Record<string, unknown>)
      if (rawOutput && typeof rawOutput === 'object') {
        formData =
          (rawOutput.formData as Record<string, unknown>) ||
          (rawOutput.inputData as Record<string, unknown>) ||
          rawOutput
        // Use rawOutput as formData if it has no known nested keys (form fields at top level)
        if (formData && Object.keys(formData).length > 0) return formData
      }
      return null
    } catch (err) {
      automationDebug('[SpreadsheetAutomationService] /steps/step_0/data endpoint error:', err)
      return null
    }
  }

  private async fetchFormDataFromCompletedTasks(
    flowId: string,
    recipientId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const tasksResponse = await fetch(`${this.apiBaseUrl}/tasks/user/${recipientId}/completed?limit=50`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      })
      if (!tasksResponse.ok) return null

      const tasksData = await tasksResponse.json()
      const tasks = tasksData.data?.tasks || tasksData.tasks || tasksData || []
      if (!Array.isArray(tasks)) return null

      const flowTask = tasks.find((t: Record<string, unknown>) => t.flowId === flowId || t.workflowId === flowId)
      if (!flowTask) return null

      // Try multiple shapes: formData, outputData.formData, outputData.inputData.formData
      let formData = (flowTask.formData as Record<string, unknown>) || {}
      if (Object.keys(formData).length === 0) {
        const outputData = (flowTask.outputData || flowTask.output_data || flowTask.data) as Record<string, unknown>
        if (outputData && typeof outputData === 'object') {
          formData =
            (outputData.formData as Record<string, unknown>) ||
            ((outputData.inputData as Record<string, unknown>)?.formData as Record<string, unknown>) ||
            outputData
        }
      }
      return formData && Object.keys(formData).length > 0 ? formData : null
    } catch (err) {
      automationDebug('[SpreadsheetAutomationService] Error fetching completed tasks:', err)
      return null
    }
  }

  private extractFormDataFromFlowOutput(
    outputData: Record<string, unknown> | undefined
  ): Record<string, unknown> | null {
    if (!outputData || Object.keys(outputData).length === 0) return null
    const fromOutput = (outputData.formData as Record<string, unknown> | undefined) || outputData
    return Object.keys(fromOutput).length > 0 ? fromOutput : null
  }

  private extractFormDataFromFlowSteps(
    steps: Array<Record<string, unknown>> | undefined
  ): Record<string, unknown> | null {
    if (!Array.isArray(steps)) return null
    for (const step of steps) {
      const outputs = step.outputs as Record<string, unknown> | undefined
      if (outputs && Object.keys(outputs).length > 0) {
        const fromOutputs = (outputs.formData as Record<string, unknown> | undefined) || outputs
        if (Object.keys(fromOutputs).length > 0) return fromOutputs
      }
      const formData = step.formData as Record<string, unknown> | undefined
      if (formData && Object.keys(formData).length > 0) return formData
    }
    return null
  }

  private async fetchFormDataFromFlowDetail(flowId: string): Promise<Record<string, unknown> | null> {
    try {
      const detailResponse = await fetch(`${this.apiBaseUrl}/flows/${flowId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      })
      if (!detailResponse.ok) return null

      const detailData = await detailResponse.json()
      const flowDetail = detailData.data || detailData

      const outputData = flowDetail?.outputData as Record<string, unknown> | undefined
      const fromOutput = this.extractFormDataFromFlowOutput(outputData)
      if (fromOutput) return fromOutput

      const steps = flowDetail?.steps as Array<Record<string, unknown>> | undefined
      return this.extractFormDataFromFlowSteps(steps)
    } catch (detailErr) {
      console.error('[SpreadsheetAutomationService] Error fetching flow detail:', detailErr)
      return null
    }
  }

  /**
   * Map flow engine status to our WorkflowStatus type
   */
  private mapFlowStatus(status: string): WorkflowStatus {
    const statusMap: Record<string, WorkflowStatus> = {
      RUNNING: 'RUNNING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      CANCELED: 'CANCELED',
      TIMED_OUT: 'TIMED_OUT',
      PENDING: 'PENDING',
      // Handle conductor statuses
      IN_PROGRESS: 'RUNNING',
      SCHEDULED: 'PENDING',
      TERMINATED: 'CANCELED'
    }

    return statusMap[status] || 'PENDING'
  }

  /**
   * Check if the current user has an open Excel Collection task for this app (collection copy).
   * Used as fallback when app.settings.excel_collection_copy is not set (e.g. dev doc service).
   */
  async hasExcelCollectionTaskForApp(copyAppId: string, userId: string): Promise<boolean> {
    try {
      const tasksRes = await fetch(`${this.apiBaseUrl}/tasks/user/${userId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      })
      if (!tasksRes.ok) return false

      const tasksData = (await tasksRes.json()) as {
        tasks?: Array<Record<string, unknown>>
        data?: { tasks?: Array<Record<string, unknown>> }
      }
      const tasks = tasksData.tasks || tasksData.data?.tasks || []
      if (!Array.isArray(tasks)) return false

      const flowsRes = await fetch(`${this.apiBaseUrl}/flows/list`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      })
      if (!flowsRes.ok) return false

      const flowsData = await flowsRes.json()
      const flows = flowsData.data?.flows || flowsData.flows || []
      const matchingFlow = (Array.isArray(flows) ? flows : []).find((f: Record<string, unknown>) => {
        const tags = (f.tags as Record<string, string>) || {}
        return (
          tags.app === 'spreadsheet-automation' &&
          tags.automationType === 'excel_collection' &&
          tags.copyAppId === copyAppId &&
          (f.status === 'RUNNING' || f.status === 'PENDING' || f.status === 'IN_PROGRESS')
        )
      }) as Record<string, unknown> | undefined

      if (!matchingFlow) return false

      const flowId =
        (matchingFlow.id as string) || (matchingFlow.workflowId as string) || (matchingFlow.flowId as string) || ''
      const task = tasks.find(
        (t: Record<string, unknown>) =>
          t.flowId === flowId ||
          t.workflowId === flowId ||
          t.businessKey === flowId ||
          (t.flow as Record<string, unknown>)?.id === flowId
      )
      return Boolean(task)
    } catch {
      return false
    }
  }

  /**
   * Find and complete the Excel Collection task for the current user viewing their copy.
   * Looks up the open task by copyAppId (stored in flow tags) and completes it.
   * Pass formData to capture submitted spreadsheet row data in the report sheet.
   */
  async findAndCompleteExcelCollectionTask(
    copyAppId: string,
    userId: string,
    formData?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const tasks = await this.fetchUserTasks(userId)
      if (!tasks) {
        const marked = await this.markDocumentRunSubmissionComplete(copyAppId)
        return marked ? { success: true } : { success: false, error: 'Failed to load your task' }
      }
      if (tasks.length === 0) {
        return { success: false, error: 'No tasks found' }
      }

      const flowId = await this.findActiveExcelCollectionFlowId(copyAppId)
      const targetTaskId = flowId ? this.findTaskIdByFlow(tasks, flowId) : null
      if (!targetTaskId) {
        const marked = await this.markDocumentRunSubmissionComplete(copyAppId)
        if (marked) {
          return { success: true }
        }
        return { success: false, error: 'Could not find your collection task. It may already be completed.' }
      }

      const completed = await this.completeTask(targetTaskId, userId, copyAppId, formData)
      if (!completed) {
        return { success: false, error: 'Failed to submit' }
      }

      // 4. Notify document-service so automation run counters/status are updated.
      // This keeps manager "In Progress" state in sync with recipient submissions.
      await this.markDocumentRunSubmissionComplete(copyAppId)

      return { success: true }
    } catch (e) {
      console.error('[SpreadsheetAutomationService] findAndCompleteExcelCollectionTask error:', e)
      return { success: false, error: e instanceof Error ? e.message : 'Submit failed' }
    }
  }

  private async fetchUserTasks(userId: string): Promise<Array<Record<string, unknown>> | null> {
    const tasksRes = await fetch(`${this.apiBaseUrl}/tasks/user/${userId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    if (!tasksRes.ok) {
      const err = await tasksRes.text()
      console.error('[SpreadsheetAutomationService] Failed to fetch user tasks:', tasksRes.status, err)
      return null
    }
    const tasksData = (await tasksRes.json()) as {
      tasks?: Array<Record<string, unknown>>
      data?: { tasks?: Array<Record<string, unknown>> }
    }
    const tasks = tasksData.tasks || tasksData.data?.tasks || []
    return Array.isArray(tasks) ? tasks : []
  }

  private async findActiveExcelCollectionFlowId(copyAppId: string): Promise<string | null> {
    try {
      const flowsRes = await fetch(`${this.apiBaseUrl}/flows/list`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      })
      if (!flowsRes.ok) return null
      const flowsData = await flowsRes.json()
      const flows = flowsData.data?.flows || flowsData.flows || []
      const matchingFlow = (Array.isArray(flows) ? flows : []).find((flow: Record<string, unknown>) => {
        const tags = (flow.tags as Record<string, string>) || {}
        return (
          tags.app === 'spreadsheet-automation' &&
          tags.automationType === 'excel_collection' &&
          tags.copyAppId === copyAppId &&
          (flow.status === 'RUNNING' || flow.status === 'PENDING' || flow.status === 'IN_PROGRESS')
        )
      }) as Record<string, unknown> | undefined
      if (!matchingFlow) return null
      return (
        (matchingFlow.id as string) || (matchingFlow.workflowId as string) || (matchingFlow.flowId as string) || null
      )
    } catch (e) {
      console.error('[SpreadsheetAutomationService] Error finding excel collection task:', e)
      return null
    }
  }

  private findTaskIdByFlow(tasks: Array<Record<string, unknown>>, flowId: string): string | null {
    const task = tasks.find(
      (t: Record<string, unknown>) =>
        t.flowId === flowId ||
        t.workflowId === flowId ||
        t.businessKey === flowId ||
        (t.flow as Record<string, unknown>)?.id === flowId
    ) as Record<string, unknown> | undefined
    if (!task) return null
    return ((task.id as string) || (task.taskId as string) || '').trim() || null
  }

  private async completeTask(
    taskId: string,
    userId: string,
    copyAppId: string,
    formData?: Record<string, unknown>
  ): Promise<boolean> {
    const baseFormData = { submitted: true, copyAppId }
    const mergedFormData =
      formData && Object.keys(formData).length > 0 ? { ...formData, ...baseFormData } : baseFormData

    const completeRes = await fetch(`${this.apiBaseUrl}/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({
        userId,
        formData: mergedFormData
      })
    })
    if (!completeRes.ok) {
      const err = await completeRes.text()
      console.error('[SpreadsheetAutomationService] Task complete failed:', completeRes.status, err)
      return false
    }
    return true
  }

  private async markDocumentRunSubmissionComplete(copyAppId: string): Promise<boolean> {
    try {
      const docBase = getDocumentServiceApiUrl().replace(/\/+$/, '')
      const markRes = await fetch(`${docBase}/automations/runs/submissions/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ copyAppId })
      })
      if (!markRes.ok) {
        const markErr = await markRes.text().catch(() => '')
        console.error('[SpreadsheetAutomationService] Failed to mark run submission complete:', markRes.status, markErr)
        return false
      }
      return true
    } catch (markError) {
      console.error('[SpreadsheetAutomationService] Error marking run submission complete:', markError)
      return false
    }
  }

  /**
   * Split array into chunks for concurrent processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) => array.slice(i * size, (i + 1) * size))
  }

  /**
   * Resolve a list of user IDs to a { [userId]: displayName } map.
   * Used to name each collection copy "Template - Recipient Name" instead of "Template (Copy)".
   */
  private async resolveRecipientDisplayNames(userIds: string[]): Promise<Record<string, string>> {
    if (!userIds.length) return {}
    const query = `
      query GetEmployeeDisplayNames($userIds: [String!]!) {
        Employee(where: { userId: { _in: $userIds }, isDeleted: { _eq: false } }) {
          userId
          firstName
          lastName
          displayName
        }
      }
    `
    try {
      const result = (await this.executeGraphQLQuery(query, { userIds })) as {
        Employee?: Array<{ userId?: string; firstName?: string; lastName?: string; displayName?: string }>
      } | null
      const names: Record<string, string> = {}
      for (const emp of result?.Employee || []) {
        if (!emp.userId) continue
        const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.userId
        names[emp.userId] = name
      }
      return names
    } catch {
      return {}
    }
  }

  /**
   * Resolve recipients by type (team = direct reports, department = all department members)
   * Uses GraphQL to query Employee data with proper supervisor/department relationships
   */
  private async resolveRecipientsByType(recipientType: 'team' | 'department', initiatorId: string): Promise<string[]> {
    automationDebug('[SpreadsheetAutomationService] Resolving recipients by type:', { recipientType, initiatorId })

    try {
      // First, get the employee ID for the initiator (we have user ID, need employee ID)
      const initiatorEmployeeId = await this.getEmployeeIdForUser(initiatorId)

      if (!initiatorEmployeeId) {
        console.warn('[SpreadsheetAutomationService] Could not find employee record for user:', initiatorId)
        // Try alternative: the initiatorId might already be an employee ID
        // Continue with the provided ID and see if it works
      }

      const employeeIdToUse = initiatorEmployeeId || initiatorId
      automationDebug('[SpreadsheetAutomationService] Using employee ID for resolution:', employeeIdToUse)

      let recipientUserIds: string[] = []

      if (recipientType === 'team') {
        // Get direct reports using GraphQL - employees where supervisorEmployeeId = this employee
        const directReportsQuery = `
          query GetDirectReports($supervisorEmployeeId: uuid!) {
            Employee(
              where: {
                employeePosition: { supervisorEmployeeId: { _eq: $supervisorEmployeeId } },
                isDeleted: { _eq: false }
              }
              limit: 100
            ) {
              id
              userId
              firstName
              lastName
              displayName
            }
          }
        `

        const result = await this.executeGraphQLQuery(directReportsQuery, {
          supervisorEmployeeId: employeeIdToUse
        })

        const employees = (result?.Employee as Array<{ userId?: string }>) || []
        automationDebug('[SpreadsheetAutomationService] Found', employees.length, 'direct reports')

        recipientUserIds = employees
          .map(emp => emp.userId)
          .filter((id): id is string => Boolean(id) && id !== initiatorId)
      } else if (recipientType === 'department') {
        // First get the initiator's department
        const initiatorQuery = `
          query GetInitiatorDepartment($employeeId: uuid!) {
            Employee(where: { id: { _eq: $employeeId } }) {
              employeePosition {
                organizationalUnit {
                  id
                  name
                }
              }
            }
          }
        `

        const initiatorResult = (await this.executeGraphQLQuery(initiatorQuery, {
          employeeId: employeeIdToUse
        })) as { Employee?: Array<{ employeePosition?: { organizationalUnit?: { id?: string } } }> } | null

        const departmentId = initiatorResult?.Employee?.[0]?.employeePosition?.organizationalUnit?.id

        if (departmentId) {
          automationDebug('[SpreadsheetAutomationService] Found department ID:', departmentId)

          // Get all employees in the same department
          const departmentQuery = `
            query GetDepartmentMembers($departmentId: uuid!) {
              Employee(
                where: {
                  employeePosition: { 
                    organizationalUnit: { id: { _eq: $departmentId } }
                  },
                  isDeleted: { _eq: false }
                }
                limit: 100
              ) {
                id
                userId
                firstName
                lastName
                displayName
              }
            }
          `

          const deptResult = await this.executeGraphQLQuery(departmentQuery, { departmentId })
          const employees = (deptResult?.Employee as Array<{ userId?: string }>) || []
          automationDebug('[SpreadsheetAutomationService] Found', employees.length, 'department members')

          recipientUserIds = employees
            .map(emp => emp.userId)
            .filter((id): id is string => Boolean(id) && id !== initiatorId)
        } else {
          console.warn('[SpreadsheetAutomationService] Could not find department for employee:', employeeIdToUse)
        }
      }

      automationDebug(
        '[SpreadsheetAutomationService] Resolved',
        recipientUserIds.length,
        'recipient user IDs for',
        recipientType
      )
      return recipientUserIds
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Error resolving recipients:', error)
      throw error
    }
  }

  /**
   * Resolve recipient IDs (employee or user) to user IDs for task assignment.
   * Flow engine matches tasks by userId; employee IDs won't show in recipient's inbox.
   * IDs that don't match as employee IDs are assumed to be user IDs (from updated wizard).
   */
  private async resolveEmployeeIdsToUserIds(recipientIds: string[]): Promise<string[]> {
    if (!recipientIds.length) return []
    const query = `
      query GetUserIdsForEmployees($ids: [uuid!]!) {
        Employee(where: { id: { _in: $ids }, isDeleted: { _eq: false } }) {
          id
          userId
        }
      }
    `
    const result = (await this.executeGraphQLQuery(query, { ids: recipientIds })) as {
      Employee?: Array<{ id: string; userId?: string }>
    } | null
    const employees = result?.Employee || []
    const employeeIdToUserId = new Map<string, string>()
    for (const emp of employees) {
      if (emp.userId) employeeIdToUserId.set(emp.id, emp.userId)
    }
    return recipientIds.map(id => employeeIdToUserId.get(id) || id)
  }

  /**
   * Get employee ID for a given user ID
   */
  private async getEmployeeIdForUser(userId: string): Promise<string | null> {
    const query = `
      query GetEmployeeByUserId($userId: uuid!) {
        Employee(where: { userId: { _eq: $userId }, isDeleted: { _eq: false } }) {
          id
        }
      }
    `

    const result = (await this.executeGraphQLQuery(query, { userId })) as { Employee?: Array<{ id?: string }> } | null
    return result?.Employee?.[0]?.id || null
  }

  /**
   * Execute a GraphQL query against the NEWWORK API
   */
  private async executeGraphQLQuery(
    query: string,
    variables: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    let graphqlUrl = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')
    if (!graphqlUrl || graphqlUrl.includes('${')) {
      const baseUrl = env('NEXT_PUBLIC_BASE_URL')
      if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        graphqlUrl = `${baseUrl.replace(/\/+$/, '')}/v1/graphql`
      }
    }
    if (!graphqlUrl) {
      console.error(
        '[SpreadsheetAutomationService] GraphQL endpoint not configured. Set NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK or NEXT_PUBLIC_BASE_URL in .env'
      )
      return null
    }
    if (graphqlUrl.includes('localhost') || graphqlUrl.includes('127.0.0.1')) {
      console.error(
        '[SpreadsheetAutomationService] GraphQL must point to remote API, not localhost. Set NEXT_PUBLIC_BASE_URL to the remote backend (e.g. https://newwork-dev.newwork.com).'
      )
      return null
    }

    try {
      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ query, variables })
      })

      if (!response.ok) {
        console.error('[SpreadsheetAutomationService] GraphQL request failed:', response.status)
        return null
      }

      const result = await response.json()

      if (result.errors) {
        console.error('[SpreadsheetAutomationService] GraphQL errors:', result.errors)
        return null
      }

      return result.data
    } catch (error) {
      console.error('[SpreadsheetAutomationService] GraphQL execution error:', error)
      return null
    }
  }
}

/**
 * Create an instance of SpreadsheetAutomationService
 */
export function createSpreadsheetAutomationService(
  accessToken: string,
  apiBaseUrl?: string
): SpreadsheetAutomationService {
  return new SpreadsheetAutomationService(accessToken, apiBaseUrl)
}
