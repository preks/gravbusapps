import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_ID } from '@/common/data/employee/queries/employeeQueries'
import { SessionMetadata, SessionUser } from './types/session'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { useSessionManagement } from './hooks/useSessionManagement'
import { SessionOverviewPage } from './pages/session-overview-page/SessionOverviewPage'
import { SessionDetailPage } from './pages/session-detail-page/SessionDetailPage'
import { ImportFolderNewAppDialog } from '@/common/components/ai-builder/import-new-app/ImportFolderNewAppDialog'

interface EmployeeRecord {
  id: string
  firstName?: string
  lastName?: string
  displayName?: string
  pictureThumbnail?: string
}

export const AIBuilder: React.FC<BusinessAppContextProps> = context => {
  const [repositoryId, setRepositoryId] = useState<string>('')
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configMessage, setConfigMessage] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [userPictureThumbnail, setUserPictureThumbnail] = useState<string | null>(null)
  const [isImportingFolderAsNewApp, setIsImportingFolderAsNewApp] = useState(false)
  const [importNewAppDialogOpen, setImportNewAppDialogOpen] = useState(false)
  const [pendingImportFiles, setPendingImportFiles] = useState<File[] | null>(null)
  const [importTargetPath, setImportTargetPath] = useState('')
  const [importResourceUrl, setImportResourceUrl] = useState('')
  const [importDialogError, setImportDialogError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const builderClient = useBuilderClient(context.accessToken)

  const {
    sessions,
    sessionId,
    showSessionList,
    createNewSession,
    selectSession,
    deleteSession,
    backToSessionList,
    updateSessionsState,
    saveSessionToAPI
  } = useSessionManagement({
    accessToken: context.accessToken,
    repositoryId,
    currentUser
  })

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true)
        setConfigError(null)
        setConfigMessage(null)
        const config = await builderClient.fetchAppConfig()
        if (config.repositoryId) {
          setRepositoryId(config.repositoryId)
        }
        if (config.message) {
          setConfigMessage(config.message)
        }
      } catch (error) {
        console.error('Failed to load app config:', error)
        setConfigError('Failed to load configuration. Please refresh the page.')
      } finally {
        setConfigLoading(false)
      }
    }
    loadConfig()
  }, [])

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const employeeId = context.userInfo?.employeeDetails?.employeeId
      if (!employeeId || !context.accessToken || currentUser) return
      try {
        const query = GET_EMPLOYEE_LIGHT_BY_ID(employeeId)
        const result = await graphqlClient.request<{ Employee: EmployeeRecord[] }>(query)
        const employee = result.Employee?.[0]
        if (employee) {
          const user: SessionUser = {
            id: employee.id,
            employeeId: employeeId,
            firstName: employee.firstName || context.userInfo?.givenName || '',
            lastName: employee.lastName || context.userInfo?.familyName || '',
            displayName: employee.displayName || `${context.userInfo?.givenName} ${context.userInfo?.familyName}`,
            email: context.userInfo?.userName,
            pictureThumbnail: employee.pictureThumbnail,
            consentToStorePii: true
          }
          setCurrentUser(user)
          setUserPictureThumbnail(employee.pictureThumbnail || null)
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error)
      }
    }
    fetchCurrentUser()
  }, [context.accessToken, context.userInfo, currentUser, graphqlClient])

  const buildDefaultResourceUrl = (targetPath: string): string => {
    const normalized = targetPath.replace(/^\/+|\/+$/g, '')
    const slug = normalized.split('/').filter(Boolean).pop() || normalized
    return `/platform/generated/${slug}`
  }

  const resetImportNewAppDialog = (): void => {
    setImportNewAppDialogOpen(false)
    setPendingImportFiles(null)
    setImportDialogError(null)
    setImportTargetPath('')
    setImportResourceUrl('')
  }

  const handleImportFolderAsNewApp = async (files: File[]): Promise<void> => {
    if (!Array.isArray(files) || files.length === 0) return
    if (!repositoryId) {
      alert('Repository is not configured. Please open settings first.')
      return
    }
    const firstPath = files[0].webkitRelativePath || files[0].name || 'imported-app'
    const defaultTargetPath =
      firstPath
        .split('/')
        .filter(Boolean)[0]
        ?.trim()
        .replace(/\s+/g, '-') || 'imported-app'

    setPendingImportFiles(files)
    setImportDialogError(null)
    setImportTargetPath(defaultTargetPath)
    setImportResourceUrl(buildDefaultResourceUrl(defaultTargetPath))
    setImportNewAppDialogOpen(true)
  }

  const handleConfirmImportFolderAsNewApp = async (): Promise<void> => {
    if (!pendingImportFiles || pendingImportFiles.length === 0) return
    if (!repositoryId) {
      setImportDialogError('Repository is not configured. Please open settings first.')
      return
    }

    const normalizedTargetPath = importTargetPath.trim().replace(/^\/+|\/+$/g, '')
    if (!normalizedTargetPath) {
      setImportDialogError('Target path is required.')
      return
    }

    const rawResourceUrl = importResourceUrl.trim()
    const normalizedResourceUrl = rawResourceUrl
      ? rawResourceUrl.startsWith('/')
        ? rawResourceUrl
        : `/${rawResourceUrl}`
      : buildDefaultResourceUrl(normalizedTargetPath)

    setIsImportingFolderAsNewApp(true)
    setImportDialogError(null)
    try {
      const createdBy: SessionUser =
        currentUser ?? {
          id: String(context.userInfo?.id ?? 'unknown-user'),
          employeeId: String(context.userInfo?.employeeDetails?.employeeId ?? ''),
          firstName: String(context.userInfo?.givenName ?? ''),
          lastName: String(context.userInfo?.familyName ?? ''),
          displayName:
            [context.userInfo?.givenName, context.userInfo?.familyName].filter(Boolean).join(' ') || 'Unknown User',
          email: typeof context.userInfo?.userName === 'string' ? context.userInfo.userName : undefined,
          pictureThumbnail: userPictureThumbnail ?? undefined,
          consentToStorePii: true
        }
      const createdByPayload = {
        ...createdBy,
        consentToStorePii: createdBy.consentToStorePii ?? true
      }

      const createdSessionResponse = await builderClient.saveSession({
        repoId: repositoryId,
        targetPath: normalizedTargetPath,
        resourceUrl: normalizedResourceUrl,
        fileCount: 0,
        description: `Imported from local folder (${normalizedTargetPath})`,
        createdBy: createdByPayload
      })

      await builderClient.importFolderSnapshot({
        files: pendingImportFiles,
        sessionId: createdSessionResponse.sessionId,
        repoId: repositoryId,
        targetPath: normalizedTargetPath,
        resourceUrl: normalizedResourceUrl,
        applyToCache: true,
        versionNote: 'Imported folder snapshot (create new app)',
        createdBy: createdByPayload as unknown as Record<string, unknown>,
        importMode: 'new'
      })

      const nowIso = new Date().toISOString()
      const createdSession: SessionMetadata = {
        sessionId: createdSessionResponse.sessionId,
        repoId: repositoryId,
        targetPath: normalizedTargetPath,
        resourceUrl: normalizedResourceUrl,
        createdAt: nowIso,
        lastModified: nowIso,
        fileCount: pendingImportFiles.length,
        createdBy,
        description: `Imported from local folder (${normalizedTargetPath})`
      }
      updateSessionsState([createdSession, ...sessions.filter(s => s.sessionId !== createdSession.sessionId)])
      resetImportNewAppDialog()
      await selectSession(createdSession.sessionId)
    } catch (error) {
      setImportDialogError(error instanceof Error ? error.message : 'Failed to import folder as a new app.')
    } finally {
      setIsImportingFolderAsNewApp(false)
    }
  }

  if (configLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:bg-background">
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <Loader2 className="gba:h-8 gba:w-8 gba:animate-spin gba:text-primary" />
          <p className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.loading_configuration', 'Loading configuration...')}
          </p>
        </div>
      </div>
    )
  }

  if (configError) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:bg-background">
        <Alert variant="destructive" className="gba:max-w-md">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <AlertDescription>{configError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (showSessionList || !repositoryId) {
    return (
      <>
        <SessionOverviewPage
          repositoryId={repositoryId}
          configMessage={configMessage}
          sessions={sessions}
          onSelectSession={repositoryId ? selectSession : () => {}}
          onCreateSession={createNewSession}
          onDeleteSession={deleteSession}
          onImportFolderAsNewApp={handleImportFolderAsNewApp}
          isImportingFolderAsNewApp={isImportingFolderAsNewApp}
        />
        <ImportFolderNewAppDialog
          open={importNewAppDialogOpen}
          onOpenChange={open => {
            if (!open && !isImportingFolderAsNewApp) {
              resetImportNewAppDialog()
              return
            }
            setImportNewAppDialogOpen(open)
          }}
          title="Import Folder as New App"
          description="Create a new Screen Builder session from a local folder."
          targetPath={importTargetPath}
          onTargetPathChange={setImportTargetPath}
          resourceUrl={importResourceUrl}
          onResourceUrlChange={setImportResourceUrl}
          confirmLabel="Create Session"
          isSubmitting={isImportingFolderAsNewApp}
          errorMessage={importDialogError}
          onConfirm={handleConfirmImportFolderAsNewApp}
        />
      </>
    )
  }

  return (
    <SessionDetailPage
      context={context}
      sessionId={sessionId}
      repositoryId={repositoryId}
      sessions={sessions}
      backToSessionList={backToSessionList}
      updateSessionsState={updateSessionsState}
      saveSessionToAPI={saveSessionToAPI}
      userPictureThumbnail={userPictureThumbnail}
    />
  )
}
