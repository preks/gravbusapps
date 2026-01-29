/**
 * SpreadsheetAppsHub Component
 *
 * The main entry point for the Excel-to-App feature.
 * Modern OneDrive-inspired design with sidebar navigation.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
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
  Checkbox
} from '@newwork/nw-design-system'
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
  Check,
  X,
  LayoutGrid,
  User,
  RefreshCw,
  ChevronLeft
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'

// Components
import { ExcelUploader } from './components/ExcelUploader'
import { SheetAnalysisPreview } from './components/SheetAnalysisPreview'
import { PromoteToDatabaseModal } from './components/PromoteToDatabaseModal'
import { SpreadsheetAppViewer } from './SpreadsheetAppViewer'
import { SpreadsheetAppEditor } from './SpreadsheetAppEditor'
import { ShareAppDialog } from './components/ShareAppDialog'
import { ManageSharesDialog } from './components/ManageSharesDialog'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Hooks
import { useSpreadsheetApps } from './hooks/useSpreadsheetApps'
import { useSpreadsheetAI } from './hooks/useSpreadsheetAI'
import { useDataPromotion } from './hooks/useDataPromotion'
import { useSpreadsheetAppsHubFavorites } from './hooks/useSpreadsheetAppsHubFavorites'
import { useSpreadsheetAppsHubFiltering } from './hooks/useSpreadsheetAppsHubFiltering'
import { useSpreadsheetAppsHubUrlState } from './hooks/useSpreadsheetAppsHubUrlState'
import { useSpreadsheetAppsHubUserLookup } from './hooks/useSpreadsheetAppsHubUserLookup'

// Services
import { generateAppSchema, generateEmptyAppSchema } from './services/SchemaGenerator'
import { setSpreadsheetApiAuthTokenProvider } from './services/SpreadsheetApiService'

// Types
import type { ParsedExcelFile, SpreadsheetAnalysis, SpreadsheetApp, SpreadsheetAppSummary } from './types'
import { getIconByName } from './utils/appIcons'

export interface SpreadsheetAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type HubView = 'list' | 'upload' | 'analysis' | 'viewer' | 'editor'
type SidebarSection = 'home' | 'my-files' | 'shared' | 'favorites' | 'recent' | 'trash'

/** Get initials from a name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format date for table display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
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
  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateEmptyDialogOpen, setIsCreateEmptyDialogOpen] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const [activeSection, setActiveSection] = useState<SidebarSection>('my-files')
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'created'>('modified')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { favorites, setFavorites } = useSpreadsheetAppsHubFavorites()

  // Data state
  const [parsedFile, setParsedFile] = useState<ParsedExcelFile | null>(null)
  const [analysis, setAnalysis] = useState<SpreadsheetAnalysis | null>(null)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [appToPromote, setAppToPromote] = useState<SpreadsheetApp | null>(null)

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

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
      userId: string
      userName: string
      userEmail: string
      userAvatar?: string
      permission: 'view' | 'edit'
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
    exportApp,
    shareApp,
    revokeAccess,
    getSharedUsers,
    clearCurrentApp,
    refreshApps,
    addRow,
    updateRow,
    updateSheetData,
    updateSheet
  } = useSpreadsheetApps(accessToken, currentUserId)

  const { ownerInfoMap, sharedUsersMap, invalidateSharedUsersForApp } = useSpreadsheetAppsHubUserLookup({
    apps,
    currentUserId,
    graphqlClient,
    activeSection
  })

  // Ref to always have the latest currentApp value for callbacks
  const currentAppRef = useRef(currentApp)
  useEffect(() => {
    currentAppRef.current = currentApp
  }, [currentApp])

  const { isAnalyzing, analyzeSpreadsheet, reset: resetAI } = useSpreadsheetAI(accessToken)
  const { promoteToDatabase } = useDataPromotion(accessToken)
  const { updateUrl, resetLoadAttempt } = useSpreadsheetAppsHubUrlState({
    currentView,
    currentAppId: currentApp?.id || null,
    isLoadingApps,
    loadAppById: loadApp,
    setSelectedAppId,
    setCurrentView
  })

  const { filteredApps } = useSpreadsheetAppsHubFiltering({
    apps,
    currentUserId,
    activeSection,
    favorites,
    searchQuery,
    sortBy,
    sortOrder
  })

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

  const handleFileParsed = useCallback(
    async (file: ParsedExcelFile) => {
      setParsedFile(file)
      const analysisResult = await analyzeSpreadsheet(file)
      if (analysisResult) {
        setAnalysis(analysisResult)
        setCurrentView('analysis')
      }
    },
    [analyzeSpreadsheet]
  )

  const handleAnalysisConfirm = useCallback(
    async (confirmedAnalysis: SpreadsheetAnalysis) => {
      if (!parsedFile || !userInfo) return

      const appSchema = generateAppSchema(
        parsedFile,
        confirmedAnalysis,
        userInfo.id || userInfo?.employeeDetails?.employeeId || 'unknown'
      )

      const createdApp = await createApp(appSchema)

      if (createdApp) {
        setSelectedAppId(createdApp.id)
        setCurrentView('viewer')
        updateUrl(createdApp.id, 'viewer', createdApp.filePath)
        setParsedFile(null)
        setAnalysis(null)
        resetAI()
      }
    },
    [parsedFile, userInfo, createApp, resetAI, updateUrl]
  )

  const handleReanalyze = useCallback(async () => {
    if (!parsedFile) return
    resetAI()
    const analysisResult = await analyzeSpreadsheet(parsedFile)
    if (analysisResult) {
      setAnalysis(analysisResult)
    }
  }, [parsedFile, analyzeSpreadsheet, resetAI])

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
      await updateApp(updatedApp.id, updatedApp)
      setCurrentView('viewer')
      updateUrl(updatedApp.id, 'viewer', updatedApp.filePath)
    },
    [updateApp, updateUrl]
  )

  const handleDeleteApp = useCallback(
    async (id: string) => {
      if (confirm('Are you sure you want to delete this spreadsheet?')) {
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
    [deleteApp, selectedAppId, updateUrl]
  )

  const handleDuplicateApp = useCallback(
    async (id: string) => {
      await duplicateApp(id)
    },
    [duplicateApp]
  )

  const handleExportApp = useCallback(
    async (id: string) => {
      const json = await exportApp(id)
      if (json) {
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `app-${id}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    },
    [exportApp]
  )

  const handleShareApp = useCallback(
    async (id: string) => {
      const app = apps.find(a => a.id === id)
      if (app) {
        setSelectedAppForShare(app)
        // Get shared users from API (returns basic info)
        const shares = await getSharedUsers(id)

        // Fetch user details via GraphQL for each shared user
        if (graphqlClient && shares.length > 0) {
          const enrichedUsers = await Promise.all(
            shares.map(async share => {
              try {
                const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(share.userId)
                const result = await graphqlClient.request<{
                  Employee: Array<{ displayName: string; pictureThumbnail?: string; workEmail?: string }>
                }>(query)
                const emp = result.Employee?.[0]
                return {
                  ...share,
                  userName: emp?.displayName || `User ${share.userId.slice(0, 8)}`,
                  userEmail: emp?.workEmail || '',
                  userAvatar: emp?.pictureThumbnail
                    ? emp.pictureThumbnail.startsWith('data:')
                      ? emp.pictureThumbnail
                      : `data:image/png;base64,${emp.pictureThumbnail}`
                    : undefined
                }
              } catch {
                return {
                  ...share,
                  userName: `User ${share.userId.slice(0, 8)}`,
                  userEmail: ''
                }
              }
            })
          )
          setSharedUsers(enrichedUsers)
        } else {
          setSharedUsers(shares)
        }
        setShareDialogOpen(true)
      }
    },
    [apps, getSharedUsers, graphqlClient]
  )

  const handleShare = useCallback(
    async (userIds: string[], permission: 'view' | 'edit' | 'admin') => {
      const actualPermission = permission === 'admin' ? 'edit' : permission
      if (!selectedAppForShare) return false

      const currentUserName =
        userInfo?.employeeDetails?.firstName && userInfo?.employeeDetails?.lastName
          ? `${userInfo.employeeDetails.firstName} ${userInfo.employeeDetails.lastName}`
          : userInfo?.givenName && userInfo?.familyName
            ? `${userInfo.givenName} ${userInfo.familyName}`
            : userInfo?.nickName || userInfo?.userName || 'Someone'

      const success = await shareApp(selectedAppForShare.id, userIds, actualPermission, currentUserName)
      if (success) {
        const users = await getSharedUsers(selectedAppForShare.id)
        setSharedUsers(users)
        await refreshApps()
      }
      return success
    },
    [selectedAppForShare, shareApp, getSharedUsers, refreshApps, userInfo]
  )

  const handleUnshare = useCallback(
    async (userId: string) => {
      if (!selectedAppForShare) return false
      const success = await revokeAccess(selectedAppForShare.id, userId)
      if (success) {
        const users = await getSharedUsers(selectedAppForShare.id)
        setSharedUsers(users)
        await refreshApps()
      }
      return success
    },
    [selectedAppForShare, revokeAccess, getSharedUsers, refreshApps]
  )

  const handleRefreshShares = useCallback(async () => {
    if (!selectedAppForShare) return
    const users = await getSharedUsers(selectedAppForShare.id)
    setSharedUsers(users)
    await refreshApps()
  }, [selectedAppForShare, getSharedUsers, refreshApps])

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
    clearCurrentApp()
    resetLoadAttempt()
    setSelectedAppId(null)
    setParsedFile(null)
    setAnalysis(null)
    resetAI()
    setCurrentView('list')
    updateUrl(null)
  }, [clearCurrentApp, resetAI, resetLoadAttempt, updateUrl])

  const handleStartUpload = useCallback(() => {
    setParsedFile(null)
    setAnalysis(null)
    resetAI()
    setCurrentView('upload')
  }, [resetAI])

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

  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast.success('Removed from favorites')
      } else {
        next.add(id)
        toast.success('Added to favorites')
      }
      return next
    })
  }, [])

  const toggleSelectApp = useCallback((id: string, e?: React.MouseEvent) => {
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
  }, [])

  const selectAllApps = useCallback(() => {
    if (selectedApps.size === filteredApps.length) {
      setSelectedApps(new Set())
    } else {
      setSelectedApps(new Set(filteredApps.map(a => a.id)))
    }
  }, [selectedApps.size, filteredApps])

  const copyLink = useCallback((app: SpreadsheetAppSummary) => {
    const url = new URL(window.location.href)
    url.searchParams.set('appId', app.id)
    if (app.filePath) url.searchParams.set('filePath', encodeURIComponent(app.filePath))
    navigator.clipboard.writeText(url.toString())
    toast.success('Link copied to clipboard')
  }, [])

  // Render based on current view
  if (currentView === 'viewer' && currentApp) {
    const canEdit = currentAppPermission === 'owner' || currentAppPermission === 'edit'

    return (
      <SpreadsheetAppViewer
        app={currentApp}
        onBack={handleBack}
        onEdit={
          canEdit
            ? () => {
                setCurrentView('editor')
                updateUrl(currentApp.id, 'editor', currentApp.filePath)
              }
            : undefined
        }
        onAppUpdate={canEdit ? updatedApp => updateApp(updatedApp.id, updatedApp) : undefined}
        onSheetUpdate={canEdit ? updateSheet : undefined}
        onRowAdd={canEdit ? addRow : undefined}
        onRowUpdate={canEdit ? updateRow : undefined}
        onDataChange={
          canEdit
            ? (sheetId, data) => {
                const latestApp = currentAppRef.current
                if (!latestApp) return
                updateSheetData(latestApp.id, sheetId, data)
              }
            : undefined
        }
        isEditing={canEdit}
        accessToken={accessToken}
        userId={currentUserId}
        data-testid={`${testId}-viewer`}
      />
    )
  }

  if (currentView === 'editor' && currentApp) {
    if (currentAppPermission !== 'owner' && currentAppPermission !== 'edit') {
      toast.error('You do not have permission to edit this spreadsheet')
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
        return 'Home'
      case 'my-files':
        return 'My Spreadsheets'
      case 'shared':
        return 'Shared with me'
      case 'favorites':
        return 'Favorites'
      case 'recent':
        return 'Recent'
      case 'trash':
        return 'Trash'
      default:
        return 'Spreadsheets'
    }
  }

  return (
    <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
      {/* Sidebar */}
      <aside className="gba:w-60 gba:border-r gba:bg-card gba:flex gba:flex-col gba:flex-shrink-0">
        {/* Logo / Brand */}
        <div className="gba:p-4 gba:border-b">
          {/* Back button row */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    navigateTo(process.env.NODE_ENV === 'production' ? '/platform/desk' : '/platform/apps/desk')
                  }
                  data-testid={`${testId}-back-to-desk`}
                  className="gba:mb-2"
                >
                  <ChevronLeft className="gba:w-4 gba:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to Desk</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Existing brand section */}
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-emerald-500 gba:to-teal-600 gba:flex gba:items-center gba:justify-center">
              <FileSpreadsheet className="gba:w-5 gba:h-5 gba:text-white" />
            </div>
            <div>
              <h1 className="gba:font-semibold gba:text-foreground">Spreadsheets</h1>
              <p className="gba:text-xs gba:text-muted-foreground">NEWWORK Apps</p>
            </div>
          </div>
        </div>

        {/* New Button */}
        <div className="gba:p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gba:w-full gba:justify-start gba:gap-2 gba:bg-gradient-to-r gba:from-emerald-500 gba:to-teal-600 gba:text-white hover:gba:from-emerald-600 hover:gba:to-teal-700">
                <Plus className="gba:w-4 gba:h-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gba:w-56">
              <DropdownMenuItem onClick={() => setIsCreateEmptyDialogOpen(true)}>
                <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-emerald-500" />
                <div>
                  <div className="gba:font-medium">Blank Spreadsheet</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Start from scratch</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStartUpload}>
                <Upload className="gba:w-4 gba:h-4 gba:mr-2 gba:text-blue-500" />
                <div>
                  <div className="gba:font-medium">Upload Excel</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Import .xlsx or .xls file</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="gba:flex-1 gba:overflow-y-auto gba:px-2 gba:py-2">
          <div className="gba:space-y-1">
            <button
              onClick={() => setActiveSection('home')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'home'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Home className="gba:w-4 gba:h-4" />
              Home
            </button>

            <button
              onClick={() => setActiveSection('my-files')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'my-files'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <FolderClosed className="gba:w-4 gba:h-4" />
              My Spreadsheets
            </button>

            <button
              onClick={() => setActiveSection('shared')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'shared'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Users className="gba:w-4 gba:h-4" />
              Shared with me
              {apps.filter(a => a.isShared && !(a.isOwner ?? a.createdBy === currentUserId)).length > 0 && (
                <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                  {apps.filter(a => a.isShared && !(a.isOwner ?? a.createdBy === currentUserId)).length}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveSection('favorites')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'favorites'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Star className="gba:w-4 gba:h-4" />
              Favorites
            </button>

            <button
              onClick={() => setActiveSection('recent')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'recent'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Clock className="gba:w-4 gba:h-4" />
              Recent
            </button>
          </div>

          <div className="gba:mt-6 gba:pt-4 gba:border-t">
            <p className="gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Storage</p>
            <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:bg-muted/30">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <Database
                  className={`gba:w-4 gba:h-4 ${storageMode === 'database' ? 'gba:text-emerald-500' : 'gba:text-amber-500'}`}
                />
                <span className="gba:text-xs gba:text-muted-foreground">
                  {storageMode === 'database' ? 'Cloud storage' : 'Local storage'}
                </span>
              </div>
              <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                <div
                  className="gba:h-full gba:bg-gradient-to-r gba:from-emerald-500 gba:to-teal-500 gba:rounded-full"
                  style={{ width: `${Math.min((apps.length / 50) * 100, 100)}%` }}
                />
              </div>
              <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">{apps.length} spreadsheets</p>
            </div>
          </div>
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
                Cancel
              </Button>

              <div className="gba:text-center gba:mb-8">
                <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-gradient-to-br gba:from-emerald-500 gba:to-teal-600 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                  <Upload className="gba:w-8 gba:h-8 gba:text-white" />
                </div>
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">Upload Excel File</h2>
                <p className="gba:text-muted-foreground">Transform your spreadsheet into a powerful app with AI</p>
              </div>

              <ExcelUploader
                onFileParsed={handleFileParsed}
                onError={error => console.error(error)}
                data-testid={`${testId}-uploader`}
              />

              {isAnalyzing && (
                <Card className="gba:p-8 gba:text-center">
                  <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
                  <h3 className="gba:font-semibold gba:text-foreground gba:mb-2">Analyzing your spreadsheet...</h3>
                  <p className="gba:text-sm gba:text-muted-foreground">
                    AI is detecting column types and suggesting the best structure
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Analysis View */}
        {currentView === 'analysis' && analysis && (
          <div className="gba:flex-1 gba:overflow-auto gba:p-8">
            <div className="gba:max-w-4xl gba:mx-auto">
              <Button variant="ghost" onClick={handleBack} className="gba:mb-4">
                <X className="gba:w-4 gba:h-4 gba:mr-2" />
                Cancel
              </Button>
              <SheetAnalysisPreview
                analysis={analysis}
                onConfirm={handleAnalysisConfirm}
                onReanalyze={handleReanalyze}
                isLoading={isAnalyzing}
                data-testid={`${testId}-analysis`}
              />
            </div>
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <>
            {/* Header / Toolbar */}
            <header className="gba:border-b gba:bg-card gba:flex-shrink-0">
              {/* Breadcrumb */}
              <div className="gba:px-6 gba:py-3 gba:flex gba:items-center gba:gap-2 gba:text-sm">
                <span className="gba:font-medium gba:text-foreground">{getSectionTitle()}</span>
              </div>

              {/* Action Bar */}
              <div className="gba:px-6 gba:py-2 gba:flex gba:items-center gba:justify-between gba:border-t gba:border-border/50">
                <div className="gba:flex gba:items-center gba:gap-1">
                  {selectedApps.size > 0 ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedApps(new Set())}>
                        <X className="gba:w-4 gba:h-4 gba:mr-1" />
                        Clear ({selectedApps.size})
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
                        Share
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          selectedApps.forEach(id => handleExportApp(id))
                        }}
                      >
                        <Download className="gba:w-4 gba:h-4 gba:mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete ${selectedApps.size} spreadsheet(s)?`)) {
                            selectedApps.forEach(id => handleDeleteApp(id))
                          }
                        }}
                      >
                        <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ArrowUpDown className="gba:w-4 gba:h-4 gba:mr-1" />
                            Sort
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() => {
                              setSortBy('name')
                              setSortOrder('asc')
                            }}
                          >
                            {sortBy === 'name' && <Check className="gba:w-4 gba:h-4 gba:mr-2" />}
                            Name
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSortBy('modified')
                              setSortOrder('desc')
                            }}
                          >
                            {sortBy === 'modified' && <Check className="gba:w-4 gba:h-4 gba:mr-2" />}
                            Modified
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSortBy('created')
                              setSortOrder('desc')
                            }}
                          >
                            {sortBy === 'created' && <Check className="gba:w-4 gba:h-4 gba:mr-2" />}
                            Created
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="sm" onClick={() => refreshApps()}>
                        <RefreshCw className="gba:w-4 gba:h-4" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="gba:flex gba:items-center gba:gap-2">
                  <div className="gba:relative">
                    <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="gba:pl-9 gba:w-64 gba:h-9"
                    />
                  </div>
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
                    <p className="gba:text-destructive">{appsError}</p>
                  </Card>
                </div>
              )}

              {/* Empty state */}
              {!isLoadingApps && !appsError && filteredApps.length === 0 && (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
                  <div className="gba:w-24 gba:h-24 gba:rounded-3xl gba:bg-gradient-to-br gba:from-emerald-500/20 gba:to-teal-500/20 gba:flex gba:items-center gba:justify-center gba:mb-6">
                    <FileSpreadsheet className="gba:w-12 gba:h-12 gba:text-emerald-500" />
                  </div>
                  <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
                    {activeSection === 'favorites'
                      ? 'No favorites yet'
                      : activeSection === 'shared'
                        ? 'Nothing shared with you'
                        : 'No spreadsheets yet'}
                  </h3>
                  <p className="gba:text-muted-foreground gba:text-center gba:max-w-md gba:mb-6">
                    {activeSection === 'favorites'
                      ? 'Star your frequently used spreadsheets to see them here.'
                      : activeSection === 'shared'
                        ? 'When someone shares a spreadsheet with you, it will appear here.'
                        : 'Create your first spreadsheet to get started.'}
                  </p>
                  {activeSection !== 'favorites' && activeSection !== 'shared' && (
                    <div className="gba:flex gba:gap-3">
                      <Button onClick={() => setIsCreateEmptyDialogOpen(true)}>
                        <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                        Create Spreadsheet
                      </Button>
                      <Button variant="outline" onClick={handleStartUpload}>
                        <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                        Upload Excel
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* List View */}
              {!isLoadingApps && filteredApps.length > 0 && viewLayout === 'list' && (
                <div className="gba:w-full">
                  {/* Table Header */}
                  <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
                    <div className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                      <div className="gba:w-8 gba:flex-shrink-0">
                        <Checkbox
                          checked={selectedApps.size === filteredApps.length && filteredApps.length > 0}
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
                        Name
                        {sortBy === 'name' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                      </div>
                      <div
                        className="gba:w-36 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                        onClick={() => {
                          setSortBy('modified')
                          setSortOrder(sortBy === 'modified' && sortOrder === 'desc' ? 'asc' : 'desc')
                        }}
                      >
                        Modified
                        {sortBy === 'modified' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                      </div>
                      <div className="gba:w-40 gba:flex-shrink-0">Modified By</div>
                      <div
                        className="gba:w-32 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                        onClick={() => {
                          setSortBy('created')
                          setSortOrder(sortBy === 'created' && sortOrder === 'desc' ? 'asc' : 'desc')
                        }}
                      >
                        Created
                        {sortBy === 'created' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                      </div>
                      <div className="gba:w-20 gba:flex-shrink-0 gba:text-right">Rows</div>
                      <div className="gba:w-10 gba:flex-shrink-0" />
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="gba:divide-y gba:divide-border">
                    {filteredApps.map(app => {
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
                                {app.isShared && !isOwner && (
                                  <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                    Shared
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
                                              {user.userAvatar && <AvatarImage src={user.userAvatar} />}
                                              <AvatarFallback className="gba:text-[8px] gba:bg-muted">
                                                {user.userName ? getInitials(user.userName) : '?'}
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
                                        <p>
                                          Shared with {sharedWith.length}{' '}
                                          {sharedWith.length === 1 ? 'person' : 'people'}
                                        </p>
                                        <p className="gba:text-xs gba:text-muted-foreground">Click to manage</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              {app.description && (
                                <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{app.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Modified */}
                          <div className="gba:w-36 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                            {formatDate(app.updatedAt)}
                          </div>

                          {/* Modified By */}
                          <div className="gba:w-40 gba:flex-shrink-0">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Avatar className="gba:w-6 gba:h-6">
                                {ownerInfo?.avatar && <AvatarImage src={ownerInfo.avatar} />}
                                <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                                  {ownerInfo?.name ? getInitials(ownerInfo.name) : <User className="gba:w-3 gba:h-3" />}
                                </AvatarFallback>
                              </Avatar>
                              <span className="gba:text-sm gba:text-muted-foreground gba:truncate">
                                {ownerInfo?.name || 'Unknown'}
                              </span>
                            </div>
                          </div>

                          {/* Created */}
                          <div className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                            {formatDate(app.createdAt)}
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
                                  Open
                                </DropdownMenuItem>
                                {isOwner && (
                                  <DropdownMenuItem onClick={() => handleShareApp(app.id)}>
                                    <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                    Share
                                  </DropdownMenuItem>
                                )}
                                {isOwner && sharedWith.length > 0 && (
                                  <DropdownMenuItem onClick={() => handleManageShares(app.id)}>
                                    <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                                    Manage sharing
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => copyLink(app)}>
                                  <Link2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Copy link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportApp(app.id)}>
                                  <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEditApp(app.id)}>
                                  <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateApp(app.id)}>
                                  <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleFavorite(app.id)}>
                                  <Star
                                    className={`gba:w-4 gba:h-4 gba:mr-2 ${isFavorite ? 'gba:fill-current gba:text-amber-500' : ''}`}
                                  />
                                  {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gba:text-destructive"
                                  onClick={() => handleDeleteApp(app.id)}
                                >
                                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Delete
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
              {!isLoadingApps && filteredApps.length > 0 && viewLayout === 'grid' && (
                <div className="gba:p-6 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-5 gba:gap-4">
                  {filteredApps.map(app => {
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
                        <div className="gba:relative gba:aspect-[4/3] gba:bg-gradient-to-br gba:from-emerald-500/10 gba:to-teal-500/10 gba:flex gba:items-center gba:justify-center gba:rounded-t-lg">
                          {(() => {
                            const IconComponent = app.icon ? getIconByName(app.icon) : null
                            return IconComponent ? (
                              <IconComponent className="gba:w-16 gba:h-16 gba:text-emerald-500/50" />
                            ) : (
                              <FileSpreadsheet className="gba:w-16 gba:h-16 gba:text-emerald-500/50" />
                            )
                          })()}

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

                          {/* Shared badge */}
                          {app.isShared && !isOwner && (
                            <Badge variant="secondary" className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]">
                              <Users className="gba:w-3 gba:h-3 gba:mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>

                        {/* Info */}
                        <div className="gba:p-3">
                          <h3 className="gba:font-medium gba:text-foreground gba:truncate gba:mb-1">{app.name}</h3>
                          <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                            <span>{formatRelativeTime(app.updatedAt)}</span>
                            <span>{app.rowCount} rows</span>
                          </div>
                        </div>

                        {/* Quick actions on hover */}
                        <div
                          className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:p-2 gba:bg-gradient-to-t gba:from-background gba:via-background/95 gba:to-transparent gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:flex gba:justify-center gba:gap-1"
                          onClick={e => e.stopPropagation()}
                        >
                          <Button size="sm" variant="secondary" onClick={() => handleOpenApp(app.id)}>
                            Open
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
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gba:text-destructive"
                                onClick={() => handleDeleteApp(app.id)}
                              >
                                <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                Delete
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

      {/* Manage Shares Dialog */}
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
            <DialogTitle>Create New Spreadsheet</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4 gba:py-4">
            <div className="gba:space-y-2">
              <Label htmlFor="app-name">Name</Label>
              <Input
                id="app-name"
                placeholder="My Spreadsheet"
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
              Cancel
            </Button>
            <Button onClick={handleCreateEmptyApp} disabled={!newAppName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Default export for module registration
export default SpreadsheetAppsHub
