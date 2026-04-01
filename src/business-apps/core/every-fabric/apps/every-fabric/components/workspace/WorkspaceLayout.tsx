import { ArrowRight, ChatCircleDots, ClockCounterClockwise, Layout, Plus, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useFabric } from '../../context/FabricContext'
import type { ChatMessage, SessionConfig } from '../../types/enterpriseAgent'
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

const parseFollowUps = (message: ChatMessage | undefined): string[] => {
  if (!message || message.type !== 'final_answer' || !message.content || typeof message.content !== 'object') return []
  const recommendations = 'recommendations' in message.content ? message.content.recommendations : undefined
  if (typeof recommendations !== 'string' || !recommendations.trim()) return []

  return recommendations
    .split('\n')
    .map(line => line.replace(/^[-*\d.\)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 4)
}

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
  const [dismissedClarificationQuestion, setDismissedClarificationQuestion] = useState<string | null>(null)
  const [dismissedFollowUpMessageId, setDismissedFollowUpMessageId] = useState<string | null>(null)

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

  const currentClarificationQuestion = session?.human_question ?? null
  const showClarification =
    isWaitingForInput &&
    !!currentClarificationQuestion &&
    dismissedClarificationQuestion !== currentClarificationQuestion
  const interruptQuestion = showClarification ? (currentClarificationQuestion ?? undefined) : undefined

  useEffect(() => {
    if (!currentClarificationQuestion || currentClarificationQuestion !== dismissedClarificationQuestion) {
      setDismissedClarificationQuestion(null)
    }
  }, [currentClarificationQuestion, dismissedClarificationQuestion])

  if (!session) return null

  const handleComposerSubmit = (task: string, config: SessionConfig) => {
    void config
    return reply(task)
  }

  const handleClarificationAnswer = (answer: string) => {
    if (currentClarificationQuestion) {
      setDismissedClarificationQuestion(currentClarificationQuestion)
    }
    return reply(answer)
  }

  const handleClarificationDismiss = () => {
    if (currentClarificationQuestion) {
      setDismissedClarificationQuestion(currentClarificationQuestion)
    }
  }

  // Extract latest thinking from agent_thinking messages
  const latestThinking = useMemo(() => {
    const thinkingMessages = messages.filter(m => m.type === 'agent_thinking')
    if (thinkingMessages.length === 0) return null
    const latest = thinkingMessages[thinkingMessages.length - 1]
    const text = typeof latest.content === 'string' ? latest.content : ''
    // Truncate to 100 chars for pill display
    return text.slice(0, 100) + (text.length > 100 ? '...' : '')
  }, [messages])

  const activeTaskLabel = taskNodes.find(node => node.status === 'active')?.label
  const latestActivitySummary = [...activityEvents].reverse()[0]?.summary
  const composerStatusText = activeTaskLabel ?? latestThinking ?? latestActivitySummary ?? 'Agent is working…'
  const latestFinalAnswer = useMemo(
    () => [...messages].reverse().find(message => message.type === 'final_answer'),
    [messages]
  )
  const suggestedFollowUps = useMemo(() => parseFollowUps(latestFinalAnswer), [latestFinalAnswer])
  useEffect(() => {
    if (!latestFinalAnswer || latestFinalAnswer.id !== dismissedFollowUpMessageId) {
      setDismissedFollowUpMessageId(null)
    }
  }, [latestFinalAnswer, dismissedFollowUpMessageId])
  const showSuggestedFollowUps =
    !isStreaming &&
    !isWaitingForInput &&
    session.status === 'completed' &&
    suggestedFollowUps.length > 0 &&
    latestFinalAnswer?.id !== dismissedFollowUpMessageId

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
            className={`gba:fixed gba:left-20 sm:gba:left-24 lg:gba:left-28 ${WORKSPACE_TOP_CONTROLS_OFFSET_CLASS} gba:z-50 gba:pointer-events-none`}
          >
            <span className="gba:inline-flex gba:items-center gba:text-[13px] gba:font-extrabold gba:tracking-[0.01em] gba:text-foreground">
              NEWWORK Enterprise Agents
            </span>
          </div>

          <div
            className={`gba:fixed gba:right-3 sm:gba:right-6 lg:gba:right-8 ${WORKSPACE_TOP_CONTROLS_OFFSET_CLASS} gba:z-50 gba:flex gba:max-w-[calc(100%-1.5rem)] gba:flex-wrap gba:justify-end gba:gap-2 gba:pointer-events-auto`}
          >
            <button
              onClick={onOpenHistory}
              className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-history-button"
            >
              <ClockCounterClockwise className="gba:h-3.5 gba:w-3.5 gba:text-foreground" weight="bold" />
              <span className="gba:hidden sm:gba:inline">History</span>
            </button>

            <button
              onClick={newSession}
              className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-new-session"
            >
              <Plus className="gba:h-3.5 gba:w-3.5 gba:text-foreground" weight="bold" />
              <span className="gba:hidden sm:gba:inline">New task</span>
            </button>

            <button
              onClick={() => setIsRightPanelOpen(open => !open)}
              className="gba:inline-flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-panel-toggle"
              aria-label={isRightPanelOpen ? 'Close workspace panel' : 'Open workspace panel'}
            >
              {isRightPanelOpen ? (
                <X className="gba:h-4 gba:w-4 gba:text-foreground" weight="bold" />
              ) : (
                <Layout className="gba:h-4 gba:w-4 gba:text-foreground" weight="bold" />
              )}
            </button>
          </div>

          <div className="gba:fixed gba:inset-x-0 gba:bottom-3 sm:gba:bottom-4 lg:gba:bottom-6 gba:pointer-events-none gba:z-50">
            <div className={`${WORKSPACE_CHAT_GUTTER_CLASS}`}>
              <div className={`${WORKSPACE_CHAT_RAIL_CLASS} gba:mx-auto gba:space-y-2.5 sm:gba:space-y-3`}>
                {showSuggestedFollowUps && (
                  <div className="gba:pointer-events-auto">
                    <div className="gba:overflow-hidden gba:rounded-[1.4rem] gba:border gba:border-border/80 gba:bg-background/96 gba:shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:pt-3 gba:pb-2">
                        <ChatCircleDots className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                        <span className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground">
                          Suggested follow-ups
                        </span>
                        <button
                          type="button"
                          onClick={() => latestFinalAnswer && setDismissedFollowUpMessageId(latestFinalAnswer.id)}
                          className="gba:ml-auto gba:inline-flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                          aria-label="Close suggested follow-ups"
                          data-testid="fabric-follow-ups-dismiss"
                        >
                          <X className="gba:h-3.5 gba:w-3.5" />
                        </button>
                      </div>
                      <div className="gba:pb-2">
                        {suggestedFollowUps.map(followUp => (
                          <button
                            key={followUp}
                            type="button"
                            onClick={() => void reply(followUp)}
                            className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:text-left gba:hover:bg-muted/25 gba:transition-colors"
                            data-testid={`fabric-follow-up-${followUp}`}
                          >
                            <span className="gba:flex-1 gba:text-sm gba:text-foreground">{followUp}</span>
                            <ArrowRight className="gba:h-4 gba:w-4 gba:text-muted-foreground/60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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
              isStreaming={isStreaming}
              onViewArtifact={setActiveArtifactId}
            />
          </div>
        </div>

        <ConversationPanel
          sessionId={session.session_id}
          messages={messages}
          isStreaming={isStreaming}
          isWaitingForInput={isWaitingForInput}
          hasFixedFollowUps={showSuggestedFollowUps}
          onReply={reply}
          onViewArtifact={setActiveArtifactId}
        />

        {showClarification && (
          <ClarificationPrompt
            question={session.human_question ?? ''}
            isOpen={showClarification}
            onAnswer={handleClarificationAnswer}
            onDismiss={handleClarificationDismiss}
          />
        )}

        {activeArtifact && (
          <ArtifactViewer file={activeArtifact} accessToken={accessToken} onClose={() => setActiveArtifactId(null)} />
        )}
      </div>
    </div>
  )
}
