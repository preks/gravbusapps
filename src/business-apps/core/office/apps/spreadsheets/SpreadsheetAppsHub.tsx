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
  useTranslation
} from '@newwork/nw-design-system'
import translations from './_i18n'
import {
  FileSpreadsheet,
  Plus,
  Search,
  List,
  Upload,
  Database,
  AlertCircle,
  FileText,
  Home,
  FolderClosed,
  Users,
  Star,
  Clock,
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
  RefreshCw,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  Zap
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getWorkEmailFromCommunication } from '@/common/data/employee/useEmployeeSearch'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID, GET_EMPLOYEE_LIGHT_BY_ID } from '@/common/data/employee/queries/employeeQueries'

// Components
import { ExcelUploader } from './components/ExcelUploader'
import { PromoteToDatabaseModal } from './components/PromoteToDatabaseModal'
import { SpreadsheetAppViewer } from './SpreadsheetAppViewer'
import { SpreadsheetAppEditor } from './SpreadsheetAppEditor'
import { ShareAppDialog } from './components/ShareAppDialog'
import { ManageSharesDialog } from './components/ManageSharesDialog'
import { SpreadsheetAutomationsSection } from './components/automations/SpreadsheetAutomationsSection'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Hooks
import { useSpreadsheetApps } from './hooks/useSpreadsheetApps'
import { useDataPromotion } from './hooks/useDataPromotion'
import { useSpreadsheetAppsHubFavorites } from './hooks/useSpreadsheetAppsHubFavorites'
import { useSpreadsheetAppsHubFiltering } from './hooks/useSpreadsheetAppsHubFiltering'
import { useSpreadsheetAppsHubUrlState } from './hooks/useSpreadsheetAppsHubUrlState'
import { useSpreadsheetAppsHubUserLookup } from './hooks/useSpreadsheetAppsHubUserLookup'
import { useHubPagination } from '@/business-apps/platform/apps/shared/hooks/useHubPagination'
import { HubPaginationFooter } from '@/business-apps/platform/apps/shared/components/HubPaginationFooter'

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

type HubView = 'list' | 'upload' | 'viewer' | 'editor'
type SidebarSection = 'home' | 'my-files' | 'shared' | 'favorites' | 'recent' | 'automations' | 'tasks' | 'trash'

const resolveCurrentUserId = (userInfo?: SpreadsheetAppsHubProps['userInfo']): string =>
  userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

const filterTaskDisplayedApps = (
  activeSection: SidebarSection,
  taskStatusFilter: 'pending' | 'completed',
  filteredApps: SpreadsheetAppSummary[]
): SpreadsheetAppSummary[] => {
  if (activeSection !== 'tasks') return filteredApps
  if (taskStatusFilter === 'pending') {
    return filteredApps.filter(app => !isSubmittedExcelCollectionCopy(app))
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

function isOwner(app: SpreadsheetAppSummary, currentUserId: string): boolean {
  if (app.createdBy) return app.createdBy === currentUserId
  return app.isOwner === true
}

function isExcelCollectionCopy(app: SpreadsheetAppSummary): boolean {
  return app.settings?.excel_collection_copy === true
}

function hasContributorAccess(app: SpreadsheetAppSummary, currentUserId: string): boolean {
  if (isOwner(app, currentUserId)) return true
  return app.permission === 'owner' || app.permission === 'edit' || app.permission === 'admin'
}

function isExcelCollectionTaskForCurrentUser(app: SpreadsheetAppSummary, currentUserId: string): boolean {
  return isExcelCollectionCopy(app) && hasContributorAccess(app, currentUserId)
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

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string, t: (key: string, vars?: Record<string, number>) => string): string {
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
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format date for table display
 */
function formatDate(dateString: string, t: (key: string, vars?: Record<string, number>) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) return t('time-days-ago', { count: diffDays })
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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
  const { t } = useTranslation(translations)

  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [taskStatusFilter, setTaskStatusFilter] = useState<'pending' | 'completed'>('pending')

  // Clear space return URL if not opened from a space
  useEffect(() => {
    try {
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
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'created'>('modified')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('spreadsheet-hub-sidebar-collapsed')
    return saved === 'true'
  })
  const { favorites, setFavorites } = useSpreadsheetAppsHubFavorites()

  // Data state
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [appToPromote, setAppToPromote] = useState<SpreadsheetApp | null>(null)

  // Get current user ID
  const currentUserId = resolveCurrentUserId(userInfo)

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
    storageMode,
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
    addRow,
    updateRow,
    updateSheet
  } = useSpreadsheetApps(accessToken, currentUserId)

  const { ownerInfoMap, sharedUsersMap, invalidateSharedUsersForApp } = useSpreadsheetAppsHubUserLookup({
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

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('spreadsheet-hub-sidebar-collapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  const { filteredApps } = useSpreadsheetAppsHubFiltering({
    apps,
    currentUserId,
    activeSection,
    favorites,
    searchQuery,
    sortBy,
    sortOrder
  })
  const sharedWithMeCount = apps.filter(
    app => app.isShared && !isOwner(app, currentUserId) && !isExcelCollectionCopy(app)
  ).length
  const tasksCount = apps.filter(app => isExcelCollectionTaskForCurrentUser(app, currentUserId)).length

  const pendingTasksCount = useMemo(
    () => (activeSection === 'tasks' ? filteredApps.filter(app => !isSubmittedExcelCollectionCopy(app)).length : 0),
    [activeSection, filteredApps]
  )
  const completedTasksCount = useMemo(
    () => (activeSection === 'tasks' ? filteredApps.filter(app => isSubmittedExcelCollectionCopy(app)).length : 0),
    [activeSection, filteredApps]
  )

  const taskDisplayedApps = useMemo(
    () => filterTaskDisplayedApps(activeSection, taskStatusFilter, filteredApps),
    [activeSection, filteredApps, taskStatusFilter]
  )

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
    if (selectedAppForManageShares) {
      invalidateSharedUsersForApp(selectedAppForManageShares.id)
    }
  }, [refreshApps, selectedAppForManageShares, invalidateSharedUsersForApp])

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

  const handleDeleteApp = useCallback(
    async (id: string) => {
      if (confirm(t('delete-confirm'))) {
        const success = await deleteApp(id)
        if (success && selectedAppId === id) {
          setSelectedAppId(null)
          setCurrentView('list')
          updateUrl(null)
        }
        setSelectedApps(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [deleteApp, selectedAppId, updateUrl, t]
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

  /**
   * Enrich shared user records with display names and avatars via GraphQL.
   * Accepts an optional knownUsers map (userId → details) as a fallback
   * when the GraphQL lookup fails or returns no results.
   */
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

      return Promise.all(
        shares.map(async share => {
          // Try GraphQL lookup: first by userId (Keycloak ID), then by id (Employee record ID)
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
                    userAvatar: emp.pictureThumbnail
                      ? emp.pictureThumbnail.startsWith('data:')
                        ? emp.pictureThumbnail
                        : `data:image/png;base64,${emp.pictureThumbnail}`
                      : undefined
                  }
                }
              } catch {
                // Try next lookup strategy
              }
            }
          }

          // Fall back to pre-known user details (e.g. from employee search)
          const known = knownUsers?.get(share.userId)
          if (known) {
            return {
              ...share,
              userName: known.displayName,
              userEmail: known.email || '',
              userAvatar: known.avatar
                ? known.avatar.startsWith('data:')
                  ? known.avatar
                  : `data:image/png;base64,${known.avatar}`
                : undefined
            }
          }

          // Last resort fallback
          return {
            ...share,
            userName: `User ${share.userId.slice(0, 8)}`,
            userEmail: ''
          }
        })
      )
    },
    [graphqlClient]
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
        await fetchAndEnrichShares(selectedAppForShare.id, userDetails)
        await refreshApps()
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

  // const _handlePromoteApp = useCallback(
  //   async (id: string) => {
  //     const app = await loadApp(id)
  //     if (app) setAppToPromote(app)
  //   },
  //   [loadApp]
  // )

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

  const handleBack = useCallback(() => {
    // Check if there's a space return URL in sessionStorage (takes priority)
    try {
      const spaceReturnUrl = sessionStorage.getItem('space_return_url')
      if (spaceReturnUrl) {
        sessionStorage.removeItem('space_return_url')
        globalThis.window.location.href = spaceReturnUrl
        return
      }
    } catch (e) {
      console.warn('Failed to read space_return_url from sessionStorage:', e)
    }

    // Fallback: Check if there's a returnUrl parameter
    const params = new URLSearchParams(globalThis.window.location.search)
    const returnUrl = params.get('returnUrl')

    if (returnUrl) {
      globalThis.window.location.href = returnUrl
      return
    }

    // Otherwise, go back in history
    window.history.back()
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
      const url = new URL(window.location.href)
      url.searchParams.set('appId', app.id)
      if (app.filePath) url.searchParams.set('filePath', encodeURIComponent(app.filePath))
      navigator.clipboard.writeText(url.toString())
      toast.success(t('toast-link-copied'))
    },
    [t]
  )

  // Render based on current view
  if (currentView === 'viewer' && currentApp) {
    const canEdit = currentAppPermission === 'owner' || currentAppPermission === 'edit'

    return (
      <>
        <SpreadsheetAppViewer
          app={currentApp}
          onBack={handleBack}
          onShare={() => handleShareApp(currentApp.id)}
          onEdit={
            canEdit
              ? () => {
                  setCurrentView('editor')
                  updateUrl(currentApp.id, 'editor', currentApp.filePath)
                }
              : undefined
          }
          onAppUpdate={canEdit ? updatedApp => updateApp(updatedApp.id, updatedApp) : undefined}
          onAppRefreshNeeded={
            canEdit
              ? async (appId: string, newSheetId?: string) => {
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
                }
              : undefined
          }
          onSheetUpdate={canEdit ? updateSheet : undefined}
          onRowAdd={canEdit ? addRow : undefined}
          onRowUpdate={canEdit ? updateRow : undefined}
          // Keep hub-level replay off: SpreadsheetAppViewer persists Univer edits via row/cell ops.
          onDataChange={undefined}
          isEditing={canEdit}
          accessToken={accessToken}
          userId={currentUserId}
          data-testid={`${testId}-viewer`}
        />

        {selectedAppForShare && (
          <ShareAppDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            appId={selectedAppForShare.id}
            appName={selectedAppForShare.name}
            appFilePath={selectedAppForShare.filePath || ''}
            accessToken={accessToken || ''}
            currentUserId={currentUserId}
            currentUserName={
              userInfo?.employeeDetails?.firstName && userInfo?.employeeDetails?.lastName
                ? `${userInfo.employeeDetails.firstName} ${userInfo.employeeDetails.lastName}`
                : userInfo?.givenName && userInfo?.familyName
                  ? `${userInfo.givenName} ${userInfo.familyName}`
                  : userInfo?.nickName || userInfo?.userName || undefined
            }
            isOwner={selectedAppForShare.isOwner !== false}
            sharedUsers={sharedUsers}
            onShare={handleShare}
            onUnshare={handleUnshare}
            onRefreshShares={handleRefreshShares}
          />
        )}
      </>
    )
  }

  if (currentView === 'editor' && currentApp) {
    if (currentAppPermission !== 'owner' && currentAppPermission !== 'edit') {
      toast.error(t('toast-no-edit-permission'))
      handleBack()
      return null
    }

    return (
      <SpreadsheetAppEditor
        app={currentApp}
        onSave={handleSaveApp}
        onCancel={handleBack}
        accessToken={accessToken}
        userId={currentUserId}
        data-testid={`${testId}-editor`}
      />
    )
  }

  // Section title helper
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'home':
        return t('section-home')
      case 'my-files':
        return t('section-my-spreadsheets')
      case 'shared':
        return t('section-shared-with-me')
      case 'favorites':
        return t('section-favorites')
      case 'recent':
        return t('section-recent')
      case 'automations':
        return t('section-automations')
      case 'tasks':
        return t('section-my-tasks')
      case 'trash':
        return t('section-trash')
      default:
        return t('section-spreadsheets')
    }
  }

  return (
    <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
      {/* Sidebar */}
      <aside
        className={`gba:border-r gba:bg-card gba:flex gba:flex-col gba:flex-shrink-0 gba:transition-all gba:duration-300 ${isSidebarCollapsed ? 'gba:w-16' : 'gba:w-60'}`}
      >
        {/* Logo / Brand */}
        <div className={`gba:border-b ${isSidebarCollapsed ? 'gba:p-2' : 'gba:p-4'}`}>
          {/* Back button and collapse toggle row */}
          <div
            className={`gba:flex gba:items-center gba:mb-2 ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:justify-between'}`}
          >
            <TooltipProvider>
              {!isSidebarCollapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.history.back()}
                      data-testid={`${testId}-back-to-desk`}
                    >
                      <ChevronLeft className="gba:w-4 gba:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('sidebar-back-to-desk')}</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    data-testid={`${testId}-toggle-sidebar`}
                  >
                    {isSidebarCollapsed ? (
                      <PanelLeft className="gba:w-4 gba:h-4" />
                    ) : (
                      <PanelLeftClose className="gba:w-4 gba:h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isSidebarCollapsed ? t('sidebar-expand') : t('sidebar-collapse')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Brand section */}
          {!isSidebarCollapsed && (
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-emerald-500 gba:to-teal-600 gba:flex gba:items-center gba:justify-center">
                <FileSpreadsheet className="gba:w-5 gba:h-5 gba:text-white" />
              </div>
              <div>
                <h1 className="gba:font-semibold gba:text-foreground">{t('sidebar-brand-title')}</h1>
                <p className="gba:text-xs gba:text-muted-foreground">{t('sidebar-brand-subtitle')}</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="gba:flex gba:justify-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-emerald-500 gba:to-teal-600 gba:flex gba:items-center gba:justify-center">
                <FileSpreadsheet className="gba:w-5 gba:h-5 gba:text-white" />
              </div>
            </div>
          )}
        </div>

        {/* New Button */}
        <div className={isSidebarCollapsed ? 'gba:p-2' : 'gba:p-3'}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={`gba:w-full gba:gap-2 gba:bg-gradient-to-r gba:from-emerald-500 gba:to-teal-600 gba:text-white hover:gba:from-emerald-600 hover:gba:to-teal-700 ${isSidebarCollapsed ? 'gba:justify-center gba:px-0' : 'gba:justify-start'}`}
              >
                <Plus className="gba:w-4 gba:h-4" />
                {!isSidebarCollapsed && t('sidebar-new')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gba:w-56">
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
        </div>

        {/* Navigation */}
        <nav className="gba:flex-1 gba:overflow-y-auto gba:px-2 gba:py-2">
          <div className="gba:space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('home')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'home'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Home className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && t('sidebar-home')}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">{t('sidebar-home')}</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('my-files')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'my-files'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <FolderClosed className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && t('sidebar-my-spreadsheets')}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">{t('sidebar-my-spreadsheets')}</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('shared')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'shared'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Users className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && (
                      <>
                        {t('sidebar-shared-with-me')}
                        {sharedWithMeCount > 0 && (
                          <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                            {sharedWithMeCount}
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right">
                    {t('sidebar-shared-with-me')} {sharedWithMeCount > 0 && `(${sharedWithMeCount})`}
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('tasks')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'tasks'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <List className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && (
                      <>
                        {t('sidebar-my-tasks')}
                        {tasksCount > 0 && (
                          <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                            {tasksCount}
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right">
                    {t('sidebar-my-tasks')} {tasksCount > 0 && `(${tasksCount})`}
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('recent')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'recent'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Clock className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && t('sidebar-recent')}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">{t('sidebar-recent')}</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('automations')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'automations'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Zap className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && t('sidebar-automations')}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">{t('sidebar-automations')}</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('favorites')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'favorites'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Star className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && t('sidebar-favorites')}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">{t('sidebar-favorites')}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </div>

          {!isSidebarCollapsed && (
            <div className="gba:mt-6 gba:pt-4 gba:border-t">
              <p className="gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                {t('sidebar-storage')}
              </p>
              <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:bg-muted/30">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <Database
                    className={`gba:w-4 gba:h-4 ${storageMode === 'database' ? 'gba:text-emerald-500' : 'gba:text-amber-500'}`}
                  />
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {storageMode === 'database' ? t('sidebar-cloud-storage') : t('sidebar-local-storage')}
                  </span>
                </div>
                <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                  <div
                    className="gba:h-full gba:bg-gradient-to-r gba:from-emerald-500 gba:to-teal-500 gba:rounded-full"
                    style={{ width: `${Math.min((apps.length / 50) * 100, 100)}%` }}
                  />
                </div>
                <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">
                  {t('sidebar-spreadsheets-count', { count: apps.length })}
                </p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="gba:mt-6 gba:pt-4 gba:border-t gba:flex gba:justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="gba:p-2">
                      <Database
                        className={`gba:w-4 gba:h-4 ${storageMode === 'database' ? 'gba:text-emerald-500' : 'gba:text-amber-500'}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div>
                      <p className="gba:font-medium">
                        {storageMode === 'database' ? t('sidebar-cloud-storage') : t('sidebar-local-storage')}
                      </p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {t('sidebar-spreadsheets-count', { count: apps.length })}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:overflow-hidden">
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
          <SpreadsheetAutomationsSection accessToken={accessToken} data-testid={`${testId}-automations-section`} />
        )}

        {/* List View */}
        {currentView === 'list' && activeSection !== 'automations' && (
          <>
            {/* Header / Toolbar */}
            <header className="gba:border-b gba:bg-card gba:flex-shrink-0">
              {/* Breadcrumb */}
              <div className="gba:px-6 gba:py-3 gba:flex gba:items-center gba:gap-2 gba:text-sm">
                <span className="gba:font-medium gba:text-foreground">{getSectionTitle()}</span>
              </div>

              {/* Task status tabs */}
              {activeSection === 'tasks' && (
                <div className="gba:px-6 gba:pb-2">
                  <Tabs value={taskStatusFilter} onValueChange={v => setTaskStatusFilter(v as 'pending' | 'completed')}>
                    <TabsList>
                      <TabsTrigger value="pending" data-testid="spreadsheet-apps-hub-tasks-tab-pending">
                        {t('tasks-pending')}
                        {pendingTasksCount > 0 && (
                          <Badge variant="secondary" className="gba:ml-1.5 gba:text-xs">
                            {pendingTasksCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="completed" data-testid="spreadsheet-apps-hub-tasks-tab-completed">
                        {t('tasks-completed')}
                        {completedTasksCount > 0 && (
                          <Badge variant="secondary" className="gba:ml-1.5 gba:text-xs">
                            {completedTasksCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}

              {/* Action Bar */}
              <div className="gba:px-6 gba:py-2 gba:flex gba:items-center gba:justify-between gba:border-t gba:border-border/50">
                <div className="gba:flex gba:items-center gba:gap-1">
                  {selectedApps.size > 0 ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedApps(new Set())}>
                        <X className="gba:w-4 gba:h-4 gba:mr-1" />
                        {t('action-clear', { count: selectedApps.size })}
                      </Button>
                      <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-2" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          selectedApps.forEach(id => handleShareApp(id))
                        }}
                      >
                        <Share2 className="gba:w-4 gba:h-4 gba:mr-1" />
                        {t('action-share')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          selectedApps.forEach(id => handleExportApp(id))
                        }}
                      >
                        <Download className="gba:w-4 gba:h-4 gba:mr-1" />
                        {t('action-download')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:text-destructive"
                        onClick={() => {
                          if (confirm(t('action-delete-confirm', { count: selectedApps.size }))) {
                            selectedApps.forEach(id => handleDeleteApp(id))
                          }
                        }}
                      >
                        <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                        {t('action-delete-spreadsheet')}
                      </Button>
                    </>
                  ) : null}
                </div>

                <div className="gba:flex gba:items-center gba:gap-2">
                  <div className="gba:relative">
                    <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    <Input
                      placeholder={t('action-search-placeholder')}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="gba:pl-9 gba:w-64 gba:h-9"
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refreshApps()}
                        data-testid="spreadsheet-apps-hub-refresh-button"
                      >
                        <RefreshCw className="gba:w-4 gba:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('action-refresh')}</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="gba:flex gba:items-center gba:border gba:rounded-md">
                    <Button
                      variant={viewLayout === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewLayout('list')}
                      className="gba:rounded-r-none"
                    >
                      <List className="gba:w-4 gba:h-4" />
                    </Button>
                    <Button
                      variant={viewLayout === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewLayout('grid')}
                      className="gba:rounded-l-none"
                    >
                      <LayoutGrid className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            {/* Content Area */}
            <div className="gba:flex-1 gba:overflow-auto">
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
                    <Button variant="outline" onClick={() => refreshApps()} data-testid="spreadsheet-apps-hub-retry">
                      <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
                      Retry
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
                          onClick={() => {
                            setSortBy('name')
                            setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')
                          }}
                        >
                          {t('action-sort-name')}
                          {sortBy === 'name' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                        </div>
                        <div
                          className="gba:w-36 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                          onClick={() => {
                            setSortBy('modified')
                            setSortOrder(sortBy === 'modified' && sortOrder === 'desc' ? 'asc' : 'desc')
                          }}
                        >
                          {t('action-sort-modified')}
                          {sortBy === 'modified' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                        </div>
                        <div className="gba:w-40 gba:flex-shrink-0">{t('table-modified-by')}</div>
                        <div
                          className="gba:w-32 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                          onClick={() => {
                            setSortBy('created')
                            setSortOrder(sortBy === 'created' && sortOrder === 'desc' ? 'asc' : 'desc')
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
                            onClick={() => handleOpenApp(app.id)}
                          >
                            {/* Checkbox */}
                            <div className="gba:w-8 gba:flex-shrink-0" onClick={e => e.stopPropagation()}>
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
                                  <span className="gba:font-medium gba:text-foreground gba:truncate">{app.name}</span>
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
                              {formatDate(app.updatedAt, t)}
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
                              {formatDate(app.createdAt, t)}
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
                                    onClick={() => handleDeleteApp(app.id)}
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
                                Submitted
                              </Badge>
                            )}
                          </div>

                          {/* Info */}
                          <div className="gba:p-3">
                            <h3 className="gba:font-medium gba:text-foreground gba:truncate gba:mb-1">{app.name}</h3>
                            <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                              <span>{formatRelativeTime(app.updatedAt, t)}</span>
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
                                  Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateApp(app.id)}>
                                  <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportApp(app.id)}>
                                  <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                                  {t('action-download')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gba:text-destructive"
                                  onClick={() => handleDeleteApp(app.id)}
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
          onOpenChange={setShareDialogOpen}
          appId={selectedAppForShare.id}
          appName={selectedAppForShare.name}
          appFilePath={selectedAppForShare.filePath || ''}
          accessToken={accessToken || ''}
          currentUserId={currentUserId}
          currentUserName={
            userInfo?.employeeDetails?.firstName && userInfo?.employeeDetails?.lastName
              ? `${userInfo.employeeDetails.firstName} ${userInfo.employeeDetails.lastName}`
              : userInfo?.givenName && userInfo?.familyName
                ? `${userInfo.givenName} ${userInfo.familyName}`
                : userInfo?.nickName || userInfo?.userName || undefined
          }
          isOwner={selectedAppForShare.isOwner !== false}
          sharedUsers={sharedUsers}
          onShare={handleShare}
          onUnshare={handleUnshare}
          onRefreshShares={handleRefreshShares}
        />
      )}

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

// Default export for module registration
export default SpreadsheetAppsHub
