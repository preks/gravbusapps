import { useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LandingScreen } from './components/landing/LandingScreen'
import { EveryFabricErrorBoundary } from './components/EveryFabricErrorBoundary'
import { SessionHistoryDrawer } from './components/history/SessionHistoryDrawer'
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

  const handleSelectSession = (id: string) => {
    selectSession(id)
    setIsHistoryOpen(false)
  }

  if (!session) {
    return (
      <>
        <LandingScreen
          accessToken={accessToken}
          onStartSession={startSession}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />
        <SessionHistoryDrawer
          sessions={sessions}
          activeSessionId={activeSessionId}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onSelectSession={handleSelectSession}
          onDeleteSession={deleteSession}
        />
      </>
    )
  }

  return (
    <>
      <WorkspaceLayout onOpenHistory={() => setIsHistoryOpen(true)} />
      <SessionHistoryDrawer
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        onDeleteSession={deleteSession}
      />
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
