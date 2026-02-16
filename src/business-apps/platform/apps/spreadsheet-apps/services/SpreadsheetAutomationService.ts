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
  AutomationFormInput,
  AutomationInputType,
  AutomationStepType
} from '../types/automation'
import { env } from '@/common/env/EnvUtils'
import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

// Flow engine API base URL for tasks, flows, etc.
// Develop flow engine uses /api/... (not /api/v1/...) for tasks and flows
const getFlowEngineApiUrl = () => {
  const envUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL')
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')

  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    const normalized = envUrl.trim().replace(/\/+$/, '')
    // Strip /api/v1 suffix - develop flow engine serves tasks/flows at /api/... not /api/v1/...
    if (normalized.endsWith('/api/v1')) {
      return normalized.slice(0, -3) // remove 'v1' (3 chars) -> .../flow-engine/api/
    }
    return normalized.includes('/api') ? normalized : `${normalized}/api`
  }

  if (baseUrl) {
    const normalized = baseUrl.trim().replace(/\/+$/, '')
    return `${normalized}/flow-engine/api`
  }

  if (typeof window !== 'undefined') {
    const { protocol, host } = window.location
    return `${protocol}//${host}/flow-engine/api`
  }

  return '/flow-engine/api'
}

// execute-dynamic lives at /api/templates/execute-dynamic (not under /api/v1) on develop flow engine
const getExecuteDynamicUrl = () => `${getFlowEngineBaseUrl()}/api/templates/execute-dynamic`

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
  private accessToken: string
  private apiBaseUrl: string

  constructor(accessToken: string, apiBaseUrl?: string) {
    this.accessToken = accessToken
    this.apiBaseUrl = apiBaseUrl || getFlowEngineApiUrl()
    console.log('[SpreadsheetAutomationService] Initialized with API URL:', this.apiBaseUrl)
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

      console.log('[SpreadsheetAutomationService] Executing workflow:', {
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
      console.log('[SpreadsheetAutomationService] Workflow started:', result)

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

    console.log('[SpreadsheetAutomationService] Running automation:', {
      type: automation.type,
      name: automation.name,
      rowCount: rows?.length,
      recipientCount: recipients?.length,
      collectionConfigRecipients: automation.collectionConfig?.recipients?.length,
      hasCollectionConfig: !!automation.collectionConfig
    })

    switch (automation.type) {
      case 'bulk_collection':
        // Bulk collection executes per RECIPIENT, not per row
        let collectionRecipients = recipients || automation.collectionConfig?.recipients || []
        const recipientType = automation.collectionConfig?.recipientType || 'specific'

        console.log('[SpreadsheetAutomationService] Bulk collection config:', {
          recipientType,
          explicitRecipients: collectionRecipients.length,
          configRecipients: automation.collectionConfig?.recipients?.length
        })

        // If recipientType is 'team' or 'department', resolve to actual user IDs
        if ((recipientType === 'team' || recipientType === 'department') && collectionRecipients.length === 0) {
          try {
            collectionRecipients = await this.resolveRecipientsByType(recipientType, initiatorId)
            console.log('[SpreadsheetAutomationService] Resolved', recipientType, 'recipients:', collectionRecipients)
          } catch (error) {
            console.error('[SpreadsheetAutomationService] Failed to resolve recipients:', error)
            return {
              success: false,
              error: `Failed to resolve ${recipientType} members. Please try again or select specific people.`,
              workflows: [],
              executedAt: new Date().toISOString(),
              totalRows: 0
            }
          }
        }

        // Resolve employee IDs to user IDs - flow engine assigns tasks by userId
        if (recipientType === 'specific' && collectionRecipients.length > 0) {
          try {
            const resolved = await this.resolveEmployeeIdsToUserIds(collectionRecipients)
            if (resolved.length > 0) {
              collectionRecipients = resolved
              console.log('[SpreadsheetAutomationService] Resolved specific recipients to user IDs:', resolved.length)
            }
          } catch (error) {
            console.warn('[SpreadsheetAutomationService] Could not resolve some recipients to user IDs:', error)
          }
        }

        if (collectionRecipients.length === 0) {
          console.error('[SpreadsheetAutomationService] ERROR: No recipients for bulk collection!')
          return {
            success: false,
            error:
              recipientType === 'specific'
                ? 'No recipients specified for bulk collection. Please edit this automation and select recipients.'
                : `No ${recipientType} members found. Please check your team/department membership.`,
            workflows: [],
            executedAt: new Date().toISOString(),
            totalRows: 0
          }
        }
        return this.executeBulkCollection({
          automation,
          recipients: collectionRecipients,
          spreadsheetId,
          sheetId,
          initiatorId,
          accessToken
        })

      case 'excel_collection':
        // Excel collection: duplicate template for each recipient, share, create flow task with link
        {
          const templateId = automation.collectionConfig?.templateSpreadsheetId
          if (!templateId) {
            return {
              success: false,
              error: 'No template spreadsheet configured for Excel Collection. Please edit the automation.',
              workflows: [],
              executedAt: new Date().toISOString(),
              totalRows: 0
            }
          }

          let excelRecipients = recipients || automation.collectionConfig?.recipients || []
          const excelRecipientType = automation.collectionConfig?.recipientType || 'specific'

          if ((excelRecipientType === 'team' || excelRecipientType === 'department') && excelRecipients.length === 0) {
            try {
              excelRecipients = await this.resolveRecipientsByType(excelRecipientType, initiatorId)
            } catch (error) {
              console.error('[SpreadsheetAutomationService] Failed to resolve excel collection recipients:', error)
              return {
                success: false,
                error: `Failed to resolve ${excelRecipientType} members. Please try again or select specific people.`,
                workflows: [],
                executedAt: new Date().toISOString(),
                totalRows: 0
              }
            }
          }

          if (excelRecipientType === 'specific' && excelRecipients.length > 0) {
            try {
              const resolved = await this.resolveEmployeeIdsToUserIds(excelRecipients)
              if (resolved.length > 0) excelRecipients = resolved
            } catch (error) {
              console.warn('[SpreadsheetAutomationService] Could not resolve some excel recipients to user IDs:', error)
            }
          }

          if (excelRecipients.length === 0) {
            return {
              success: false,
              error: 'No recipients configured for Excel Collection. Please edit the automation.',
              workflows: [],
              executedAt: new Date().toISOString(),
              totalRows: 0
            }
          }

          return this.executeExcelCollection({
            automation,
            recipients: excelRecipients,
            spreadsheetId,
            sheetId,
            initiatorId,
            accessToken
          })
        }

      case 'sheet_approval':
        // Sheet approval creates ONE workflow for the entire sheet
        return this.executeSheetApproval({
          automation,
          rows: rows || [],
          spreadsheetId,
          sheetId,
          initiatorId,
          accessToken
        })

      case 'line_approval':
      case 'row_workflow':
      default:
        // Row-based automations execute per row
        if (!rows || rows.length === 0) {
          return {
            success: false,
            error: 'No rows specified for row-based automation',
            workflows: [],
            executedAt: new Date().toISOString(),
            totalRows: 0
          }
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
  }

  /**
   * Execute bulk collection - creates one workflow per RECIPIENT
   * Each recipient receives a task to fill out a form, responses become new rows
   */
  async executeBulkCollection(params: ExecuteBulkCollectionParams): Promise<AutomationExecutionResult> {
    const { automation, recipients, spreadsheetId, sheetId, initiatorId, accessToken } = params
    const bulkGroupId = `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const executedAt = new Date().toISOString()

    const workflows: Array<{ rowId: string; workflowId: string; status: WorkflowStatus }> = []
    const failedRecipients: string[] = []

    console.log(`[SpreadsheetAutomationService] Executing bulk collection for ${recipients.length} recipients`)

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
            bulkGroupId
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

    return {
      success: failedRecipients.length === 0,
      error: failedRecipients.length > 0 ? `Failed to send to ${failedRecipients.length} recipients` : undefined,
      workflows,
      executedAt,
      totalRows: recipients.length,
      failedRows: failedRecipients.length > 0 ? failedRecipients : undefined
    }
  }

  /**
   * Execute excel collection - duplicate template per recipient, share, create flow task with link to copy
   */
  async executeExcelCollection(params: ExecuteExcelCollectionParams): Promise<AutomationExecutionResult> {
    const { automation, recipients, spreadsheetId, sheetId, initiatorId, accessToken } = params
    const bulkGroupId = `excel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const executedAt = new Date().toISOString()
    const templateId = automation.collectionConfig?.templateSpreadsheetId!

    const workflows: Array<{ rowId: string; workflowId: string; status: WorkflowStatus }> = []
    const failedRecipients: string[] = []

    const docBase = getDocumentServiceApiUrl().replace(/\/+$/, '')

    const duplicateSpreadsheet = async (
      templateAppId: string,
      token: string,
      ownerId: string
    ): Promise<{ id: string } | null> => {
      try {
        const url = `${docBase}/spreadsheets/${templateAppId}/duplicate`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ excel_collection_copy: true, ownerId })
        })
        if (!res.ok) {
          const err = await res.text()
          console.error('[SpreadsheetAutomationService] Duplicate failed:', res.status, url, err)
          return null
        }
        const data = (await res.json()) as Record<string, unknown>
        // Support multiple response shapes: { id }, { data: { id } }, { data: { app: { id } } }
        const inner = data.data as Record<string, unknown> | undefined
        const appObj = inner?.app as Record<string, unknown> | undefined
        const id = (
          data.id ??
          inner?.id ??
          appObj?.id
        ) as string | undefined
        if (!id || typeof id !== 'string') {
          console.error('[SpreadsheetAutomationService] Duplicate response missing id:', data)
          return null
        }
        // Sanity check: copy ID must differ from template ID
        if (id === templateAppId) {
          console.error('[SpreadsheetAutomationService] Duplicate returned template ID instead of copy ID')
          return null
        }
        const debugEnabled =
          typeof window !== 'undefined' &&
          typeof window.localStorage !== 'undefined' &&
          window.localStorage.getItem('debug:spreadsheet-apps') === '1'
        if (debugEnabled) {
          console.debug('[SpreadsheetAutomationService] Duplicate response (id only):', { id })
        }
        console.log('[SpreadsheetAutomationService] Duplicated template to copy:', {
          templateId: templateAppId,
          copyId: id,
          linkAppId: id
        })
        return { id }
      } catch (e) {
        console.error('[SpreadsheetAutomationService] Duplicate error:', e)
        return null
      }
    }

    const shareSpreadsheet = async (
      appId: string,
      userId: string,
      permission: string,
      token: string
    ): Promise<boolean> => {
      try {
        const res = await fetch(`${docBase}/sharing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            entityType: 'spreadsheet_app',
            entityId: appId,
            recipients: [{ userId, permission }]
          })
        })
        return res.ok
      } catch (e) {
        console.error('[SpreadsheetAutomationService] Share error:', e)
        return false
      }
    }

    const CONCURRENCY_LIMIT = 3
    const chunks = this.chunkArray(recipients, CONCURRENCY_LIMIT)

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async recipientId => {
          try {
            // Copy is owned by recipient so it appears in their files, not manager's
            const copy = await duplicateSpreadsheet(templateId, accessToken, recipientId)
            if (!copy) {
              return { recipientId, workflowId: null }
            }

            // Share with recipient as fallback (redundant when ownerId matches, but ensures access if ID formats differ)
            const shared = await shareSpreadsheet(copy.id, recipientId, 'edit', accessToken)
            if (!shared) {
              console.warn(
                `[SpreadsheetAutomationService] Failed to share copy with ${recipientId} - recipient is owner, but share failed`
              )
            }

            const template = this.generateExcelCollectionTemplate(automation, recipientId, copy.id)
            const tags = this.buildWorkflowTags({
              spreadsheetId,
              sheetId,
              rowId: `recipient_${recipientId}`,
              automationId: automation.id,
              automationType: automation.type,
              bulkGroupId,
              recipientId
            })
            template.tags = { ...template.tags, ...tags }

            const res = await fetch(getExecuteDynamicUrl(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.accessToken}`
              },
              body: JSON.stringify({
                templateDefinition: template,
                initiatorId,
                stepAssignments: {
                  step_0: {
                    assignment: {
                      assignmentMode: 'ASSIGN',
                      targets: { users: [recipientId] },
                      allowReassignment: true
                    }
                  }
                }
              })
            })

            if (!res.ok) {
              const err = await res.text()
              console.error('[SpreadsheetAutomationService] Excel collection workflow failed:', res.status, err)
              return { recipientId, workflowId: null }
            }

            const result = (await res.json()) as { data?: { workflowId?: string }; workflowId?: string }
            const workflowId = result.data?.workflowId || result.workflowId

            return { recipientId, workflowId }
          } catch (e) {
            console.error('[SpreadsheetAutomationService] Excel collection error for', recipientId, e)
            return { recipientId, workflowId: null }
          }
        })
      )

      for (const r of results) {
        if (r.workflowId) {
          workflows.push({
            rowId: `recipient_${r.recipientId}`,
            workflowId: r.workflowId,
            status: 'RUNNING'
          })
        } else {
          failedRecipients.push(r.recipientId)
        }
      }
    }

    return {
      success: failedRecipients.length === 0,
      error: failedRecipients.length > 0 ? `Failed to send to ${failedRecipients.length} recipients` : undefined,
      workflows,
      executedAt,
      totalRows: recipients.length,
      failedRows: failedRecipients.length > 0 ? failedRecipients : undefined
    }
  }

  /**
   * Generate template for excel collection - task with link to spreadsheet copy
   */
  private generateExcelCollectionTemplate(
    automation: SpreadsheetAutomation,
    recipientId: string,
    copyAppId: string
  ): AutomationFlowTemplate {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const copyUrl = `${origin}/platform/apps/spreadsheet-apps?appId=${encodeURIComponent(copyAppId)}&view=viewer&excel_collection=1`

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
            automation.collectionConfig?.message?.trim() ||
            'Open your copy, fill it in, and click Submit when done.',
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
  }): Promise<WorkflowExecutionResult> {
    const { automation, recipientId, spreadsheetId, sheetId, initiatorId, bulkGroupId } = params

    try {
      // Generate a template specifically for bulk collection
      const template = this.generateBulkCollectionTemplate(automation, recipientId)

      // Build tags for workflow-spreadsheet linking
      const tags = this.buildWorkflowTags({
        spreadsheetId,
        sheetId,
        rowId: `pending_${recipientId}`, // Row will be created when completed
        automationId: automation.id,
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

      console.log('[SpreadsheetAutomationService] Executing bulk collection workflow:', {
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
   * Generate a template for bulk collection with form fields
   */
  private generateBulkCollectionTemplate(
    automation: SpreadsheetAutomation,
    recipientId: string
  ): AutomationFlowTemplate {
    const formFields = automation.collectionConfig?.formFields || []

    // Build form inputs from configured fields
    const formInputs: AutomationFormInput[] = formFields.map(field => ({
      name: field.columnId || field.id,
      label: field.label,
      type: (field.inputType || 'TEXT') as AutomationInputType,
      required: field.required ?? true,
      options: field.options?.map(opt => ({ value: opt, label: opt }))
    }))

    // If no fields configured, create default text field
    if (formInputs.length === 0) {
      formInputs.push({
        name: 'response',
        label: 'Your Response',
        type: 'TEXTAREA',
        required: true
      })
    }

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
            type: 'APPROVAL' as AutomationStepType,
            title: step.title,
            message: step.message || `Please review and approve ${rows.length} items`,
            form: [
              {
                name: 'approvalDecision',
                label: 'Decision',
                type: 'SELECT' as AutomationInputType,
                required: true,
                options: [
                  { value: 'approve', label: 'Approve' },
                  { value: 'reject', label: 'Reject' }
                ]
              },
              {
                name: 'comments',
                label: 'Comments',
                type: 'TEXTAREA' as AutomationInputType,
                required: false
              }
            ],
            assignment: step.approvers
          }))
        : [
            {
              type: 'APPROVAL' as AutomationStepType,
              title: 'Review & Approve',
              message: `Please review and approve ${rows.length} items`,
              form: [
                {
                  name: 'approvalDecision',
                  label: 'Decision',
                  type: 'SELECT' as AutomationInputType,
                  required: true,
                  options: [
                    { value: 'approve', label: 'Approve' },
                    { value: 'reject', label: 'Reject' }
                  ]
                },
                {
                  name: 'comments',
                  label: 'Comments',
                  type: 'TEXTAREA' as AutomationInputType,
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
    const template: AutomationFlowTemplate = JSON.parse(JSON.stringify(baseTemplate))

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
              defaultValue: String(value)
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
    return template.replace(/\{\{(\w+)\}\}/g, (match, columnName) => {
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

    const stringValue = String(value)

    switch (transform) {
      case 'uppercase':
        return stringValue.toUpperCase()
      case 'lowercase':
        return stringValue.toLowerCase()
      case 'trim':
        return stringValue.trim()
      case 'number':
        return String(parseFloat(stringValue) || 0)
      case 'date':
        return new Date(stringValue).toISOString()
      case 'boolean':
        return String(['true', '1', 'yes'].includes(stringValue.toLowerCase()))
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
    const steps: AutomationFlowStep[] = []

    // Default assignment targets to initiator if no specific targets are configured
    const defaultTargets = initiatorId ? { users: [initiatorId] } : null

    switch (automation.type) {
      /**
       * ROW_WORKFLOW: Process each spreadsheet row through a multi-step workflow
       * Use case: Data processing, review workflows, status updates
       * Example: Process customer requests, review inventory items, handle support tickets
       */
      case 'row_workflow':
        steps.push(
          {
            type: 'TASK',
            title: 'Review Row Data',
            message:
              'Review the data in this row and verify it is complete and accurate.\n\nRow Details:\n{{rowSummary}}',
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
            dueInMinutes: 1440 // 24 hours
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
            dueInMinutes: 2880 // 48 hours
          }
        )
        break

      /**
       * SHEET_APPROVAL: Submit the ENTIRE spreadsheet for approval as one unit
       * Use case: Budget approvals, quarterly reports, document sign-offs
       * Example: Q4 Budget approval, Annual plan review, Batch invoice approval
       * Note: This creates ONE workflow for the whole sheet, not per-row
       */
      case 'sheet_approval':
        steps.push(
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
            dueInMinutes: 4320 // 3 days
          }
        )
        break

      /**
       * LINE_APPROVAL: Each row requires individual approval
       * Use case: Expense lines, purchase order items, individual records
       * Example: Expense report line items, PO line approvals, record verifications
       * Note: Creates one workflow PER ROW for granular approval
       */
      case 'line_approval':
        steps.push({
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
          dueInMinutes: 2880 // 48 hours
        })
        break

      /**
       * BULK_COLLECTION: Collect data FROM multiple users INTO the spreadsheet
       * Use case: Surveys, data gathering, team inputs, status updates
       * Example: Employee survey, team capacity planning, feedback collection
       * Note: Workflow is sent to multiple people, their responses become new rows
       */
      case 'bulk_collection':
        steps.push({
          type: 'TASK',
          title: 'Submit Your Response',
          message:
            'Please complete this form. Your response will be added to the collection.\n\n{{collectionDescription}}',
          form: [
            // The form fields should be dynamically generated based on spreadsheet columns
            // This is a placeholder - actual implementation should map columns to form inputs
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
            allowReassignment: false // Responses should come from assigned users
          },
          dueInMinutes: 10080 // 1 week
        })
        break
    }

    return {
      type: 'TEMPLATE',
      name: automation.name,
      description: automation.description || this.getDefaultDescription(automation.type),
      version: 1,
      steps
    }
  }

  /**
   * Get default description for automation type
   */
  private getDefaultDescription(type: string): string {
    switch (type) {
      case 'row_workflow':
        return 'Process each row through a review and processing workflow'
      case 'sheet_approval':
        return 'Submit the entire spreadsheet for approval'
      case 'line_approval':
        return 'Approve or reject each line item individually'
      case 'bulk_collection':
        return 'Collect responses from multiple users into the spreadsheet'
      default:
        return 'Spreadsheet automation workflow'
    }
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
        // Check if assignment targets reference row data
        if (step.assignment?.targets) {
          const resolvedTargets = this.resolveAssignmentTargets(
            step.assignment.targets as unknown as Record<string, unknown>,
            rowData
          )
          assignments[`step_${index}`] = {
            assignment: {
              ...step.assignment,
              targets: resolvedTargets
            }
          }
        } else if (step.assignment) {
          // Has assignment config but no targets - use default
          assignments[`step_${index}`] = {
            assignment: {
              ...step.assignment,
              targets: defaultAssignment?.targets || step.assignment.targets
            }
          }
        } else {
          // No assignment at all - use default
          assignments[`step_${index}`] = {
            assignment: defaultAssignment
          }
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

  /**
   * Get the number of steps in the default template for an automation type
   */
  private getDefaultStepCount(type: string): number {
    switch (type) {
      case 'row_workflow':
        return 2 // Review + Process
      case 'sheet_approval':
        return 2 // Information + Approval
      case 'line_approval':
        return 1 // Single approval step
      case 'bulk_collection':
        return 1 // Single form submission step
      default:
        return 1
    }
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
      // Query the webhook controller for aggregated results
      const queryParams = new URLSearchParams({
        spreadsheetId: params.spreadsheetId,
        sheetId: params.sheetId,
        automationId: params.automationId,
        ...(params.bulkGroupId && { bulkGroupId: params.bulkGroupId })
      })

      const response = await fetch(`${this.apiBaseUrl}/webhooks/spreadsheet/aggregate-bulk?${queryParams}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          spreadsheetId: params.spreadsheetId,
          sheetId: params.sheetId,
          automationId: params.automationId,
          bulkGroupId: params.bulkGroupId || params.automationId
        })
      })

      if (!response.ok) {
        console.log('[SpreadsheetAutomationService] aggregate-bulk endpoint failed, using fallback')
        // If no aggregation endpoint, fall back to querying flows directly
        return this.fetchBulkResponsesFromFlows({
          ...params,
          automationType: params.automationType || 'bulk_collection'
        })
      }

      const data = await response.json()
      console.log('[SpreadsheetAutomationService] aggregate-bulk response:', {
        totalWorkflows: data.totalWorkflows,
        completedCount: data.completedResults?.length || 0
      })

      // If aggregate-bulk returns empty results, fall back to flow-based query
      if (!data.completedResults || data.completedResults.length === 0) {
        console.log('[SpreadsheetAutomationService] aggregate-bulk returned empty, using fallback')
        return this.fetchBulkResponsesFromFlows({
          ...params,
          automationType: params.automationType || 'bulk_collection'
        })
      }

      return (data.completedResults || []).map((result: Record<string, unknown>) => {
        const outputData = (result.outputData as Record<string, unknown>) || {}
        const tags = (result.tags as Record<string, string>) || {}
        const responderId =
          (outputData.responderId as string) ||
          (outputData.userId as string) ||
          (outputData.recipientId as string) ||
          (outputData.assignedTo as string) ||
          tags.recipientId ||
          ''
        let formData = (outputData.formData as Record<string, unknown>) || outputData
        // For excel_collection, copyAppId lives in flow tags – merge into formData for View Response link
        if (params.automationType === 'excel_collection' && tags.copyAppId) {
          formData = { ...formData, copyAppId: tags.copyAppId }
        }
        return {
          workflowId: result.workflowId as string,
          responderId: responderId && String(responderId).trim() ? String(responderId).trim() : '',
          responderName: (outputData.responderName as string) || 'Unknown',
          responderEmail: outputData.responderEmail as string,
          submittedAt: (result.completedAt as string) || new Date().toISOString(),
          formData,
          status: 'COMPLETED'
        }
      })
    } catch (error) {
      console.error('[SpreadsheetAutomationService] Fetch bulk responses error:', error)
      // Fall back to querying flows directly
      return this.fetchBulkResponsesFromFlows({
        ...params,
        automationType: params.automationType || 'bulk_collection'
      })
    }
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
            return (
              tags.app === 'spreadsheet-automation' &&
              tags.automationType === automationType &&
              tags.spreadsheetId === params.spreadsheetId &&
              tags.automationId === params.automationId &&
              flow.status === 'COMPLETED'
            )
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

          console.log('[SpreadsheetAutomationService] Processing flow:', {
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
          console.log('[SpreadsheetAutomationService] Final form data for flow', flowId, ':', formData)

          return {
            workflowId: flowId,
            responderId: recipientId || '',
            responderName: 'Unknown', // TODO: Look up user name
            responderEmail: undefined,
            submittedAt: (flow.completedAt as string) || new Date().toISOString(),
            formData,
            status: 'COMPLETED' as const
          }
        })
      )

      // Filter out null results (flows with no ID)
      const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null)
      console.log('[SpreadsheetAutomationService] Returning', validResults.length, 'completed responses')
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
      console.log('[SpreadsheetAutomationService] /steps/step_0/data endpoint error:', err)
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
      console.log('[SpreadsheetAutomationService] Error fetching completed tasks:', err)
      return null
    }
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
      if (outputData && Object.keys(outputData).length > 0) {
        const fromOutput = (outputData.formData as Record<string, unknown> | undefined) || outputData
        if (Object.keys(fromOutput).length > 0) return fromOutput
      }

      const steps = flowDetail?.steps as Array<Record<string, unknown>> | undefined
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

      const tasksData = (await tasksRes.json()) as { tasks?: Array<Record<string, unknown>>; data?: { tasks?: Array<Record<string, unknown>> } }
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
        (matchingFlow.id as string) ||
        (matchingFlow.workflowId as string) ||
        (matchingFlow.flowId as string) ||
        ''
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
   */
  async findAndCompleteExcelCollectionTask(copyAppId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Fetch user's assigned/open tasks
      const tasksRes = await fetch(`${this.apiBaseUrl}/tasks/user/${userId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      })
      if (!tasksRes.ok) {
        const err = await tasksRes.text()
        console.error('[SpreadsheetAutomationService] Failed to fetch user tasks:', tasksRes.status, err)
        return { success: false, error: 'Failed to load your task' }
      }

      const tasksData = (await tasksRes.json()) as { tasks?: Array<Record<string, unknown>>; data?: { tasks?: Array<Record<string, unknown>> } }
      const tasks = tasksData.tasks || tasksData.data?.tasks || []
      if (!Array.isArray(tasks)) {
        return { success: false, error: 'No tasks found' }
      }

      // 2. Fetch flows/list to find flow with copyAppId tag (excel_collection, RUNNING)
      let targetTaskId: string | null = null
      try {
        const flowsRes = await fetch(`${this.apiBaseUrl}/flows/list`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.accessToken}` }
        })
        if (flowsRes.ok) {
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

          if (matchingFlow) {
            const flowId =
              (matchingFlow.id as string) ||
              (matchingFlow.workflowId as string) ||
              (matchingFlow.flowId as string) ||
              ''
            // Find task that belongs to this flow
            const task = tasks.find(
              (t: Record<string, unknown>) =>
                t.flowId === flowId ||
                t.workflowId === flowId ||
                t.businessKey === flowId ||
                (t.flow as Record<string, unknown>)?.id === flowId
            ) as Record<string, unknown> | undefined
            if (task) {
              targetTaskId = (task.id as string) || (task.taskId as string) || ''
            }
          }
        }
      } catch (e) {
        console.error('[SpreadsheetAutomationService] Error finding excel collection task:', e)
      }

      if (!targetTaskId) {
        return { success: false, error: 'Could not find your collection task. It may already be completed.' }
      }

      // 3. Complete the task
      const completeRes = await fetch(`${this.apiBaseUrl}/tasks/${targetTaskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          userId,
          formData: { submitted: true, copyAppId }
        })
      })

      if (!completeRes.ok) {
        const err = await completeRes.text()
        console.error('[SpreadsheetAutomationService] Task complete failed:', completeRes.status, err)
        return { success: false, error: 'Failed to submit' }
      }

      return { success: true }
    } catch (e) {
      console.error('[SpreadsheetAutomationService] findAndCompleteExcelCollectionTask error:', e)
      return { success: false, error: e instanceof Error ? e.message : 'Submit failed' }
    }
  }

  /**
   * Split array into chunks for concurrent processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Resolve recipients by type (team = direct reports, department = all department members)
   * Uses GraphQL to query Employee data with proper supervisor/department relationships
   */
  private async resolveRecipientsByType(recipientType: 'team' | 'department', initiatorId: string): Promise<string[]> {
    console.log('[SpreadsheetAutomationService] Resolving recipients by type:', { recipientType, initiatorId })

    try {
      // First, get the employee ID for the initiator (we have user ID, need employee ID)
      const initiatorEmployeeId = await this.getEmployeeIdForUser(initiatorId)

      if (!initiatorEmployeeId) {
        console.warn('[SpreadsheetAutomationService] Could not find employee record for user:', initiatorId)
        // Try alternative: the initiatorId might already be an employee ID
        // Continue with the provided ID and see if it works
      }

      const employeeIdToUse = initiatorEmployeeId || initiatorId
      console.log('[SpreadsheetAutomationService] Using employee ID for resolution:', employeeIdToUse)

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
        console.log('[SpreadsheetAutomationService] Found', employees.length, 'direct reports')

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
          console.log('[SpreadsheetAutomationService] Found department ID:', departmentId)

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
          console.log('[SpreadsheetAutomationService] Found', employees.length, 'department members')

          recipientUserIds = employees
            .map(emp => emp.userId)
            .filter((id): id is string => Boolean(id) && id !== initiatorId)
        } else {
          console.warn('[SpreadsheetAutomationService] Could not find department for employee:', employeeIdToUse)
        }
      }

      console.log(
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
