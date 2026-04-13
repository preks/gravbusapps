import { useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { LandingScreen } from './components/landing/LandingScreen'
import { EveryFabricErrorBoundary } from './components/EveryFabricErrorBoundary'
import { SessionHistoryDrawer } from './components/history/SessionHistoryDrawer'
import { AgentSettingsPanel } from './components/settings/AgentSettingsPanel'
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout'
import { FabricProvider, useFabric } from './context/FabricContext'

/**
 * Every Fabric — Autonomous Agent Workspace
 *
 * Screen routing:
 *   session === null  →  LandingScreen    (Phase 2 ✓)
 *   session active    →  WorkspaceLayout  (Phase 3 ✓)
 */

const EveryFabricInner: React.FC = () => {
  const { session, sessions, activeSessionId, accessToken, startSession, selectSession, deleteSession } = useFabric()
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleSelectSession = (id: string) => {
    selectSession(id)
    setIsHistoryOpen(false)
  }

  const isLoadingSession = activeSessionId && !session
  const sessionNotFound =
    activeSessionId && sessions.length > 0 && !sessions.some(s => s.session_id === activeSessionId)

  if (isLoadingSession && !sessionNotFound) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
        <p className="gba:text-sm gba:text-muted-foreground">Loading session...</p>
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

  if (!session) {
    return (
      <>
        <LandingScreen
          accessToken={accessToken}
          onStartSession={startSession}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <SessionHistoryDrawer
          sessions={sessions}
          activeSessionId={activeSessionId}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onSelectSession={handleSelectSession}
          onDeleteSession={deleteSession}
        />
        <AgentSettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          accessToken={accessToken}
        />
      </>
    )
  }

  return (
    <>
      <WorkspaceLayout onOpenHistory={() => setIsHistoryOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} />
      <SessionHistoryDrawer
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        onDeleteSession={deleteSession}
      />
      <AgentSettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} accessToken={accessToken} />
    </>
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
          className="gba:h-full gba:min-h-full gba:flex gba:flex-col gba:bg-background gba:overflow-hidden"
          data-testid={props.prefixDataTestId ?? 'every-fabric'}
        >
          <EveryFabricInner />
        </div>
      </FabricProvider>
    </EveryFabricErrorBoundary>
  )
}

export default EveryFabricApp
