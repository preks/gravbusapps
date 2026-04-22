import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { EveryFabricErrorBoundary } from './components/EveryFabricErrorBoundary'
import { LandingScreen } from './components/landing/LandingScreen'
import { SettingsScreen } from './components/settings/SettingsScreen'
import { Sidebar } from './components/sidebar/Sidebar'
import { useSidebarCollapsedState } from './components/sidebar/useSidebarCollapsedState'
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout'
import { FabricProvider, useFabric } from './context/FabricContext'
import { useActiveSessions } from './hooks/useActiveSessions'
import { useSessionUrlState } from './hooks/useSessionUrlState'

/**
 * Every Fabric — Autonomous Agent Workspace
 *
 * Shell layout:
 *   ┌─────────────┬────────────────────────────────────┐
 *   │             │                                    │
 *   │   Sidebar   │   LandingScreen / WorkspaceLayout  │
 *   │  (island,   │   / SettingsScreen (cross-faded)   │
 *   │ collapsible)│                                    │
 *   │             │                                    │
 *   └─────────────┴────────────────────────────────────┘
 */
const EveryFabricInner: React.FC = () => {
  const {
    session,
    sessions,
    activeSessionId,
    accessToken,
    userInfo,
    selectSession,
    deleteSession,
    newSession,
    startSession,
    sessionLoadError,
    retrySessionLoad
  } = useFabric()
  const { urlView, updateUrl } = useSessionUrlState()
  const { isCollapsed, toggleCollapsed, setCollapsed } = useSidebarCollapsedState()
  const { activeSessions } = useActiveSessions(accessToken)
  const [displayView, setDisplayView] = useState<string | null>(urlView)

  useEffect(() => {
    if (urlView !== displayView) {
      const timer = setTimeout(() => {
        setDisplayView(urlView)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [urlView, displayView])

  const handleOpenSettings = () => updateUrl({ view: 'settings' })
  const handleCloseSettings = () => updateUrl({ view: null })

  const handleSelectSession = (id: string) => selectSession(id)

  const isLoadingSession = Boolean(activeSessionId) && !session
  const sessionNotFound =
    Boolean(activeSessionId) && sessions.length > 0 && !sessions.some(s => s.session_id === activeSessionId)

  const isSettingsView = displayView === 'settings'
  const showSettings = urlView === 'settings'

  const renderMain = () => {
    if (isLoadingSession && sessionLoadError) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4">
          <p className="gba:text-sm gba:text-foreground">Couldn&apos;t load this session</p>
          <div className="gba:flex gba:items-center gba:gap-3">
            <Button variant="secondary" onClick={() => void retrySessionLoad()}>
              Try again
            </Button>
            <Button onClick={() => selectSession(null)}>Back to landing</Button>
          </div>
        </div>
      )
    }

    if (isLoadingSession && !sessionNotFound) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-3">
          <SpinnerGapIcon className="gba:h-5 gba:w-5 gba:animate-spin gba:text-muted-foreground" />
          <p className="gba:text-sm gba:text-muted-foreground">Opening session...</p>
        </div>
      )
    }

    if (sessionNotFound) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4">
          <p className="gba:text-sm gba:text-foreground">Session not found</p>
          <Button onClick={() => selectSession(null)}>Back to landing</Button>
        </div>
      )
    }

    return (
      <>
        <div
          className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-300 gba:ease-in-out ${
            showSettings ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
        >
          {isSettingsView && <SettingsScreen accessToken={accessToken} onBack={handleCloseSettings} />}
        </div>

        <div
          className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-300 gba:ease-in-out ${
            !showSettings ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
        >
          {session ? <WorkspaceLayout /> : <LandingScreen accessToken={accessToken} onStartSession={startSession} />}
        </div>
      </>
    )
  }

  return (
    <div className="gba:flex gba:h-full gba:min-h-full gba:w-full gba:min-w-0">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapsed={toggleCollapsed}
        onExpand={() => setCollapsed(false)}
        activeSessionId={activeSessionId}
        activeSessions={activeSessions}
        historySessions={sessions}
        userInfo={userInfo}
        showNewSessionCta={Boolean(session)}
        onNewSession={newSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={deleteSession}
        onOpenSettings={handleOpenSettings}
      />
      <main className="gba:relative gba:flex-1 gba:min-w-0 gba:h-full">{renderMain()}</main>
    </div>
  )
}

export interface EveryFabricAppProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const EveryFabricApp: React.FC<EveryFabricAppProps> = props => {
  return (
    <EveryFabricErrorBoundary>
      <FabricProvider {...props}>
        <div
          className="gba:h-full gba:min-h-full gba:relative gba:bg-background gba:overflow-hidden"
          data-testid={props.prefixDataTestId ?? 'every-fabric'}
        >
          <EveryFabricInner />
        </div>
      </FabricProvider>
    </EveryFabricErrorBoundary>
  )
}

export default EveryFabricApp
