/**
 * SpreadsheetAutomationsSection Component
 *
 * Hub-level view for managing all spreadsheet automations.
 * Displays automations across all spreadsheets with run history.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tabs,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import {
  Zap,
  Search,
  Play,
  Square,
  History,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Users,
  FileDown,
  ClipboardCheck,
  ChevronRight,
  Eye,
  ExternalLink
} from 'lucide-react'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { getSpreadsheetBasePath, isAllowedSpreadsheetPath } from '../../utils/spreadsheetPaths'
import type { SpreadsheetAutomation, AutomationType } from '../../types/automation'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID, GET_EMPLOYEE_LIGHT_BY_ID } from '@/common/data/employee/queries/employeeQueries'
import { RunSummarizeWithAI } from './RunSummarizeWithAI'

export interface AutomationRun {
  id: string
  automationId: string
  spreadsheetAppId: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED' | 'CANCELLED'
  recipientCount: number
  completedCount: number
  message?: string
  recipients: string[]
  startedAt: string
  completedAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AutomationWithRuns extends SpreadsheetAutomation {
  spreadsheetAppId?: string
  spreadsheetAppName?: string
  recentRuns?: AutomationRun[]
}

export interface SpreadsheetAutomationsSectionProps {
  accessToken: string
  'data-testid'?: string
}

function extractArray<T>(payload: unknown): T[] {
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
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    if (!response.ok) return null
    return (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

async function collectAutomationsFromSpreadsheetPayload(
  spreadsheetPayload: Record<string, unknown>,
  appId: string,
  docServiceUrl: string,
  accessToken: string
): Promise<SpreadsheetAutomation[]> {
  const fromSheetConfig: SpreadsheetAutomation[] = []
  const appLevelAutomations = extractAutomations(spreadsheetPayload.automations)
  for (const rawAutomation of appLevelAutomations) {
    fromSheetConfig.push(normalizeAutomation(rawAutomation))
  }

  const sheets = extractArray<Record<string, unknown>>(spreadsheetPayload.sheets)
  const sheetIdsNeedingDetails: string[] = []
  for (const sheet of sheets) {
    const sheetAutomations = extractAutomations(sheet.automations)
    if (sheetAutomations.length > 0) {
      for (const rawAutomation of sheetAutomations) {
        fromSheetConfig.push(normalizeAutomation(rawAutomation))
      }
      continue
    }

    const sheetId = typeof sheet.id === 'string' ? sheet.id.trim() : ''
    if (sheetId) sheetIdsNeedingDetails.push(sheetId)
  }

  if (sheetIdsNeedingDetails.length === 0) {
    return fromSheetConfig
  }

  const sheetResponses = await Promise.all(
    sheetIdsNeedingDetails.map(sheetId => fetchSheetPayload(docServiceUrl, accessToken, appId, sheetId))
  )

  for (const sheetPayload of sheetResponses) {
    if (!sheetPayload) continue
    const normalizedSheetPayload = unwrapObject(sheetPayload)
    const sheetAutomations = extractAutomations(normalizedSheetPayload.automations)
    for (const rawAutomation of sheetAutomations) {
      fromSheetConfig.push(normalizeAutomation(rawAutomation))
    }
  }

  return fromSheetConfig
}

/**
 * Get icon for automation type
 */
function getAutomationTypeIcon(type: AutomationType) {
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

/**
 * Get label for automation type
 */
function getAutomationTypeLabel(type: AutomationType): string {
  const labels: Record<AutomationType, string> = {
    row_workflow: 'Row Workflow',
    bulk_collection: 'Data Collection (Form)',
    excel_collection: 'Data Collection (Template)',
    sheet_approval: 'Sheet Approval',
    line_approval: 'Line Approval'
  }
  return labels[type] || type
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

/**
 * Get status badge variant
 */
function getStatusBadgeVariant(
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

/**
 * Get status icon
 */
function getStatusIcon(status: AutomationRun['status']) {
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

/**
 * SpreadsheetAutomationsSection Component
 */
export const SpreadsheetAutomationsSection: React.FC<SpreadsheetAutomationsSectionProps> = ({
  accessToken,
  'data-testid': testId = 'spreadsheet-automations-section'
}) => {
  const [automations, setAutomations] = useState<AutomationWithRuns[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationWithRuns | null>(null)
  const [runningAutomations, setRunningAutomations] = useState<Set<string>>(new Set())
  const [stoppingRuns, setStoppingRuns] = useState<Set<string>>(new Set())

  const docServiceUrl = getDocumentServiceApiUrl().replace(/\/+$/, '')

  const fetchAccessibleSpreadsheets = useCallback(async (): Promise<Array<{ id: string; name: string }>> => {
    const PAGE_SIZE = 100
    let page = 1
    let hasMore = true
    const apps: Array<{ id: string; name: string }> = []

    while (hasMore) {
      const response = await fetch(`${docServiceUrl}/spreadsheets?page=${page}&limit=${PAGE_SIZE}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
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
  }, [accessToken, docServiceUrl])

  // Fetch all automations
  const fetchAutomations = useCallback(async () => {
    if (!accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Backend does not expose GET /automations.
      // Aggregate automations by reading all accessible spreadsheets, then per-app automations.
      const spreadsheets = await fetchAccessibleSpreadsheets()
      const automationsByApp = await Promise.all(
        spreadsheets.map(async app => {
          try {
            const [automationsResponse, spreadsheetResponse] = await Promise.all([
              fetch(`${docServiceUrl}/automations/app/${app.id}`, {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              }),
              fetch(`${docServiceUrl}/spreadsheets/${app.id}`, {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
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
          } catch {
            return [] as AutomationWithRuns[]
          }
        })
      )
      const automationsList = automationsByApp.flat()

      // Fetch recent runs for each automation
      const automationsWithRuns = await Promise.all(
        automationsList.map(async (automation: AutomationWithRuns) => {
          try {
            const runsResponse = await fetch(`${docServiceUrl}/automations/${automation.id}/runs?limit=5`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            })

            if (runsResponse.ok) {
              const runsData = await runsResponse.json()
              return {
                ...automation,
                recentRuns: extractArray<AutomationRun>(runsData)
              }
            }
          } catch {
            // Silently ignore run fetch errors
          }

          return { ...automation, recentRuns: [] }
        })
      )

      setAutomations(automationsWithRuns)
    } catch (err) {
      console.error('[SpreadsheetAutomationsSection] Error fetching automations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load automations')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, docServiceUrl, fetchAccessibleSpreadsheets])

  useEffect(() => {
    fetchAutomations()
  }, [fetchAutomations])

  // Filter automations
  const filteredAutomations = useMemo(() => {
    let filtered = automations

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        a => a.name.toLowerCase().includes(query) || a.description?.toLowerCase().includes(query)
      )
    }

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(a => a.type === activeTab)
    }

    return filtered
  }, [automations, searchQuery, activeTab])

  // Run automation
  const handleRunAutomation = useCallback(
    async (automation: AutomationWithRuns) => {
      if (!accessToken) return

      setRunningAutomations(prev => new Set(prev).add(automation.id))

      try {
        const response = await fetch(`${docServiceUrl}/automations/${automation.id}/run`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipients: automation.collectionConfig?.recipients || []
          })
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to run automation: ${response.statusText}`)
        }

        // Refresh automations to get updated run history
        await fetchAutomations()
      } catch (err) {
        console.error('[SpreadsheetAutomationsSection] Error running automation:', err)
        setError(err instanceof Error ? err.message : 'Failed to run automation')
      } finally {
        setRunningAutomations(prev => {
          const next = new Set(prev)
          next.delete(automation.id)
          return next
        })
      }
    },
    [accessToken, docServiceUrl, fetchAutomations]
  )

  // View automation details
  const handleViewAutomation = useCallback((automation: AutomationWithRuns) => {
    setSelectedAutomation(automation)
  }, [])

  const handleStopRun = useCallback(
    async (runId: string) => {
      if (!accessToken || !runId) return

      setStoppingRuns(prev => new Set(prev).add(runId))
      try {
        const response = await fetch(`${docServiceUrl}/automations/runs/${runId}/cancel`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to stop run: ${response.statusText}`)
        }

        await fetchAutomations()
      } catch (err) {
        console.error('[SpreadsheetAutomationsSection] Error stopping run:', err)
        setError(err instanceof Error ? err.message : 'Failed to stop run')
      } finally {
        setStoppingRuns(prev => {
          const next = new Set(prev)
          next.delete(runId)
          return next
        })
      }
    },
    [accessToken, docServiceUrl, fetchAutomations]
  )

  // Stats
  const stats = useMemo(() => {
    const total = automations.length
    const byType: Record<string, number> = {}
    let totalRuns = 0
    let activeRuns = 0

    automations.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + 1
      a.recentRuns?.forEach(run => {
        totalRuns++
        if (run.status === 'RUNNING' || run.status === 'PENDING') {
          activeRuns++
        }
      })
    })

    return { total, byType, totalRuns, activeRuns }
  }, [automations])

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-16" data-testid={testId}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid={testId}>
        <Card className="gba:p-6 gba:text-center">
          <XCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mx-auto gba:mb-4" />
          <p className="gba:text-destructive">{error}</p>
          <Button variant="outline" className="gba:mt-4" onClick={fetchAutomations}>
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  // Automation detail view
  if (selectedAutomation) {
    return (
      <AutomationDetailView
        automation={selectedAutomation}
        accessToken={accessToken}
        onBack={() => setSelectedAutomation(null)}
        onRunAgain={() => handleRunAutomation(selectedAutomation)}
        isRunning={runningAutomations.has(selectedAutomation.id)}
        data-testid={`${testId}-detail`}
      />
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card gba:px-6 gba:py-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-2">
              <Zap className="gba:w-5 gba:h-5 gba:text-primary" />
              Automations
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground">
              Manage your spreadsheet automations and view run history
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAutomations}>
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="gba:grid gba:grid-cols-4 gba:gap-3">
          <Card>
            <CardContent className="gba:p-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:text-xs gba:text-muted-foreground">Total</div>
                <div className="gba:text-lg gba:font-bold gba:text-foreground">{stats.total}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:p-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:text-xs gba:text-muted-foreground">Spreadsheet Collections</div>
                <div className="gba:text-lg gba:font-bold gba:text-primary">
                  {stats.byType['excel_collection'] || 0}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:p-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:text-xs gba:text-muted-foreground">Total Runs</div>
                <div className="gba:text-lg gba:font-bold gba:text-foreground">{stats.totalRuns}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:p-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:text-xs gba:text-muted-foreground">Active</div>
                <div className="gba:text-lg gba:font-bold gba:text-info">{stats.activeRuns}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="gba:px-6 gba:py-3 gba:border-b gba:flex gba:items-center gba:gap-4">
        <div className="gba:relative gba:flex-1 gba:max-w-sm">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder="Search automations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-10"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="excel_collection">Spreadsheet Collection</TabsTrigger>
            <TabsTrigger value="bulk_collection">Form Collection</TabsTrigger>
            <TabsTrigger value="row_workflow">Row Workflow</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-6">
        {filteredAutomations.length === 0 ? (
          <Card className="gba:border-dashed">
            <CardContent className="gba:py-16 gba:text-center">
              <Zap className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">
                {automations.length === 0 ? 'No automations yet' : 'No matching automations'}
              </h3>
              <p className="gba:text-muted-foreground">
                {automations.length === 0
                  ? 'Create automations from within your spreadsheets to see them here.'
                  : 'Try adjusting your search or filter.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="gba:space-y-3">
            {filteredAutomations.map(automation => (
              <AutomationListItem
                key={automation.id}
                automation={automation}
                onView={() => handleViewAutomation(automation)}
                onRun={() => handleRunAutomation(automation)}
                onStopRun={runId => handleStopRun(runId)}
                isRunning={runningAutomations.has(automation.id)}
                isStoppingRun={Boolean(automation.recentRuns?.[0]?.id && stoppingRuns.has(automation.recentRuns[0].id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * AutomationListItem Component
 */
interface AutomationListItemProps {
  automation: AutomationWithRuns
  onView: () => void
  onRun: () => void
  onStopRun: (runId: string) => void
  isRunning: boolean
  isStoppingRun: boolean
}

const AutomationListItem: React.FC<AutomationListItemProps> = ({
  automation,
  onView,
  onRun,
  onStopRun,
  isRunning,
  isStoppingRun
}) => {
  const Icon = getAutomationTypeIcon(automation.type)
  const latestRun = automation.recentRuns?.[0]
  const canStopLatestRun = latestRun && (latestRun.status === 'RUNNING' || latestRun.status === 'PENDING')

  return (
    <Card
      className="gba:hover:border-primary/50 gba:transition-colors gba:cursor-pointer"
      onClick={onView}
      data-testid={`automation-item-${automation.id}`}
    >
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          {/* Left: Icon and info */}
          <div className="gba:flex gba:items-start gba:gap-3 gba:flex-1 gba:min-w-0">
            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
              <Icon className="gba:w-5 gba:h-5 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-2">
                <h3 className="gba:font-semibold gba:text-foreground gba:truncate">{automation.name}</h3>
                {!automation.isEnabled && (
                  <Badge variant="outline" className="gba:text-xs">
                    Disabled
                  </Badge>
                )}
              </div>
              <div className="gba:flex gba:items-center gba:gap-3 gba:mt-1 gba:text-sm gba:text-muted-foreground">
                <span>{getAutomationTypeLabel(automation.type)}</span>
                {automation.spreadsheetAppName && (
                  <>
                    <span className="gba:text-muted-foreground/50">•</span>
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <FileSpreadsheet className="gba:w-3 gba:h-3" />
                      {automation.spreadsheetAppName}
                    </span>
                  </>
                )}
              </div>
              {automation.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:line-clamp-1">
                  {automation.description}
                </p>
              )}
              <div className="gba:flex gba:items-center gba:gap-4 gba:mt-2 gba:text-xs gba:text-muted-foreground">
                {latestRun && (
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <Clock className="gba:w-3 gba:h-3" />
                    Last run: {formatRelativeTime(latestRun.startedAt)}
                  </span>
                )}
                <span className="gba:flex gba:items-center gba:gap-1">
                  <History className="gba:w-3 gba:h-3" />
                  {automation.runCount} total runs
                </span>
                {latestRun && (latestRun.status === 'RUNNING' || latestRun.status === 'PENDING') && (
                  <Badge variant="info" className="gba:text-xs">
                    <RefreshCw className="gba:w-3 gba:h-3 gba:mr-1 gba:animate-spin" />
                    In Progress
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="gba:flex gba:items-center gba:gap-2">
            {automation.trigger === 'manual' && automation.type === 'excel_collection' && (
              <Button
                size="sm"
                variant="outline"
                onClick={e => {
                  e.stopPropagation()
                  onRun()
                }}
                disabled={!automation.isEnabled || isRunning}
              >
                {isRunning ? <Spinner size="sm" className="gba:mr-1" /> : <Play className="gba:w-4 gba:h-4 gba:mr-1" />}
                Run
              </Button>
            )}
            {canStopLatestRun && (
              <Button
                size="sm"
                variant="outline"
                onClick={e => {
                  e.stopPropagation()
                  onStopRun(latestRun.id)
                }}
                disabled={isStoppingRun}
              >
                {isStoppingRun ? (
                  <Spinner size="sm" className="gba:mr-1" />
                ) : (
                  <Square className="gba:w-4 gba:h-4 gba:mr-1" />
                )}
                Stop
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={e => {
                e.stopPropagation()
                onView()
              }}
            >
              <Eye className="gba:w-4 gba:h-4 gba:mr-1" />
              View
            </Button>

            <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          </div>
        </div>

        {/* Recent runs preview */}
        {automation.recentRuns && automation.recentRuns.length > 0 && (
          <div className="gba:mt-3 gba:pt-3 gba:border-t">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:mb-2">
              <History className="gba:w-3 gba:h-3" />
              Recent runs
            </div>
            <div className="gba:flex gba:gap-2">
              {automation.recentRuns.slice(0, 3).map(run => {
                const StatusIcon = getStatusIcon(run.status)
                return (
                  <Badge key={run.id} variant={getStatusBadgeVariant(run.status)} className="gba:text-xs">
                    <StatusIcon
                      className={`gba:w-3 gba:h-3 gba:mr-1 ${run.status === 'RUNNING' ? 'gba:animate-spin' : ''}`}
                    />
                    {run.completedCount}/{run.recipientCount}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * AutomationDetailView Component
 */
interface AutomationDetailViewProps {
  automation: AutomationWithRuns
  accessToken: string
  onBack: () => void
  onRunAgain: () => void
  isRunning: boolean
  'data-testid'?: string
}

const AutomationDetailView: React.FC<AutomationDetailViewProps> = ({
  automation,
  accessToken,
  onBack,
  onRunAgain,
  isRunning,
  'data-testid': testId
}) => {
  const [runs, setRuns] = useState<AutomationRun[]>(automation.recentRuns || [])
  const [isLoadingRuns, setIsLoadingRuns] = useState(false)
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null)

  const docServiceUrl = getDocumentServiceApiUrl().replace(/\/+$/, '')
  const Icon = getAutomationTypeIcon(automation.type)

  // Fetch all runs for this automation
  const fetchRuns = useCallback(async () => {
    if (!accessToken) return

    setIsLoadingRuns(true)
    try {
      const response = await fetch(`${docServiceUrl}/automations/${automation.id}/runs?limit=50`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRuns(extractArray<AutomationRun>(data))
      }
    } catch (err) {
      console.error('[AutomationDetailView] Error fetching runs:', err)
    } finally {
      setIsLoadingRuns(false)
    }
  }, [accessToken, docServiceUrl, automation.id])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  useEffect(() => {
    if (runs.length === 0) {
      setSelectedRun(null)
      return
    }

    setSelectedRun(prev => {
      if (!prev) return runs[0]
      return runs.find(run => run.id === prev.id) || runs[0]
    })
  }, [runs])

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card gba:px-6 gba:py-4">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronRight className="gba:w-4 gba:h-4 gba:rotate-180 gba:mr-1" />
            Back
          </Button>
        </div>

        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:w-12 gba:h-12 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <Icon className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
            <div>
              <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{automation.name}</h2>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                {getAutomationTypeLabel(automation.type)}
                {automation.spreadsheetAppName && ` • ${automation.spreadsheetAppName}`}
              </p>
              {automation.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">{automation.description}</p>
              )}
            </div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <Button variant="outline" size="sm" onClick={fetchRuns}>
              <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
              Refresh
            </Button>
            {automation.trigger === 'manual' && automation.type === 'excel_collection' && (
              <Button size="sm" onClick={onRunAgain} disabled={!automation.isEnabled || isRunning}>
                {isRunning ? <Spinner size="sm" className="gba:mr-2" /> : <Play className="gba:w-4 gba:h-4 gba:mr-2" />}
                Run Again
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-6">
        <h3 className="gba:font-semibold gba:text-foreground gba:mb-4 gba:flex gba:items-center gba:gap-2">
          <History className="gba:w-4 gba:h-4" />
          Run History
        </h3>

        {isLoadingRuns ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner size="md" />
          </div>
        ) : runs.length === 0 ? (
          <Card className="gba:border-dashed">
            <CardContent className="gba:py-12 gba:text-center">
              <History className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
              <h4 className="gba:font-semibold gba:text-foreground gba:mb-2">No runs yet</h4>
              <p className="gba:text-muted-foreground">Run this automation to see execution history here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] gba:gap-4">
            <div className="gba:space-y-3">
              {runs.map(run => {
                const StatusIcon = getStatusIcon(run.status)
                const progress = run.recipientCount > 0 ? (run.completedCount / run.recipientCount) * 100 : 0
                const isSelected = selectedRun?.id === run.id

                return (
                  <Card
                    key={run.id}
                    className={`gba:transition-colors gba:cursor-pointer ${
                      isSelected ? 'gba:border-primary gba:bg-primary/5' : 'gba:hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedRun(run)}
                  >
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <StatusIcon
                            className={`gba:w-5 gba:h-5 ${
                              run.status === 'COMPLETED'
                                ? 'gba:text-success'
                                : run.status === 'FAILED' || run.status === 'CANCELLED'
                                  ? 'gba:text-destructive'
                                  : run.status === 'RUNNING'
                                    ? 'gba:text-info gba:animate-spin'
                                    : 'gba:text-muted-foreground'
                            }`}
                          />
                          <div>
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:font-medium gba:text-foreground">
                                {formatRelativeTime(run.startedAt)}
                              </span>
                              <Badge variant={getStatusBadgeVariant(run.status)} className="gba:text-xs">
                                {run.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                              {run.completedCount} of {run.recipientCount} completed
                              {run.message && ` • ${run.message}`}
                            </p>
                          </div>
                        </div>

                        <div className="gba:flex gba:items-center gba:gap-4">
                          <div className="gba:w-32">
                            <div className="gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                              <div
                                className={`gba:h-full gba:rounded-full ${
                                  run.status === 'COMPLETED'
                                    ? 'gba:bg-success'
                                    : run.status === 'FAILED'
                                      ? 'gba:bg-destructive'
                                      : 'gba:bg-primary'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <RunDetailPanel run={selectedRun} accessToken={accessToken} data-testid={`${testId}-run-detail`} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * RunDetailPanel Component
 */
interface RunDetailPanelProps {
  run: AutomationRun | null
  accessToken: string
  'data-testid'?: string
}

interface EmployeeLightResult {
  Employee?: Array<{ displayName: string; pictureThumbnail?: string }>
}

interface RecipientProfile {
  recipientName: string
  recipientAvatar?: string
}

interface RunSubmission {
  id: string
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  copyAppName: string
  copyAppUrl: string
  status: 'COMPLETED' | 'SENT'
  completedAt?: string
}

function formatCompletionDateTime(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

function getRunStatusIconClass(status: AutomationRun['status']): string {
  if (status === 'COMPLETED') return 'gba:text-success'
  if (status === 'FAILED') return 'gba:text-destructive'
  if (status === 'RUNNING') return 'gba:text-info gba:animate-spin'
  return 'gba:text-muted-foreground'
}

function getRunProgressClass(status: AutomationRun['status']): string {
  if (status === 'COMPLETED') return 'gba:bg-success'
  if (status === 'FAILED') return 'gba:bg-destructive'
  return 'gba:bg-primary'
}

function getSubmissionBadgeVariant(status: RunSubmission['status']): 'success' | 'info' {
  return status === 'COMPLETED' ? 'success' : 'info'
}

function getSubmissionStatusLabel(status: RunSubmission['status']): 'Completed' | 'Sent' {
  return status === 'COMPLETED' ? 'Completed' : 'Sent'
}

function openSafeSpreadsheetUrl(rawUrl: string): void {
  if (globalThis.window === undefined || !rawUrl) return

  try {
    const currentOrigin = globalThis.window.location.origin
    const targetUrl = new URL(rawUrl, currentOrigin)

    // Guard against open-redirect behavior: only allow same-origin spreadsheet app links.
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

async function resolveRecipientProfile(
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

async function enrichRunSubmission(
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const RunDetailPanel: React.FC<RunDetailPanelProps> = ({ run, accessToken, 'data-testid': testId }) => {
  const [submissions, setSubmissions] = useState<RunSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const docServiceUrl = getDocumentServiceApiUrl().replace(/\/+$/, '')
  const StatusIcon = run ? getStatusIcon(run.status) : null
  const graphqlClient = useGraphQLClient(accessToken)

  // Fetch submissions for this run
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!accessToken || !run?.id) return

      setIsLoading(true)
      try {
        const response = await fetch(`${docServiceUrl}/automations/runs/${run.id}/submissions`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) return

        const data = await response.json()
        const rawSubmissions = extractArray<Record<string, unknown>>(data)
        const baseOrigin = globalThis.window !== undefined ? globalThis.window.location.origin : ''
        const enrichedSubmissions = await Promise.all(
          rawSubmissions.map(item => enrichRunSubmission(item, graphqlClient, baseOrigin))
        )
        setSubmissions(enrichedSubmissions)
      } catch (err) {
        console.error('[RunDetailDialog] Error fetching submissions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchSubmissions()
  }, [accessToken, docServiceUrl, run?.id])

  if (!run) {
    return (
      <Card className="gba:h-fit" data-testid={testId}>
        <CardContent className="gba:p-4">
          <p className="gba:text-sm gba:text-muted-foreground">Select a run to see recipient details.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:h-fit" data-testid={testId}>
      <CardContent className="gba:p-4">
        <div className="gba:mb-4">
          <h4 className="gba:flex gba:items-center gba:gap-2 gba:font-semibold gba:text-foreground">
            {StatusIcon && <StatusIcon className={`gba:w-5 gba:h-5 ${getRunStatusIconClass(run.status)}`} />}
            Run Details
          </h4>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            Started {formatRelativeTime(run.startedAt)}
            {run.completedAt && ` • Completed ${formatRelativeTime(run.completedAt)}`}
          </p>
        </div>

        <div className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
            <span className="gba:text-sm gba:font-medium">Progress</span>
            <span className="gba:text-sm gba:text-muted-foreground">
              {run.completedCount} / {run.recipientCount}
            </span>
          </div>
          <div className="gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
            <div
              className={`gba:h-full gba:rounded-full ${getRunProgressClass(run.status)}`}
              style={{
                width: `${run.recipientCount > 0 ? (run.completedCount / run.recipientCount) * 100 : 0}%`
              }}
            />
          </div>
        </div>

        <div>
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
            <h5 className="gba:font-medium gba:text-foreground">Recipients</h5>
            <RunSummarizeWithAI
              accessToken={accessToken}
              submissions={submissions}
              runName={run ? formatRelativeTime(run.startedAt) : undefined}
              data-testid="run-detail-summarize-ai"
            />
          </div>
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Spinner size="sm" />
            </div>
          ) : submissions.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
              No submission data available
            </p>
          ) : (
            <div className="gba:space-y-2 gba:max-h-80 gba:overflow-auto">
              {submissions.map(submission => (
                <div key={submission.id} className="gba:p-3 gba:rounded-lg gba:bg-muted/50">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                      <Avatar className="gba:w-7 gba:h-7">
                        {submission.recipientAvatar && <AvatarImage src={submission.recipientAvatar} />}
                        <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                          {getInitials(submission.recipientName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:truncate">{submission.recipientName}</p>
                        <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{submission.copyAppName}</p>
                      </div>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Badge variant={getSubmissionBadgeVariant(submission.status)}>
                        {getSubmissionStatusLabel(submission.status)}
                      </Badge>
                      {submission.status === 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSafeSpreadsheetUrl(submission.copyAppUrl)}
                        >
                          <ExternalLink className="gba:w-3 gba:h-3 gba:mr-1" />
                          Open file
                        </Button>
                      )}
                    </div>
                  </div>
                  {submission.status === 'COMPLETED' && (
                    <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
                      Completed at {formatCompletionDateTime(submission.completedAt) || 'N/A'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SpreadsheetAutomationsSection
