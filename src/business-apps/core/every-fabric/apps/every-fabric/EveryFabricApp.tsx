import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { AgentMeshScreen } from './components/agent-mesh/AgentMeshScreen'
import { EnterpriseWorkforceScreen } from './components/enterprise-workforce/EnterpriseWorkforceScreen'
import { TraceExplorerScreen } from './components/trace-explorer/TraceExplorerScreen'
import { EveryFabricErrorBoundary } from './components/EveryFabricErrorBoundary'
import { LandingScreen } from './components/landing/LandingScreen'
import { ScheduledDispatchesScreen } from './components/scheduled/ScheduledDispatchesScreen'
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
  const { activeSessions, removeActive } = useActiveSessions(accessToken)

  // Stop a session: drop it from the active sidebar immediately (optimistic)
  // and then call deleteSession, which issues DELETE /sessions/{id} and
  // cleans up history / selection state. If the backend later emits a
  // terminal / session_removed SSE event, it's a no-op because the id is
  // already gone from the map.
  const handleStopSession = useCallback(
    (id: string) => {
      removeActive(id)
      deleteSession(id)
    },
    [removeActive, deleteSession]
  )
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
  const handleOpenScheduled = () => updateUrl({ view: 'scheduled' })
  const handleCloseScheduled = () => updateUrl({ view: null })
  // Company Mesh: company-wide aggregate view. Sets meshScope=company so
  // the AgentMeshScopeProvider opens at the right scope regardless of any
  // previously persisted session-scope URL state.
  const handleOpenCompanyMesh = () => updateUrl({ view: 'agent-mesh', meshScope: 'company' })
  // Session Mesh: live/replay view bound to the currently selected session.
  // Strip meshScope so useAgentMeshScope.buildInitialSnapshot falls through
  // to its default (session when activeSessionId is set).
  const handleOpenSessionMesh = () => updateUrl({ view: 'agent-mesh', meshScope: null })
  const handleCloseAgentMesh = () => updateUrl({ view: null })
  const handleOpenTraceExplorer = (positionMs?: number) =>
    updateUrl({ view: 'trace-explorer', t: positionMs != null ? String(positionMs) : null })
  const handleCloseTraceExplorer = () => updateUrl({ view: null, t: null, focus: null })
  const handleOpenAgentMeshFromTrace = (positionMs?: number) =>
    updateUrl({ view: 'agent-mesh', t: positionMs != null ? String(positionMs) : null })
  const handleOpenEnterpriseWorkforce = () => updateUrl({ view: 'enterprise-workforce' })
  const handleCloseEnterpriseWorkforce = () => updateUrl({ view: null })
  const handleSelectSession = (id: string) => {
    updateUrl({ view: null })
    selectSession(id)
  }

  const handleNewSession = () => {
    updateUrl({ view: null })
    newSession()
  }

  const isLoadingSession = Boolean(activeSessionId) && !session
  const sessionNotFound =
    Boolean(activeSessionId) && sessions.length > 0 && !sessions.some(s => s.session_id === activeSessionId)

  const isSettingsView = displayView === 'settings'
  const showSettings = urlView === 'settings'
  const isScheduledView = displayView === 'scheduled'
  const showScheduled = urlView === 'scheduled'
  const isAgentMeshView = displayView === 'agent-mesh'
  const showAgentMesh = urlView === 'agent-mesh'
  const isTraceExplorerView = displayView === 'trace-explorer'
  const showTraceExplorer = urlView === 'trace-explorer'
  const isEnterpriseWorkforceView = displayView === 'enterprise-workforce'
  const showEnterpriseWorkforce = urlView === 'enterprise-workforce'
  // For sidebar highlighting, split the single agent-mesh URL into
  // "company mesh" vs "session mesh" by inspecting the meshScope param.
  const meshScopeParam =
    typeof globalThis.location !== 'undefined' ? new URLSearchParams(globalThis.location.search).get('meshScope') : null
  const isCompanyMeshActive = showAgentMesh && meshScopeParam === 'company'
  const isSessionMeshActive = showAgentMesh && meshScopeParam !== 'company'
  const isAnyOverlayShown =
    showSettings || showScheduled || showAgentMesh || showTraceExplorer || showEnterpriseWorkforce
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
          style={{ pointerEvents: showSettings ? 'auto' : 'none', zIndex: showSettings ? 30 : 0 }}
        >
          {isSettingsView && (
            <SettingsScreen
              accessToken={accessToken}
              onBack={handleCloseSettings}
              onRunTask={agent => {
                handleCloseSettings()
                void startSession(`Run task with ${agent.name}: `, {
                  mode: 'deep',
                  enable_memory: true,
                  enable_reflection: undefined,
                  selectedAgent: {
                    id: agent.id,
                    name: agent.name,
                    display_name: agent.name,
                    description: agent.description,
                    domain: agent.specialty ?? agent.domain ?? '',
                    tags: agent.tags ?? []
                  }
                })
              }}
            />
          )}
        </div>

        <div
          className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-300 gba:ease-in-out ${
            showScheduled ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
          style={{ pointerEvents: showScheduled ? 'auto' : 'none', zIndex: showScheduled ? 30 : 0 }}
        >
          {isScheduledView && (
            <ScheduledDispatchesScreen
              accessToken={accessToken}
              onBack={handleCloseScheduled}
              onOpenSession={handleSelectSession}
            />
          )}
        </div>

        <div
          className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-300 gba:ease-in-out ${
            showAgentMesh ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
          style={{ pointerEvents: showAgentMesh ? 'auto' : 'none', zIndex: showAgentMesh ? 30 : 0 }}
        >
          {isAgentMeshView && (
            <AgentMeshScreen
              activeSessions={activeSessions}
              onBack={handleCloseAgentMesh}
              onOpenTraceExplorer={handleOpenTraceExplorer}
            />
          )}
        </div>

        <div
          className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-300 gba:ease-in-out ${
            showTraceExplorer ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
          style={{ pointerEvents: showTraceExplorer ? 'auto' : 'none', zIndex: showTraceExplorer ? 30 : 0 }}
        >
          {isTraceExplorerView && (
            <TraceExplorerScreen onBack={handleCloseTraceExplorer} onOpenAgentMesh={handleOpenAgentMeshFromTrace} />
          )}
        </div>

        <div
          className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-300 gba:ease-in-out ${
            showEnterpriseWorkforce ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
          style={{
            pointerEvents: showEnterpriseWorkforce ? 'auto' : 'none',
            zIndex: showEnterpriseWorkforce ? 30 : 0
          }}
        >
          {isEnterpriseWorkforceView && (
            <EnterpriseWorkforceScreen
              accessToken={accessToken}
              activeSessions={activeSessions}
              onBack={handleCloseEnterpriseWorkforce}
            />
          )}
        </div>

        <div
          className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-300 gba:ease-in-out ${
            !isAnyOverlayShown ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
          style={{
            pointerEvents: !isAnyOverlayShown ? 'auto' : 'none',
            zIndex: !isAnyOverlayShown ? 20 : 0
          }}
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
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleStopSession}
        onStopSession={handleStopSession}
        onOpenSettings={handleOpenSettings}
        onOpenScheduled={handleOpenScheduled}
        onOpenEnterpriseWorkforce={handleOpenEnterpriseWorkforce}
        isEnterpriseWorkforceActive={showEnterpriseWorkforce}
        onOpenCompanyMesh={handleOpenCompanyMesh}
        isCompanyMeshActive={isCompanyMeshActive}
        onOpenSessionMesh={handleOpenSessionMesh}
        isSessionMeshActive={isSessionMeshActive}
        onOpenTraceExplorer={handleOpenTraceExplorer}
        isTraceExplorerActive={showTraceExplorer}
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
