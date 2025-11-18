import React, { useEffect, useRef, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowBot } from './hooks/useFlowBot'
import { ChatInput } from './components/ChatInput'
import { FormSubmissionProvider } from './components/FormSubmissionContext'
import { ConversationRenderer } from './components/ConversationRenderer'
import { useCurrentUserPicture } from './hooks/useCurrentUserPicture'
import { RemindersPanel } from './components/RemindersPanel'
import { Button } from '@newwork/nw-design-system'

export interface EveryAIProps extends BusinessAppContextProps {
  className?: string
}

/**
 * EveryAI - Premium AI Assistant
 * The most advanced AI-powered assistant for NEWWORK ERP
 */
export const EveryAI: React.FC<EveryAIProps> = props => {
  const { accessToken, className, userInfo } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showRemindersPanel, setShowRemindersPanel] = useState(false)

  const { conversation, isLoading, sendMessage, clearConversation, nextStepProposals, isPrechatLoading } =
    useFlowBot(accessToken)

  // Fetch current user's picture
  const { pictureThumbnail } = useCurrentUserPicture(userInfo?.employeeDetails?.employeeId, accessToken)

  const extendedConversation = useMemo(() => {
    // Don't add loading if conversation already has it
    const lastTurn = conversation[conversation.length - 1]
    const hasLoadingOutput = lastTurn?.side === 'agent' && lastTurn.outputs?.some(o => o.type === 'loading')

    if (isLoading && !hasLoadingOutput) {
      return [...conversation, { side: 'agent' as const, outputs: [{ type: 'loading' as const }] }]
    }
    return conversation
  }, [conversation, isLoading])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [extendedConversation.length])

  const handleSend = (
    text: string,
    files: File[],
    isThinking: boolean,
    isSearching: boolean,
    mentions?: Array<{ id: string; typeKey: string; display: string; raw?: any; start?: number; end?: number }>
  ) => {
    sendMessage(text, files, isThinking, isSearching, mentions)
  }

  return (
    <div
      className={`gba:h-full gba:flex gba:flex-col gba:bg-background gba:relative gba:overflow-hidden ${className || ''}`}
      data-testid="every-ai-app"
    >
      {/* Reminders Bell Icon - Top Right */}
      <div className="gba:absolute gba:top-4 gba:right-4 gba:z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRemindersPanel(!showRemindersPanel)}
          className="gba:relative gba:p-2 gba:rounded-full gba:bg-card/80 gba:backdrop-blur-sm gba:border gba:border-border hover:gba:bg-accent gba:transition-all hover:gba:shadow-lg gba:group"
          data-testid="reminders-bell-button"
          title="My Reminders"
        >
          <svg
            className="gba:h-5 gba:w-5 gba:text-muted-foreground group-hover:gba:text-primary gba:transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </Button>
      </div>

      {/* Reminders Panel Overlay */}
      {showRemindersPanel && (
        <div className="gba:absolute gba:top-16 gba:right-4 gba:z-30">
          <RemindersPanel accessToken={accessToken} userInfo={userInfo} onClose={() => setShowRemindersPanel(false)} />
        </div>
      )}

      <FormSubmissionProvider>
        {/* Conversation Area with subtle gradient */}
        <div
          ref={scrollRef}
          className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:relative gba:z-10"
          data-testid="conversation-area"
        >
          {conversation.length === 0 && !isLoading ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center">
              {/* Premium welcome screen */}
              <div className="gba:relative gba:mb-6">
                <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-full gba:blur-2xl gba:opacity-40 gba:animate-pulse" />
                <div className="gba:h-24 gba:w-24 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-full gba:flex gba:items-center gba:justify-center gba:relative gba:shadow-2xl">
                  <svg
                    className="gba:h-12 gba:w-12 gba:text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>

              <h2 className="gba:text-3xl gba:font-bold gba:bg-gradient-to-r gba:from-primary gba:via-info gba:to-success gba:bg-clip-text gba:text-transparent gba:mb-3">
                Welcome to EveryAI
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-md gba:text-lg gba:mb-8">
                Your intelligent companion for managing tasks, analyzing data, and automating workflows across the
                entire platform.
              </p>

              {/* Feature highlights with icons */}
              <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:max-w-2xl gba:mb-8">
                {[
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    ),
                    label: 'Instant Answers'
                  },
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    ),
                    label: 'Data Insights'
                  },
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ),
                    label: 'Automation'
                  }
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:p-5 gba:rounded-xl gba:bg-card gba:border gba:border-border hover:gba:border-primary gba:transition-all gba:shadow-sm hover:gba:shadow-md gba:group"
                  >
                    <div className="gba:h-12 gba:w-12 gba:rounded-xl gba:bg-gradient-to-br gba:from-primary/10 gba:to-info/10 gba:flex gba:items-center gba:justify-center gba:text-primary group-hover:gba:scale-110 gba:transition-transform">
                      {feature.icon}
                    </div>
                    <span className="gba:text-sm gba:font-semibold gba:text-foreground">{feature.label}</span>
                  </div>
                ))}
              </div>

              <p className="gba:text-xs gba:text-muted-foreground gba:opacity-75">
                Type a question below or click a suggestion to get started
              </p>
            </div>
          ) : (
            <ConversationRenderer
              turns={extendedConversation}
              accessToken={accessToken}
              sendMessage={sendMessage}
              userInfo={userInfo}
              pictureThumbnail={pictureThumbnail}
            />
          )}
        </div>

        {/* Input Area with premium styling */}
        <div className="gba:flex-shrink-0 gba:border-t gba:border-border gba:bg-card/50 gba:backdrop-blur-md gba:p-6 gba:relative gba:z-10">
          <ChatInput
            onSend={handleSend}
            onClear={clearConversation}
            disabled={isLoading}
            suggestions={nextStepProposals}
            isPrechatLoading={isPrechatLoading}
            placeholder="Ask EveryAI anything..."
          />
        </div>
      </FormSubmissionProvider>
    </div>
  )
}

export default EveryAI
