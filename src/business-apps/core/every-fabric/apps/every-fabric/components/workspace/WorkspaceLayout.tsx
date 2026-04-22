import { ArrowRightIcon, ChatCircleDotsIcon, LayoutIcon, XIcon } from '@phosphor-icons/react'
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
  WORKSPACE_CHAT_OFFSET_TRANSITION_CLASS,
  WORKSPACE_CHAT_RAIL_CLASS,
  WORKSPACE_CHAT_RIGHT_OFFSET_OPEN_CLASS,
  WORKSPACE_CHAT_RIGHT_OFFSET_PREVIEW_OPEN_CLASS,
  WORKSPACE_RIGHT_RAIL_AUTO_OPEN_BREAKPOINT_PX,
  WORKSPACE_RIGHT_RAIL_PREVIEW_WIDTH_CLASS,
  WORKSPACE_RIGHT_RAIL_TOP_OFFSET_CLASS,
  WORKSPACE_RIGHT_RAIL_WIDTH_CLASS,
  WORKSPACE_TOP_CONTROLS_OFFSET_CLASS
} from './workspaceLayout.constants'

/**
 * Single source of truth for the right-panel shell. The panel is always a
 * small floating right rail, no matter the viewport — it's ambient progress
 * info, not a modal, so we never take over the screen with a backdrop.
 */
function workspaceRightPanelShellClass(isRightPanelOpen: boolean, hasActivePreview: boolean): string {
  const motion = isRightPanelOpen
    ? 'gba:translate-x-0 gba:opacity-100 gba:pointer-events-auto'
    : 'gba:translate-x-[calc(100%+1.5rem)] gba:opacity-0 gba:pointer-events-none'
  // Widen to the preview-sized rail while a live document/slide canvas is
  // generating or ready — otherwise the canvas would be squeezed into the
  // ambient 20–24rem progress rail and be unusable.
  const width = hasActivePreview ? WORKSPACE_RIGHT_RAIL_PREVIEW_WIDTH_CLASS : WORKSPACE_RIGHT_RAIL_WIDTH_CLASS
  return `gba:absolute ${WORKSPACE_RIGHT_RAIL_TOP_OFFSET_CLASS} gba:right-4 sm:gba:right-6 lg:gba:right-8 gba:bottom-6 gba:z-40 ${width} ${motion}`
}

/**
 * Pick the chat-rail right-offset class for the current panel state. Extracted
 * (instead of a nested ternary inline) so the dependency on `hasActivePreview`
 * widening the panel — and therefore the chat gutter — is legible.
 */
function resolveChatOffsetClass(isChatOffset: boolean, hasActivePreview: boolean): string {
  if (!isChatOffset) return ''
  if (hasActivePreview) return WORKSPACE_CHAT_RIGHT_OFFSET_PREVIEW_OPEN_CLASS
  return WORKSPACE_CHAT_RIGHT_OFFSET_OPEN_CLASS
}

function resolveInitialPanelOpen(): boolean {
  if (typeof globalThis.innerWidth !== 'number') return true
  return globalThis.innerWidth >= WORKSPACE_RIGHT_RAIL_AUTO_OPEN_BREAKPOINT_PX
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

export const WorkspaceLayout: React.FC = () => {
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
    artifactPreviews,
    latestPreview,
    hasActivePreview,
    refreshArtifacts,
    reply,
    stopSession,
    setActiveArtifactId
  } = useFabric()

  const {
    availableConnectors,
    activeConnectors,
    toggleConnector,
    isLoading: isLoadingConnectors
  } = useFabricConnectors(accessToken)

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(resolveInitialPanelOpen)
  const [dismissedClarificationQuestion, setDismissedClarificationQuestion] = useState<string | null>(null)
  const [dismissedFollowUpMessageId, setDismissedFollowUpMessageId] = useState<string | null>(null)
  const [isConnectorSheetOpen, setIsConnectorSheetOpen] = useState(false)

  // Compute session connectors from stored IDs and available connectors
  const sessionConnectors = useMemo(() => {
    if (!sessionConnectorIds.length || !availableConnectors.length) return []
    return availableConnectors.filter(c => sessionConnectorIds.includes(c.connection_id))
  }, [sessionConnectorIds, availableConnectors])

  // When a live canvas preview kicks off, surface it automatically — even if the
  // user had manually collapsed the ambient rail — so the slide/document stream
  // isn't hidden behind the panel toggle.
  useEffect(() => {
    if (hasActivePreview) setIsRightPanelOpen(true)
  }, [hasActivePreview])

  // Refresh artifacts list whenever any preview transitions generating → ready
  // so the Documents section of the right panel stays in sync with whatever
  // the live canvas just finished rendering.
  const previewStatusByIdRef = useRef<Map<string, string>>(new Map())
  useEffect(() => {
    const statusMap = previewStatusByIdRef.current
    let shouldRefresh = false
    for (const preview of artifactPreviews) {
      const prev = statusMap.get(preview.artifactId)
      if (prev === 'generating' && preview.status === 'ready') {
        shouldRefresh = true
      }
      statusMap.set(preview.artifactId, preview.status)
    }
    if (shouldRefresh) void refreshArtifacts()
  }, [artifactPreviews, refreshArtifacts])

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

  // When the right panel is open, the chat rail (messages, composer,
  // clarification modal) slides left so it never lands under the floating panel.
  // When a live canvas preview is active the panel widens, so the chat slides
  // further left to match.
  const isChatOffset = isRightPanelOpen
  const chatOffsetClass = resolveChatOffsetClass(isChatOffset, hasActivePreview)

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
          <div
            className={`gba:absolute gba:left-3 sm:gba:left-6 lg:gba:left-8 ${WORKSPACE_TOP_CONTROLS_OFFSET_CLASS} gba:z-50 gba:flex gba:items-center gba:gap-3 gba:pointer-events-auto`}
          >
            <WorkspaceSkillIndicator skill={activeSkill} />
            <WorkspaceConnectorIndicator connectors={sessionConnectors} />
          </div>

          <div
            className={`gba:absolute gba:right-3 sm:gba:right-6 lg:gba:right-8 ${WORKSPACE_TOP_CONTROLS_OFFSET_CLASS} gba:z-50 gba:flex gba:max-w-[calc(100%-1.5rem)] gba:flex-wrap gba:justify-end gba:gap-2 gba:pointer-events-auto`}
          >
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

          <div
            className={`gba:absolute gba:inset-x-0 gba:bottom-3 sm:gba:bottom-4 lg:gba:bottom-6 gba:pointer-events-none gba:z-50 ${chatOffsetClass} ${WORKSPACE_CHAT_OFFSET_TRANSITION_CLASS}`}
            data-testid="fabric-workspace-composer-stack"
            data-chat-offset={isChatOffset ? 'true' : 'false'}
          >
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
            className={`gba:transition-[transform,opacity,width] gba:duration-300 gba:ease-out gba:min-h-0 gba:overflow-hidden ${workspaceRightPanelShellClass(
              isRightPanelOpen,
              hasActivePreview
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
              latestPreview={latestPreview}
              accessToken={accessToken}
              sessionId={session.session_id}
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
          isChatOffset={isChatOffset}
          onReply={reply}
          onViewArtifact={setActiveArtifactId}
          accessToken={accessToken}
        />

        {showClarification && (
          <ClarificationPrompt
            question={session.human_question ?? ''}
            isOpen={showClarification}
            isChatOffset={isChatOffset}
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
