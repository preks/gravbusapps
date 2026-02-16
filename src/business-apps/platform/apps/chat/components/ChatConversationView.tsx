/**
 * Conversation view: header, experts bar, message list, AI/Expert indicators,
 * empty state, and message input.
 */

import { ConversationHeader, type ActiveCallInfo } from './ConversationHeader'
import { ActiveExpertsBar } from './ActiveExpertsBar'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { AIThinkingIndicator, AIResponseRenderer, ExpertThinkingIndicator } from './AIResponseRenderer'
import type { Conversation, Message, TypingIndicator, EntityReference, MessageEntityReference } from '../types'
import type { UserPresence } from '../hooks/usePresence'
import type { ActiveExpert } from '../hooks/useConversationExperts'
import type { ChatApiClient } from '../services/chatApiClient'

export interface ChatConversationViewProps {
  prefixDataTestId: string
  stableActiveConversation: Conversation | null
  isSingleViewMode: boolean
  viewMode: 'full' | 'compact' | 'mobile'
  onBack: () => void
  onCloseConversation: () => void
  onRemoveConversation: (id: string) => void
  onShowGroupSettings: () => void
  onShowExpertSelector: () => void
  onNudge?: () => void
  onAudioCall?: () => void
  onVideoCall?: () => void
  onJoinCall?: () => void
  currentUserId: string | null
  otherUserPresence?: UserPresence
  isCallEnabled: boolean
  isInCall: boolean
  isStartingCall: boolean
  activeCall: ActiveCallInfo | null
  t: (key: string, params?: Record<string, unknown>) => string
  activeExperts: ActiveExpert[]
  onRemoveExpert: (expertId: string) => void
  messages: Message[]
  messagesLoading: boolean
  hasMoreMessages: boolean
  onLoadMoreMessages: () => void
  activeConversationId: string | null
  typingUsers: TypingIndicator[]
  onReplyToAI: () => void
  accessToken: string | undefined
  onSendMessage: (content: string, metadata?: Record<string, unknown>) => Promise<void>
  apiClient: ChatApiClient | null
  isAIProcessing: boolean
  aiStreamingText: string | null
  isExpertProcessing: boolean
  processingExpert: { name: string; color?: string } | null
  onSendMessageInput: (content: string, ...args: unknown[]) => void | Promise<void>
  onTypingStart: () => void
  onTypingStop: () => void
  draftMessage: string
  onDraftChange: (value: string) => void
  onRegisterMentionReady: (
    registerFn: (entity: EntityReference, text: string, startIndex: number) => MessageEntityReference
  ) => void
  onFocusReady: (fn: () => void) => void
}

export function ChatConversationView({
  prefixDataTestId,
  stableActiveConversation,
  isSingleViewMode,
  viewMode,
  onBack,
  onCloseConversation,
  onRemoveConversation,
  onShowGroupSettings,
  onShowExpertSelector,
  onNudge,
  onAudioCall,
  onVideoCall,
  onJoinCall,
  currentUserId,
  otherUserPresence,
  isCallEnabled,
  isInCall,
  isStartingCall,
  activeCall,
  t,
  activeExperts,
  onRemoveExpert,
  messages,
  messagesLoading,
  hasMoreMessages,
  onLoadMoreMessages,
  activeConversationId,
  typingUsers,
  onReplyToAI,
  accessToken,
  onSendMessage,
  apiClient,
  isAIProcessing,
  aiStreamingText,
  isExpertProcessing,
  processingExpert,
  onSendMessageInput,
  onTypingStart,
  onTypingStop,
  draftMessage,
  onDraftChange,
  onRegisterMentionReady,
  onFocusReady
}: Readonly<ChatConversationViewProps>) {
  if (stableActiveConversation) {
    return (
      <>
        <ConversationHeader
          conversation={stableActiveConversation}
          onBack={isSingleViewMode ? onBack : undefined}
          onClose={onCloseConversation}
          onRemove={() => onRemoveConversation(stableActiveConversation.id)}
          onGroupSettings={onShowGroupSettings}
          onAddExpert={stableActiveConversation.type === 'group' ? onShowExpertSelector : undefined}
          onNudge={stableActiveConversation.type === 'direct' ? onNudge : undefined}
          onAudioCall={onAudioCall}
          onVideoCall={onVideoCall}
          onJoinCall={onJoinCall}
          showBackButton={isSingleViewMode}
          currentUserId={currentUserId}
          compact={viewMode === 'compact'}
          otherUserPresence={otherUserPresence}
          isCallEnabled={isCallEnabled}
          isInCall={isInCall}
          isStartingCall={isStartingCall}
          activeCall={activeCall}
          t={t}
        />
        {activeExperts.length > 0 && (
          <ActiveExpertsBar
            experts={activeExperts}
            onRemoveExpert={onRemoveExpert}
            data-testid={`${prefixDataTestId}-active-experts`}
          />
        )}
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          conversationType={stableActiveConversation.type}
          isLoading={messagesLoading}
          hasMore={hasMoreMessages}
          onLoadMore={onLoadMoreMessages}
          conversationId={activeConversationId}
          typingUsers={typingUsers}
          onReplyToAI={onReplyToAI}
          accessToken={accessToken}
          onSendMessage={onSendMessage}
          participants={stableActiveConversation.participants}
          apiClient={apiClient}
        />
        {isAIProcessing && (
          <div className="gba:px-4 gba:py-2 gba:border-t gba:border-border/30 gba:bg-muted/20">
            <div className="gba:flex gba:gap-2">
              <div className="gba:w-7 gba:h-7 gba:flex-shrink-0 gba:rounded-full gba:bg-gradient-to-br gba:from-primary gba:to-accent gba:flex gba:items-center gba:justify-center">
                <span className="gba:text-[10px] gba:text-primary-foreground gba:font-bold">AI</span>
              </div>
              <div className="gba:flex-1">
                <div className="gba:text-xs gba:font-semibold gba:text-primary gba:mb-1">✨ Every AI</div>
                {aiStreamingText ? (
                  <div className="gba:text-sm gba:text-foreground gba:bg-gradient-to-br gba:from-muted gba:to-accent/10 gba:rounded-lg gba:p-2 gba:border gba:border-primary/20">
                    <AIResponseRenderer content={aiStreamingText} accessToken={accessToken} />
                  </div>
                ) : (
                  <AIThinkingIndicator />
                )}
              </div>
            </div>
          </div>
        )}
        {isExpertProcessing && processingExpert && (
          <div
            className="gba:px-4 gba:py-3 gba:border-t gba:border-border/30"
            style={{
              backgroundColor: processingExpert.color ? `${processingExpert.color}10` : 'var(--nw-muted)'
            }}
          >
            <div className="gba:flex gba:gap-3 gba:items-center">
              <div
                className="gba:w-8 gba:h-8 gba:flex-shrink-0 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-bold gba:text-xs"
                style={{ backgroundColor: processingExpert.color || 'var(--nw-primary)' }}
              >
                {processingExpert.name.charAt(0).toUpperCase()}
              </div>
              <ExpertThinkingIndicator expertName={processingExpert.name} expertColor={processingExpert.color} />
            </div>
          </div>
        )}
        <MessageInput
          onSend={onSendMessageInput}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
          disabled={false}
          compact={viewMode !== 'full'}
          accessToken={accessToken}
          value={draftMessage}
          onChange={onDraftChange}
          onRegisterMentionReady={onRegisterMentionReady}
          onFocusReady={onFocusReady}
          activeExperts={activeExperts}
          t={t}
        />
      </>
    )
  }

  return (
    <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-6 gba:text-center">
      <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mb-4">
        <svg
          className="gba:w-8 gba:h-8 gba:text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <p className="gba:text-sm gba:text-muted-foreground gba:max-w-[200px]">{t('chat-selectConversation')}</p>
    </div>
  )
}
