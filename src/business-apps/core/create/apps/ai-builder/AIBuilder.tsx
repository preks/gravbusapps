import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_ID } from '@/common/data/employee/queries/employeeQueries'
import { SessionUser } from './types/session'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { useSessionManagement } from './hooks/useSessionManagement'
import { AdminSettings } from './components/AdminSettings'
import { SessionOverviewPage } from './pages/session-overview-page/SessionOverviewPage'
import { SessionDetailPage } from './pages/session-detail-page/SessionDetailPage'

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
  const [showAdminSettings, setShowAdminSettings] = useState(false)
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [userPictureThumbnail, setUserPictureThumbnail] = useState<string | null>(null)

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

  if (showAdminSettings) {
    return <AdminSettings onClose={() => setShowAdminSettings(false)} />
  }

  if (showSessionList || !repositoryId) {
    return (
      <SessionOverviewPage
        repositoryId={repositoryId}
        configMessage={configMessage}
        sessions={sessions}
        onSelectSession={repositoryId ? selectSession : () => {}}
        onCreateSession={repositoryId ? createNewSession : () => setShowAdminSettings(true)}
        onDeleteSession={deleteSession}
        onOpenSettings={() => setShowAdminSettings(true)}
        disabled={!repositoryId}
      />
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
