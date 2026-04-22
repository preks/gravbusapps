import {
  ArrowRightIcon,
  ChatCircleDotsIcon,
  ClockCounterClockwiseIcon,
  GearIcon,
  LayoutIcon,
  PlusIcon,
  XIcon
} from '@phosphor-icons/react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFabric } from '../../context/FabricContext'
import type { ChatMessage, SessionConfig } from '../../types/enterpriseAgent'
import { ArtifactViewer } from './ArtifactViewer'
import { ClarificationPrompt } from './ClarificationPrompt'
import { ConversationPanel } from './ConversationPanel'
import { WorkspaceRightPanel } from './WorkspaceRightPanel'
import { WorkspaceSkillIndicator } from './WorkspaceSkillIndicator'
import { WorkspaceConnectorIndicator } from './WorkspaceConnectorIndicator'
import { WorkspaceStreamingIsland } from './WorkspaceStreamingIsland'
import { FabricInput } from '../landing/FabricInput'
import { ConnectorPickerSheet } from '../connectors/ConnectorPickerSheet'
import { useFabricConnectors } from '../../hooks/useFabricConnectors'
import {
  WORKSPACE_CHAT_GUTTER_CLASS,
  WORKSPACE_CHAT_RAIL_CLASS,
  WORKSPACE_RIGHT_RAIL_BOTTOM_DEFAULT_CLASS,
  WORKSPACE_RIGHT_RAIL_BOTTOM_STREAMING_ISLAND_CLASS,
  WORKSPACE_RIGHT_RAIL_BOTTOM_WITH_FOLLOWUPS_CLASS,
  WORKSPACE_RIGHT_RAIL_DESKTOP_BREAKPOINT_PX,
  WORKSPACE_RIGHT_RAIL_TOP_OFFSET_CLASS,
  WORKSPACE_RIGHT_RAIL_WIDTH_CLASS,
  WORKSPACE_TOP_CONTROLS_OFFSET_CLASS
} from './workspaceLayout.constants'

function workspaceRightPanelShellClass(
  isDesktopPanel: boolean,
  isRightPanelOpen: boolean,
  narrowRailBottomClass: string
): string {
  const desktopMotion = isRightPanelOpen
    ? 'gba:translate-x-0 gba:opacity-100 gba:pointer-events-auto'
    : 'gba:translate-x-[calc(100%+1.5rem)] gba:opacity-0 gba:pointer-events-none'
  const narrowMotion = isRightPanelOpen
    ? 'gba:translate-y-0 gba:opacity-100 gba:pointer-events-auto'
    : 'gba:translate-y-4 gba:opacity-0 gba:pointer-events-none'
  if (isDesktopPanel) {
    return `gba:fixed ${WORKSPACE_RIGHT_RAIL_TOP_OFFSET_CLASS} gba:right-4 sm:gba:right-6 lg:gba:right-8 gba:bottom-6 gba:z-40 ${WORKSPACE_RIGHT_RAIL_WIDTH_CLASS} ${desktopMotion}`
  }
  return `gba:fixed gba:top-24 sm:gba:top-28 gba:right-3 gba:left-3 gba:z-50 sm:gba:right-4 sm:gba:left-auto sm:gba:w-[22rem] ${narrowRailBottomClass} ${narrowMotion}`
}

type WorkspacePanelMode = 'desktop' | 'overlay'

function resolveWorkspacePanelMode(innerWidth: number): WorkspacePanelMode {
  if (innerWidth >= WORKSPACE_RIGHT_RAIL_DESKTOP_BREAKPOINT_PX) return 'desktop'
  return 'overlay'
}

function getCurrentWorkspacePanelMode(): WorkspacePanelMode {
  if (typeof globalThis.innerWidth !== 'number') return 'desktop'
  return resolveWorkspacePanelMode(globalThis.innerWidth)
}

const parseFollowUps = (message: ChatMessage | undefined): string[] => {
  if (message?.type !== 'final_answer' || !message?.content || typeof message.content !== 'object') return []
  const recommendations = 'recommendations' in message.content ? message.content.recommendations : undefined
  if (typeof recommendations !== 'string' || !recommendations.trim()) return []

  return recommendations
    .split('\n')
    .map(line => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 4)
}

// ─── Main component ───────────────────────────────────────────────────────────

export const WorkspaceLayout: React.FC<{ onOpenHistory: () => void; onOpenSettings: () => void }> = ({
  onOpenHistory,
  onOpenSettings
}) => {
  const initialPanelMode = getCurrentWorkspacePanelMode()
  const {
    session,
    messages,
    streamingGreeting,
    streamingContent,
    streamingThinking,
    statusHeadline,
    accessToken,
    isStreaming,
    isConnected,
    isWaitingForInput,
    taskNodes,
    completedCount,
    totalCount,
    progressPercent,
    activityEvents,
    activeSkill,
    sessionConnectorIds,
    artifacts,
    workspaceDocs,
    activeArtifact,
    reply,
    stopSession,
    newSession,
    setActiveArtifactId
  } = useFabric()

  const {
    availableConnectors,
    activeConnectors,
    toggleConnector,
    isLoading: isLoadingConnectors
  } = useFabricConnectors(accessToken)

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(initialPanelMode === 'desktop')
  const [isDesktopPanel, setIsDesktopPanel] = useState(initialPanelMode === 'desktop')
  const [dismissedClarificationQuestion, setDismissedClarificationQuestion] = useState<string | null>(null)
  const [dismissedFollowUpMessageId, setDismissedFollowUpMessageId] = useState<string | null>(null)
  const [isConnectorSheetOpen, setIsConnectorSheetOpen] = useState(false)
  const lastPanelModeRef = useRef<WorkspacePanelMode>(initialPanelMode)

  // Compute session connectors from stored IDs and available connectors
  const sessionConnectors = useMemo(() => {
    if (!sessionConnectorIds.length || !availableConnectors.length) return []
    return availableConnectors.filter(c => sessionConnectorIds.includes(c.connection_id))
  }, [sessionConnectorIds, availableConnectors])

  useEffect(() => {
    if (typeof globalThis.innerWidth !== 'number') return

    const syncPanelMode = () => {
      const nextPanelMode = resolveWorkspacePanelMode(globalThis.innerWidth)
      const previousPanelMode = lastPanelModeRef.current

      setIsDesktopPanel(nextPanelMode === 'desktop')
      setIsRightPanelOpen(previousIsOpen => {
        if (nextPanelMode === 'desktop') return true
        if (nextPanelMode !== previousPanelMode) return false
        return previousIsOpen
      })
      lastPanelModeRef.current = nextPanelMode
    }

    syncPanelMode()
    globalThis.addEventListener('resize', syncPanelMode)

    return () => globalThis.removeEventListener('resize', syncPanelMode)
  }, [])

  const currentClarificationQuestion = session?.human_question ?? null
  // Only show clarification modal if there's NO structured input request
  // (structured forms render inline in the chat, not as a modal)
  const showClarification =
    isWaitingForInput &&
    !!currentClarificationQuestion &&
    !session?.structured_input_request &&
    dismissedClarificationQuestion !== currentClarificationQuestion
  /** Keep composer in reply mode while waiting or while interrupt POST is in flight (modal may be dismissed). */
  const composerInterruptQuestion =
    !session?.structured_input_request && currentClarificationQuestion && (isWaitingForInput || isStreaming)
      ? currentClarificationQuestion
      : undefined

  useEffect(() => {
    if (!currentClarificationQuestion || currentClarificationQuestion !== dismissedClarificationQuestion) {
      setDismissedClarificationQuestion(null)
    }
  }, [currentClarificationQuestion, dismissedClarificationQuestion])

  const latestFinalAnswer = useMemo(
    () => [...messages].reverse().find(message => message.type === 'final_answer'),
    [messages]
  )
  const suggestedFollowUps = useMemo(() => parseFollowUps(latestFinalAnswer), [latestFinalAnswer])

  const streamingStatusHeadline = useMemo(() => {
    // Prioritize real-time status from agent (skill matching, workspace prep, etc.)
    if (statusHeadline) return statusHeadline

    // Fallback to task node progress
    if (totalCount === 0) return null
    const active = taskNodes.find(n => n.status === 'active')
    if (active?.label) return active.label
    const pending = taskNodes.find(n => n.status === 'pending')
    if (pending?.label) return `Next: ${pending.label}`
    return null
  }, [statusHeadline, taskNodes, totalCount])
  useEffect(() => {
    if (latestFinalAnswer?.id !== dismissedFollowUpMessageId) {
      setDismissedFollowUpMessageId(null)
    }
  }, [latestFinalAnswer, dismissedFollowUpMessageId])
  const showSuggestedFollowUps =
    !!session &&
    !isStreaming &&
    !isWaitingForInput &&
    session.status === 'completed' &&
    suggestedFollowUps.length > 0 &&
    latestFinalAnswer?.id !== dismissedFollowUpMessageId

  let narrowRailBottomClass = WORKSPACE_RIGHT_RAIL_BOTTOM_DEFAULT_CLASS
  if (showSuggestedFollowUps) narrowRailBottomClass = WORKSPACE_RIGHT_RAIL_BOTTOM_WITH_FOLLOWUPS_CLASS
  else if (isStreaming) narrowRailBottomClass = WORKSPACE_RIGHT_RAIL_BOTTOM_STREAMING_ISLAND_CLASS

  if (!session) return null

  const handleComposerSubmit = (
    task: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- FabricInput forwards SessionConfig; workspace path ignores it
    _config: SessionConfig
  ) => reply(task)

  const handleClarificationAnswer = (answer: string) => {
    // Immediately dismiss to close modal
    if (currentClarificationQuestion) {
      setDismissedClarificationQuestion(currentClarificationQuestion)
    }
    // Send reply - modal will unmount since showClarification becomes false
    reply(answer).catch(() => undefined)
  }

  const handleClarificationDismiss = () => {
    if (currentClarificationQuestion) {
      setDismissedClarificationQuestion(currentClarificationQuestion)
    }
  }

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
            className={`gba:fixed gba:left-3 sm:gba:left-6 lg:gba:left-8 ${WORKSPACE_TOP_CONTROLS_OFFSET_CLASS} gba:z-50 gba:flex gba:items-center gba:gap-3 gba:pointer-events-auto`}
            style={{ top: 'calc(5rem + 2.5rem)' }}
          >
            <button
              onClick={onOpenHistory}
              className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-history-button"
            >
              <ClockCounterClockwiseIcon className="gba:h-3.5 gba:w-3.5 gba:text-foreground" weight="bold" />
              <span className="gba:hidden sm:gba:inline">History</span>
            </button>
            <WorkspaceSkillIndicator skill={activeSkill} />
            <WorkspaceConnectorIndicator connectors={sessionConnectors} />
          </div>

          <div
            className={`gba:fixed gba:right-3 sm:gba:right-6 lg:gba:right-8 ${WORKSPACE_TOP_CONTROLS_OFFSET_CLASS} gba:z-50 gba:flex gba:max-w-[calc(100%-1.5rem)] gba:flex-wrap gba:justify-end gba:gap-2 gba:pointer-events-auto`}
          >
            <button
              onClick={onOpenSettings}
              className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-settings-button"
            >
              <GearIcon className="gba:h-3.5 gba:w-3.5 gba:text-foreground" weight="bold" />
              <span className="gba:hidden sm:gba:inline">Settings</span>
            </button>

            <button
              onClick={newSession}
              className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-new-session"
            >
              <PlusIcon className="gba:h-3.5 gba:w-3.5 gba:text-foreground" weight="bold" />
              <span className="gba:hidden sm:gba:inline">New task</span>
            </button>

            <button
              onClick={() => setIsRightPanelOpen(open => !open)}
              className="gba:inline-flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-foreground gba:hover:bg-background gba:transition-colors"
              data-testid="fabric-workspace-panel-toggle"
              aria-label={isRightPanelOpen ? 'Close workspace panel' : 'Open workspace panel'}
            >
              {isRightPanelOpen ? (
                <XIcon className="gba:h-4 gba:w-4 gba:text-foreground" weight="bold" />
              ) : (
                <LayoutIcon className="gba:h-4 gba:w-4 gba:text-foreground" weight="bold" />
              )}
            </button>
          </div>

          <div className="gba:fixed gba:inset-x-0 gba:bottom-3 sm:gba:bottom-4 lg:gba:bottom-6 gba:pointer-events-none gba:z-50">
            <div className={`${WORKSPACE_CHAT_GUTTER_CLASS}`}>
              <div
                className={`${WORKSPACE_CHAT_RAIL_CLASS} gba:mx-auto ${
                  showSuggestedFollowUps ? 'gba:space-y-1.5 sm:gba:space-y-2' : 'gba:space-y-2.5 sm:gba:space-y-3'
                }`}
              >
                {showSuggestedFollowUps && (
                  <div className="gba:pointer-events-auto">
                    <div className="gba:overflow-hidden gba:rounded-[1.25rem] gba:border gba:border-border/80 gba:bg-background/96 gba:shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:pt-2 gba:pb-1.5 sm:gba:px-3.5">
                        <ChatCircleDotsIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground" />
                        <span className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground">
                          Suggested follow-ups
                        </span>
                        <button
                          type="button"
                          onClick={() => latestFinalAnswer && setDismissedFollowUpMessageId(latestFinalAnswer.id)}
                          className="gba:ml-auto gba:inline-flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                          aria-label="Close suggested follow-ups"
                          data-testid="fabric-follow-ups-dismiss"
                        >
                          <XIcon className="gba:h-3.5 gba:w-3.5" />
                        </button>
                      </div>
                      <div className="gba:pb-1 sm:gba:pb-1.5">
                        {suggestedFollowUps.map(followUp => (
                          <button
                            key={followUp}
                            type="button"
                            onClick={() => void reply(followUp)}
                            className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:px-3 gba:py-2 sm:gba:gap-2.5 sm:gba:px-3.5 sm:gba:py-2.5 gba:text-left gba:leading-snug gba:hover:bg-muted/25 gba:transition-colors"
                            data-testid={`fabric-follow-up-${followUp}`}
                          >
                            <span className="gba:flex-1 gba:text-xs sm:gba:text-sm gba:text-foreground">
                              {followUp}
                            </span>
                            <ArrowRightIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground/60 sm:gba:h-4 sm:gba:w-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isStreaming && (
                  <WorkspaceStreamingIsland
                    sessionId={session.session_id}
                    messages={messages}
                    statusHeadline={streamingStatusHeadline}
                    completedCount={completedCount}
                    totalCount={totalCount}
                    progressPercent={progressPercent}
                    isConnected={isConnected}
                    isStreaming={isStreaming}
                  />
                )}

                <div className="gba:pointer-events-auto">
                  <FabricInput
                    variant="workspace"
                    onSubmit={handleComposerSubmit}
                    onStop={stopSession}
                    onReply={reply}
                    activeInterrupt={composerInterruptQuestion}
                    isRunning={isStreaming}
                    isDisabled={isStreaming && !isWaitingForInput}
                    onConnectorsClick={() => setIsConnectorSheetOpen(true)}
                    activeConnectors={activeConnectors}
                    onRemoveConnector={toggleConnector}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`gba:transition gba:duration-300 gba:ease-out gba:min-h-0 gba:overflow-hidden ${workspaceRightPanelShellClass(
              isDesktopPanel,
              isRightPanelOpen,
              narrowRailBottomClass
            )}`}
          >
            <WorkspaceRightPanel
              taskNodes={taskNodes}
              completedCount={completedCount}
              totalCount={totalCount}
              progressPercent={progressPercent}
              activityEvents={activityEvents}
              artifacts={artifacts}
              workspaceDocs={workspaceDocs}
              isConnected={isConnected}
              isStreaming={isStreaming}
              onViewArtifact={setActiveArtifactId}
            />
          </div>
        </div>

        <ConversationPanel
          sessionId={session.session_id}
          messages={messages}
          streamingGreeting={streamingGreeting}
          streamingContent={streamingContent}
          streamingThinking={streamingThinking}
          statusHeadline={statusHeadline}
          isStreaming={isStreaming}
          isWaitingForInput={isWaitingForInput}
          hasFixedFollowUps={showSuggestedFollowUps}
          hasStreamingIsland={isStreaming}
          onReply={reply}
          onViewArtifact={setActiveArtifactId}
          accessToken={accessToken}
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

        <ConnectorPickerSheet
          isOpen={isConnectorSheetOpen}
          onClose={() => setIsConnectorSheetOpen(false)}
          connectors={availableConnectors}
          activeConnectorIds={new Set(activeConnectors.map(c => c.connection_id))}
          onToggle={toggleConnector}
          isLoading={isLoadingConnectors}
        />
      </div>
    </div>
  )
}
