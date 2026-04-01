import { ClockCounterClockwise, Layout, Plus, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useFabric } from '../../context/FabricContext'
import type { SessionConfig } from '../../types/enterpriseAgent'
import { ArtifactViewer } from './ArtifactViewer'
import { ClarificationPrompt } from './ClarificationPrompt'
import { ConversationPanel } from './ConversationPanel'
import { WorkspaceRightPanel } from './WorkspaceRightPanel'
import { FabricInput } from '../landing/FabricInput'
import {
  WORKSPACE_CHAT_GUTTER_CLASS,
  WORKSPACE_CHAT_RAIL_CLASS,
  WORKSPACE_RIGHT_RAIL_TOP_OFFSET_CLASS,
  WORKSPACE_RIGHT_RAIL_WIDTH_CLASS,
  WORKSPACE_TOP_CONTROLS_OFFSET_CLASS
} from './workspaceLayout.constants'

// ─── Main component ───────────────────────────────────────────────────────────

export const WorkspaceLayout: React.FC<{ onOpenHistory: () => void }> = ({ onOpenHistory }) => {
  const {
    session,
    messages,
    accessToken,
    isStreaming,
    isConnected,
    isWaitingForInput,
    taskNodes,
    completedCount,
    totalCount,
    progressPercent,
    activityEvents,
    artifacts,
    activeArtifact,
    reply,
    stopSession,
    newSession,
    setActiveArtifactId
  } = useFabric()
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [isDesktopPanel, setIsDesktopPanel] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncPanelMode = () => {
      const desktop = window.innerWidth >= 1500
      setIsDesktopPanel(desktop)
      if (desktop) setIsRightPanelOpen(true)
    }

    syncPanelMode()
    window.addEventListener('resize', syncPanelMode)

    return () => window.removeEventListener('resize', syncPanelMode)
  }, [])

  if (!session) return null

  const showClarification = isWaitingForInput && !!session.human_question
  const lastInterrupt = [...messages].reverse().find(m => m.type === 'human_interrupt')
  const interruptQuestion = lastInterrupt
    ? (lastInterrupt.content as { question: string } | undefined)?.question
    : undefined

  const handleComposerSubmit = (task: string, config: SessionConfig) => {
    void config
    return reply(task)
  }

  const activeTaskLabel = taskNodes.find(node => node.status === 'active')?.label
  const latestActivitySummary = [...activityEvents].reverse()[0]?.summary
  const composerStatusText = activeTaskLabel ?? latestActivitySummary ?? 'Agent is working…'

  return (
    <div
      className="gba:flex gba:flex-col gba:flex-1 gba:h-full gba:min-h-0 gba:overflow-hidden"
      data-testid="fabric-workspace"
    >
      <div className="gba:relative gba:flex-1 gba:h-full gba:min-h-0 gba:overflow-hidden gba:bg-background gba:isolate">
        <div className="gba:pointer-events-none gba:z-30">
          {!isDesktopPanel && isRightPanelOpen && (
            <button
              type="button"
              aria-label="Close workspace panel overlay"
              onClick={() => setIsRightPanelOpen(false)}
              className="gba:fixed gba:inset-0 gba:z-40 gba:bg-background/35 gba:backdrop-blur-[2px] gba:pointer-events-auto"
            />
          )}

          <div
            className={`gba:fixed gba:right-3 sm:gba:right-6 lg:gba:right-8 ${WORKSPACE_TOP_CONTROLS_OFFSET_CLASS} gba:z-50 gba:flex gba:max-w-[calc(100%-1.5rem)] gba:flex-wrap gba:justify-end gba:gap-2 gba:pointer-events-auto`}
          >
            <button
              onClick={onOpenHistory}
              className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-history-button"
            >
              <ClockCounterClockwise className="gba:h-3.5 gba:w-3.5" />
              <span className="gba:hidden sm:gba:inline">History</span>
            </button>

            <button
              onClick={newSession}
              className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-new-session"
            >
              <Plus className="gba:h-3.5 gba:w-3.5" weight="bold" />
              <span className="gba:hidden sm:gba:inline">New task</span>
            </button>

            <button
              onClick={() => setIsRightPanelOpen(open => !open)}
              className="gba:inline-flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-panel-toggle"
              aria-label={isRightPanelOpen ? 'Close workspace panel' : 'Open workspace panel'}
            >
              {isRightPanelOpen ? <X className="gba:h-4 gba:w-4" /> : <Layout className="gba:h-4 gba:w-4" />}
            </button>
          </div>

          <div className="gba:fixed gba:inset-x-0 gba:bottom-3 sm:gba:bottom-4 lg:gba:bottom-6 gba:pointer-events-none gba:z-50">
            <div className={`${WORKSPACE_CHAT_GUTTER_CLASS}`}>
              <div className={`${WORKSPACE_CHAT_RAIL_CLASS} gba:mx-auto gba:space-y-2.5 sm:gba:space-y-3`}>
                {isStreaming && composerStatusText && (
                  <div className="gba:pointer-events-none gba:flex gba:items-center">
                    <div className="gba:inline-flex gba:max-w-full gba:items-center gba:gap-2.5 gba:rounded-full gba:border gba:border-border/70 gba:bg-background/94 gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground gba:backdrop-blur-md gba:shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
                      <span className="gba:inline-flex gba:gap-1 gba:rounded-full gba:bg-muted gba:px-2 gba:py-1">
                        <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-muted-foreground/60 gba:animate-pulse" />
                        <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-muted-foreground/45 gba:animate-pulse" />
                        <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-muted-foreground/30 gba:animate-pulse" />
                      </span>
                      <span
                        key={composerStatusText}
                        className="gba:block gba:max-w-[min(100%,34rem)] gba:truncate gba:animate-in gba:fade-in-0 gba:slide-in-from-bottom-1 gba:duration-200"
                      >
                        {composerStatusText}
                      </span>
                    </div>
                  </div>
                )}

                <div className="gba:pointer-events-auto">
                  <FabricInput
                    variant="workspace"
                    onSubmit={handleComposerSubmit}
                    onStop={stopSession}
                    onReply={reply}
                    activeInterrupt={interruptQuestion}
                    isRunning={isStreaming}
                    isDisabled={isStreaming && !isWaitingForInput}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`gba:transition-all gba:duration-300 gba:ease-out ${
              isDesktopPanel
                ? `gba:fixed ${WORKSPACE_RIGHT_RAIL_TOP_OFFSET_CLASS} gba:right-4 sm:gba:right-6 lg:gba:right-8 gba:bottom-6 gba:z-40 ${WORKSPACE_RIGHT_RAIL_WIDTH_CLASS} ${
                    isRightPanelOpen
                      ? 'gba:translate-x-0 gba:opacity-100 gba:pointer-events-auto'
                      : 'gba:translate-x-[calc(100%+1.5rem)] gba:opacity-0 gba:pointer-events-none'
                  }`
                : `gba:fixed gba:top-24 sm:gba:top-28 gba:right-3 gba:left-3 gba:bottom-[7rem] gba:z-50 sm:gba:right-4 sm:gba:left-auto sm:gba:w-[22rem] sm:gba:bottom-[7.5rem] ${
                    isRightPanelOpen
                      ? 'gba:translate-y-0 gba:opacity-100 gba:pointer-events-auto'
                      : 'gba:translate-y-4 gba:opacity-0 gba:pointer-events-none'
                  }`
            }`}
          >
            <WorkspaceRightPanel
              taskNodes={taskNodes}
              completedCount={completedCount}
              totalCount={totalCount}
              progressPercent={progressPercent}
              activityEvents={activityEvents}
              artifacts={artifacts}
              isConnected={isConnected}
              onViewArtifact={setActiveArtifactId}
            />
          </div>
        </div>

        <ConversationPanel
          sessionId={session.session_id}
          messages={messages}
          isStreaming={isStreaming}
          isWaitingForInput={isWaitingForInput}
          onReply={reply}
          onViewArtifact={setActiveArtifactId}
        />

        {showClarification && (
          <ClarificationPrompt question={session.human_question ?? ''} isOpen={showClarification} onAnswer={reply} />
        )}

        {activeArtifact && (
          <ArtifactViewer file={activeArtifact} accessToken={accessToken} onClose={() => setActiveArtifactId(null)} />
        )}
      </div>
    </div>
  )
}
