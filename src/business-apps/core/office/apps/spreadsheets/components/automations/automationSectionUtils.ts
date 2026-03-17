import {
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  FileSpreadsheet,
  Users,
  FileDown,
  ClipboardCheck
} from 'lucide-react'
import type { SpreadsheetAutomation, AutomationType } from '../../types/automation'
import type {
  AutomationRun,
  AutomationWithRuns,
  RunSubmission,
  RecipientProfile,
  EmployeeLightResult
} from './automationSectionTypes'
import { getSpreadsheetBasePath, isAllowedSpreadsheetPath } from '../../utils/spreadsheetPaths'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID, GET_EMPLOYEE_LIGHT_BY_ID } from '@/common/data/employee/queries/employeeQueries'

export function extractArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== 'object') return []

  const obj = payload as Record<string, unknown>
  const data = obj.data

  if (Array.isArray(obj.items)) return obj.items as T[]
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).items)) {
    return (data as Record<string, unknown>).items as T[]
  }

  return []
}

function unwrapObject(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {}
  const obj = payload as Record<string, unknown>
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>
  }
  return obj
}

function extractAutomations(payload: unknown): Record<string, unknown>[] {
  const direct = extractArray<Record<string, unknown>>(payload)
  if (direct.length > 0) return direct

  const root = unwrapObject(payload)
  if (Array.isArray(root.automations)) {
    return root.automations as Record<string, unknown>[]
  }
  if (root.items && Array.isArray(root.items)) {
    return root.items as Record<string, unknown>[]
  }
  return []
}

function normalizeAutomationType(rawType: unknown): AutomationType {
  const value = typeof rawType === 'string' ? rawType.trim().toLowerCase() : ''
  if (!value) return 'row_workflow'

  if (value === 'bulk_collection' || value === 'bulkcollection' || value === 'bulk-collection') {
    return 'bulk_collection'
  }
  if (
    value === 'excel_collection' ||
    value === 'excelcollection' ||
    value === 'excel-collection' ||
    value === 'template_collection' ||
    value === 'spreadsheet_collection'
  ) {
    return 'excel_collection'
  }
  if (
    value === 'form_collection' ||
    value === 'formcollection' ||
    value === 'form-collection' ||
    value === 'data_collection' ||
    value === 'datacollection'
  ) {
    return 'bulk_collection'
  }
  if (value === 'sheet_approval' || value === 'sheetapproval' || value === 'sheet-approval') {
    return 'sheet_approval'
  }
  if (value === 'line_approval' || value === 'lineapproval' || value === 'line-approval') {
    return 'line_approval'
  }
  return 'row_workflow'
}

function normalizeAutomationTrigger(rawTrigger: unknown): SpreadsheetAutomation['trigger'] {
  const value = typeof rawTrigger === 'string' ? rawTrigger.trim() : ''
  if (
    value === 'manual' ||
    value === 'onRowAdd' ||
    value === 'onFieldChange' ||
    value === 'scheduled' ||
    value === 'onApprovalRequest'
  ) {
    return value
  }
  return 'manual'
}

function normalizeAutomation(raw: Record<string, unknown>): SpreadsheetAutomation {
  const normalizedType = normalizeAutomationType(raw.type ?? raw.automationType)
  const collectionConfig =
    raw.collectionConfig && typeof raw.collectionConfig === 'object'
      ? (raw.collectionConfig as Record<string, unknown>)
      : undefined
  const collectionMode = typeof collectionConfig?.type === 'string' ? collectionConfig.type.toLowerCase() : ''
  const modeAdjustedType =
    normalizedType === 'bulk_collection' && collectionMode === 'excel_collection' ? 'excel_collection' : normalizedType

  return {
    ...(raw as SpreadsheetAutomation),
    type: modeAdjustedType,
    trigger: normalizeAutomationTrigger(raw.trigger)
  }
}

function getAutomationIdentity(automation: SpreadsheetAutomation): string {
  const backendId =
    typeof automation.backendId === 'string' && automation.backendId.trim().length > 0
      ? automation.backendId.trim()
      : ''
  const id = typeof automation.id === 'string' ? automation.id.trim() : ''
  return backendId || id
}

async function fetchSheetPayload(
  docServiceUrl: string,
  accessToken: string,
  appId: string,
  sheetId: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${docServiceUrl}/spreadsheets/${appId}/sheets/${sheetId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    })
    if (!response.ok) return null
    return (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

function appendNormalizedAutomations(target: SpreadsheetAutomation[], rawAutomations: Record<string, unknown>[]): void {
  rawAutomations.forEach(rawAutomation => {
    target.push(normalizeAutomation(rawAutomation))
  })
}

function collectSheetLevelAutomationIdsAndPayloads(
  sheets: Record<string, unknown>[],
  target: SpreadsheetAutomation[]
): string[] {
  const sheetIdsNeedingDetails: string[] = []
  sheets.forEach(sheet => {
    const sheetAutomations = extractAutomations(sheet.automations)
    if (sheetAutomations.length > 0) {
      appendNormalizedAutomations(target, sheetAutomations)
      return
    }
    const sheetId = typeof sheet.id === 'string' ? sheet.id.trim() : ''
    if (sheetId) sheetIdsNeedingDetails.push(sheetId)
  })
  return sheetIdsNeedingDetails
}

function appendAutomationsFromSheetResponses(
  target: SpreadsheetAutomation[],
  sheetResponses: Array<Record<string, unknown> | null>
): void {
  sheetResponses.forEach(sheetPayload => {
    if (!sheetPayload) return
    const normalizedSheetPayload = unwrapObject(sheetPayload)
    appendNormalizedAutomations(target, extractAutomations(normalizedSheetPayload.automations))
  })
}

async function collectAutomationsFromSpreadsheetPayload(
  spreadsheetPayload: Record<string, unknown>,
  appId: string,
  docServiceUrl: string,
  accessToken: string
): Promise<SpreadsheetAutomation[]> {
  const fromSheetConfig: SpreadsheetAutomation[] = []
  appendNormalizedAutomations(fromSheetConfig, extractAutomations(spreadsheetPayload.automations))

  const sheets = extractArray<Record<string, unknown>>(spreadsheetPayload.sheets)
  const sheetIdsNeedingDetails = collectSheetLevelAutomationIdsAndPayloads(sheets, fromSheetConfig)
  if (sheetIdsNeedingDetails.length === 0) return fromSheetConfig

  const sheetResponses = await Promise.all(
    sheetIdsNeedingDetails.map(sheetId => fetchSheetPayload(docServiceUrl, accessToken, appId, sheetId))
  )

  appendAutomationsFromSheetResponses(fromSheetConfig, sheetResponses)
  return fromSheetConfig
}

export async function fetchAutomationsForApp(
  app: { id: string; name: string },
  docServiceUrl: string,
  accessToken: string
): Promise<AutomationWithRuns[]> {
  const [automationsResponse, spreadsheetResponse] = await Promise.all([
    fetch(`${docServiceUrl}/automations/app/${app.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    }),
    fetch(`${docServiceUrl}/spreadsheets/${app.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    })
  ])

  const fromAutomationEndpoint = automationsResponse.ok
    ? extractAutomations(await automationsResponse.json()).map(normalizeAutomation)
    : []

  const fromSheetConfig: SpreadsheetAutomation[] = []
  if (spreadsheetResponse.ok) {
    const spreadsheetPayload = unwrapObject(await spreadsheetResponse.json())
    const collected = await collectAutomationsFromSpreadsheetPayload(
      spreadsheetPayload,
      app.id,
      docServiceUrl,
      accessToken
    )
    fromSheetConfig.push(...collected)
  }

  const seen = new Set<string>()
  const mergedAutomations: SpreadsheetAutomation[] = []
  for (const automation of [...fromAutomationEndpoint, ...fromSheetConfig]) {
    const key = getAutomationIdentity(automation)
    if (!key || seen.has(key)) continue
    seen.add(key)
    mergedAutomations.push(automation)
  }

  return mergedAutomations.map(automation => ({
    ...automation,
    spreadsheetAppId: app.id,
    spreadsheetAppName: app.name
  }))
}

export async function fetchRunsForAutomation(
  automation: AutomationWithRuns,
  docServiceUrl: string,
  accessToken: string
): Promise<AutomationWithRuns> {
  try {
    const runsResponse = await fetch(`${docServiceUrl}/automations/${automation.id}/runs?limit=5`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    })
    if (runsResponse.ok) {
      return { ...automation, recentRuns: extractArray<AutomationRun>(await runsResponse.json()) }
    }
  } catch {
    // Ignore run fetch errors
  }
  return { ...automation, recentRuns: [] }
}

export function getAutomationTypeIcon(type: AutomationType) {
  switch (type) {
    case 'row_workflow':
      return FileSpreadsheet
    case 'bulk_collection':
      return Users
    case 'excel_collection':
      return FileDown
    case 'sheet_approval':
    case 'line_approval':
      return ClipboardCheck
    default:
      return Zap
  }
}

export function getAutomationTypeLabel(type: AutomationType, t: (key: string) => string): string {
  const keyMap: Record<AutomationType, string> = {
    row_workflow: 'automation-type-row-workflow',
    bulk_collection: 'automation-type-bulk-collection',
    excel_collection: 'automation-type-excel-collection',
    sheet_approval: 'automation-type-sheet-approval',
    line_approval: 'automation-type-line-approval'
  }
  return t(keyMap[type] || type)
}

export function formatRelativeTime(dateString: string, t: (key: string) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('automations-time-just-now')
  if (diffMins < 60) return t('automations-time-min-ago')
  if (diffHours < 24) return t('automations-time-hours-ago')
  if (diffDays < 7) return t('automations-time-days-ago')
  return date.toLocaleDateString()
}

export function getStatusBadgeVariant(
  status: AutomationRun['status']
): 'success' | 'destructive' | 'warning' | 'info' | 'offline' {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'FAILED':
    case 'CANCELLED':
      return 'destructive'
    case 'PARTIALLY_COMPLETED':
      return 'warning'
    case 'RUNNING':
      return 'info'
    case 'PENDING':
    default:
      return 'offline'
  }
}

export function getStatusIcon(status: AutomationRun['status']) {
  switch (status) {
    case 'COMPLETED':
      return CheckCircle
    case 'FAILED':
    case 'CANCELLED':
      return XCircle
    case 'PARTIALLY_COMPLETED':
      return AlertTriangle
    case 'RUNNING':
      return RefreshCw
    case 'PENDING':
    default:
      return Clock
  }
}

export function formatCompletionDateTime(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

export function getRunStatusIconClass(status: AutomationRun['status']): string {
  if (status === 'COMPLETED') return 'gba:text-success'
  if (status === 'FAILED') return 'gba:text-destructive'
  if (status === 'RUNNING') return 'gba:text-info gba:animate-spin'
  return 'gba:text-muted-foreground'
}

export function getRunProgressClass(status: AutomationRun['status']): string {
  if (status === 'COMPLETED') return 'gba:bg-success'
  if (status === 'FAILED') return 'gba:bg-destructive'
  return 'gba:bg-primary'
}

export function getSubmissionBadgeVariant(status: RunSubmission['status']): 'success' | 'info' {
  return status === 'COMPLETED' ? 'success' : 'info'
}

export function getSubmissionStatusLabel(status: RunSubmission['status'], t: (key: string) => string): string {
  return status === 'COMPLETED' ? t('sa-status-completed') : t('sa-status-sent')
}

export function openSafeSpreadsheetUrl(rawUrl: string): void {
  if (globalThis.window === undefined || !rawUrl) return

  try {
    const currentOrigin = globalThis.window.location.origin
    const targetUrl = new URL(rawUrl, currentOrigin)
    if (targetUrl.origin !== currentOrigin) return
    if (!isAllowedSpreadsheetPath(targetUrl.pathname)) return
    globalThis.window.open(targetUrl.toString(), '_blank', 'noopener,noreferrer')
  } catch {
    // Ignore malformed URLs.
  }
}

function safeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function getCompletedAt(rawItem: Record<string, unknown>): string | undefined {
  const settings =
    rawItem.settings && typeof rawItem.settings === 'object' ? (rawItem.settings as Record<string, unknown>) : {}
  return (
    safeString(settings.excel_collection_submitted_at, '') ||
    safeString(rawItem.excel_collection_submitted_at, '') ||
    safeString(rawItem.completedAt, '') ||
    undefined
  )
}

function isCompletedSubmission(rawItem: Record<string, unknown>, completedAt?: string): boolean {
  const settings =
    rawItem.settings && typeof rawItem.settings === 'object' ? (rawItem.settings as Record<string, unknown>) : {}
  const normalizedStatus = safeString(rawItem.status, '').toUpperCase()
  return settings.excel_collection_submitted === true || Boolean(completedAt) || normalizedStatus.includes('COMPLETED')
}

function normalizeAvatar(avatar?: string): string | undefined {
  if (!avatar) return undefined
  return avatar.startsWith('data:') ? avatar : `data:image/png;base64,${avatar}`
}

export async function resolveRecipientProfile(
  graphqlClient: ReturnType<typeof useGraphQLClient>,
  recipientId: string
): Promise<RecipientProfile> {
  const fallbackName = recipientId ? `User ${recipientId.slice(0, 8)}` : 'Unknown user'
  if (!graphqlClient || !recipientId) return { recipientName: fallbackName }

  for (const queryFn of [GET_EMPLOYEE_LIGHT_BY_USER_ID, GET_EMPLOYEE_LIGHT_BY_ID]) {
    try {
      const query = queryFn(recipientId)
      const result = await graphqlClient.request<EmployeeLightResult>(query)
      const employee = result.Employee?.[0]
      if (employee?.displayName) {
        return {
          recipientName: employee.displayName,
          recipientAvatar: normalizeAvatar(employee.pictureThumbnail)
        }
      }
    } catch {
      // Try next lookup strategy.
    }
  }

  return { recipientName: fallbackName }
}

export async function enrichRunSubmission(
  item: Record<string, unknown>,
  graphqlClient: ReturnType<typeof useGraphQLClient>,
  baseOrigin: string
): Promise<RunSubmission> {
  const copyAppId = safeString(item.id, '')
  const recipientId = safeString(item.ownerId, '')
  const profile = await resolveRecipientProfile(graphqlClient, recipientId)
  const completedAt = getCompletedAt(item)
  const isCompleted = isCompletedSubmission(item, completedAt)

  return {
    id: copyAppId,
    recipientId,
    recipientName: profile.recipientName,
    recipientAvatar: profile.recipientAvatar,
    copyAppName: safeString(item.name, 'Spreadsheet copy'),
    copyAppUrl: `${baseOrigin}${getSpreadsheetBasePath()}?appId=${encodeURIComponent(copyAppId)}&view=viewer`,
    status: isCompleted ? 'COMPLETED' : 'SENT',
    completedAt: isCompleted ? completedAt : undefined
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export async function fetchAccessibleSpreadsheets(
  docServiceUrl: string,
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  const PAGE_SIZE = 100
  let page = 1
  let hasMore = true
  const apps: Array<{ id: string; name: string }> = []

  while (hasMore) {
    const response = await fetch(`${docServiceUrl}/spreadsheets?page=${page}&limit=${PAGE_SIZE}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheets: ${response.statusText}`)
    }

    const payload = await response.json()
    const items = extractArray<{ id: string; name: string }>(payload)
    apps.push(...items.map(item => ({ id: item.id, name: item.name })))
    hasMore = items.length === PAGE_SIZE
    page++
  }

  return apps
}
