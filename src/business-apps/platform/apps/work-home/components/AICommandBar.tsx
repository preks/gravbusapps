import React, { useCallback, useState, useLayoutEffect, useMemo, useRef } from 'react'
import { Card, CardContent, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ArrowCounterClockwiseIcon, CaretDownIcon, CaretUpIcon, SparkleIcon } from '@phosphor-icons/react'
import { useFlowBot } from '@/business-apps/platform/apps/every-ai/hooks/useFlowBot'
import { ConversationRenderer } from '@/business-apps/platform/apps/every-ai/components/ConversationRenderer'
import { ChatInput } from '@/business-apps/platform/apps/every-ai/components/ChatInput'
import { FormSubmissionProvider } from '@/business-apps/platform/apps/every-ai/components/FormSubmissionContext'
import { FlowProposalFileUploadProvider } from '@/business-apps/platform/apps/every-ai/context/FlowProposalFileUploadContext'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import translations from '../_i18n'

interface AICommandBarProps {
  accessToken: string
  userInfo?: UserInfoProps
  'data-testid'?: string
}

const getAvatarSrc = (pictureThumbnail?: string): string | null => {
  const thumbnail = pictureThumbnail?.trim()

  if (!thumbnail || thumbnail.startsWith('{')) {
    return null
  }

  if (thumbnail.startsWith('data:') || /^https?:\/\//i.test(thumbnail)) {
    return thumbnail
  }

  if (thumbnail.startsWith('/9j/')) return `data:image/jpeg;base64,${thumbnail}`
  if (thumbnail.startsWith('iVBOR')) return `data:image/png;base64,${thumbnail}`
  if (thumbnail.startsWith('R0lGOD')) return `data:image/gif;base64,${thumbnail}`

  return `data:image/gif;base64,${thumbnail}`
}

export const AICommandBar: React.FC<AICommandBarProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'work-home-ai-bar'
}) => {
  const { t } = useTranslation(translations)
  const scrollRef = useRef<HTMLDivElement>(null)
  const preservedDistanceRef = useRef<number | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

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
    attachFilesForFlowProposalField,
    cancelGeneration,
    cancelledMessageText,
    clearCancelledMessage,
    loadMoreHistory,
    hasMoreHistory,
    isLoadingMoreHistory
  } = useFlowBot(accessToken, { isActive: true })

  const pictureThumbnail = useMemo(() => {
    return getAvatarSrc(userInfo?.employeeDetails?.pictureThumbnail)
  }, [userInfo])

  const hasConversation = conversation.length > 0

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const handleHeaderKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsExpanded(prev => !prev)
    }
  }, [])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !isExpanded) return
    if (preservedDistanceRef.current !== null) {
      const dist = preservedDistanceRef.current
      preservedDistanceRef.current = null
      el.scrollTop = Math.max(0, el.scrollHeight - dist)
      return
    }
    el.scrollTop = el.scrollHeight
  }, [conversation, isLoading, isExpanded])

  const handleLoadMore = useCallback(async () => {
    const el = scrollRef.current
    if (el) {
      preservedDistanceRef.current = el.scrollHeight - el.scrollTop
    }
    const count = await loadMoreHistory()
    if (count === 0) preservedDistanceRef.current = null
  }, [loadMoreHistory])

  const handleSend = useCallback(
    (text: string, files: File[], isThinking: boolean, isSearching: boolean) => {
      setIsExpanded(true)
      sendMessage(text, files, isThinking, isSearching)
    },
    [sendMessage]
  )

  const handleNewChat = useCallback(() => {
    clearConversation()
    setIsExpanded(true)
  }, [clearConversation])

  return (
    <Card className="gba:rounded-xl gba:overflow-hidden" data-testid={testId}>
      {/* Header — clickable to collapse/expand the EveryAI section. */}
      <div
        className={`gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-3 gba:cursor-pointer gba:hover:bg-muted/30 gba:transition-colors ${isExpanded ? 'gba:border-b gba:border-border/50' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={toggleExpanded}
        onKeyDown={handleHeaderKeyDown}
        data-testid={`${testId}-header`}
      >
        <div className="gba:flex gba:items-center gba:gap-2.5">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <SparkleIcon className="gba:h-4 gba:w-4 gba:text-primary" />
          </div>
          <div>
            <h3 className="gba:font-semibold gba:text-sm gba:text-foreground">{t('ai-bar-title')}</h3>
            <p className="gba:text-xs gba:text-muted-foreground">{t('ai-bar-subtitle')}</p>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-1">
          {hasConversation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                handleNewChat()
              }}
              className="gba:h-8 gba:px-2 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
              data-testid={`${testId}-new-chat-button`}
            >
              <ArrowCounterClockwiseIcon className="gba:h-3 gba:w-3 gba:mr-1" />
              {t('ai-bar-new-chat')}
            </Button>
          )}
          {isExpanded ? (
            <CaretUpIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          ) : (
            <CaretDownIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          )}
        </div>
      </div>

      <FormSubmissionProvider>
        <FlowProposalFileUploadProvider upload={attachFilesForFlowProposalField}>
          {/* Conversation area — collapsible */}
          {hasConversation && isExpanded && (
            <div ref={scrollRef} className="gba:overflow-y-auto gba:px-5 gba:py-4" style={{ maxHeight: '400px' }}>
              {hasMoreHistory && (
                <div className="gba:flex gba:justify-center gba:pb-3">
                  <Button
                    onClick={handleLoadMore}
                    variant="ghost"
                    size="sm"
                    disabled={isLoadingMoreHistory}
                    className="gba:text-sm gba:text-muted-foreground hover:gba:text-foreground"
                  >
                    {isLoadingMoreHistory ? <Spinner size="sm" /> : t('ai-bar-load-older')}
                  </Button>
                </div>
              )}
              <ConversationRenderer
                turns={conversation}
                accessToken={accessToken}
                sendMessage={sendMessage}
                editMessage={editMessage}
                userInfo={userInfo}
                pictureThumbnail={pictureThumbnail}
                sessionId={sessionId ?? undefined}
                onCancelGeneration={cancelGeneration}
                isAgentGenerating={isGenerating}
              />
            </div>
          )}

          {/* Input area — always visible */}
          {isExpanded && (
            <CardContent className={`gba:p-3 ${hasConversation ? 'gba:border-t gba:border-border/50' : ''}`}>
              <ChatInput
                onSend={handleSend}
                onClear={clearConversation}
                disabled={false}
                suggestions={nextStepProposals}
                isPrechatLoading={isPrechatLoading}
                placeholder={t('ai-bar-placeholder')}
                cancelledMessageText={cancelledMessageText}
                onClearCancelledMessage={clearCancelledMessage}
                accessToken={accessToken}
                compactSuggestions
              />
            </CardContent>
          )}
        </FlowProposalFileUploadProvider>
      </FormSubmissionProvider>
    </Card>
  )
}
