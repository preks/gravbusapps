import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { Sparkles, X, Trash2 } from 'lucide-react'
import { useFlowBot } from '../../every-ai/hooks/useFlowBot'
import { ConversationRenderer } from '../../every-ai/components/ConversationRenderer'
import { ChatInput } from '../../every-ai/components/ChatInput'
import type { ConversationTurn } from '../../every-ai/types/models'

export interface EmbeddedFlowbotChatState {
  conversation: ConversationTurn[]
  isLoading: boolean
  isGenerating: boolean
}

export interface EmbeddedFlowbotChatPanelProps {
  accessToken: string
  onClose: () => void
  title?: string
  headerHeight?: number
  initialPrompt?: string | null
  onInitialPromptConsumed?: () => void
  onStateChange?: (state: EmbeddedFlowbotChatState) => void
  currentUserAvatar?: string | null
  'data-testid'?: string
}

export const EmbeddedFlowbotChatPanel: React.FC<EmbeddedFlowbotChatPanelProps> = ({
  accessToken,
  onClose,
  title = 'AI Assistant',
  headerHeight = 120,
  initialPrompt,
  onInitialPromptConsumed,
  onStateChange,
  currentUserAvatar = null,
  'data-testid': testId = 'embedded-flowbot-chat-panel'
}) => {
  const {
    conversation,
    isLoading,
    isGenerating,
    sendMessage,
    editMessage,
    clearConversation,
    nextStepProposals,
    isPrechatLoading,
    sessionId,
    cancelGeneration,
    cancelledMessageText,
    clearCancelledMessage,
    loadMoreHistory,
    hasMoreHistory,
    isLoadingMoreHistory
  } = useFlowBot(accessToken, { isActive: true })

  const conversationRef = useRef<HTMLDivElement>(null)
  const lastSentInitialPromptRef = useRef<string | null>(null)
  // Distance-from-bottom captured before prepending older messages; used so
  // the viewport stays anchored to the currently visible content instead of
  // jumping back down via the auto-scroll effect below.
  const preservedDistanceFromBottomRef = useRef<number | null>(null)

  useEffect(() => {
    onStateChange?.({ conversation, isLoading, isGenerating })
  }, [conversation, isLoading, isGenerating, onStateChange])

  useEffect(() => {
    if (!initialPrompt?.trim()) return
    if (isGenerating) return
    if (initialPrompt === lastSentInitialPromptRef.current) return

    lastSentInitialPromptRef.current = initialPrompt
    void sendMessage(initialPrompt, [], false, false)
    onInitialPromptConsumed?.()
  }, [initialPrompt, isGenerating, sendMessage, onInitialPromptConsumed])

  useLayoutEffect(() => {
    const el = conversationRef.current
    if (!el) return
    if (preservedDistanceFromBottomRef.current !== null) {
      const distanceFromBottom = preservedDistanceFromBottomRef.current
      preservedDistanceFromBottomRef.current = null
      el.scrollTop = Math.max(0, el.scrollHeight - distanceFromBottom)
      return
    }
    el.scrollTop = el.scrollHeight
  }, [conversation, isLoading])

  const handleLoadMoreHistory = useCallback(async () => {
    const el = conversationRef.current
    if (el) {
      preservedDistanceFromBottomRef.current = el.scrollHeight - el.scrollTop
    }
    const prependedCount = await loadMoreHistory()
    if (prependedCount === 0) {
      preservedDistanceFromBottomRef.current = null
    }
  }, [loadMoreHistory])

  const hasConversation = useMemo(() => conversation.length > 0, [conversation.length])

  return (
    <div
      className="gba:fixed gba:right-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col"
      style={{ top: `${headerHeight}px`, height: `calc(100vh - ${headerHeight}px)`, width: 520, zIndex: 50 }}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <Sparkles className="gba:h-4 gba:w-4 gba:text-primary" />
          </div>
          <div>
            <h3 className="gba:font-semibold gba:text-sm">{title}</h3>
            <p className="gba:text-xs gba:text-muted-foreground">Document-integrated chat (same Flowbot as EveryAI)</p>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearConversation}
            title="New chat"
            className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full"
            data-testid="embedded-flowbot-chat-clear"
          >
            <Trash2 className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full"
            data-testid="embedded-flowbot-chat-close"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col">
        <div
          ref={conversationRef}
          className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-4 gba:py-4 gba:space-y-4"
        >
          {!hasConversation && (
            <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:p-4 gba:text-sm gba:text-muted-foreground">
              Ask for edits directly here. The assistant uses the same `chat v2` + monolith tools as EveryAI.
            </div>
          )}

          {hasMoreHistory && hasConversation && (
            <div className="gba:flex gba:justify-center gba:pb-2">
              <Button
                onClick={handleLoadMoreHistory}
                variant="ghost"
                size="sm"
                disabled={isLoadingMoreHistory}
                className="gba:text-sm gba:text-muted-foreground hover:gba:text-foreground"
                data-testid="embedded-flowbot-load-more-history"
              >
                {isLoadingMoreHistory ? <Spinner size="sm" /> : 'Load older messages'}
              </Button>
            </div>
          )}

          <ConversationRenderer
            turns={conversation}
            accessToken={accessToken}
            sendMessage={sendMessage}
            editMessage={editMessage}
            pictureThumbnail={currentUserAvatar}
            sessionId={sessionId ?? undefined}
            onCancelGeneration={cancelGeneration}
            isAgentGenerating={isGenerating}
          />

          <div className="gba:h-2" />
        </div>
      </div>

      <div className="gba:p-3 gba:border-t gba:border-border/50 gba:bg-muted/20">
        <ChatInput
          onSend={(text, files, isThinking, isSearching) => void sendMessage(text, files, isThinking, isSearching)}
          onClear={clearConversation}
          disabled={false}
          suggestions={nextStepProposals}
          isPrechatLoading={isPrechatLoading}
          placeholder="Ask AI to edit this document..."
          cancelledMessageText={cancelledMessageText}
          onClearCancelledMessage={clearCancelledMessage}
          accessToken={accessToken}
          compactSuggestions
        />
      </div>
    </div>
  )
}

export default EmbeddedFlowbotChatPanel
