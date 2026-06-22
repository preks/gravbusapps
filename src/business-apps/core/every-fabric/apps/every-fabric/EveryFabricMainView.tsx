import React, { type ReactNode } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import translations from './_i18n'
import { AgentMeshScreen } from './components/agent-mesh/AgentMeshScreen'
import { EnterpriseWorkforceScreen } from './components/enterprise-workforce/EnterpriseWorkforceScreen'
import { TraceExplorerScreen } from './components/trace-explorer/TraceExplorerScreen'
import { TraceLensScreen } from './components/trace-lens/TraceLensScreen'
import { MemoryLensScreen } from './components/memory-lens/MemoryLensScreen'
import { LandingScreen } from './components/landing/LandingScreen'
import { ScheduledDispatchesScreen } from './components/scheduled/ScheduledDispatchesScreen'
import { SettingsScreen } from './components/settings/SettingsScreen'
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout'
import type { useActiveSessions } from './hooks/useActiveSessions'
import type { useFabric } from './context/FabricContext'

type FabricContext = ReturnType<typeof useFabric>
type ActiveSessions = ReturnType<typeof useActiveSessions>['activeSessions']

/** Deep-link target for TraceLens (`?view=trace-lens&traceRunId=<sessionId>`).
 *  Read at render time — kept separate from `sessionId` so a workforce run
 *  can be inspected without becoming the active chat session. */
function getTraceRunIdFromUrl(): string | null {
  if (typeof globalThis.location === 'undefined') return null
  return new URLSearchParams(globalThis.location.search).get('traceRunId')
}

interface FadeOverlayProps {
  visible: boolean
  children?: ReactNode
}

function FadeOverlay({ visible, children }: Readonly<FadeOverlayProps>) {
  return (
    <div
      className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-300 gba:ease-in-out ${
        visible ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
      }`}
      style={{ pointerEvents: visible ? 'auto' : 'none', zIndex: visible ? 30 : 0 }}
    >
      {children}
    </div>
  )
}

interface SessionLoadGateProps {
  isLoadingSession: boolean
  sessionLoadError: FabricContext['sessionLoadError']
  sessionNotFound: boolean
  onRetry: () => void
  onBackToLanding: () => void
  children: ReactNode
}

function SessionLoadGate({
  isLoadingSession,
  sessionLoadError,
  sessionNotFound,
  onRetry,
  onBackToLanding,
  children
}: Readonly<SessionLoadGateProps>) {
  const { t } = useTranslation(translations)

  if (isLoadingSession && sessionLoadError) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4">
        <p className="gba:text-sm gba:text-foreground">{t('shell-session-load-error')}</p>
        <div className="gba:flex gba:items-center gba:gap-3">
          <Button variant="secondary" onClick={onRetry}>
            {t('shell-try-again')}
          </Button>
          <Button onClick={onBackToLanding}>{t('shell-back-to-landing')}</Button>
        </div>
      </div>
    )
  }

  if (isLoadingSession && !sessionNotFound) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-3">
        <SpinnerGapIcon className="gba:h-5 gba:w-5 gba:animate-spin gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">{t('shell-opening-session')}</p>
      </div>
    )
  }

  if (sessionNotFound) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4">
        <p className="gba:text-sm gba:text-foreground">{t('shell-session-not-found')}</p>
        <Button onClick={onBackToLanding}>{t('shell-back-to-landing')}</Button>
      </div>
    )
  }

  return children
}

export interface EveryFabricMainViewProps {
  accessToken: string
  session: FabricContext['session']
  activeSessions: ActiveSessions
  devToolsEnabled: boolean
  devModeEnabled: boolean
  displayView: string | null
  showSettings: boolean
  showScheduled: boolean
  showAgentMesh: boolean
  showTraceExplorer: boolean
  showTraceLens: boolean
  showMemoryLens: boolean
  showEnterpriseWorkforce: boolean
  isAnyOverlayShown: boolean
  isLoadingSession: boolean
  sessionLoadError: FabricContext['sessionLoadError']
  sessionNotFound: boolean
  onRetrySessionLoad: () => void
  onBackToLanding: () => void
  onCloseSettings: () => void
  onCloseScheduled: () => void
  onCloseAgentMesh: () => void
  onCloseTraceExplorer: () => void
  onCloseTraceLens: () => void
  onCloseMemoryLens: () => void
  onCloseEnterpriseWorkforce: () => void
  onSelectSession: (id: string) => void
  onOpenTraceExplorer: (positionMs?: number) => void
  onOpenAgentMeshFromTrace: (positionMs?: number) => void
  onStartSession: FabricContext['startSession']
}

export function EveryFabricMainView({
  accessToken,
  session,
  activeSessions,
  devToolsEnabled,
  devModeEnabled,
  displayView,
  showSettings,
  showScheduled,
  showAgentMesh,
  showTraceExplorer,
  showTraceLens,
  showMemoryLens,
  showEnterpriseWorkforce,
  isAnyOverlayShown,
  isLoadingSession,
  sessionLoadError,
  sessionNotFound,
  onRetrySessionLoad,
  onBackToLanding,
  onCloseSettings,
  onCloseScheduled,
  onCloseAgentMesh,
  onCloseTraceExplorer,
  onCloseTraceLens,
  onCloseMemoryLens,
  onCloseEnterpriseWorkforce,
  onSelectSession,
  onOpenTraceExplorer,
  onOpenAgentMeshFromTrace,
  onStartSession
}: Readonly<EveryFabricMainViewProps>) {
  const showMainContent = !isAnyOverlayShown

  return (
    <SessionLoadGate
      isLoadingSession={isLoadingSession}
      sessionLoadError={sessionLoadError}
      sessionNotFound={sessionNotFound}
      onRetry={onRetrySessionLoad}
      onBackToLanding={onBackToLanding}
    >
      <>
        <FadeOverlay visible={showSettings}>
          {displayView === 'settings' && (
            <SettingsScreen accessToken={accessToken} devToolsEnabled={devToolsEnabled} onBack={onCloseSettings} />
          )}
        </FadeOverlay>

        <FadeOverlay visible={showScheduled}>
          {displayView === 'scheduled' && (
            <ScheduledDispatchesScreen
              accessToken={accessToken}
              onBack={onCloseScheduled}
              onOpenSession={onSelectSession}
            />
          )}
        </FadeOverlay>

        <FadeOverlay visible={showAgentMesh}>
          {displayView === 'agent-mesh' && (
            <AgentMeshScreen
              activeSessions={activeSessions}
              onBack={onCloseAgentMesh}
              onOpenTraceExplorer={devModeEnabled ? onOpenTraceExplorer : undefined}
            />
          )}
        </FadeOverlay>

        <FadeOverlay visible={showTraceExplorer}>
          {devModeEnabled && displayView === 'trace-explorer' && (
            <TraceExplorerScreen onBack={onCloseTraceExplorer} onOpenAgentMesh={onOpenAgentMeshFromTrace} />
          )}
        </FadeOverlay>

        <FadeOverlay visible={showTraceLens}>
          {devModeEnabled && displayView === 'trace-lens' && (
            <TraceLensScreen
              accessToken={accessToken}
              onBack={onCloseTraceLens}
              initialSessionId={getTraceRunIdFromUrl() ?? session?.session_id ?? null}
            />
          )}
        </FadeOverlay>

        <FadeOverlay visible={showMemoryLens}>
          {devModeEnabled && displayView === 'memory-lens' && (
            <MemoryLensScreen accessToken={accessToken} onBack={onCloseMemoryLens} />
          )}
        </FadeOverlay>

        <FadeOverlay visible={showEnterpriseWorkforce}>
          {displayView === 'enterprise-workforce' && (
            <EnterpriseWorkforceScreen
              accessToken={accessToken}
              activeSessions={activeSessions}
              devModeEnabled={devModeEnabled}
              onBack={onCloseEnterpriseWorkforce}
            />
          )}
        </FadeOverlay>

        <div
          className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-300 gba:ease-in-out ${
            showMainContent ? 'gba:opacity-100' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
          style={{
            pointerEvents: showMainContent ? 'auto' : 'none',
            zIndex: showMainContent ? 20 : 0
          }}
        >
          {session ? (
            <WorkspaceLayout devModeEnabled={devModeEnabled} />
          ) : (
            <LandingScreen accessToken={accessToken} onStartSession={onStartSession} devModeEnabled={devModeEnabled} />
          )}
        </div>
      </>
    </SessionLoadGate>
  )
}
