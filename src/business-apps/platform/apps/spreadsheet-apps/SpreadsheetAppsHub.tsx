/**
 * SpreadsheetAppsHub Component
 *
 * The main entry point for the Excel-to-App feature.
 * Displays existing apps and provides the upload interface for creating new ones.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label
} from '@newwork/nw-design-system'
import {
  FileSpreadsheet,
  Plus,
  Search,
  Sparkles,
  Grid,
  List,
  Filter,
  SortAsc,
  Upload,
  Database,
  AlertCircle,
  FileText
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Components
import { ExcelUploader } from './components/ExcelUploader'
import { SheetAnalysisPreview } from './components/SheetAnalysisPreview'
import { AppPreviewCard, NoAppsState } from './components/AppPreviewCard'
import { PromoteToDatabaseModal } from './components/PromoteToDatabaseModal'
import { SpreadsheetAppViewer } from './SpreadsheetAppViewer'
import { SpreadsheetAppEditor } from './SpreadsheetAppEditor'
import { ShareAppDialog } from './components/ShareAppDialog'

// Hooks
import { useSpreadsheetApps } from './hooks/useSpreadsheetApps'
import { useSpreadsheetAI } from './hooks/useSpreadsheetAI'
import { useDataPromotion } from './hooks/useDataPromotion'

// Services
import { generateAppSchema, generateEmptyAppSchema } from './services/SchemaGenerator'

// Types
import type { ParsedExcelFile, SpreadsheetAnalysis, SpreadsheetApp, SpreadsheetAppSummary } from './types'

export interface SpreadsheetAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type HubView = 'list' | 'upload' | 'analysis' | 'viewer' | 'editor'

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
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateEmptyDialogOpen, setIsCreateEmptyDialogOpen] = useState(false)
  const [newAppName, setNewAppName] = useState('')

  // Data state
  const [parsedFile, setParsedFile] = useState<ParsedExcelFile | null>(null)
  const [analysis, setAnalysis] = useState<SpreadsheetAnalysis | null>(null)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [appToPromote, setAppToPromote] = useState<SpreadsheetApp | null>(null)

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // URL helpers for deep linking
  const getUrlParams = useCallback((): { appId: string | null; filePath: string | null; view: HubView | null } => {
    const urlParams = new URLSearchParams(window.location.search)
    return {
      appId: urlParams.get('appId'),
      filePath: urlParams.get('filePath'),
      view: urlParams.get('view') as HubView | null
    }
  }, [])

  const updateUrl = useCallback((appId: string | null, view?: HubView, filePath?: string | null) => {
    const urlParams = new URLSearchParams(window.location.search)
    if (appId) {
      urlParams.set('appId', appId)
      if (view) urlParams.set('view', view)
      if (filePath) urlParams.set('filePath', encodeURIComponent(filePath))
    } else {
      urlParams.delete('appId')
      urlParams.delete('view')
      urlParams.delete('filePath')
    }
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.pushState({ appId, view, filePath }, '', newUrl)
  }, [])

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedAppForShare, setSelectedAppForShare] = useState<SpreadsheetAppSummary | null>(null)
  const [sharedUsers, setSharedUsers] = useState<
    Array<{
      userId: string
      userName: string
      userEmail: string
      permission: 'view' | 'edit'
      sharedAt: string
    }>
  >([])

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
    updateSheetData
  } = useSpreadsheetApps(accessToken, currentUserId)

  // Ref to always have the latest currentApp value for callbacks
  // This prevents stale closure issues in onDataChange
  const currentAppRef = useRef(currentApp)
  useEffect(() => {
    currentAppRef.current = currentApp
  }, [currentApp])

  // Track which app ID we've attempted to load to prevent infinite loops
  const loadAttemptedRef = useRef<string | null>(null)

  const { isAnalyzing, analyzeSpreadsheet, reset: resetAI } = useSpreadsheetAI(accessToken)

  const { promoteToDatabase } = useDataPromotion(accessToken)

  // Load app from URL on mount
  useEffect(() => {
    const { appId, filePath, view } = getUrlParams()
    // Only load if we have an appId, no current app, not loading, and haven't already attempted this app
    if (appId && !currentApp && !isLoadingApps && loadAttemptedRef.current !== appId) {
      loadAttemptedRef.current = appId // Mark as attempted before loading
      // Load the app from URL - try with filePath for cross-device access
      loadApp(appId, filePath ? decodeURIComponent(filePath) : undefined).then(app => {
        if (app) {
          setSelectedAppId(appId)
          setCurrentView(view === 'editor' ? 'editor' : 'viewer')
        }
      })
    }
  }, [getUrlParams, loadApp, currentApp, isLoadingApps])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { appId?: string; view?: HubView } | null
      if (state?.appId) {
        loadApp(state.appId).then(app => {
          if (app) {
            setSelectedAppId(state.appId!)
            setCurrentView(state.view || 'viewer')
          }
        })
      } else {
        // No app in state, go back to list
        setSelectedAppId(null)
        setCurrentView('list')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [loadApp])

  // Filter apps based on search
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return apps

    const query = searchQuery.toLowerCase()
    return apps.filter(app => app.name.toLowerCase().includes(query) || app.description?.toLowerCase().includes(query))
  }, [apps, searchQuery])

  /**
   * Handle file parsed from ExcelUploader
   */
  const handleFileParsed = useCallback(
    async (file: ParsedExcelFile) => {
      setParsedFile(file)

      // Start AI analysis
      const analysisResult = await analyzeSpreadsheet(file)
      if (analysisResult) {
        setAnalysis(analysisResult)
        setCurrentView('analysis')
      }
    },
    [analyzeSpreadsheet]
  )

  /**
   * Handle analysis confirmation - create the app
   */
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
        updateUrl(createdApp.id, 'viewer', createdApp.filePath) // Include filePath for cross-device access

        // Clean up
        setParsedFile(null)
        setAnalysis(null)
        resetAI()
      }
    },
    [parsedFile, userInfo, createApp, resetAI, updateUrl]
  )

  /**
   * Handle re-analyze
   */
  const handleReanalyze = useCallback(async () => {
    if (!parsedFile) return

    resetAI()
    const analysisResult = await analyzeSpreadsheet(parsedFile)
    if (analysisResult) {
      setAnalysis(analysisResult)
    }
  }, [parsedFile, analyzeSpreadsheet, resetAI])

  /**
   * Open an app
   */
  const handleOpenApp = useCallback(
    async (id: string) => {
      // Get filePath from apps list for shareable URL
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

  /**
   * Edit an app
   */
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

  /**
   * Handle app save from editor
   */
  const handleSaveApp = useCallback(
    async (updatedApp: SpreadsheetApp) => {
      await updateApp(updatedApp.id, updatedApp)
      setCurrentView('viewer')
      updateUrl(updatedApp.id, 'viewer', updatedApp.filePath) // Include filePath
    },
    [updateApp, updateUrl]
  )

  /**
   * Handle delete app
   */
  const handleDeleteApp = useCallback(
    async (id: string) => {
      if (confirm('Are you sure you want to delete this app?')) {
        const success = await deleteApp(id)
        if (success && selectedAppId === id) {
          setSelectedAppId(null)
          setCurrentView('list')
          updateUrl(null) // Clear URL after delete
        }
      }
    },
    [deleteApp, selectedAppId, updateUrl]
  )

  /**
   * Handle duplicate app
   */
  const handleDuplicateApp = useCallback(
    async (id: string) => {
      await duplicateApp(id)
    },
    [duplicateApp]
  )

  /**
   * Handle export app
   */
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

  /**
   * Handle share app
   */
  const handleShareApp = useCallback(
    async (id: string) => {
      const app = apps.find(a => a.id === id)
      if (app) {
        setSelectedAppForShare(app)
        // Load shared users
        const users = await getSharedUsers(id)
        setSharedUsers(users)
        setShareDialogOpen(true)
      }
    },
    [apps, getSharedUsers]
  )

  /**
   * Handle share dialog share action
   */
  const handleShare = useCallback(
    async (userIds: string[], permission: 'view' | 'edit' | 'admin') => {
      // Convert 'admin' to 'edit' for now (admin permission not fully implemented)
      const actualPermission = permission === 'admin' ? 'edit' : permission
      if (!selectedAppForShare) return false

      // Get current user display name
      const currentUserName =
        userInfo?.employeeDetails?.firstName && userInfo?.employeeDetails?.lastName
          ? `${userInfo.employeeDetails.firstName} ${userInfo.employeeDetails.lastName}`
          : userInfo?.givenName && userInfo?.familyName
            ? `${userInfo.givenName} ${userInfo.familyName}`
            : userInfo?.nickName || userInfo?.userName || 'Someone'

      const success = await shareApp(selectedAppForShare.id, userIds, actualPermission, currentUserName)
      if (success) {
        // Refresh shared users list
        const users = await getSharedUsers(selectedAppForShare.id)
        setSharedUsers(users)
        // Refresh apps list to update shared count
        await refreshApps()
      }
      return success
    },
    [selectedAppForShare, shareApp, getSharedUsers, refreshApps, userInfo]
  )

  /**
   * Handle unshare
   */
  const handleUnshare = useCallback(
    async (userId: string) => {
      if (!selectedAppForShare) return false
      const success = await revokeAccess(selectedAppForShare.id, userId)
      if (success) {
        // Refresh shared users list
        const users = await getSharedUsers(selectedAppForShare.id)
        setSharedUsers(users)
        // Refresh apps list
        await refreshApps()
      }
      return success
    },
    [selectedAppForShare, revokeAccess, getSharedUsers, refreshApps]
  )

  /**
   * Handle refresh shares
   */
  const handleRefreshShares = useCallback(async () => {
    if (!selectedAppForShare) return
    const users = await getSharedUsers(selectedAppForShare.id)
    setSharedUsers(users)
    await refreshApps()
  }, [selectedAppForShare, getSharedUsers, refreshApps])

  /**
   * Handle promote app
   */
  const handlePromoteApp = useCallback(
    async (id: string) => {
      const app = await loadApp(id)
      if (app) {
        setAppToPromote(app)
      }
    },
    [loadApp]
  )

  /**
   * Handle promotion execution
   */
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

  /**
   * Go back to list
   */
  const handleBack = useCallback(() => {
    clearCurrentApp()
    loadAttemptedRef.current = null // Reset so we can retry loading if needed
    setSelectedAppId(null)
    setParsedFile(null)
    setAnalysis(null)
    resetAI()
    setCurrentView('list')
    updateUrl(null) // Clear the URL
  }, [clearCurrentApp, resetAI, updateUrl])

  /**
   * Start new upload
   */
  const handleStartUpload = useCallback(() => {
    setParsedFile(null)
    setAnalysis(null)
    resetAI()
    setCurrentView('upload')
  }, [resetAI])

  /**
   * Handle create empty app
   */
  const handleCreateEmptyApp = useCallback(async () => {
    if (!newAppName.trim() || !userInfo) return

    const appName = newAppName.trim() || 'New Spreadsheet App'
    const appSchema = generateEmptyAppSchema(appName, userInfo.id || userInfo?.employeeDetails?.employeeId || 'unknown')

    const createdApp = await createApp(appSchema)

    if (createdApp) {
      // Refresh apps list to ensure permissions are set
      await refreshApps()
      // Load the app to ensure it's available in currentApp with proper permissions
      await loadApp(createdApp.id, createdApp.filePath)
      setSelectedAppId(createdApp.id)
      setCurrentView('viewer')
      updateUrl(createdApp.id, 'viewer', createdApp.filePath)
      setIsCreateEmptyDialogOpen(false)
      setNewAppName('')
    }
  }, [newAppName, userInfo, createApp, updateUrl, refreshApps, loadApp])

  // Render based on current view
  if (currentView === 'viewer' && currentApp) {
    // Check if user can edit (owner or edit permission)
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
        onRowAdd={canEdit ? addRow : undefined}
        onRowUpdate={canEdit ? updateRow : undefined}
        onDataChange={
          canEdit
            ? (sheetId, data) => {
                // Use ref to get latest currentApp to prevent stale closure issues
                const latestApp = currentAppRef.current
                if (!latestApp) return

                // Save row data to the backend using updateSheetData
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
    // Only allow editing if user has owner or edit permission
    if (currentAppPermission !== 'owner' && currentAppPermission !== 'edit') {
      toast.error('You do not have permission to edit this app')
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

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card">
        <div className="gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-gradient-to-br gba:from-primary gba:to-primary/60 gba:flex gba:items-center gba:justify-center">
                <FileSpreadsheet className="gba:w-6 gba:h-6 gba:text-primary-foreground" />
              </div>
              <div>
                <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">Spreadsheet Apps</h1>
                <p className="gba:text-sm gba:text-muted-foreground">
                  Transform your Excel files into powerful business applications
                </p>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              {currentView === 'list' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                      New App
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsCreateEmptyDialogOpen(true)}>
                      <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                      Create Empty Spreadsheet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleStartUpload}>
                      <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                      Upload Excel File
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {currentView !== 'list' && (
                <Button variant="outline" onClick={handleBack}>
                  Back to Apps
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-6">
        {/* Upload View */}
        {currentView === 'upload' && (
          <div className="gba:max-w-2xl gba:mx-auto gba:space-y-6">
            <div className="gba:text-center gba:mb-8">
              <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">Create a New App</h2>
              <p className="gba:text-muted-foreground">
                Upload your Excel file and let AI transform it into a business app
              </p>
            </div>

            <ExcelUploader
              onFileParsed={handleFileParsed}
              onError={error => console.error(error)}
              data-testid={`${testId}-uploader`}
            />

            {isAnalyzing && (
              <Card className="gba:p-8 gba:text-center">
                <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
                <h3 className="gba:font-semibold gba:text-foreground gba:mb-2">AI is analyzing your spreadsheet...</h3>
                <p className="gba:text-sm gba:text-muted-foreground">
                  Detecting column types, relationships, and suggesting the best app structure
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Analysis View */}
        {currentView === 'analysis' && analysis && (
          <div className="gba:max-w-4xl gba:mx-auto">
            <SheetAnalysisPreview
              analysis={analysis}
              onConfirm={handleAnalysisConfirm}
              onReanalyze={handleReanalyze}
              isLoading={isAnalyzing}
              data-testid={`${testId}-analysis`}
            />
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <div className="gba:space-y-6">
            {/* Toolbar */}
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-4">
                <div className="gba:relative">
                  <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  <Input
                    placeholder="Search apps..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="gba:pl-10 gba:w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="gba:w-4 gba:h-4 gba:mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <SortAsc className="gba:w-4 gba:h-4 gba:mr-2" />
                  Sort
                </Button>
              </div>

              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  variant={viewLayout === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewLayout('grid')}
                >
                  <Grid className="gba:w-4 gba:h-4" />
                </Button>
                <Button
                  variant={viewLayout === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewLayout('list')}
                >
                  <List className="gba:w-4 gba:h-4" />
                </Button>
              </div>
            </div>

            {/* Loading state */}
            {isLoadingApps && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
                <Spinner size="lg" />
              </div>
            )}

            {/* Error state */}
            {appsError && (
              <Card className="gba:p-6 gba:text-center">
                <AlertCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mx-auto gba:mb-4" />
                <p className="gba:text-destructive">{appsError}</p>
              </Card>
            )}

            {/* Empty state */}
            {!isLoadingApps && !appsError && filteredApps.length === 0 && (
              <NoAppsState onCreateNew={handleStartUpload} />
            )}

            {/* Apps grid/list */}
            {!isLoadingApps && filteredApps.length > 0 && (
              <div
                className={
                  viewLayout === 'grid'
                    ? 'gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4'
                    : 'gba:space-y-4'
                }
              >
                {filteredApps.map(app => (
                  <AppPreviewCard
                    key={app.id}
                    app={app}
                    onOpen={handleOpenApp}
                    onEdit={handleEditApp}
                    onDelete={handleDeleteApp}
                    onDuplicate={handleDuplicateApp}
                    onExport={handleExportApp}
                    onPromote={handlePromoteApp}
                    onShare={handleShareApp}
                    data-testid={`${testId}-app-card`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature highlights (shown in list view) */}
      {currentView === 'list' && filteredApps.length > 0 && (
        <div className="gba:border-t gba:bg-muted/30 gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-8 gba:text-sm gba:text-muted-foreground">
            {/* Storage status indicator */}
            <div className="gba:flex gba:items-center gba:gap-2">
              <Database
                className={`gba:w-4 gba:h-4 ${storageMode === 'database' ? 'gba:text-success' : 'gba:text-warning'}`}
              />
              <span>{storageMode === 'database' ? 'Stored in database' : 'Stored locally'}</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Sparkles className="gba:w-4 gba:h-4 gba:text-primary" />
              <span>AI-powered analysis</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Upload className="gba:w-4 gba:h-4 gba:text-primary" />
              <span>Instant app generation</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Create Empty App Dialog */}
      <Dialog open={isCreateEmptyDialogOpen} onOpenChange={setIsCreateEmptyDialogOpen}>
        <DialogContent className="gba:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Empty Spreadsheet</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4 gba:py-4">
            <div className="gba:space-y-2">
              <Label htmlFor="app-name">App Name</Label>
              <Input
                id="app-name"
                placeholder="My Spreadsheet App"
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
