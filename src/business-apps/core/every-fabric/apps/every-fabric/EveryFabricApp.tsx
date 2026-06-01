import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback, useEffect, useState } from 'react'
import { EveryFabricErrorBoundary } from './components/EveryFabricErrorBoundary'
import { Sidebar } from './components/sidebar/Sidebar'
import { useSidebarCollapsedState } from './components/sidebar/useSidebarCollapsedState'
import { FabricProvider, useFabric } from './context/FabricContext'
import { useActiveSessions } from './hooks/useActiveSessions'
import { useAgentSettings } from './hooks/useAgentSettings'
import { useSessionUrlState } from './hooks/useSessionUrlState'
import { EveryFabricMainView } from './EveryFabricMainView'

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
  const { devModeEnabled } = useAgentSettings()

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

  const showSettings = urlView === 'settings'
  const showScheduled = urlView === 'scheduled'
  const showAgentMesh = urlView === 'agent-mesh'
  const showTraceExplorer = urlView === 'trace-explorer'
  const showEnterpriseWorkforce = urlView === 'enterprise-workforce'
  // For sidebar highlighting, split the single agent-mesh URL into
  // "company mesh" vs "session mesh" by inspecting the meshScope param.
  const meshScopeParam =
    typeof globalThis.location !== 'undefined' ? new URLSearchParams(globalThis.location.search).get('meshScope') : null
  const isCompanyMeshActive = showAgentMesh && meshScopeParam === 'company'
  const isSessionMeshActive = showAgentMesh && meshScopeParam !== 'company'
  const isAnyOverlayShown =
    showSettings || showScheduled || showAgentMesh || showTraceExplorer || showEnterpriseWorkforce

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
        accessToken={accessToken}
        showNewSessionCta={Boolean(session) || isAnyOverlayShown}
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
        devModeEnabled={devModeEnabled}
      />
      <main className="gba:relative gba:flex-1 gba:min-w-0 gba:h-full">
        <EveryFabricMainView
          accessToken={accessToken}
          session={session}
          activeSessions={activeSessions}
          devModeEnabled={devModeEnabled}
          displayView={displayView}
          showSettings={showSettings}
          showScheduled={showScheduled}
          showAgentMesh={showAgentMesh}
          showTraceExplorer={showTraceExplorer}
          showEnterpriseWorkforce={showEnterpriseWorkforce}
          isAnyOverlayShown={isAnyOverlayShown}
          isLoadingSession={isLoadingSession}
          sessionLoadError={sessionLoadError}
          sessionNotFound={sessionNotFound}
          onRetrySessionLoad={() => void retrySessionLoad()}
          onBackToLanding={() => selectSession(null)}
          onCloseSettings={handleCloseSettings}
          onCloseScheduled={handleCloseScheduled}
          onCloseAgentMesh={handleCloseAgentMesh}
          onCloseTraceExplorer={handleCloseTraceExplorer}
          onCloseEnterpriseWorkforce={handleCloseEnterpriseWorkforce}
          onSelectSession={handleSelectSession}
          onOpenTraceExplorer={handleOpenTraceExplorer}
          onOpenAgentMeshFromTrace={handleOpenAgentMeshFromTrace}
          onStartSession={startSession}
        />
      </main>
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
