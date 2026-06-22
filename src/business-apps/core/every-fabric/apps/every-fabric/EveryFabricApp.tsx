import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FormLocalizationProvider } from '@/common/components/form-localization-provider'
import { EVERY_FABRIC_PROMPT_PARAM } from '@/common/utils/openEveryFabric'
import { getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { EveryFabricErrorBoundary } from './components/EveryFabricErrorBoundary'
import { Sidebar } from './components/sidebar/Sidebar'
import { useSidebarCollapsedState } from './components/sidebar/useSidebarCollapsedState'
import { FabricProvider, useFabric } from './context/FabricContext'
import { useActiveSessions } from './hooks/useActiveSessions'
import { useAgentSettings } from './hooks/useAgentSettings'
import { useSessionUrlState } from './hooks/useSessionUrlState'
import { EveryFabricMainView } from './EveryFabricMainView'
import { isEveryFabricDevToolsEnabled } from './utils/devToolsGate'

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
    sessionsLoading,
    sessionsLoadingMore,
    sessionsSearching,
    hasMoreSessions,
    sessionSearchQuery,
    setSessionSearchQuery,
    loadMoreSessions,
    sessionLoadError,
    retrySessionLoad
  } = useFabric()
  const { urlView, updateUrl } = useSessionUrlState()
  const { isCollapsed, toggleCollapsed, setCollapsed } = useSidebarCollapsedState()
  const { activeSessions, removeActive } = useActiveSessions(accessToken)
  const { devModeEnabled: localDevModeEnabled } = useAgentSettings()
  const devToolsFeature = useFeature<boolean>(Feature.EveryFabric.DevTools.Key)
  const devToolsEnabled = isEveryFabricDevToolsEnabled(devToolsFeature)
  const devModeEnabled = devToolsEnabled && localDevModeEnabled

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

  // External hand-off: another screen (e.g. the Digital Workplace composer)
  // navigates here with a `fabricPrompt` query param to kick off a fresh
  // EveryFabric session. We consume it once, then strip it from the URL so a
  // refresh doesn't restart the task. We wait for the initial session history
  // fetch to finish first — otherwise that fetch resolves after our optimistic
  // addSession and overwrites it, leaving the new session "not found".
  const initialTaskConsumedRef = useRef(false)
  useEffect(() => {
    if (initialTaskConsumedRef.current || sessionsLoading) return
    let task: string | null = null
    try {
      task = new URLSearchParams(globalThis.location.search).get(EVERY_FABRIC_PROMPT_PARAM)
    } catch {
      task = null
    }
    if (!task) return
    initialTaskConsumedRef.current = true
    try {
      const stripped = getCurrentUrlWithUpdatedSearchParams({ [EVERY_FABRIC_PROMPT_PARAM]: null })
      globalThis.history.replaceState(globalThis.history.state, '', stripped)
    } catch {
      // ignore — failing to strip only means a refresh could restart the task
    }
    void startSession(task, { mode: 'deep', enable_memory: true, enable_reflection: undefined })
  }, [sessionsLoading, startSession])

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
  const handleOpenTraceLens = () => updateUrl({ view: 'trace-lens' })
  const handleCloseTraceLens = () => updateUrl({ view: null, traceRunId: null })
  const handleOpenMemoryLens = () => updateUrl({ view: 'memory-lens' })
  const handleCloseMemoryLens = () => updateUrl({ view: null })
  const handleOpenAgentMeshFromTrace = (positionMs?: number) =>
    updateUrl({ view: 'agent-mesh', t: positionMs != null ? String(positionMs) : null })
  const handleOpenEnterpriseWorkforce = () =>
    updateUrl({
      view: 'enterprise-workforce',
      // Settings → Agents uses the same `agentId` query param; clear it so
      // Digital Workforce does not open an enterprise-only agent detail view.
      agentId: null,
      tab: null,
      runId: null,
      skillId: null
    })
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
  const showTraceExplorer = devModeEnabled && urlView === 'trace-explorer'
  const showTraceLens = devModeEnabled && urlView === 'trace-lens'
  const showMemoryLens = devModeEnabled && urlView === 'memory-lens'
  const showEnterpriseWorkforce = urlView === 'enterprise-workforce'
  // For sidebar highlighting, split the single agent-mesh URL into
  // "company mesh" vs "session mesh" by inspecting the meshScope param.
  const meshScopeParam =
    typeof globalThis.location !== 'undefined' ? new URLSearchParams(globalThis.location.search).get('meshScope') : null
  const isCompanyMeshActive = showAgentMesh && meshScopeParam === 'company'
  const isAnyOverlayShown =
    showSettings ||
    showScheduled ||
    showAgentMesh ||
    showTraceExplorer ||
    showTraceLens ||
    showMemoryLens ||
    showEnterpriseWorkforce
  return (
    <div className="gba:flex gba:h-full gba:min-h-full gba:w-full gba:min-w-0">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapsed={toggleCollapsed}
        onExpand={() => setCollapsed(false)}
        activeSessionId={activeSessionId}
        activeSessions={activeSessions}
        historySessions={sessions}
        historySessionsLoading={sessionsLoading}
        historySessionsLoadingMore={sessionsLoadingMore}
        historySessionsSearching={sessionsSearching}
        hasMoreHistorySessions={hasMoreSessions}
        historySearchQuery={sessionSearchQuery}
        onHistorySearchQueryChange={setSessionSearchQuery}
        onLoadMoreHistorySessions={loadMoreSessions}
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
        onOpenTraceExplorer={handleOpenTraceExplorer}
        isTraceExplorerActive={showTraceExplorer}
        onOpenTraceLens={handleOpenTraceLens}
        isTraceLensActive={showTraceLens}
        onOpenMemoryLens={handleOpenMemoryLens}
        isMemoryLensActive={showMemoryLens}
        devModeEnabled={devModeEnabled}
      />
      <main className="gba:relative gba:flex-1 gba:min-w-0 gba:h-full">
        <EveryFabricMainView
          accessToken={accessToken}
          session={session}
          activeSessions={activeSessions}
          devToolsEnabled={devToolsEnabled}
          devModeEnabled={devModeEnabled}
          displayView={displayView}
          showSettings={showSettings}
          showScheduled={showScheduled}
          showAgentMesh={showAgentMesh}
          showTraceExplorer={showTraceExplorer}
          showTraceLens={showTraceLens}
          showMemoryLens={showMemoryLens}
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
          onCloseTraceLens={handleCloseTraceLens}
          onCloseMemoryLens={handleCloseMemoryLens}
          onCloseEnterpriseWorkforce={handleCloseEnterpriseWorkforce}
          onSelectSession={handleSelectSession}
          onOpenTraceExplorer={handleOpenTraceExplorer}
          onOpenSessionMesh={handleOpenSessionMesh}
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
    // LocalizationProvider must wrap the error boundary: the boundary's fallback
    // UI calls the design-system `useTranslation`, which throws
    // "useLocalizationContext must be used within LocalizationProvider" if it
    // renders outside the provider. Keeping the provider outermost ensures a
    // caught render error surfaces the real fallback instead of crashing the
    // whole remote with a misleading localization error.
    <FormLocalizationProvider>
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
    </FormLocalizationProvider>
  )
}

export default EveryFabricApp
