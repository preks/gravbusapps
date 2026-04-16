/**
 * SpreadsheetAppsHub Component
 *
 * The main entry point for the Excel-to-App feature.
 * Modern OneDrive-inspired design with sidebar navigation.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Card,
  Button,
  Input,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import translations from './_i18n'
import {
  FileSpreadsheet,
  Plus,
  Search,
  List,
  Upload,
  AlertCircle,
  FileText,
  Users,
  Star,
  Trash2,
  MoreHorizontal,
  Share2,
  Link2,
  Download,
  Settings,
  Copy,
  Play,
  ArrowUpDown,
  X,
  LayoutGrid,
  User,
  RefreshCw
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getWorkEmailFromCommunication } from '@/common/data/employee/useEmployeeSearch'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID, GET_EMPLOYEE_LIGHT_BY_ID } from '@/common/data/employee/queries/employeeQueries'

// Components
import { SpreadsheetHero } from './components/SpreadsheetHero'
import type { SpreadsheetSection } from './components/SpreadsheetHero'
import { ExcelUploader } from './components/ExcelUploader'
import { PromoteToDatabaseModal } from './components/PromoteToDatabaseModal'
import { SpreadsheetAppViewer } from './SpreadsheetAppViewer'
import { SpreadsheetAppEditor } from './SpreadsheetAppEditor'
import { ShareAppDialog } from './components/ShareAppDialog'
import { ManageSharesDialog } from './components/ManageSharesDialog'
import { SpreadsheetAutomationsSection } from './components/automations/SpreadsheetAutomationsSection'
import { TrashedSpreadsheetReadonlyDialog } from './components/TrashedSpreadsheetReadonlyDialog'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { OfficeTrashList } from '@/business-apps/platform/apps/shared/components/OfficeTrashList'
import { DeleteConfirmDialog } from '@/business-apps/core/office/apps/drive/components/DeleteConfirmDialog'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'

// Hooks
import { useSpreadsheetApps } from './hooks/useSpreadsheetApps'
import { useDataPromotion } from './hooks/useDataPromotion'
import { useSpreadsheetAppsHubFavorites } from './hooks/useSpreadsheetAppsHubFavorites'
import { useSpreadsheetAppsHubFiltering } from './hooks/useSpreadsheetAppsHubFiltering'
import { useSpreadsheetAppsHubUrlState } from './hooks/useSpreadsheetAppsHubUrlState'
import { useSpreadsheetAppsHubUserLookup } from './hooks/useSpreadsheetAppsHubUserLookup'
import { useHubPagination } from '@/business-apps/platform/apps/shared/hooks/useHubPagination'
import { HubPaginationFooter } from '@/business-apps/platform/apps/shared/components/HubPaginationFooter'
import { navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { sanitizeSameOriginReturnUrl } from '@/common/utils/safeUrlUtils'

// Services
import { generateAppSchemaFromParsedFile, generateEmptyAppSchema } from './services/SchemaGenerator'
import { setSpreadsheetApiAuthTokenProvider, SpreadsheetApiService } from './services/SpreadsheetApiService'
import { exportAppToExcel } from './utils/exportUtils'

// Types
import type { ParsedExcelFile, SpreadsheetApp, SpreadsheetAppSummary } from './types'
import { getIconByName } from './utils/appIcons'
import { SpreadsheetPreviewThumbnail } from './components/SpreadsheetPreviewThumbnail'

export interface SpreadsheetAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type HubView = 'list' | 'upload' | 'viewer' | 'editor' | 'trash'
type SidebarSection = SpreadsheetSection
const TASK_DEBUG_PREFIX = '[SpreadsheetTasksDebug]'

const isTaskDebugEnabled = (): boolean => {
  try {
    return globalThis.localStorage?.getItem('debug:spreadsheet-apps') === '1'
  } catch {
    return false
  }
}

const taskDebugLog = (...args: unknown[]) => {
  if (isTaskDebugEnabled()) {
    console.debug(...args)
  }
}

function maskIdentifier(id: string | null | undefined): string {
  const normalized = String(id || '').trim()
  if (!normalized) return 'n/a'
  if (normalized.length <= 8) return normalized
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`
}

function summarizeIdSet(ids: Set<string>, maxItems = 10): string[] {
  return Array.from(ids)
    .slice(0, maxItems)
    .map(id => maskIdentifier(id))
}

const resolveCurrentUserId = (userInfo?: SpreadsheetAppsHubProps['userInfo']): string =>
  userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

const filterTaskDisplayedApps = (
  activeSection: SidebarSection,
  taskStatusFilter: 'pending' | 'completed',
  filteredApps: SpreadsheetAppSummary[],
  pendingTaskAppIds: Set<string>,
  completedTaskAppIds: Set<string>
): SpreadsheetAppSummary[] => {
  if (activeSection !== 'tasks') return filteredApps
  if (taskStatusFilter === 'pending') {
    if (pendingTaskAppIds.size > 0) {
      return filteredApps.filter(app => pendingTaskAppIds.has(app.id))
    }
    return filteredApps.filter(app => !isSubmittedExcelCollectionCopy(app))
  }
  if (completedTaskAppIds.size > 0) {
    return filteredApps.filter(app => completedTaskAppIds.has(app.id) && !pendingTaskAppIds.has(app.id))
  }
  return filteredApps.filter(app => isSubmittedExcelCollectionCopy(app))
}

/** Get initials from a name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function isSubmittedExcelCollectionCopy(app: SpreadsheetAppSummary): boolean {
  const settings = (app.settings && typeof app.settings === 'object' ? app.settings : {}) as Record<string, unknown>
  const submittedAt =
    (typeof settings.excel_collection_submitted_at === 'string' && settings.excel_collection_submitted_at) ||
    (typeof settings.completedAt === 'string' && settings.completedAt) ||
    ''
  const status = (typeof settings.status === 'string' ? settings.status : '').toUpperCase()
  return settings.excel_collection_submitted === true || Boolean(submittedAt) || status.includes('COMPLETED')
}

function hasExcelCollectionCopyMarker(app: SpreadsheetAppSummary): boolean {
  const settings = (app.settings && typeof app.settings === 'object' ? app.settings : {}) as Record<string, unknown>
  const isTruthy = (value: unknown): boolean => {
    if (value === true) return true
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      return normalized === 'true' || normalized === '1' || normalized === 'yes'
    }
    if (typeof value === 'number') return value === 1
    return false
  }
  return (
    isTruthy(settings.excel_collection_copy) ||
    isTruthy(settings.excelCollectionCopy) ||
    (typeof settings.parentAppId === 'string' && settings.parentAppId.length > 0) ||
    (typeof settings.copyAppId === 'string' && settings.copyAppId.length > 0) ||
    (typeof settings.automationRunId === 'string' && settings.automationRunId.length > 0)
  )
}

function isPendingTaskApp(app: SpreadsheetAppSummary, currentUserId: string, pendingTaskAppIds: Set<string>): boolean {
  void currentUserId
  // `apps` is already access-scoped by backend list API.
  // Do not rely on optional permission flags for task visibility.
  const isTask = pendingTaskAppIds.has(app.id) || hasExcelCollectionCopyMarker(app)
  return isTask && !isSubmittedExcelCollectionCopy(app)
}

function formatAvatarUrl(src?: string): string | undefined {
  if (!src) return undefined
  return src.startsWith('data:') ? src : `data:image/png;base64,${src}`
}

type TranslationFn = (key: string, vars?: Record<string, number>) => string

function resolveCurrentUserName(userInfo?: SpreadsheetAppsHubProps['userInfo']): string | undefined {
  if (userInfo?.employeeDetails?.firstName && userInfo?.employeeDetails?.lastName) {
    return `${userInfo.employeeDetails.firstName} ${userInfo.employeeDetails.lastName}`
  }
  if (userInfo?.givenName && userInfo?.familyName) {
    return `${userInfo.givenName} ${userInfo.familyName}`
  }
  return userInfo?.nickName || userInfo?.userName || undefined
}

const OPEN_TASK_STATUS_BLOCKLIST = new Set(['COMPLETED', 'DONE', 'CANCELLED', 'CANCELED', 'FAILED', 'TERMINATED'])

function normalizeStatus(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function isOpenTask(task: Record<string, unknown>): boolean {
  const status = normalizeStatus(task.status)
  if (!status) return true
  return !OPEN_TASK_STATUS_BLOCKLIST.has(status)
}

function extractTaskFlowId(task: Record<string, unknown>): string | null {
  const flow = task.flow as Record<string, unknown> | undefined
  const flowId = String(task.flowId || task.workflowId || task.businessKey || flow?.id || '').trim()
  return flowId || null
}

function extractFlowId(flow: Record<string, unknown>): string | null {
  const id = String(flow.id || flow.flowId || flow.workflowId || '').trim()
  return id || null
}

function extractCopyAppIdFromFlow(flow: Record<string, unknown>): string | null {
  const tags = (flow.tags as Record<string, unknown>) || {}
  const automationType = String(tags.automationType || '')
    .trim()
    .toLowerCase()
  if (automationType !== 'excel_collection') return null
  const copyAppId = String(tags.copyAppId || tags.copy_app_id || '').trim()
  return copyAppId || null
}

function extractCopyAppIdFromTask(task: Record<string, unknown>): string | null {
  const tags = (task.tags as Record<string, unknown>) || {}
  const copyAppId = String(task.copyAppId || task.copy_app_id || tags.copyAppId || tags.copy_app_id || '').trim()
  return copyAppId || null
}

function areStringSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const value of a) {
    if (!b.has(value)) return false
  }
  return true
}

async function fetchPendingExcelCollectionCopyAppIds(params: {
  accessToken: string
  currentUserId: string
}): Promise<{ pendingIds: Set<string>; completedIds: Set<string> }> {
  const { accessToken, currentUserId } = params
  if (!accessToken || !currentUserId) {
    taskDebugLog(`${TASK_DEBUG_PREFIX} Skipping task fetch due to missing auth/user`, {
      hasAccessToken: Boolean(accessToken),
      hasUserId: Boolean(currentUserId)
    })
    return { pendingIds: new Set<string>(), completedIds: new Set<string>() }
  }

  const apiBase = getFlowEngineApiBaseUrl().replace(/\/+$/, '')
  const headers: HeadersInit = { Authorization: `Bearer ${accessToken}` }
  taskDebugLog(`${TASK_DEBUG_PREFIX} Fetching task app ids`, {
    apiBase,
    userId: maskIdentifier(currentUserId)
  })

  const openTaskResponse = await fetch(`${apiBase}/tasks/user/${currentUserId}`, {
    method: 'GET',
    headers
  })
  const completedTaskResponse = await fetch(`${apiBase}/tasks/user/${currentUserId}/completed?limit=200`, {
    method: 'GET',
    headers
  })
  taskDebugLog(`${TASK_DEBUG_PREFIX} Task API responses`, {
    openStatus: openTaskResponse.status,
    openOk: openTaskResponse.ok,
    completedStatus: completedTaskResponse.status,
    completedOk: completedTaskResponse.ok
  })

  const taskPayload = openTaskResponse.ok
    ? ((await openTaskResponse.json()) as {
        tasks?: Array<Record<string, unknown>>
        data?: { tasks?: Array<Record<string, unknown>> }
      })
    : null
  const completedTaskPayload = completedTaskResponse.ok
    ? ((await completedTaskResponse.json()) as {
        tasks?: Array<Record<string, unknown>>
        data?: { tasks?: Array<Record<string, unknown>> }
      })
    : null

  const openTasks = taskPayload ? taskPayload.tasks || taskPayload.data?.tasks || [] : []
  const completedTasks = completedTaskPayload
    ? completedTaskPayload.tasks || completedTaskPayload.data?.tasks || []
    : []
  if (
    (!Array.isArray(openTasks) || openTasks.length === 0) &&
    (!Array.isArray(completedTasks) || completedTasks.length === 0)
  ) {
    taskDebugLog(`${TASK_DEBUG_PREFIX} No open/completed tasks returned`, {
      openTasks: Array.isArray(openTasks) ? openTasks.length : 0,
      completedTasks: Array.isArray(completedTasks) ? completedTasks.length : 0
    })
    return { pendingIds: new Set<string>(), completedIds: new Set<string>() }
  }

  const pendingFlowIds = new Set<string>()
  const completedFlowIds = new Set<string>()
  const pendingIds = new Set<string>()
  const completedIds = new Set<string>()

  const collectFromTask = (task: Record<string, unknown>, targetIds: Set<string>, targetFlowIds: Set<string>) => {
    const directCopyAppId = extractCopyAppIdFromTask(task)
    if (directCopyAppId) targetIds.add(directCopyAppId)
    const flowId = extractTaskFlowId(task)
    if (flowId) targetFlowIds.add(flowId)
  }

  if (Array.isArray(openTasks)) {
    openTasks.filter(task => isOpenTask(task)).forEach(task => collectFromTask(task, pendingIds, pendingFlowIds))
  }

  if (Array.isArray(completedTasks)) {
    completedTasks.forEach(task => collectFromTask(task, completedIds, completedFlowIds))
  }
  taskDebugLog(`${TASK_DEBUG_PREFIX} Parsed task payload`, {
    openTasks: Array.isArray(openTasks) ? openTasks.length : 0,
    completedTasks: Array.isArray(completedTasks) ? completedTasks.length : 0,
    pendingFlowIds: pendingFlowIds.size,
    completedFlowIds: completedFlowIds.size,
    pendingDirectCopyIds: pendingIds.size,
    completedDirectCopyIds: completedIds.size
  })

  const allFlowIds = new Set<string>([...pendingFlowIds, ...completedFlowIds])
  if (allFlowIds.size === 0) {
    completedIds.forEach(id => {
      if (pendingIds.has(id)) completedIds.delete(id)
    })
    taskDebugLog(`${TASK_DEBUG_PREFIX} Resolved copy app ids without flow lookup`, {
      pendingIds: pendingIds.size,
      completedIds: completedIds.size,
      pendingSamples: summarizeIdSet(pendingIds),
      completedSamples: summarizeIdSet(completedIds)
    })
    return { pendingIds, completedIds }
  }

  const flowsResponse = await fetch(`${apiBase}/flows/list`, {
    method: 'GET',
    headers
  })
  if (!flowsResponse.ok) {
    taskDebugLog(`${TASK_DEBUG_PREFIX} Flow list request failed, returning task-derived ids only`, {
      status: flowsResponse.status
    })
    completedIds.forEach(id => {
      if (pendingIds.has(id)) completedIds.delete(id)
    })
    return { pendingIds, completedIds }
  }

  const flowsPayload = (await flowsResponse.json()) as {
    flows?: Array<Record<string, unknown>>
    data?: { flows?: Array<Record<string, unknown>> }
  }
  const flows = flowsPayload.flows || flowsPayload.data?.flows || []
  if (!Array.isArray(flows) || flows.length === 0) {
    taskDebugLog(`${TASK_DEBUG_PREFIX} Flow list is empty, returning task-derived ids only`)
    completedIds.forEach(id => {
      if (pendingIds.has(id)) completedIds.delete(id)
    })
    return { pendingIds, completedIds }
  }

  const flowById = new Map<string, Record<string, unknown>>()
  flows.forEach(flow => {
    const id = extractFlowId(flow)
    if (id) flowById.set(id, flow)
  })

  pendingFlowIds.forEach(flowId => {
    const flow = flowById.get(flowId)
    if (!flow) return
    const copyAppId = extractCopyAppIdFromFlow(flow)
    if (copyAppId) pendingIds.add(copyAppId)
  })

  completedFlowIds.forEach(flowId => {
    const flow = flowById.get(flowId)
    if (!flow) return
    const copyAppId = extractCopyAppIdFromFlow(flow)
    if (copyAppId) completedIds.add(copyAppId)
  })

  completedIds.forEach(id => {
    if (pendingIds.has(id)) completedIds.delete(id)
  })

  taskDebugLog(`${TASK_DEBUG_PREFIX} Final task app id resolution`, {
    totalFlows: flows.length,
    pendingIds: pendingIds.size,
    completedIds: completedIds.size,
    pendingSamples: summarizeIdSet(pendingIds),
    completedSamples: summarizeIdSet(completedIds)
  })

  return { pendingIds, completedIds }
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string, t: TranslationFn, locale: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('time-just-now')
  if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
  if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) return t('time-days-ago', { count: diffDays })
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric'
  })
}

/**
 * Format date for table display
 */
function formatDate(dateString: string, t: TranslationFn, locale: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) return t('time-days-ago', { count: diffDays })
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric'
  })
}

/**
 * SpreadsheetAppsHub Component
 */
export const SpreadsheetAppsHub: React.FC<SpreadsheetAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'spreadsheet-apps-hub'
}) => {
  const { t, locale } = useTranslation(translations)

  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [trashSearchQuery, setTrashSearchQuery] = useState('')
  const [taskStatusFilter, setTaskStatusFilter] = useState<'pending' | 'completed'>('pending')
  const [pendingTaskAppIds, setPendingTaskAppIds] = useState<Set<string>>(new Set())
  const [completedTaskAppIds, setCompletedTaskAppIds] = useState<Set<string>>(new Set())

  // Clear space return URL if not opened from a space
  useEffect(() => {
    try {
      const { pathname, search, hash } = globalThis.window.location
      // Backward compatibility: route old spreadsheet URL to the canonical every-office path.
      if (pathname.startsWith('/platform/spreadsheets')) {
        globalThis.window.location.replace(`/platform/every-office/spreadsheets${search}${hash}`)
        return
      }
      const params = new URLSearchParams(globalThis.window.location.search)
      const spaceId = params.get('spaceId')
      if (!spaceId) {
        // Spreadsheet opened from hub, not from a space - clear any stale return URL
        sessionStorage.removeItem('space_return_url')
      }
    } catch (e) {
      console.warn('Failed to check/clear space_return_url:', e)
    }
  }, [])
  const [isCreateEmptyDialogOpen, setIsCreateEmptyDialogOpen] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const [activeSection, setActiveSection] = useState<SidebarSection>('my-files')
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set())
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [pendingTrashApps, setPendingTrashApps] = useState<Array<{ id: string; name: string }>>([])
  const [isMovingAppsToTrash, setIsMovingAppsToTrash] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'created'>('modified')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { favorites, setFavorites } = useSpreadsheetAppsHubFavorites()

  // Data state
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [appToPromote, setAppToPromote] = useState<SpreadsheetApp | null>(null)
  const [isRestoringTrashedApp, setIsRestoringTrashedApp] = useState(false)
  const [isDeletingTrashedApp, setIsDeletingTrashedApp] = useState(false)

  // Get current user ID
  const currentUserId = resolveCurrentUserId(userInfo)
  const flowTaskUserId = userInfo?.id || currentUserId

  // Ensure SpreadsheetApiService can authenticate in published screens (token might not be in localStorage)
  useEffect(() => {
    if (!accessToken) return
    setSpreadsheetApiAuthTokenProvider(() => accessToken)
    return () => setSpreadsheetApiAuthTokenProvider(null)
  }, [accessToken])

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedAppForShare, setSelectedAppForShare] = useState<SpreadsheetAppSummary | null>(null)
  const [sharedUsers, setSharedUsers] = useState<
    Array<{
      id: string
      userId: string
      userName: string
      userEmail: string
      userAvatar?: string
      permission: 'view' | 'edit' | 'admin'
      sharedAt: string
    }>
  >([])

  // Manage shares dialog state
  const [manageSharesDialogOpen, setManageSharesDialogOpen] = useState(false)
  const [selectedAppForManageShares, setSelectedAppForManageShares] = useState<SpreadsheetAppSummary | null>(null)

  // GraphQL client for fetching user info
  const graphqlClient = useGraphQLClient(accessToken)

  // Hooks - Using file storage (database-backed) with localStorage fallback
  const {
    apps,
    currentApp,
    isLoading: isLoadingApps,
    error: appsError,
    currentAppPermission,
    loadApp,
    createApp,
    updateApp,
    deleteApp,
    duplicateApp,
    shareApp,
    revokeAccess,
    getSharedUsers,
    refreshApps,
    clearCurrentApp,
    addRow,
    updateRow,
    updateSheet
  } = useSpreadsheetApps(accessToken, currentUserId)

  const { ownerInfoMap, sharedUsersMap } = useSpreadsheetAppsHubUserLookup({
    apps,
    currentUserId,
    graphqlClient,
    activeSection
  })

  const { promoteToDatabase } = useDataPromotion(accessToken)
  const { updateUrl } = useSpreadsheetAppsHubUrlState({
    currentView,
    currentAppId: currentApp?.id || null,
    isLoadingApps,
    loadAppById: loadApp,
    setSelectedAppId,
    setCurrentView,
    activeSection,
    setActiveSection,
    onLoadFailed: () => {
      toast.error(t('toast-spreadsheet-not-found'))
    }
  })

  // Update URL whenever activeSection changes (when user clicks sidebar)
  useEffect(() => {
    const hasAppIdInUrl = new URLSearchParams(globalThis.window.location.search).has('appId')
    if (currentView === 'list' && !currentApp) {
      // During initial URL restore, keep appId/view params until loading finishes.
      if (hasAppIdInUrl) return
      updateUrl(null)
    }
  }, [activeSection, currentView, currentApp, updateUrl])

  const { filteredApps } = useSpreadsheetAppsHubFiltering({
    apps,
    currentUserId,
    activeSection,
    favorites,
    taskAppIds: new Set<string>([...pendingTaskAppIds, ...completedTaskAppIds]),
    searchQuery,
    sortBy,
    sortOrder
  })

  useEffect(() => {
    if (!accessToken || !flowTaskUserId || currentView !== 'list') {
      setPendingTaskAppIds(prev => (prev.size === 0 ? prev : new Set<string>()))
      setCompletedTaskAppIds(prev => (prev.size === 0 ? prev : new Set<string>()))
      return
    }

    let disposed = false
    const refreshPendingTasks = async () => {
      try {
        const next = await fetchPendingExcelCollectionCopyAppIds({
          accessToken,
          currentUserId: flowTaskUserId
        })
        if (disposed) return
        taskDebugLog(`${TASK_DEBUG_PREFIX} Refresh cycle complete`, {
          pendingIds: next.pendingIds.size,
          completedIds: next.completedIds.size,
          pendingSamples: summarizeIdSet(next.pendingIds),
          completedSamples: summarizeIdSet(next.completedIds)
        })
        setPendingTaskAppIds(prev => (areStringSetsEqual(prev, next.pendingIds) ? prev : next.pendingIds))
        setCompletedTaskAppIds(prev => (areStringSetsEqual(prev, next.completedIds) ? prev : next.completedIds))
      } catch {
        if (disposed) return
        taskDebugLog(`${TASK_DEBUG_PREFIX} Refresh cycle failed; clearing cached task ids`)
        setPendingTaskAppIds(prev => (prev.size === 0 ? prev : new Set<string>()))
        setCompletedTaskAppIds(prev => (prev.size === 0 ? prev : new Set<string>()))
      }
    }

    void refreshPendingTasks()
    const intervalId = globalThis.setInterval(() => {
      void refreshPendingTasks()
    }, 15000)
    const handleVisibilityOrFocus = () => {
      if (globalThis.document !== undefined && document.visibilityState !== 'visible') {
        return
      }
      void refreshPendingTasks()
    }
    if (globalThis.window !== undefined) {
      globalThis.addEventListener('focus', handleVisibilityOrFocus)
      globalThis.addEventListener('pageshow', handleVisibilityOrFocus)
    }
    if (globalThis.document !== undefined) {
      document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    }

    return () => {
      disposed = true
      globalThis.clearInterval(intervalId)
      if (globalThis.window !== undefined) {
        globalThis.removeEventListener('focus', handleVisibilityOrFocus)
        globalThis.removeEventListener('pageshow', handleVisibilityOrFocus)
      }
      if (globalThis.document !== undefined) {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      }
    }
  }, [accessToken, flowTaskUserId, currentView])

  const pendingTaskCount = useMemo(
    () => apps.filter(app => isPendingTaskApp(app, currentUserId, pendingTaskAppIds)).length,
    [apps, currentUserId, pendingTaskAppIds]
  )
  const completedTaskCount = useMemo(
    () =>
      activeSection === 'tasks'
        ? filteredApps.filter(app => completedTaskAppIds.has(app.id) && !pendingTaskAppIds.has(app.id)).length
        : 0,
    [activeSection, filteredApps, completedTaskAppIds, pendingTaskAppIds]
  )
  const heroTabBadges = useMemo(
    () => ({
      tasks: { count: pendingTaskCount, highlight: pendingTaskCount > 0 }
    }),
    [pendingTaskCount]
  )
  const taskDisplayedApps = useMemo(
    () =>
      filterTaskDisplayedApps(activeSection, taskStatusFilter, filteredApps, pendingTaskAppIds, completedTaskAppIds),
    [activeSection, filteredApps, taskStatusFilter, pendingTaskAppIds, completedTaskAppIds]
  )
  useEffect(() => {
    if (currentView !== 'list') return
    taskDebugLog(`${TASK_DEBUG_PREFIX} Hub task state snapshot`, {
      activeSection,
      taskStatusFilter,
      filteredApps: filteredApps.length,
      displayedTaskApps: taskDisplayedApps.length,
      pendingTaskAppIds: pendingTaskAppIds.size,
      completedTaskAppIds: completedTaskAppIds.size,
      displayedSamples: taskDisplayedApps.slice(0, 10).map(app => maskIdentifier(app.id))
    })
  }, [
    activeSection,
    currentView,
    filteredApps,
    taskDisplayedApps,
    taskStatusFilter,
    pendingTaskAppIds,
    completedTaskAppIds
  ])

  const {
    paginatedItems: paginatedApps,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    pageSize
  } = useHubPagination({ items: activeSection === 'tasks' ? taskDisplayedApps : filteredApps, pageSize: 20 })

  // Handlers
  const handleManageShares = useCallback(
    (id: string) => {
      const app = apps.find(a => a.id === id)
      if (app) {
        setSelectedAppForManageShares(app)
        setManageSharesDialogOpen(true)
      }
    },
    [apps]
  )

  const handleSharesChanged = useCallback(async () => {
    await refreshApps()
  }, [refreshApps])

  const finishCreatedAppNavigation = useCallback(
    async (createdApp: SpreadsheetApp, preferredView: 'viewer' | 'editor' = 'editor') => {
      const loadedApp = await loadApp(createdApp.id)
      if (loadedApp) {
        setSelectedAppId(loadedApp.id)
        setCurrentView(preferredView)
        updateUrl(loadedApp.id, preferredView, loadedApp.filePath ?? createdApp.filePath)
      } else {
        setSelectedAppId(createdApp.id)
        setCurrentView('viewer')
        updateUrl(createdApp.id, 'viewer', createdApp.filePath)
      }
    },
    [loadApp, updateUrl]
  )

  const handleFileParsed = useCallback(
    async (file: ParsedExcelFile) => {
      if (!userInfo) return

      const appSchema = generateAppSchemaFromParsedFile(
        file,
        userInfo.id || userInfo?.employeeDetails?.employeeId || 'unknown'
      )
      const createdApp = await createApp(appSchema)
      if (createdApp) {
        await finishCreatedAppNavigation(createdApp, 'viewer')
      }
    },
    [createApp, finishCreatedAppNavigation, userInfo]
  )

  const handleOpenApp = useCallback(
    async (id: string) => {
      const appSummary = apps.find(a => a.id === id)
      const app = await loadApp(id)
      if (app) {
        setSelectedAppId(id)
        setCurrentView('viewer')
        updateUrl(id, 'viewer', appSummary?.filePath)
      }
    },
    [loadApp, updateUrl, apps]
  )

  const handleOpenTrashedApp = useCallback(
    async (id: string) => {
      const app = await loadApp(id, undefined, { allowTrashed: true })
      if (app) {
        setSelectedAppId(id)
        setCurrentView('trash')
        updateUrl(id, 'trash', app.filePath, 'trash')
      }
    },
    [loadApp, updateUrl]
  )

  const handleEditApp = useCallback(
    async (id: string) => {
      const appSummary = apps.find(a => a.id === id)
      const app = await loadApp(id)
      if (app) {
        setSelectedAppId(id)
        setCurrentView('editor')
        updateUrl(id, 'editor', appSummary?.filePath)
      }
    },
    [loadApp, updateUrl, apps]
  )

  const handleSaveApp = useCallback(
    async (updatedApp: SpreadsheetApp) => {
      // 1. Save app-level properties (name, description, icon, status, settings)
      await updateApp(updatedApp.id, updatedApp)

      // 2. Save sheet-level changes (columns, views, settings) via updateSheet.
      //    updateApp strips sheets from the payload, so we must persist
      //    sheet changes separately through the sheet-level API.
      if (updatedApp.sheets) {
        for (const sheet of updatedApp.sheets) {
          await updateSheet(updatedApp.id, sheet.id, {
            name: sheet.name,
            description: sheet.description,
            columns: sheet.columns,
            views: sheet.views,
            settings: sheet.settings
          })
        }
      }

      // 3. Reload the full app so the viewer gets fresh data (including rows)
      await loadApp(updatedApp.id)

      setCurrentView('viewer')
      updateUrl(updatedApp.id, 'viewer', updatedApp.filePath)
    },
    [updateApp, updateSheet, loadApp, updateUrl]
  )

  const requestMoveAppsToTrash = useCallback((appsToTrash: Array<{ id: string; name: string }>) => {
    if (appsToTrash.length === 0) {
      return
    }

    setPendingTrashApps(appsToTrash)
    setTrashConfirmOpen(true)
  }, [])

  const handleDeleteApp = useCallback(
    (id: string, name?: string) => {
      const appName = name || apps.find(app => app.id === id)?.name || currentApp?.name || t('title-untitled')
      requestMoveAppsToTrash([{ id, name: appName }])
    },
    [apps, currentApp?.name, requestMoveAppsToTrash, t]
  )

  const confirmMoveAppsToTrash = useCallback(async () => {
    if (pendingTrashApps.length === 0) {
      return
    }

    setIsMovingAppsToTrash(true)

    try {
      const trashedAppIds = new Set<string>()

      for (const pendingApp of pendingTrashApps) {
        const success = await deleteApp(pendingApp.id)
        if (success) {
          trashedAppIds.add(pendingApp.id)
        }
      }

      if (selectedAppId && trashedAppIds.has(selectedAppId)) {
        setSelectedAppId(null)
        setCurrentView('list')
        updateUrl(null)
      }

      if (trashedAppIds.size > 0) {
        setSelectedApps(prev => {
          const next = new Set(prev)
          trashedAppIds.forEach(id => next.delete(id))
          return next
        })
      }
    } finally {
      setIsMovingAppsToTrash(false)
      setPendingTrashApps([])
    }
  }, [deleteApp, pendingTrashApps, selectedAppId, updateUrl])

  const handleTrashConfirmOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isMovingAppsToTrash) {
        setPendingTrashApps([])
      }

      setTrashConfirmOpen(open)
    },
    [isMovingAppsToTrash]
  )

  const handleDuplicateApp = useCallback(
    async (id: string) => {
      await duplicateApp(id)
    },
    [duplicateApp]
  )

  const handleExportApp = useCallback(
    async (id: string) => {
      if (!accessToken) {
        toast.error(t('toast-not-authenticated'))
        return
      }

      try {
        const app = await SpreadsheetApiService.getApp(id)
        if (!app) {
          toast.error(t('toast-export-load-failed'))
          return
        }

        const sheetsWithData = await Promise.all(
          app.sheets.map(async sheet => ({
            ...sheet,
            data: await SpreadsheetApiService.getRows(id, sheet.id)
          }))
        )

        await exportAppToExcel(app.name, sheetsWithData)
      } catch (error) {
        console.error('[SpreadsheetAppsHub] Failed to export spreadsheet as xlsx:', error)
        toast.error(t('toast-export-download-failed'))
      }
    },
    [accessToken, t]
  )

  const resolveShareUser = useCallback(
    async (
      share: {
        id: string
        userId: string
        userName: string
        userEmail: string
        permission: 'view' | 'edit' | 'admin'
        sharedAt: string
        sharedBy: string
      },
      knownUsers?: Map<string, { displayName: string; avatar?: string; email?: string }>
    ) => {
      if (graphqlClient) {
        for (const queryFn of [GET_EMPLOYEE_LIGHT_BY_USER_ID, GET_EMPLOYEE_LIGHT_BY_ID]) {
          try {
            const query = queryFn(share.userId)
            const result = await graphqlClient.request<{
              Employee: Array<{
                displayName: string
                pictureThumbnail?: string
                communication?: Array<{ value?: string; channelRef?: string }>
              }>
            }>(query)
            const emp = result.Employee?.[0]
            if (emp?.displayName) {
              return {
                ...share,
                userName: emp.displayName,
                userEmail: getWorkEmailFromCommunication(emp.communication) || '',
                userAvatar: formatAvatarUrl(emp.pictureThumbnail)
              }
            }
          } catch {
            // Try next lookup strategy
          }
        }
      }

      const known = knownUsers?.get(share.userId)
      if (known) {
        return {
          ...share,
          userName: known.displayName,
          userEmail: known.email || '',
          userAvatar: formatAvatarUrl(known.avatar)
        }
      }

      return {
        ...share,
        userName: `User ${share.userId.slice(0, 8)}`,
        userEmail: ''
      }
    },
    [graphqlClient]
  )

  const enrichSharedUsers = useCallback(
    async (
      shares: Array<{
        id: string
        userId: string
        userName: string
        userEmail: string
        permission: 'view' | 'edit' | 'admin'
        sharedAt: string
        sharedBy: string
      }>,
      knownUsers?: Map<string, { displayName: string; avatar?: string; email?: string }>
    ) => {
      if (shares.length === 0) return shares
      return Promise.all(shares.map(share => resolveShareUser(share, knownUsers)))
    },
    [resolveShareUser]
  )

  /**
   * Build a known-users map from current sharedUsers state as a fallback for GraphQL failures.
   */
  const buildKnownUsersMap = useCallback(
    (extraDetails?: Array<{ userId: string; displayName: string; avatar?: string; email?: string }>) => {
      const map = new Map<string, { displayName: string; avatar?: string; email?: string }>()
      sharedUsers.forEach(u => {
        if (u.userName && !u.userName.startsWith('User ')) {
          map.set(u.userId, { displayName: u.userName, avatar: u.userAvatar, email: u.userEmail })
        }
      })
      extraDetails?.forEach(u => map.set(u.userId, u))
      return map
    },
    [sharedUsers]
  )

  /**
   * Fetch shares for an app, enrich with user details, and update state.
   */
  const fetchAndEnrichShares = useCallback(
    async (
      appId: string,
      extraDetails?: Array<{ userId: string; displayName: string; avatar?: string; email?: string }>
    ) => {
      const shares = await getSharedUsers(appId)
      const enrichedUsers = await enrichSharedUsers(shares, buildKnownUsersMap(extraDetails))
      setSharedUsers(enrichedUsers)
    },
    [getSharedUsers, enrichSharedUsers, buildKnownUsersMap]
  )

  const handleShareDialogOpenChange = useCallback((nextOpen: boolean) => {
    setShareDialogOpen(nextOpen)
    if (!nextOpen) {
      setSelectedAppForShare(null)
    }
  }, [])

  const handleShareApp = useCallback(
    async (id: string) => {
      const fromList = apps.find(a => a.id === id)
      const fromCurrent =
        currentApp && currentApp.id === id
          ? {
              id: currentApp.id,
              name: currentApp.name,
              description: currentApp.description,
              icon: currentApp.icon,
              sheetCount: currentApp.sheets.length,
              rowCount: currentApp.sheets.reduce((sum, sheet) => sum + (sheet.data?.length || 0), 0),
              status: currentApp.status,
              createdAt: currentApp.createdAt,
              updatedAt: currentApp.updatedAt,
              createdBy: currentApp.createdBy,
              filePath: currentApp.filePath,
              isShared: currentApp.isShared,
              isOwner: currentApp.permission === 'owner' || currentApp.permission === 'admin' || !currentApp.permission,
              permission: currentApp.permission,
              sharedBy: currentApp.sharedBy,
              settings: currentApp.settings as Record<string, unknown>
            }
          : null

      const targetApp = fromList || fromCurrent
      if (!targetApp) return

      // Open dialog immediately so the user gets instant feedback.
      setSelectedAppForShare(targetApp)
      setShareDialogOpen(true)

      try {
        await fetchAndEnrichShares(id)
      } catch (error) {
        console.warn('[SpreadsheetAppsHub] Failed to preload shares:', error)
      }
    },
    [apps, currentApp, fetchAndEnrichShares]
  )

  const handleShare = useCallback(
    async (
      shares: Array<{ userId: string; permission: 'view' | 'edit' | 'admin' }>,
      userDetails?: Array<{ userId: string; displayName: string; avatar?: string; email?: string }>
    ) => {
      if (!selectedAppForShare) return false
      const success = await shareApp(selectedAppForShare.id, shares)
      if (success) {
        // Keep modal responsive: refresh data without blocking dialog flow.
        void fetchAndEnrichShares(selectedAppForShare.id, userDetails)
        void refreshApps()
      }
      return success
    },
    [selectedAppForShare, shareApp, fetchAndEnrichShares, refreshApps]
  )

  const handleUnshare = useCallback(
    async (shareId: string) => {
      if (!selectedAppForShare) return false
      const success = await revokeAccess(shareId)
      if (success) {
        await fetchAndEnrichShares(selectedAppForShare.id)
        await refreshApps()
      }
      return success
    },
    [selectedAppForShare, revokeAccess, fetchAndEnrichShares, refreshApps]
  )

  const handleRefreshShares = useCallback(async () => {
    if (!selectedAppForShare) return
    await fetchAndEnrichShares(selectedAppForShare.id)
    await refreshApps()
  }, [selectedAppForShare, fetchAndEnrichShares, refreshApps])

  const handlePromoteExecute = useCallback(
    async (app: SpreadsheetApp, entityName: string) => {
      const result = await promoteToDatabase(app, entityName)
      if (result.success) {
        await updateApp(app.id, { status: 'promoted', promotedEntityId: result.entityId })
      }
      setAppToPromote(null)
    },
    [promoteToDatabase, updateApp]
  )

  const isTrashedApp = Boolean(currentApp?.trashedAt)
  const canManageTrashedApp = Boolean(isTrashedApp && currentAppPermission === 'owner')

  const handleRestoreTrashedApp = useCallback(async () => {
    if (!currentApp?.id || !canManageTrashedApp) {
      return
    }

    setIsRestoringTrashedApp(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.restoreItems([{ entityType: 'spreadsheet_app', entityId: currentApp.id }])
      const restoredApp = await loadApp(currentApp.id)
      if (!restoredApp) {
        return
      }

      setSelectedAppId(currentApp.id)
      setActiveSection('my-files')
      setCurrentView('viewer')
      updateUrl(currentApp.id, 'viewer', restoredApp.filePath, 'my-files')
      toast.success(t('toast-restored'))
      await refreshApps()
    } catch (error) {
      console.error('[SpreadsheetAppsHub] Failed to restore trashed spreadsheet:', error)
      toast.error(t('toast-restore-failed'))
    } finally {
      setIsRestoringTrashedApp(false)
    }
  }, [accessToken, canManageTrashedApp, currentApp?.id, loadApp, refreshApps, t, updateUrl])

  const handleDeleteTrashedAppPermanently = useCallback(async () => {
    if (!currentApp?.id || !canManageTrashedApp) {
      return
    }

    setIsDeletingTrashedApp(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.deleteTrashedItem('spreadsheet_app', currentApp.id)
      clearCurrentApp()
      setSelectedAppId(null)
      setCurrentView('list')
      setActiveSection('trash')
      updateUrl(null, undefined, undefined, 'trash')
      await refreshApps()
    } catch (error) {
      console.error('[SpreadsheetAppsHub] Failed to permanently delete trashed spreadsheet:', error)
      toast.error(t('toast-delete-permanently-failed'))
    } finally {
      setIsDeletingTrashedApp(false)
    }
  }, [accessToken, canManageTrashedApp, clearCurrentApp, currentApp?.id, refreshApps, t, updateUrl])

  const handleBack = useCallback(() => {
    if (currentView === 'trash') {
      clearCurrentApp()
      setSelectedAppId(null)
      setCurrentView('list')
      setActiveSection('trash')
      updateUrl(null, undefined, undefined, 'trash')
      return
    }

    // Check if there's a space return URL in sessionStorage (takes priority)
    try {
      const spaceReturnUrl = sanitizeSameOriginReturnUrl(sessionStorage.getItem('space_return_url'))
      if (spaceReturnUrl) {
        sessionStorage.removeItem('space_return_url')
        navigateTo(spaceReturnUrl)
        return
      }
    } catch (e) {
      console.warn('Failed to read space_return_url from sessionStorage:', e)
    }

    // Fallback: Check if there's a returnUrl parameter
    const params = new URLSearchParams(globalThis.window.location.search)
    const returnUrl = sanitizeSameOriginReturnUrl(params.get('returnUrl'))

    if (returnUrl) {
      navigateTo(returnUrl)
      return
    }

    // Full page navigation matches prod host routing and avoids dev-only history + popstate gaps.
    navigateTo(Navigation.OFFICE_SPREADSHEETS, { fullPage: true })
  }, [clearCurrentApp, currentView, updateUrl])

  /** Header Spreadsheets breadcrumb: hub route only (does not consume space_return_url / returnUrl). */
  const handleSpreadsheetHubHome = useCallback(() => {
    try {
      sessionStorage.removeItem('space_return_url')
    } catch (e) {
      console.warn('Failed to clear space_return_url:', e)
    }
    // Same as handleBack default: fullPage avoids host nwNavigate only updating the URL while the
    // viewer stays mounted (first click short URL, second click reload → hub).
    navigateTo(Navigation.OFFICE_SPREADSHEETS, { fullPage: true })
  }, [])

  const handleStartUpload = useCallback(() => {
    setCurrentView('upload')
  }, [])

  const handleCreateEmptyApp = useCallback(async () => {
    if (!newAppName.trim() || !userInfo) return

    const appName = newAppName.trim() || 'New Spreadsheet'
    const appSchema = generateEmptyAppSchema(appName, userInfo.id || userInfo?.employeeDetails?.employeeId || 'unknown')

    const createdApp = await createApp(appSchema)

    if (createdApp) {
      await refreshApps()
      await loadApp(createdApp.id, createdApp.filePath)
      setSelectedAppId(createdApp.id)
      setCurrentView('viewer')
      updateUrl(createdApp.id, 'viewer', createdApp.filePath)
      setIsCreateEmptyDialogOpen(false)
      setNewAppName('')
    }
  }, [newAppName, userInfo, createApp, updateUrl, refreshApps, loadApp])

  const toggleFavorite = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setFavorites(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          toast.success(t('toast-removed-from-favorites'))
        } else {
          next.add(id)
          toast.success(t('toast-added-to-favorites'))
        }
        return next
      })
    },
    [t]
  )

  const toggleSelectApp = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setSelectedApps(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    [t]
  )

  const selectAllApps = useCallback(() => {
    if (selectedApps.size === filteredApps.length) {
      setSelectedApps(new Set())
    } else {
      setSelectedApps(new Set(filteredApps.map(a => a.id)))
    }
  }, [selectedApps.size, filteredApps])

  const copyLink = useCallback(
    (app: SpreadsheetAppSummary) => {
      const url = new URL(globalThis.location.href)
      url.searchParams.set('appId', app.id)
      if (app.filePath) url.searchParams.set('filePath', encodeURIComponent(app.filePath))
      navigator.clipboard.writeText(url.toString())
      toast.success(t('toast-link-copied'))
    },
    [t]
  )

  const currentUserName = useMemo(() => resolveCurrentUserName(userInfo), [userInfo])

  const handleOpenViewerEditor = useCallback(
    (app: SpreadsheetApp) => {
      setCurrentView('editor')
      updateUrl(app.id, 'editor', app.filePath)
    },
    [updateUrl]
  )

  const handleAppRefreshNeeded = useCallback(
    async (appId: string, newSheetId?: string) => {
      const maxAttempts = 5
      const retryDelayMs = 400

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const refreshed = await loadApp(appId)

        // If no target sheet is provided, a single successful refresh is enough.
        if (!newSheetId) return

        const targetSheet = refreshed?.sheets?.find(s => s.id === newSheetId)
        if (targetSheet && (targetSheet.data?.length ?? 0) > 0) {
          return
        }

        // Wait briefly and retry to handle eventual consistency after row creation.
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs))
        }
      }
    },
    [loadApp]
  )

  const renderViewerContent = useCallback(
    (app: SpreadsheetApp) => {
      const isReadonlyTrashView = Boolean(app.trashedAt)
      const canEdit = !isReadonlyTrashView && (currentAppPermission === 'owner' || currentAppPermission === 'edit')

      return (
        <>
          <SpreadsheetAppViewer
            app={app}
            onBack={handleBack}
            onNavigateToSpreadsheetHub={handleSpreadsheetHubHome}
            onShare={isReadonlyTrashView ? undefined : () => handleShareApp(app.id)}
            onEdit={canEdit ? () => handleOpenViewerEditor(app) : undefined}
            onAppUpdate={canEdit ? updatedApp => updateApp(updatedApp.id, updatedApp) : undefined}
            onAppRefreshNeeded={canEdit ? handleAppRefreshNeeded : undefined}
            onSheetUpdate={canEdit ? updateSheet : undefined}
            onRowAdd={canEdit ? addRow : undefined}
            onRowUpdate={canEdit ? updateRow : undefined}
            // Keep hub-level replay off: SpreadsheetAppViewer persists Univer edits via row/cell ops.
            onDataChange={undefined}
            isEditing={canEdit}
            isTrashedApp={isReadonlyTrashView}
            accessToken={accessToken}
            userId={currentUserId}
            data-testid={`${testId}-viewer`}
          />

          {isReadonlyTrashView ? (
            <TrashedSpreadsheetReadonlyDialog
              spreadsheetTitle={app.name}
              canManage={canManageTrashedApp}
              isRestoring={isRestoringTrashedApp}
              isDeleting={isDeletingTrashedApp}
              onBackToTrash={handleBack}
              onRestore={() => {
                void handleRestoreTrashedApp()
              }}
              onDeletePermanently={() => {
                void handleDeleteTrashedAppPermanently()
              }}
              data-testid={`${testId}-trashed-spreadsheet-dialog`}
            />
          ) : null}

          {selectedAppForShare && !isReadonlyTrashView && (
            <ShareAppDialog
              open={shareDialogOpen}
              onOpenChange={handleShareDialogOpenChange}
              appId={selectedAppForShare.id}
              appName={selectedAppForShare.name}
              appFilePath={selectedAppForShare.filePath || ''}
              accessToken={accessToken || ''}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              isOwner={selectedAppForShare.isOwner !== false}
              sharedUsers={sharedUsers}
              onShare={handleShare}
              onUnshare={handleUnshare}
              onRefreshShares={handleRefreshShares}
            />
          )}
        </>
      )
    },
    [
      accessToken,
      addRow,
      currentAppPermission,
      currentUserId,
      currentUserName,
      handleAppRefreshNeeded,
      handleBack,
      handleDeleteTrashedAppPermanently,
      handleOpenViewerEditor,
      handleRefreshShares,
      handleRestoreTrashedApp,
      handleShare,
      handleShareApp,
      handleSpreadsheetHubHome,
      handleUnshare,
      isDeletingTrashedApp,
      isRestoringTrashedApp,
      canManageTrashedApp,
      selectedAppForShare,
      setShareDialogOpen,
      sharedUsers,
      testId,
      updateApp,
      updateRow,
      updateSheet
    ]
  )

  const renderEditorContent = useCallback(
    (app: SpreadsheetApp) => {
      if (currentAppPermission !== 'owner' && currentAppPermission !== 'edit') {
        toast.error(t('toast-no-edit-permission'))
        handleBack()
        return null
      }

      return (
        <SpreadsheetAppEditor
          app={app}
          onSave={handleSaveApp}
          onCancel={handleBack}
          accessToken={accessToken}
          userId={currentUserId}
          data-testid={`${testId}-editor`}
        />
      )
    },
    [accessToken, currentAppPermission, currentUserId, handleBack, handleSaveApp, t, testId]
  )

  const renderCurrentView = () => {
    if ((currentView === 'viewer' || currentView === 'trash') && currentApp) {
      return (
        <div
          className="gba:flex gba:w-full gba:flex-col gba:overflow-hidden gba:h-dvh gba:min-h-0"
          data-testid={testId}
        >
          {renderViewerContent(currentApp)}
        </div>
      )
    }

    if (currentView === 'editor' && currentApp) {
      return (
        <div
          className="gba:flex gba:w-full gba:flex-col gba:overflow-hidden gba:h-dvh gba:min-h-0"
          data-testid={testId}
        >
          {renderEditorContent(currentApp)}
        </div>
      )
    }

    const heroNewButton = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="gba:gap-1.5 gba:bg-white/15 gba:text-white gba:border gba:border-white/20 hover:gba:bg-white/25 gba:backdrop-blur-sm"
            data-testid={`${testId}-hero-new-btn`}
          >
            <Plus className="gba:w-4 gba:h-4" />
            {t('sidebar-new')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="gba:w-56">
          <DropdownMenuItem onClick={() => setIsCreateEmptyDialogOpen(true)}>
            <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-emerald-500" />
            <div>
              <div className="gba:font-medium">{t('sidebar-blank-spreadsheet')}</div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('sidebar-blank-spreadsheet-desc')}</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleStartUpload}>
            <Upload className="gba:w-4 gba:h-4 gba:mr-2 gba:text-blue-500" />
            <div>
              <div className="gba:font-medium">{t('sidebar-upload-excel')}</div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('sidebar-upload-excel-desc')}</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    if (currentView === 'list' && activeSection === 'trash') {
      return (
        <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
          <SpreadsheetHero
            activeSection={activeSection as SpreadsheetSection}
            onSectionChange={s => setActiveSection(s as SidebarSection)}
            tabBadges={heroTabBadges}
            newButton={heroNewButton}
            t={t}
            data-testid={`${testId}-hero`}
          />
          <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:px-6 gba:pt-5 gba:pb-4 gba:border-b gba:border-border/50">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground/70" />
              <Input
                placeholder={t('spreadsheets-header-search-placeholder')}
                value={trashSearchQuery}
                onChange={e => setTrashSearchQuery(e.target.value)}
                className="gba:h-12 gba:pl-11 gba:rounded-xl gba:bg-muted/40 gba:border-border/60 gba:shadow-sm"
                data-testid={`${testId}-trash-search`}
              />
            </div>
          </div>
          <main className="gba:flex-1 gba:overflow-auto gba:p-6">
            <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
              <OfficeTrashList
                accessToken={accessToken}
                entityType="spreadsheet_app"
                emptyTitle={t('spreadsheets-empty-trash-title')}
                emptyDescription={t('spreadsheets-empty-trash-description')}
                layout="list"
                searchQuery={trashSearchQuery}
                listControls={{
                  refreshLabel: t('header-refresh'),
                  sortNameLabel: t('sort-name'),
                  sortTrashedOnLabel: t('sort-trashed'),
                  trashedOnColumnLabel: t('table-trashed'),
                  defaultSortBy: 'trashedAt',
                  defaultSortOrder: 'desc'
                }}
                onOpenItem={item => handleOpenTrashedApp(item.id)}
                onItemsChanged={() => {
                  void refreshApps()
                }}
                data-testid={`${testId}-trash-list`}
              />
            </div>
          </main>
        </div>
      )
    }

    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
        <SpreadsheetHero
          activeSection={activeSection}
          onSectionChange={s => setActiveSection(s)}
          tabBadges={heroTabBadges}
          newButton={heroNewButton}
          t={t}
          data-testid={`${testId}-hero`}
        />

        {/* Main Content */}
        <main className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:overflow-hidden">
          {/* Upload View */}
          {currentView === 'upload' && (
            <div className="gba:flex-1 gba:overflow-auto gba:p-8">
              <div className="gba:max-w-2xl gba:mx-auto gba:space-y-6">
                <Button variant="ghost" onClick={handleBack} className="gba:mb-4">
                  <X className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('upload-cancel')}
                </Button>

                <div className="gba:text-center gba:mb-8">
                  <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-gradient-to-br gba:from-emerald-500 gba:to-teal-600 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                    <Upload className="gba:w-8 gba:h-8 gba:text-white" />
                  </div>
                  <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">{t('upload-title')}</h2>
                  <p className="gba:text-muted-foreground">{t('upload-subtitle')}</p>
                </div>

                <Card className="gba:p-4">
                  <div className="gba:flex gba:flex-col gba:gap-3">
                    <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('upload-mode-simple-title')}</p>
                    <p className="gba:text-xs gba:text-muted-foreground">{t('upload-mode-simple-desc')}</p>
                  </div>
                </Card>

                <ExcelUploader
                  parseMode="preserve-format"
                  onFileParsed={handleFileParsed}
                  onError={error => console.error(error)}
                  data-testid={`${testId}-uploader`}
                />
              </div>
            </div>
          )}

          {/* Automations View */}
          {currentView === 'list' && activeSection === 'automations' && (
            <div className="gba:flex-1 gba:overflow-auto">
              <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:px-6 gba:py-5">
                <SpreadsheetAutomationsSection
                  accessToken={accessToken}
                  data-testid={`${testId}-automations-section`}
                />
              </div>
            </div>
          )}

          {/* List View */}
          {currentView === 'list' && activeSection !== 'automations' && (
            <>
              {/* Content Area */}
              <div className="gba:flex-1 gba:overflow-auto">
                <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:px-6 gba:pt-5">
                  {/* Spotlight search bar */}
                  <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
                    <div className="gba:relative">
                      <Search className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground/70" />
                      <Input
                        placeholder={t('spreadsheets-header-search-placeholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="gba:pl-12 gba:pr-4 gba:h-12 gba:text-base gba:rounded-xl gba:bg-muted/40 gba:border-border/60 gba:shadow-sm hover:gba:shadow-md hover:gba:bg-muted/70 hover:gba:border-border gba:transition-all gba:duration-200"
                        data-testid={`${testId}-search-input`}
                      />
                    </div>

                    {/* Actions row */}
                    <div className="gba:flex gba:items-center gba:gap-2">
                      {selectedApps.size > 0 ? (
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gba:h-7 gba:text-xs"
                            onClick={() => setSelectedApps(new Set())}
                          >
                            <X className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                            {t('action-clear', { count: selectedApps.size })}
                          </Button>
                          <div className="gba:w-px gba:h-4 gba:bg-border gba:mx-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gba:h-7 gba:text-xs"
                            onClick={() => {
                              selectedApps.forEach(id => handleShareApp(id))
                            }}
                          >
                            <Share2 className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                            {t('action-share')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gba:h-7 gba:text-xs"
                            onClick={() => {
                              selectedApps.forEach(id => handleExportApp(id))
                            }}
                          >
                            <Download className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                            {t('action-download')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gba:h-7 gba:text-xs gba:text-destructive"
                            onClick={() => {
                              requestMoveAppsToTrash(
                                Array.from(selectedApps)
                                  .map(id => {
                                    const app = apps.find(item => item.id === id)
                                    if (!app) return null

                                    return {
                                      id: app.id,
                                      name: app.name
                                    }
                                  })
                                  .filter((app): app is { id: string; name: string } => app !== null)
                              )
                            }}
                          >
                            <Trash2 className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                            {t('action-delete-spreadsheet')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshApps()}
                          className="gba:gap-1.5 gba:h-7 gba:text-xs"
                          data-testid="spreadsheet-apps-hub-refresh-button"
                        >
                          <RefreshCw className="gba:w-3.5 gba:h-3.5" />
                          {t('action-refresh')}
                        </Button>
                      )}

                      <div className="gba:ml-auto gba:flex gba:items-center gba:gap-1.5">
                        <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:p-0.5">
                          <button
                            onClick={() => setViewLayout('list')}
                            className={`gba:p-1 gba:rounded gba:transition-colors ${viewLayout === 'list' ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                            data-testid={`${testId}-view-list`}
                          >
                            <List className="gba:w-3.5 gba:h-3.5" />
                          </button>
                          <button
                            onClick={() => setViewLayout('grid')}
                            className={`gba:p-1 gba:rounded gba:transition-colors ${viewLayout === 'grid' ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                            data-testid={`${testId}-view-grid`}
                          >
                            <LayoutGrid className="gba:w-3.5 gba:h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {activeSection === 'tasks' && (
                    <Tabs
                      value={taskStatusFilter}
                      onValueChange={(v: string) => setTaskStatusFilter(v as 'pending' | 'completed')}
                      className="gba:mb-4"
                      data-testid={`${testId}-tasks-subtabs`}
                    >
                      <TabsList className="gba:inline-flex gba:items-center gba:rounded-lg gba:bg-muted/50 gba:p-1">
                        <TabsTrigger
                          value="pending"
                          className="gba:px-4 gba:py-2 gba:text-sm"
                          data-testid={`${testId}-tasks-tab-pending`}
                        >
                          {t('tasks-pending')} ({pendingTaskCount})
                        </TabsTrigger>
                        <TabsTrigger
                          value="completed"
                          className="gba:px-4 gba:py-2 gba:text-sm"
                          data-testid={`${testId}-tasks-tab-completed`}
                        >
                          {t('tasks-completed')} ({completedTaskCount})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                </div>
                <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
                  {/* Loading state */}
                  {isLoadingApps && (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
                      <Spinner size="lg" />
                    </div>
                  )}

                  {/* Error state */}
                  {appsError && (
                    <div className="gba:p-6">
                      <Card className="gba:p-6 gba:text-center">
                        <AlertCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mx-auto gba:mb-4" />
                        <p className="gba:text-destructive gba:mb-4">{appsError}</p>
                        <Button
                          variant="outline"
                          onClick={() => refreshApps()}
                          data-testid="spreadsheet-apps-hub-retry"
                        >
                          <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
                          {t('action-retry')}
                        </Button>
                      </Card>
                    </div>
                  )}

                  {/* Empty state */}
                  {!isLoadingApps &&
                    !appsError &&
                    (activeSection === 'tasks' ? taskDisplayedApps : filteredApps).length === 0 && (
                      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
                        <div className="gba:w-24 gba:h-24 gba:rounded-3xl gba:bg-gradient-to-br gba:from-emerald-500/20 gba:to-teal-500/20 gba:flex gba:items-center gba:justify-center gba:mb-6">
                          <FileSpreadsheet className="gba:w-12 gba:h-12 gba:text-emerald-500" />
                        </div>
                        <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
                          {activeSection === 'favorites'
                            ? t('empty-no-favorites')
                            : activeSection === 'shared'
                              ? t('empty-nothing-shared')
                              : activeSection === 'tasks'
                                ? taskStatusFilter === 'pending'
                                  ? t('empty-no-pending-tasks')
                                  : t('empty-no-completed-tasks')
                                : t('empty-no-spreadsheets')}
                        </h3>
                        <p className="gba:text-muted-foreground gba:text-center gba:max-w-md gba:mb-6">
                          {activeSection === 'favorites'
                            ? t('empty-favorites-hint')
                            : activeSection === 'shared'
                              ? t('empty-shared-hint')
                              : activeSection === 'tasks'
                                ? taskStatusFilter === 'pending'
                                  ? t('empty-tasks-pending-hint')
                                  : t('empty-tasks-completed-hint')
                                : t('empty-get-started-hint')}
                        </p>
                        {activeSection !== 'favorites' && activeSection !== 'shared' && activeSection !== 'tasks' && (
                          <div className="gba:flex gba:gap-3">
                            <Button onClick={() => setIsCreateEmptyDialogOpen(true)}>
                              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('action-create-spreadsheet')}
                            </Button>
                            <Button variant="outline" onClick={handleStartUpload}>
                              <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('action-upload-excel')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                  {/* List View */}
                  {!isLoadingApps &&
                    (activeSection === 'tasks' ? taskDisplayedApps : filteredApps).length > 0 &&
                    viewLayout === 'list' && (
                      <div className="gba:w-full">
                        {/* Table Header */}
                        <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
                          <div className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                            <div className="gba:w-8 gba:flex-shrink-0">
                              <Checkbox
                                checked={selectedApps.size === paginatedApps.length && paginatedApps.length > 0}
                                onCheckedChange={selectAllApps}
                              />
                            </div>
                            <div className="gba:w-8 gba:flex-shrink-0" />
                            <div
                              className="gba:flex-1 gba:min-w-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSortBy('name')
                                setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setSortBy('name')
                                  setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')
                                }
                              }}
                            >
                              {t('action-sort-name')}
                              {sortBy === 'name' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                            </div>
                            <div
                              className="gba:w-36 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSortBy('modified')
                                setSortOrder(sortBy === 'modified' && sortOrder === 'desc' ? 'asc' : 'desc')
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setSortBy('modified')
                                  setSortOrder(sortBy === 'modified' && sortOrder === 'desc' ? 'asc' : 'desc')
                                }
                              }}
                            >
                              {t('action-sort-modified')}
                              {sortBy === 'modified' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                            </div>
                            <div className="gba:w-40 gba:flex-shrink-0">{t('table-modified-by')}</div>
                            <div
                              className="gba:w-32 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSortBy('created')
                                setSortOrder(sortBy === 'created' && sortOrder === 'desc' ? 'asc' : 'desc')
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setSortBy('created')
                                  setSortOrder(sortBy === 'created' && sortOrder === 'desc' ? 'asc' : 'desc')
                                }
                              }}
                            >
                              {t('action-sort-created')}
                              {sortBy === 'created' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                            </div>
                            <div className="gba:w-20 gba:flex-shrink-0 gba:text-right">{t('table-rows')}</div>
                            <div className="gba:w-10 gba:flex-shrink-0" />
                          </div>
                        </div>

                        {/* Table Body */}
                        <div className="gba:divide-y gba:divide-border">
                          {paginatedApps.map(app => {
                            const isOwner = app.isOwner ?? app.createdBy === currentUserId
                            const isSelected = selectedApps.has(app.id)
                            const isFavorite = favorites.has(app.id)
                            const ownerInfo = app.createdBy ? ownerInfoMap.get(app.createdBy) : undefined
                            const sharedWith = sharedUsersMap.get(app.id) || []

                            return (
                              <div
                                key={app.id}
                                className={`gba:flex gba:items-center gba:px-4 gba:py-3 gba:transition-colors gba:cursor-pointer ${
                                  isSelected ? 'gba:bg-primary/5' : 'hover:gba:bg-muted/30'
                                }`}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleOpenApp(app.id)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleOpenApp(app.id)
                                  }
                                }}
                              >
                                {/* Checkbox */}
                                <div
                                  className="gba:w-8 gba:flex-shrink-0"
                                  role="button"
                                  tabIndex={0}
                                  onClick={e => e.stopPropagation()}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
                                  }}
                                >
                                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectApp(app.id)} />
                                </div>

                                {/* Star */}
                                <div className="gba:w-8 gba:flex-shrink-0">
                                  <button
                                    onClick={e => toggleFavorite(app.id, e)}
                                    className={`gba:p-1 gba:rounded hover:gba:bg-muted ${isFavorite ? 'gba:text-amber-500' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                                  >
                                    <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-current' : ''}`} />
                                  </button>
                                </div>

                                {/* Name & Icon */}
                                <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-3">
                                  <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-emerald-500/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                                    {(() => {
                                      const IconComponent = app.icon ? getIconByName(app.icon) : null
                                      return IconComponent ? (
                                        <IconComponent className="gba:w-5 gba:h-5 gba:text-emerald-600" />
                                      ) : (
                                        <FileSpreadsheet className="gba:w-5 gba:h-5 gba:text-emerald-600" />
                                      )
                                    })()}
                                  </div>
                                  <div className="gba:min-w-0">
                                    <div className="gba:flex gba:items-center gba:gap-2">
                                      <span className="gba:font-medium gba:text-foreground gba:truncate">
                                        {app.name}
                                      </span>
                                      {activeSection === 'tasks' && isSubmittedExcelCollectionCopy(app) && (
                                        <Badge variant="success" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                          {t('badge-submitted')}
                                        </Badge>
                                      )}
                                      {app.isShared && !isOwner && (
                                        <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                          {t('badge-shared')}
                                        </Badge>
                                      )}
                                      {isOwner && sharedWith.length > 0 && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  handleManageShares(app.id)
                                                }}
                                                className="gba:flex gba:items-center gba:-space-x-1 hover:gba:opacity-80 gba:transition-opacity"
                                              >
                                                {sharedWith.slice(0, 3).map(user => (
                                                  <Avatar
                                                    key={user.userId}
                                                    className="gba:w-5 gba:h-5 gba:border gba:border-background"
                                                  >
                                                    {user.avatar && <AvatarImage src={user.avatar} />}
                                                    <AvatarFallback className="gba:text-[8px] gba:bg-muted">
                                                      {user.name ? getInitials(user.name) : '?'}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                ))}
                                                {sharedWith.length > 3 && (
                                                  <div className="gba:w-5 gba:h-5 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-[8px] gba:border gba:border-background">
                                                    +{sharedWith.length - 3}
                                                  </div>
                                                )}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{t('badge-shared-with', { count: sharedWith.length })}</p>
                                              <p className="gba:text-xs gba:text-muted-foreground">
                                                {t('badge-click-to-manage')}
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </div>
                                    {app.description && (
                                      <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                        {app.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Modified */}
                                <div className="gba:w-36 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                                  {formatDate(app.updatedAt, t, locale)}
                                </div>

                                {/* Modified By */}
                                <div className="gba:w-40 gba:flex-shrink-0">
                                  <div className="gba:flex gba:items-center gba:gap-2">
                                    <Avatar className="gba:w-6 gba:h-6">
                                      {ownerInfo?.avatar && <AvatarImage src={ownerInfo.avatar} />}
                                      <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                                        {ownerInfo?.name ? (
                                          getInitials(ownerInfo.name)
                                        ) : (
                                          <User className="gba:w-3 gba:h-3" />
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="gba:text-sm gba:text-muted-foreground gba:truncate">
                                      {ownerInfo?.name || t('table-unknown-owner')}
                                    </span>
                                  </div>
                                </div>

                                {/* Created */}
                                <div className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                                  {formatDate(app.createdAt, t, locale)}
                                </div>

                                {/* Rows */}
                                <div className="gba:w-20 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground gba:text-right">
                                  {app.rowCount.toLocaleString()}
                                </div>

                                {/* Actions */}
                                <div
                                  className="gba:w-10 gba:flex-shrink-0 gba:flex gba:justify-end"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="gba:h-8 gba:w-8 gba:p-0">
                                        <MoreHorizontal className="gba:w-4 gba:h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenApp(app.id)}>
                                        <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                                        {t('action-open')}
                                      </DropdownMenuItem>
                                      {isOwner && (
                                        <DropdownMenuItem onClick={() => handleShareApp(app.id)}>
                                          <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                          {t('action-share')}
                                        </DropdownMenuItem>
                                      )}
                                      {isOwner && sharedWith.length > 0 && (
                                        <DropdownMenuItem onClick={() => handleManageShares(app.id)}>
                                          <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                                          {t('action-manage-sharing')}
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => copyLink(app)}>
                                        <Link2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                        {t('action-copy-link')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleExportApp(app.id)}>
                                        <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                                        {t('action-download')}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleEditApp(app.id)}>
                                        <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                                        {t('action-settings')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDuplicateApp(app.id)}>
                                        <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                                        {t('action-duplicate')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => toggleFavorite(app.id)}>
                                        <Star
                                          className={`gba:w-4 gba:h-4 gba:mr-2 ${isFavorite ? 'gba:fill-current gba:text-amber-500' : ''}`}
                                        />
                                        {isFavorite ? t('action-remove-from-favorites') : t('action-add-to-favorites')}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="gba:text-destructive"
                                        onClick={() => handleDeleteApp(app.id, app.name)}
                                      >
                                        <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                        {t('action-delete-spreadsheet')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                  {/* Grid View */}
                  {!isLoadingApps &&
                    (activeSection === 'tasks' ? taskDisplayedApps : filteredApps).length > 0 &&
                    viewLayout === 'grid' && (
                      <div className="gba:p-6 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-5 gba:gap-4">
                        {paginatedApps.map(app => {
                          const isOwner = app.isOwner ?? app.createdBy === currentUserId
                          const isSelected = selectedApps.has(app.id)
                          const isFavorite = favorites.has(app.id)

                          return (
                            <Card
                              key={app.id}
                              className={`gba:group gba:cursor-pointer gba:transition-all hover:gba:shadow-lg ${
                                isSelected ? 'gba:ring-2 gba:ring-primary' : ''
                              }`}
                              onClick={() => handleOpenApp(app.id)}
                            >
                              {/* Preview area */}
                              <div className="gba:relative gba:aspect-[4/3] gba:rounded-t-lg gba:overflow-hidden">
                                <SpreadsheetPreviewThumbnail
                                  app={app}
                                  className="gba:absolute gba:inset-0"
                                  data-testid={`${testId}-grid-preview-${app.id}`}
                                />

                                {/* Hover overlay */}
                                <div className="gba:absolute gba:inset-0 gba:bg-black/0 group-hover:gba:bg-black/5 gba:transition-colors gba:rounded-t-lg" />

                                {/* Selection checkbox */}
                                <div
                                  className={`gba:absolute gba:top-2 gba:left-2 gba:opacity-0 group-hover:gba:opacity-100 ${isSelected ? 'gba:opacity-100' : ''} gba:transition-opacity`}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelectApp(app.id)}
                                    className="gba:bg-background"
                                  />
                                </div>

                                {/* Favorite star */}
                                <button
                                  className={`gba:absolute gba:top-2 gba:right-2 gba:p-1.5 gba:rounded-full gba:bg-background/80 gba:backdrop-blur-sm gba:opacity-0 group-hover:gba:opacity-100 ${isFavorite ? 'gba:opacity-100 gba:text-amber-500' : 'gba:text-muted-foreground hover:gba:text-foreground'} gba:transition-all`}
                                  onClick={e => toggleFavorite(app.id, e)}
                                >
                                  <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-current' : ''}`} />
                                </button>

                                {/* {t('badge-shared')} badge */}
                                {app.isShared && !isOwner && (
                                  <Badge
                                    variant="secondary"
                                    className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]"
                                  >
                                    <Users className="gba:w-3 gba:h-3 gba:mr-1" />
                                    {t('badge-shared')}
                                  </Badge>
                                )}
                                {activeSection === 'tasks' && isSubmittedExcelCollectionCopy(app) && (
                                  <Badge
                                    variant="success"
                                    className="gba:absolute gba:bottom-2 gba:right-2 gba:text-[10px]"
                                  >
                                    {t('badge-submitted')}
                                  </Badge>
                                )}
                              </div>

                              {/* Info */}
                              <div className="gba:p-3">
                                <h3 className="gba:font-medium gba:text-foreground gba:truncate gba:mb-1">
                                  {app.name}
                                </h3>
                                <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                                  <span>{formatRelativeTime(app.updatedAt, t, locale)}</span>
                                  <span>
                                    {app.rowCount} {t('rows-label')}
                                  </span>
                                </div>
                              </div>

                              {/* Quick actions on hover */}
                              <div
                                className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:p-2 gba:bg-gradient-to-t gba:from-background gba:via-background/95 gba:to-transparent gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:flex gba:justify-center gba:gap-1"
                                onClick={e => e.stopPropagation()}
                              >
                                <Button size="sm" variant="secondary" onClick={() => handleOpenApp(app.id)}>
                                  {t('action-open')}
                                </Button>
                                {isOwner && (
                                  <Button size="sm" variant="ghost" onClick={() => handleShareApp(app.id)}>
                                    <Share2 className="gba:w-4 gba:h-4" />
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      <MoreHorizontal className="gba:w-4 gba:h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditApp(app.id)}>
                                      <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                                      {t('action-settings')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicateApp(app.id)}>
                                      <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                                      {t('action-duplicate')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportApp(app.id)}>
                                      <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                                      {t('action-download')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="gba:text-destructive"
                                      onClick={() => handleDeleteApp(app.id, app.name)}
                                    >
                                      <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                      {t('action-delete-spreadsheet')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                </div>
              </div>

              {/* Pagination */}
              {!isLoadingApps && (activeSection === 'tasks' ? taskDisplayedApps : filteredApps).length > 0 && (
                <HubPaginationFooter
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                  data-testid={`${testId}-pagination`}
                />
              )}
            </>
          )}
        </main>

        {/* Promote to Database Modal */}
        {appToPromote && (
          <PromoteToDatabaseModal
            isOpen={!!appToPromote}
            onClose={() => setAppToPromote(null)}
            app={appToPromote}
            onPromote={handlePromoteExecute}
            data-testid={`${testId}-promote-modal`}
          />
        )}

        {/* Share App Dialog */}
        {selectedAppForShare && (
          <ShareAppDialog
            open={shareDialogOpen}
            onOpenChange={handleShareDialogOpenChange}
            appId={selectedAppForShare.id}
            appName={selectedAppForShare.name}
            appFilePath={selectedAppForShare.filePath || ''}
            accessToken={accessToken || ''}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            isOwner={selectedAppForShare.isOwner !== false}
            sharedUsers={sharedUsers}
            onShare={handleShare}
            onUnshare={handleUnshare}
            onRefreshShares={handleRefreshShares}
          />
        )}

        <DeleteConfirmDialog
          open={trashConfirmOpen}
          onOpenChange={handleTrashConfirmOpenChange}
          itemNames={pendingTrashApps.map(app => app.name)}
          onConfirm={() => {
            void confirmMoveAppsToTrash()
          }}
          isDeleting={isMovingAppsToTrash}
          t={t}
          data-testid={`${testId}-trash-confirm`}
        />

        {/* Manage {t('action-share')}s Dialog */}
        {selectedAppForManageShares && (
          <ManageSharesDialog
            open={manageSharesDialogOpen}
            onOpenChange={setManageSharesDialogOpen}
            appId={selectedAppForManageShares.id}
            appName={selectedAppForManageShares.name}
            accessToken={accessToken || ''}
            onSharesChanged={handleSharesChanged}
            onAddMoreUsers={() => {
              setManageSharesDialogOpen(false)
              handleShareApp(selectedAppForManageShares.id)
            }}
          />
        )}

        {/* Create Empty App Dialog */}
        <Dialog open={isCreateEmptyDialogOpen} onOpenChange={setIsCreateEmptyDialogOpen}>
          <DialogContent className="gba:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('dialog-create-title')}</DialogTitle>
            </DialogHeader>
            <div className="gba:space-y-4 gba:py-4">
              <div className="gba:space-y-2">
                <Label htmlFor="app-name">{t('dialog-create-name-label')}</Label>
                <Input
                  id="app-name"
                  placeholder={t('dialog-create-name-placeholder')}
                  value={newAppName}
                  onChange={e => setNewAppName(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newAppName.trim()) {
                      handleCreateEmptyApp()
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateEmptyDialogOpen(false)}>
                {t('dialog-create-cancel')}
              </Button>
              <Button onClick={handleCreateEmptyApp} disabled={!newAppName.trim()}>
                {t('dialog-create-submit')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return renderCurrentView()
}

// Default export for module registration
export default SpreadsheetAppsHub
