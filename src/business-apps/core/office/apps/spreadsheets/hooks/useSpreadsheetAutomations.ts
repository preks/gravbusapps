/**
 * useSpreadsheetAutomations Hook
 *
 * React hook for managing spreadsheet automations.
 * Handles CRUD operations, execution, and status synchronization.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  SpreadsheetAutomation,
  WorkflowRowLink,
  AutomationExecutionResult,
  AutomationExecutionHistory
} from '../types/automation'
import {
  SpreadsheetAutomationService,
  createSpreadsheetAutomationService,
  WorkflowStatusSyncService,
  createWorkflowStatusSyncService
} from '../services'
import { isUuid } from '../types/automation'
import { buildSentRowTrackingValues, buildCompletedRowTrackingValues, isTrackingColumn } from '../utils/trackingColumns'
import { getDefaultTrackingColumns } from '../components/automations/TrackingColumnsConfig'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import { fetchRecipientsData } from '../utils/fetchRecipientData'
import { DOCUMENT_API_URL } from '@/common/utils/serviceResolver'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import { fetchAutomationsForSingleSheet } from '../components/automations/automationSectionUtils'

/**
 * Ensure essential recipient tracking columns are always present.
 * We rely on these for avatar/email display and user expectations.
 * For excel_collection, also ensure copy_link for "View Response" column.
 */
function ensureRecipientTrackingColumns(
  selected: string[],
  automationType?: 'bulk_collection' | 'excel_collection'
): string[] {
  const ensured = new Set(selected)
  ensured.add('recipient_avatar')
  ensured.add('recipient_name')
  ensured.add('recipient_email')
  if (automationType === 'excel_collection') {
    ensured.add('copy_link')
  }
  return Array.from(ensured)
}

export interface UseSpreadsheetAutomationsParams {
  /** Spreadsheet ID */
  spreadsheetId: string
  /** Sheet ID */
  sheetId: string
  /** Access token for API calls */
  accessToken: string
  /** Current user ID */
  currentUserId: string
  /** Initial automations */
  initialAutomations?: SpreadsheetAutomation[]
  /** Initial workflow links */
  initialWorkflowLinks?: WorkflowRowLink[]
  /** Callback when automations change */
  onAutomationsChange?: (automations: SpreadsheetAutomation[]) => void
  /** Callback when workflow links change */
  onWorkflowLinksChange?: (links: WorkflowRowLink[]) => void
  /** Callback when new rows should be added (from bulk collection responses) */
  onAddRows?: (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => void
  /** Callback when existing rows should be updated (when responses come back) */
  onUpdateRows?: (
    updates: Array<{
      workflowId: string
      recipientId?: string
      cells: Record<string, unknown>
      columnLabels?: Record<string, string>
    }>
  ) => void
  /** Enable status polling */
  enablePolling?: boolean
  /** Poll interval in milliseconds */
  pollInterval?: number
}

export interface UseSpreadsheetAutomationsResult {
  /** All automations for this sheet */
  automations: SpreadsheetAutomation[]
  /** Workflow links for all rows */
  workflowLinks: WorkflowRowLink[]
  /** Execution history */
  executionHistory: AutomationExecutionHistory[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: string | null
  /** Whether status polling is active */
  isPolling: boolean

  // CRUD Operations
  /** Create a new automation */
  createAutomation: (
    automation: Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>
  ) => Promise<SpreadsheetAutomation>
  /** Update an existing automation */
  updateAutomation: (id: string, updates: Partial<SpreadsheetAutomation>) => Promise<void>
  /** Delete an automation */
  deleteAutomation: (id: string) => Promise<void>
  /** Duplicate an automation */
  duplicateAutomation: (id: string) => Promise<SpreadsheetAutomation>
  /** Toggle automation enabled state */
  toggleAutomation: (id: string, enabled: boolean) => Promise<void>

  // Execution
  /** Run automation for specific rows */
  runAutomation: (
    automationId: string,
    rows?: Array<{ id: string; cells: Record<string, unknown> }>
  ) => Promise<AutomationExecutionResult>
  /** Run automation for a single row */
  runAutomationForRow: (
    automationId: string,
    rowId: string,
    rowData: Record<string, unknown>
  ) => Promise<{ workflowId: string } | null>

  // Status Management
  /** Get workflow link for a specific row */
  getWorkflowLinkForRow: (rowId: string) => WorkflowRowLink | undefined
  /** Refresh workflow statuses */
  refreshWorkflowStatuses: () => Promise<void>
  /** Reload automations for this sheet from document service (same sources as the Spreadsheets Automations hub tab) */
  refreshAutomationsFromDocumentService: () => Promise<void>
  /** Start status polling */
  startPolling: () => void
  /** Stop status polling */
  stopPolling: () => void
  /** Fetch bulk collection responses and add as rows */
  fetchBulkCollectionResponses: () => Promise<void>

  /** Complete the Excel Collection task for the current user (when viewing a collection copy) */
  completeExcelCollectionTask: (
    copyAppId: string,
    formData?: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string }>
  /** Check if user has an open Excel Collection task for this app (fallback when settings lack the flag) */
  hasExcelCollectionTaskForApp: (copyAppId: string) => Promise<boolean>

  // Utilities
  /** Get automation by ID */
  getAutomationById: (id: string) => SpreadsheetAutomation | undefined
  /** Get enabled automations */
  getEnabledAutomations: () => SpreadsheetAutomation[]
  /** Get automations by trigger type */
  getAutomationsByTrigger: (trigger: SpreadsheetAutomation['trigger']) => SpreadsheetAutomation[]
  /** Clear error */
  clearError: () => void
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `auto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/** Min/max poll interval (ms) - prevents abuse from untrusted pollInterval values */
const POLL_INTERVAL_MIN = 5000
const POLL_INTERVAL_MAX = 300000
const POLL_INTERVAL_DEFAULT = 30000

function sanitizePollInterval(value: unknown): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : POLL_INTERVAL_DEFAULT
  return Math.max(POLL_INTERVAL_MIN, Math.min(POLL_INTERVAL_MAX, Math.floor(num)))
}

const isCollectionAutomation = (automation: SpreadsheetAutomation): boolean =>
  automation.type === 'bulk_collection' || automation.type === 'excel_collection'

const toExecutionError = (error: string): AutomationExecutionResult => ({
  success: false,
  error,
  workflows: [],
  executedAt: new Date().toISOString(),
  totalRows: 0
})

const buildColumnIdToNameMap = (automation: SpreadsheetAutomation): Map<string, string> => {
  const columnIdToName = new Map<string, string>()
  if (automation.workflowConfig.columnMappings) {
    for (const mapping of automation.workflowConfig.columnMappings) {
      columnIdToName.set(mapping.columnId, mapping.columnName)
    }
  }
  if (automation.collectionConfig?.formFields) {
    for (const field of automation.collectionConfig.formFields) {
      if (!field.columnId || columnIdToName.has(field.columnId)) continue
      const mapping = automation.workflowConfig.columnMappings?.find(m => m.columnId === field.columnId)
      columnIdToName.set(field.columnId, mapping?.columnName || field.columnId)
    }
  }
  return columnIdToName
}

/** Map sheet column name → wizard form field label (bulk_collection only). Excel collection uses template columns instead. */
function buildBulkCollectionFormFieldColumnLabels(
  automation: SpreadsheetAutomation,
  columnIdToName: Map<string, string>
): Record<string, string> | undefined {
  if (automation.type !== 'bulk_collection') return undefined
  const formFields = automation.collectionConfig?.formFields
  if (!formFields?.length) return undefined
  const out: Record<string, string> = {}
  for (const field of formFields) {
    const columnId = field.columnId
    if (!columnId) continue
    const label = typeof field.label === 'string' ? field.label.trim() : ''
    if (!label) continue
    const columnName = columnIdToName.get(columnId) ?? columnId
    out[columnName] = label
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function hasCollectionRecipients(automation: SpreadsheetAutomation): boolean {
  return (
    (automation.collectionConfig?.recipients?.length ?? 0) > 0 ||
    automation.collectionConfig?.recipientType === 'team' ||
    automation.collectionConfig?.recipientType === 'department'
  )
}

function mapRowsForAutomationRun(rows?: Array<{ id: string; cells: Record<string, unknown> }>) {
  if (!rows?.length) return undefined
  return rows.map(row => ({
    rowId: row.id,
    data: { _id: row.id, ...row.cells }
  }))
}

function buildWorkflowLinks(
  workflows: Array<{ rowId: string; workflowId: string; status: WorkflowRowLink['workflowStatus'] }>,
  automationId: string,
  executedAt: string,
  totalSteps: number
): WorkflowRowLink[] {
  return workflows.map(wf => ({
    rowId: wf.rowId,
    workflowId: wf.workflowId,
    workflowStatus: wf.status,
    automationId,
    startedAt: executedAt,
    lastUpdatedAt: executedAt,
    currentStepIndex: 0,
    totalSteps
  }))
}

async function fetchTemplateFormColumns(templateAppId: string): Promise<Array<{ name: string; label: string }>> {
  const app = await SpreadsheetApiService.getApp(templateAppId)
  if (!app?.sheets?.length) return []
  const sheet = app.sheets[0]
  const columns = sheet.columns || []
  return columns
    .filter(col => col.isVisible !== false && !isTrackingColumn(col.name) && !isTrackingColumn(col.id))
    .map(col => ({ name: col.name, label: (col.label || col.name).trim() }))
    .filter(col => col.label)
}

async function buildInitialCollectionRows(params: {
  automation: SpreadsheetAutomation
  workflows: Array<{ rowId: string; workflowId: string }>
  executedAt: string
  accessToken: string
}): Promise<Array<{ cells: Record<string, unknown>; metadata: Record<string, unknown> }>> {
  const { automation, workflows, executedAt, accessToken } = params
  const statusColumn = automation.workflowConfig.statusColumn
  const trackingColumns = ensureRecipientTrackingColumns(
    automation.collectionConfig?.trackingColumns || getDefaultTrackingColumns(),
    automation.type === 'excel_collection' ? 'excel_collection' : 'bulk_collection'
  )
  const columnIdToName = buildColumnIdToNameMap(automation)
  const recipientIds = workflows.map(wf => wf.rowId.replace('recipient_', ''))

  graphQLClient.setAccessToken(accessToken)
  const recipientDataMap = await fetchRecipientsData(graphQLClient, recipientIds)

  let formFieldColumns: Array<{ name: string; label: string }> = []
  let columnLabels: Record<string, string> = {}
  if (automation.type === 'excel_collection' && automation.collectionConfig?.templateSpreadsheetId) {
    formFieldColumns = await fetchTemplateFormColumns(automation.collectionConfig.templateSpreadsheetId)
    columnLabels = Object.fromEntries(formFieldColumns.map(c => [c.name, c.label]))
  } else if (automation.type === 'bulk_collection') {
    const bulkLabels = buildBulkCollectionFormFieldColumnLabels(automation, columnIdToName)
    if (bulkLabels) columnLabels = bulkLabels
  }

  /** Column IDs for bulk form fields: hide Excel-style placeholder columns until a response writes data (parity with excel_collection UX). */
  const bulkDeferPlaceholderFormColumnIds: string[] | undefined =
    automation.type === 'bulk_collection'
      ? (automation.collectionConfig?.formFields ?? [])
          .map(f => f.columnId)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : undefined
  const bulkDeferMeta =
    bulkDeferPlaceholderFormColumnIds && bulkDeferPlaceholderFormColumnIds.length > 0
      ? { bulkDeferPlaceholderFormColumnIds }
      : {}

  return workflows.map(wf => {
    const recipientId = wf.rowId.replace('recipient_', '')
    const recipientData = recipientDataMap.get(recipientId)

    const trackingValues = buildSentRowTrackingValues(
      trackingColumns,
      {
        id: recipientId,
        name: recipientData?.name,
        email: recipientData?.email,
        avatar: recipientData?.avatar
      },
      executedAt
    )

    const cells: Record<string, unknown> = {
      ...trackingValues,
      _workflow_id: wf.workflowId
    }

    if (statusColumn) {
      const statusColumnName = columnIdToName.get(statusColumn) || statusColumn
      cells[statusColumnName] = 'Sent'
    }

    for (const col of formFieldColumns) {
      cells[col.name] = ''
    }

    return {
      cells,
      metadata: {
        workflowId: wf.workflowId,
        recipientId,
        automationId: automation.id,
        isBulkCollectionPending: true,
        trackingColumns,
        ...(Object.keys(columnLabels).length > 0 ? { columnLabels } : {}),
        ...bulkDeferMeta
      }
    }
  })
}

function getStringFormValue(formData: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = formData[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return undefined
}

function filterNewCompletedResponses(
  responses: Array<{ status: string; workflowId: string; responderId?: string }>,
  shouldDedupeByMemory: boolean,
  processedWorkflowIds: Set<string>
): Array<{ status: string; workflowId: string; responderId?: string }> {
  return responses.filter(r => {
    if (r.status !== 'COMPLETED') return false
    const normalizedWorkflowId = String(r.workflowId || '').trim()
    const normalizedResponderId = String(r.responderId || '').trim()
    if (!normalizedWorkflowId && !normalizedResponderId) return false
    if (!shouldDedupeByMemory) return true
    return normalizedWorkflowId ? !processedWorkflowIds.has(normalizedWorkflowId) : true
  })
}

function buildRowUpdate(params: {
  response: {
    workflowId: string
    responderId?: string
    responderName?: string
    responderEmail?: string
    submittedAt?: string
    formData: Record<string, unknown>
  }
  recipientData?: { name?: string; email?: string; avatar?: string }
  trackingColumns: string[]
  statusColumn?: string
  columnIdToName: Map<string, string>
  columnMappings?: Array<{
    direction: string
    workflowParameter: string
    columnName: string
  }>
  /** When form responses omit __columnLabels__ (bulk forms), use automation form field titles */
  fallbackColumnLabels?: Record<string, string>
}): {
  workflowId: string
  recipientId?: string
  cells: Record<string, unknown>
  columnLabels?: Record<string, string>
} {
  const { response, recipientData, trackingColumns, statusColumn, columnIdToName, columnMappings } = params
  const displayName =
    response.responderName && response.responderName !== 'Unknown' ? response.responderName : recipientData?.name
  const displayEmail = response.responderEmail ?? recipientData?.email

  const copyAppId = getStringFormValue(response.formData, [
    'copyAppId',
    'copy_app_id',
    'appId',
    'copySpreadsheetId',
    'copy_spreadsheet_id'
  ])
  const copyUrl = getStringFormValue(response.formData, [
    'copyUrl',
    'copyURL',
    'copyLink',
    'copy_link',
    'spreadsheetUrl',
    'spreadsheet_url'
  ])

  const trackingValues = buildCompletedRowTrackingValues(
    trackingColumns,
    {
      id: response.responderId,
      name: displayName,
      email: displayEmail,
      avatar: recipientData?.avatar
    },
    new Date().toISOString(),
    response.submittedAt,
    copyAppId,
    copyUrl
  )

  const cells: Record<string, unknown> = { ...trackingValues }
  if (statusColumn) {
    const statusColumnName = columnIdToName.get(statusColumn) || statusColumn
    cells[statusColumnName] = 'Completed'
  }

  if (columnMappings) {
    for (const mapping of columnMappings) {
      if (
        mapping.direction === 'fromWorkflow' &&
        response.formData[mapping.workflowParameter] &&
        !isTrackingColumn(mapping.columnName)
      ) {
        cells[mapping.columnName] = response.formData[mapping.workflowParameter]
      }
    }
  }

  const fromResponse = (response.formData.__columnLabels__ as Record<string, string> | undefined) || {}
  const fallback = params.fallbackColumnLabels || {}
  const mergedLabels = { ...fallback, ...fromResponse }
  const columnLabels = Object.keys(mergedLabels).length > 0 ? mergedLabels : undefined

  for (const [key, value] of Object.entries(response.formData)) {
    if (key === '__columnLabels__') continue
    const columnName = columnIdToName.get(key) || key
    if (!cells[columnName] && columnName !== statusColumn && !isTrackingColumn(columnName)) {
      cells[columnName] = value
    }
  }

  return {
    workflowId: String(response.workflowId || '').trim(),
    recipientId: String(response.responderId || '').trim() || undefined,
    cells,
    columnLabels
  }
}

/**
 * useSpreadsheetAutomations Hook
 */
export function useSpreadsheetAutomations(params: UseSpreadsheetAutomationsParams): UseSpreadsheetAutomationsResult {
  const {
    spreadsheetId,
    sheetId,
    accessToken,
    currentUserId,
    initialAutomations = [],
    initialWorkflowLinks = [],
    onAutomationsChange,
    onWorkflowLinksChange,
    onAddRows,
    onUpdateRows,
    enablePolling = true,
    pollInterval = 30000
  } = params

  // State
  const [automations, setAutomations] = useState<SpreadsheetAutomation[]>(initialAutomations)
  const [workflowLinks, setWorkflowLinks] = useState<WorkflowRowLink[]>(initialWorkflowLinks)
  const [executionHistory, setExecutionHistory] = useState<AutomationExecutionHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  // Services
  const automationServiceRef = useRef<SpreadsheetAutomationService | null>(null)
  const syncServiceRef = useRef<WorkflowStatusSyncService | null>(null)

  // Initialize services
  useEffect(() => {
    if (accessToken) {
      automationServiceRef.current = createSpreadsheetAutomationService(accessToken)
      syncServiceRef.current = createWorkflowStatusSyncService(accessToken, {
        pollInterval: sanitizePollInterval(pollInterval)
      })
    }
    return () => {
      syncServiceRef.current?.stopPolling()
    }
  }, [accessToken, pollInterval])

  // Store callbacks in refs to avoid re-render loops
  const onAutomationsChangeRef = useRef(onAutomationsChange)
  const onWorkflowLinksChangeRef = useRef(onWorkflowLinksChange)
  const onAddRowsRef = useRef(onAddRows)
  const onUpdateRowsRef = useRef(onUpdateRows)

  // Track processed workflow IDs when a future collection type opts into in-memory dedupe (see fetchBulkCollectionResponses).
  const processedWorkflowIdsRef = useRef<Set<string>>(new Set())
  // Cache resolved backend IDs for excel_collection automations that were created with client-side IDs.
  const resolvedExcelBackendIdsRef = useRef<Map<string, string>>(new Map())

  // Update refs when callbacks change (without triggering effects)
  useEffect(() => {
    onAutomationsChangeRef.current = onAutomationsChange
  }, [onAutomationsChange])

  useEffect(() => {
    onWorkflowLinksChangeRef.current = onWorkflowLinksChange
  }, [onWorkflowLinksChange])

  useEffect(() => {
    onAddRowsRef.current = onAddRows
  }, [onAddRows])

  useEffect(() => {
    onUpdateRowsRef.current = onUpdateRows
  }, [onUpdateRows])

  const resolveExcelCollectionAutomationId = useCallback(
    async (automation: SpreadsheetAutomation): Promise<string | null> => {
      const backendId = typeof automation.backendId === 'string' ? automation.backendId.trim() : ''
      if (backendId) return backendId

      const automationId = typeof automation.id === 'string' ? automation.id.trim() : ''
      if (!automationId) return null
      if (isUuid(automationId)) return automationId

      const cached = resolvedExcelBackendIdsRef.current.get(automationId)
      if (cached) return cached

      try {
        const docBase = DOCUMENT_API_URL.replace(/\/+$/, '')
        const response = await fetch(`${docBase}/automations/app/${spreadsheetId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) return null

        const payload = (await response.json()) as Record<string, unknown>
        let items: Array<Record<string, unknown>> = []
        if (Array.isArray(payload)) {
          items = payload
        } else if (Array.isArray(payload.data)) {
          items = payload.data
        } else if (Array.isArray(payload.items)) {
          items = payload.items
        }

        const normalizeType = (raw: unknown): string => {
          const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
          if (
            value === 'excel_collection' ||
            value === 'excelcollection' ||
            value === 'excel-collection' ||
            value === 'template_collection'
          ) {
            return 'excel_collection'
          }
          return value
        }

        const normalizedName = (automation.name || '').trim().toLowerCase()
        const matched =
          items.find(item => String(item.id || '').trim() === automationId) ||
          items.find(item => String(item.backendId || '').trim() === automationId) ||
          items.find(item => {
            const itemType = normalizeType(item.type)
            if (itemType !== 'excel_collection') return false
            const itemName = String(item.name || '')
              .trim()
              .toLowerCase()
            const itemSheetId = String(item.sheetId || '').trim()
            return itemName === normalizedName && (itemSheetId === sheetId || itemSheetId.length === 0)
          })

        const resolvedId = String(matched?.id || '').trim()
        if (!resolvedId || !isUuid(resolvedId)) {
          return null
        }

        resolvedExcelBackendIdsRef.current.set(automationId, resolvedId)
        return resolvedId
      } catch {
        return null
      }
    },
    [accessToken, sheetId, spreadsheetId]
  )

  // Helper to notify automation changes (call after state updates)
  const notifyAutomationsChange = useCallback((newAutomations: SpreadsheetAutomation[]) => {
    onAutomationsChangeRef.current?.(newAutomations)
  }, [])

  // Helper to notify workflow link changes
  const notifyWorkflowLinksChange = useCallback((newLinks: WorkflowRowLink[]) => {
    onWorkflowLinksChangeRef.current?.(newLinks)
  }, [])

  /** Register bulk/excel automations in document-service so the Automations hub tab can list them. */
  const syncCollectionAutomationToBackend = useCallback(
    async (automation: SpreadsheetAutomation) => {
      if (!isCollectionAutomation(automation)) return
      const svc = automationServiceRef.current
      if (!svc || !accessToken) return
      try {
        const backendId = await svc.syncAutomationRecordOnBackend(automation, spreadsheetId, sheetId, {
          persistMode: 'upsert'
        })
        if (!backendId) return
        if (isUuid(automation.id)) return
        if (automation.backendId === backendId) return
        setAutomations(prev => {
          const updated = prev.map(a => (a.id === automation.id ? { ...a, backendId } : a))
          setTimeout(() => notifyAutomationsChange(updated), 0)
          return updated
        })
      } catch {
        // Hub can still merge from sheet JSON; avoid blocking the editor.
      }
    },
    [accessToken, spreadsheetId, sheetId, notifyAutomationsChange]
  )

  // Create automation
  const createAutomation = useCallback(
    async (
      automationData: Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>
    ): Promise<SpreadsheetAutomation> => {
      const now = new Date().toISOString()
      const newAutomation: SpreadsheetAutomation = {
        ...automationData,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        runCount: 0,
        createdBy: currentUserId
      }

      setAutomations(prev => {
        const updated = [...prev, newAutomation]
        setTimeout(() => {
          notifyAutomationsChange(updated)
          void syncCollectionAutomationToBackend(newAutomation)
        }, 0)
        return updated
      })
      return newAutomation
    },
    [currentUserId, notifyAutomationsChange, syncCollectionAutomationToBackend]
  )

  // Update automation
  const updateAutomation = useCallback(
    async (id: string, updates: Partial<SpreadsheetAutomation>): Promise<void> => {
      setAutomations(prev => {
        const updated = prev.map(automation =>
          automation.id === id ? { ...automation, ...updates, updatedAt: new Date().toISOString() } : automation
        )
        const merged = updated.find(a => a.id === id)
        setTimeout(() => {
          notifyAutomationsChange(updated)
          if (merged) void syncCollectionAutomationToBackend(merged)
        }, 0)
        return updated
      })
    },
    [notifyAutomationsChange, syncCollectionAutomationToBackend]
  )

  // Delete automation
  const deleteAutomation = useCallback(
    async (id: string): Promise<void> => {
      setAutomations(prev => {
        const updated = prev.filter(automation => automation.id !== id)
        // Notify parent after state update
        setTimeout(() => notifyAutomationsChange(updated), 0)
        return updated
      })
      // Also remove associated workflow links
      setWorkflowLinks(prev => {
        const updated = prev.filter(link => link.automationId !== id)
        setTimeout(() => notifyWorkflowLinksChange(updated), 0)
        return updated
      })
    },
    [notifyAutomationsChange, notifyWorkflowLinksChange]
  )

  // Duplicate automation
  const duplicateAutomation = useCallback(
    async (id: string): Promise<SpreadsheetAutomation> => {
      const original = automations.find(a => a.id === id)
      if (!original) {
        throw new Error(`Automation ${id} not found`)
      }

      const now = new Date().toISOString()
      const duplicate: SpreadsheetAutomation = {
        ...original,
        id: generateId(),
        backendId: undefined,
        name: `${original.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
        runCount: 0,
        lastRunAt: undefined,
        createdBy: currentUserId
      }

      setAutomations(prev => {
        const updated = [...prev, duplicate]
        setTimeout(() => {
          notifyAutomationsChange(updated)
          void syncCollectionAutomationToBackend(duplicate)
        }, 0)
        return updated
      })
      return duplicate
    },
    [automations, currentUserId, notifyAutomationsChange, syncCollectionAutomationToBackend]
  )

  // Toggle automation enabled state
  const toggleAutomation = useCallback(
    async (id: string, enabled: boolean): Promise<void> => {
      await updateAutomation(id, { isEnabled: enabled })
    },
    [updateAutomation]
  )

  // Run automation for rows - actually executes workflows via flow engine
  const runAutomation = useCallback(
    async (
      automationId: string,
      rows?: Array<{ id: string; cells: Record<string, unknown> }>
    ): Promise<AutomationExecutionResult> => {
      const automation = automations.find(a => a.id === automationId)
      if (!automation) {
        console.error('[useSpreadsheetAutomations] ERROR: Automation not found:', automationId)
        return toExecutionError(`Automation ${automationId} not found`)
      }

      if (!automation.isEnabled) {
        console.error('[useSpreadsheetAutomations] ERROR: Automation is disabled')
        return toExecutionError('Automation is disabled')
      }

      const service = automationServiceRef.current
      if (!service) {
        console.error('[useSpreadsheetAutomations] ERROR: automationServiceRef.current is null/undefined')
        return toExecutionError('Automation service not initialized - missing access token')
      }

      setIsLoading(true)
      setError(null)

      try {
        const executedAt = new Date().toISOString()
        const startTime = Date.now()

        // Check if we have data to process based on automation type
        // - bulk_collection / excel_collection: requires RECIPIENTS (not rows) - can run on empty sheets
        // - other types: require ROWS to process
        const isBulkCollection = isCollectionAutomation(automation)
        const hasRecipients = hasCollectionRecipients(automation)

        if (!isBulkCollection && (!rows || rows.length === 0)) {
          // Update automation last run time anyway for UI feedback
          await updateAutomation(automationId, { lastRunAt: executedAt, runCount: automation.runCount + 1 })

          return {
            success: true,
            workflows: [],
            executedAt,
            totalRows: 0
          }
        }

        // For bulk collection, check recipients instead of rows
        if (isBulkCollection && !hasRecipients) {
          console.error('[useSpreadsheetAutomations] Bulk collection has no recipients configured')
          return toExecutionError(
            'No recipients configured for bulk collection. Please edit the automation and add recipients.'
          )
        }

        // Use the dispatcher that handles different automation types correctly
        // - row_workflow/line_approval: execute per row
        // - bulk_collection: execute per recipient (not per row!)
        // - sheet_approval: execute once for entire sheet
        const result = await service.runAutomation({
          automation,
          rows: mapRowsForAutomationRun(rows),
          recipients: automation.collectionConfig?.recipients,
          spreadsheetId,
          sheetId,
          initiatorId: currentUserId,
          accessToken
        })
        const durationMs = Date.now() - startTime

        // Update workflow links with new workflows
        if (result.workflows && result.workflows.length > 0) {
          const newLinks = buildWorkflowLinks(
            result.workflows,
            automationId,
            executedAt,
            automation.workflowConfig.dynamicTemplate?.steps?.length || 1
          )
          setWorkflowLinks(prev => {
            // bulk/excel collection runs can execute without source sheet rows
            const processedRowIds = rows?.map(r => r.id) ?? []
            const updated = [...prev.filter(l => !processedRowIds.includes(l.rowId)), ...newLinks]
            setTimeout(() => notifyWorkflowLinksChange(updated), 0)
            return updated
          })

          // For bulk_collection and excel_collection: create rows showing "Sent" status when automation starts.
          if (isCollectionAutomation(automation)) {
            if (onAddRowsRef.current) {
              const initialRows = await buildInitialCollectionRows({
                automation,
                workflows: result.workflows,
                executedAt,
                accessToken
              })
              onAddRowsRef.current(initialRows)
            } else {
              console.error('[useSpreadsheetAutomations] ERROR: onAddRowsRef.current is not set!')
            }
          }
        }

        // Update automation last run time and backendId (when created on first run)
        await updateAutomation(automationId, {
          lastRunAt: executedAt,
          runCount: automation.runCount + 1,
          ...(result.backendId && { backendId: result.backendId })
        })

        // Add to execution history
        const historyEntry: AutomationExecutionHistory = {
          id: generateId(),
          automationId,
          executedAt,
          executedBy: currentUserId,
          triggerType: 'manual',
          rowCount: result.totalRows,
          successCount: result.workflows?.length || 0,
          failedCount: result.failedRows?.length || 0,
          durationMs
        }
        setExecutionHistory(prev => [historyEntry, ...prev])

        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('[useSpreadsheetAutomations] Run automation error:', err)
        setError(errorMessage)
        return toExecutionError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [automations, spreadsheetId, sheetId, currentUserId, accessToken, updateAutomation, notifyWorkflowLinksChange]
  )

  // Run automation for a single row
  const runAutomationForRow = useCallback(
    async (
      automationId: string,
      rowId: string,
      rowData: Record<string, unknown>
    ): Promise<{ workflowId: string } | null> => {
      const automation = automations.find(a => a.id === automationId)
      if (!automation || !automation.isEnabled) {
        return null
      }

      const service = automationServiceRef.current
      if (!service) {
        setError('Automation service not initialized')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await service.executeRowWorkflow({
          automation,
          row: rowData,
          rowId,
          spreadsheetId,
          sheetId,
          initiatorId: currentUserId,
          accessToken
        })

        if (result.success && result.workflowId) {
          // Add workflow link
          const newLink: WorkflowRowLink = {
            rowId,
            workflowId: result.workflowId,
            workflowStatus: 'RUNNING',
            currentStepIndex: 0,
            totalSteps: automation.workflowConfig.dynamicTemplate?.steps.length || 1,
            startedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            automationId
          }

          setWorkflowLinks(prev => {
            // Replace existing link for this row if exists
            const existing = prev.findIndex(l => l.rowId === rowId && l.automationId === automationId)
            let updated: WorkflowRowLink[]
            if (existing >= 0) {
              updated = [...prev.slice(0, existing), newLink, ...prev.slice(existing + 1)]
            } else {
              updated = [...prev, newLink]
            }
            setTimeout(() => notifyWorkflowLinksChange(updated), 0)
            return updated
          })

          // Update automation run count
          await updateAutomation(automationId, {
            lastRunAt: new Date().toISOString(),
            runCount: automation.runCount + 1
          })

          return { workflowId: result.workflowId }
        }

        return null
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [automations, spreadsheetId, sheetId, currentUserId, accessToken, updateAutomation, notifyWorkflowLinksChange]
  )

  // Get workflow link for a row
  const getWorkflowLinkForRow = useCallback(
    (rowId: string): WorkflowRowLink | undefined => {
      return workflowLinks.find(link => link.rowId === rowId)
    },
    [workflowLinks]
  )

  // Refresh workflow statuses
  const refreshWorkflowStatuses = useCallback(async (): Promise<void> => {
    const service = syncServiceRef.current
    if (!service || workflowLinks.length === 0) return

    try {
      const updatedLinks = await service.syncWorkflowStatuses({
        spreadsheetId,
        sheetId,
        workflowLinks
      })
      setWorkflowLinks(updatedLinks)
      notifyWorkflowLinksChange(updatedLinks)
    } catch (err) {
      console.error('[useSpreadsheetAutomations] Failed to refresh statuses:', err)
    }
  }, [spreadsheetId, sheetId, workflowLinks, notifyWorkflowLinksChange])

  const refreshAutomationsFromDocumentService = useCallback(async (): Promise<void> => {
    if (!accessToken) return
    try {
      const docBase = DOCUMENT_API_URL.replace(/\/+$/, '')
      const list = await fetchAutomationsForSingleSheet({ id: spreadsheetId, name: '' }, sheetId, docBase, accessToken)
      const normalized = list.map(a => ({
        ...a,
        runCount: typeof a.runCount === 'number' && Number.isFinite(a.runCount) ? a.runCount : 0
      }))
      setAutomations(normalized)
      notifyAutomationsChange(normalized)
    } catch (err) {
      console.error('[useSpreadsheetAutomations] Failed to refresh automations from document service:', err)
    }
  }, [accessToken, spreadsheetId, sheetId, notifyAutomationsChange])

  // Start polling
  const startPolling = useCallback(() => {
    const service = syncServiceRef.current
    if (!service || workflowLinks.length === 0) return

    setIsPolling(true)
    service.startPolling({ spreadsheetId, sheetId, workflowLinks }, updatedLinks => {
      setWorkflowLinks(updatedLinks)
      notifyWorkflowLinksChange(updatedLinks)
    })
  }, [spreadsheetId, sheetId, workflowLinks, notifyWorkflowLinksChange])

  // Stop polling
  const stopPolling = useCallback(() => {
    syncServiceRef.current?.stopPolling()
    setIsPolling(false)
  }, [])

  // Auto-start polling if enabled and there are active workflows
  useEffect(() => {
    if (!enablePolling) return

    const hasActiveWorkflows = workflowLinks.some(
      link => link.workflowStatus === 'RUNNING' || link.workflowStatus === 'PENDING'
    )

    if (hasActiveWorkflows && !isPolling) {
      startPolling()
    } else if (!hasActiveWorkflows && isPolling) {
      stopPolling()
    }
  }, [enablePolling, workflowLinks, isPolling, startPolling, stopPolling])

  // Fetch and process bulk collection responses
  const fetchBulkCollectionResponses = useCallback(async () => {
    const service = automationServiceRef.current
    if (!service) {
      return
    }

    // Get all bulk/excel collection automations
    const bulkCollectionAutomations = automations.filter(a => isCollectionAutomation(a) && a.isEnabled)
    if (bulkCollectionAutomations.length === 0) {
      return
    }

    for (const automation of bulkCollectionAutomations) {
      try {
        const automationType = automation.type === 'excel_collection' ? 'excel_collection' : 'bulk_collection'

        let responses: Awaited<ReturnType<SpreadsheetAutomationService['fetchBulkCollectionResponses']>>

        if (automation.type === 'excel_collection') {
          // Flows are tagged with document-service UUID; prefer backendId / resolved id.
          let effectiveAutomationId: string | null =
            automation.backendId || (isUuid(automation.id) ? automation.id : null) || automation.id
          const resolvedId = await resolveExcelCollectionAutomationId(automation)
          if (resolvedId) {
            effectiveAutomationId = resolvedId
            if (automation.backendId !== resolvedId) {
              void updateAutomation(automation.id, { backendId: resolvedId })
            }
          }
          if (!effectiveAutomationId) continue
          responses = await service.fetchBulkCollectionResponses({
            spreadsheetId,
            sheetId,
            automationId: effectiveAutomationId,
            automationType
          })
        } else {
          // bulk_collection: new runs tag flows with document-service automation UUID; legacy flows may
          // still use the client id. Merge results for every distinct client/backend id.
          const clientId = typeof automation.id === 'string' ? automation.id.trim() : ''
          const backendIdTrimmed = typeof automation.backendId === 'string' ? automation.backendId.trim() : ''
          const idCandidates = [...new Set([clientId, backendIdTrimmed].filter(id => id.length > 0))]
          if (idCandidates.length === 0) continue

          const merged: typeof responses = []
          const seenWorkflowIds = new Set<string>()
          for (const automationId of idCandidates) {
            const batch = await service.fetchBulkCollectionResponses({
              spreadsheetId,
              sheetId,
              automationId,
              automationType: 'bulk_collection'
            })
            for (const item of batch) {
              const wid = String(item.workflowId || '').trim()
              if (wid.length > 0 && !seenWorkflowIds.has(wid)) {
                seenWorkflowIds.add(wid)
                merged.push(item)
              }
            }
          }
          responses = merged
        }

        // Filter out already processed responses (only when shouldDedupeByMemory is true).
        // IMPORTANT:
        // For bulk_collection and excel_collection we DO NOT suppress by in-memory processed set,
        // because row application can race sheet hydration (poll before local rows exist), fail to
        // match, or fail to persist — and we must keep retrying on every poll until rows update.
        // Previously bulk_collection deduped after the first fetch, so closing/reopening the viewer
        // or a failed first apply could skip completed responses permanently for that session.
        const shouldDedupeByMemory = automation.type !== 'bulk_collection' && automation.type !== 'excel_collection'
        const newResponses = filterNewCompletedResponses(
          responses,
          shouldDedupeByMemory,
          processedWorkflowIdsRef.current
        )

        if (newResponses.length === 0) continue

        // Resolve recipient names/emails via GraphQL (service may return "Unknown" when using flows fallback)
        const responderIds = newResponses
          .map(r => r.responderId)
          .filter((id): id is string => Boolean(id) && id.trim().length > 0)
        graphQLClient.setAccessToken(accessToken)
        const recipientDataMap = await fetchRecipientsData(graphQLClient, responderIds)

        // Build updates for existing rows (rows that have _workflow_id matching these responses)
        const trackingColumns = ensureRecipientTrackingColumns(
          automation.collectionConfig?.trackingColumns || getDefaultTrackingColumns(),
          automation.type === 'excel_collection' ? 'excel_collection' : 'bulk_collection'
        )
        const statusColumn = automation.workflowConfig.statusColumn

        const columnIdToName = buildColumnIdToNameMap(automation)
        const fallbackColumnLabels = buildBulkCollectionFormFieldColumnLabels(automation, columnIdToName)
        const recipientIdByWorkflowId = new Map(
          workflowLinks
            .filter(link => link.automationId === automation.id)
            .map(link => {
              const rawRowId = String(link.rowId || '')
              const normalizedRecipientId = rawRowId.startsWith('recipient_')
                ? rawRowId.slice('recipient_'.length)
                : rawRowId
              return [String(link.workflowId || '').trim(), normalizedRecipientId]
            })
            .filter(([workflowId, recipientId]) => workflowId.length > 0 && recipientId.length > 0)
        )
        const rowUpdates = newResponses.map(response => {
          const normalizedWorkflowId = String(response.workflowId || '').trim()
          const normalizedResponderId = String(response.responderId || '').trim()
          const fallbackRecipientId = recipientIdByWorkflowId.get(normalizedWorkflowId)
          const effectiveResponderId = normalizedResponderId || fallbackRecipientId || ''
          const recipientData = effectiveResponderId ? recipientDataMap.get(effectiveResponderId) : undefined
          return buildRowUpdate({
            response: {
              workflowId: normalizedWorkflowId,
              responderId: effectiveResponderId,
              responderName: response.responderName,
              responderEmail: response.responderEmail,
              submittedAt: response.submittedAt,
              formData: response.formData
            },
            recipientData,
            trackingColumns,
            statusColumn,
            columnIdToName,
            columnMappings: automation.workflowConfig.columnMappings,
            fallbackColumnLabels
          })
        })

        if (shouldDedupeByMemory) {
          newResponses.forEach(r => processedWorkflowIdsRef.current.add(r.workflowId))
        }

        // Update existing rows via callback if available, otherwise add as new rows
        if (rowUpdates.length > 0) {
          if (onUpdateRowsRef.current) {
            onUpdateRowsRef.current(rowUpdates)
          } else if (onAddRowsRef.current) {
            // Fallback: add as new rows if no update callback
            onAddRowsRef.current(
              rowUpdates.map(u => ({
                cells: u.cells,
                metadata: { workflowId: u.workflowId, recipientId: u.recipientId }
              }))
            )
          } else {
            console.warn('[useSpreadsheetAutomations][trace] no row callbacks available', {
              automationId: automation.id,
              updatesCount: rowUpdates.length
            })
          }
        }
      } catch (err) {
        console.error('[useSpreadsheetAutomations] Error fetching bulk collection responses:', err)
      }
    }
  }, [
    automations,
    spreadsheetId,
    sheetId,
    accessToken,
    resolveExcelCollectionAutomationId,
    updateAutomation,
    workflowLinks
  ])

  // Poll for bulk collection responses
  useEffect(() => {
    if (!enablePolling) {
      return
    }

    // Check if there are any bulk/excel collection automations
    const hasBulkCollectionAutomations = automations.some(
      a => (a.type === 'bulk_collection' || a.type === 'excel_collection') && a.isEnabled
    )

    if (!hasBulkCollectionAutomations) {
      return
    }

    // Initial fetch
    fetchBulkCollectionResponses()

    // Set up polling interval (use sanitized value to prevent code injection from untrusted inputs)
    const sanitizedInterval = sanitizePollInterval(pollInterval)
    const intervalId = globalThis.setInterval(() => {
      void fetchBulkCollectionResponses()
    }, sanitizedInterval)
    const handleVisibilityOrFocus = () => {
      if (globalThis.document !== undefined && document.visibilityState === 'visible') {
        void fetchBulkCollectionResponses()
      }
    }
    if (globalThis.window !== undefined) {
      globalThis.addEventListener('focus', handleVisibilityOrFocus)
      globalThis.addEventListener('pageshow', handleVisibilityOrFocus)
    }
    if (globalThis.document !== undefined) {
      document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    }

    return () => {
      globalThis.clearInterval(intervalId)
      if (globalThis.window !== undefined) {
        globalThis.removeEventListener('focus', handleVisibilityOrFocus)
        globalThis.removeEventListener('pageshow', handleVisibilityOrFocus)
      }
      if (globalThis.document !== undefined) {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      }
    }
  }, [enablePolling, automations, pollInterval, fetchBulkCollectionResponses])

  // Get automation by ID
  const getAutomationById = useCallback(
    (id: string): SpreadsheetAutomation | undefined => {
      return automations.find(a => a.id === id)
    },
    [automations]
  )

  // Get enabled automations
  const getEnabledAutomations = useCallback((): SpreadsheetAutomation[] => {
    return automations.filter(a => a.isEnabled)
  }, [automations])

  // Get automations by trigger
  const getAutomationsByTrigger = useCallback(
    (trigger: SpreadsheetAutomation['trigger']): SpreadsheetAutomation[] => {
      return automations.filter(a => a.trigger === trigger)
    },
    [automations]
  )

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Complete Excel Collection task (when viewing a collection copy)
  const completeExcelCollectionTask = useCallback(
    async (copyAppId: string, formData?: Record<string, unknown>): Promise<{ success: boolean; error?: string }> => {
      const service = automationServiceRef.current
      if (!service) {
        return { success: false, error: 'Service not available' }
      }
      return service.findAndCompleteExcelCollectionTask(copyAppId, currentUserId, formData)
    },
    [currentUserId]
  )

  const hasExcelCollectionTaskForApp = useCallback(
    async (copyAppId: string): Promise<boolean> => {
      const service = automationServiceRef.current
      if (!service || !currentUserId) return false
      return service.hasExcelCollectionTaskForApp(copyAppId, currentUserId)
    },
    [currentUserId]
  )

  return {
    // State
    automations,
    workflowLinks,
    executionHistory,
    isLoading,
    error,
    isPolling,

    // CRUD
    createAutomation,
    updateAutomation,
    deleteAutomation,
    duplicateAutomation,
    toggleAutomation,

    // Execution
    runAutomation,
    runAutomationForRow,

    // Status
    getWorkflowLinkForRow,
    refreshWorkflowStatuses,
    refreshAutomationsFromDocumentService,
    startPolling,
    stopPolling,

    // Bulk Collection
    fetchBulkCollectionResponses,
    completeExcelCollectionTask,
    hasExcelCollectionTaskForApp,

    // Utilities
    getAutomationById,
    getEnabledAutomations,
    getAutomationsByTrigger,
    clearError
  }
}

export default useSpreadsheetAutomations
