import { useEffect, useRef, useCallback } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { History, Plus, Sparkles, Zap, Brain, Database, MessageSquare, Globe, FlaskConical } from 'lucide-react'
import { NexusChatMessage } from './NexusChatMessage'
import { NexusChatInput } from './NexusChatInput'
import { NexusScopeSelector } from './NexusScopeSelector'
import type { NexusMessage, NexusArtifact } from '../../types/nexus.types'
import translations from '../../_i18n'

interface Space {
  id: string
  name: string
}

interface NexusChatProps {
  messages: NexusMessage[]
  isStreaming: boolean
  streamingContent: string
  thinkingStatus?: string | null
  thinkingSources?: Array<{ title: string; url: string }>
  messageWebSources?: Record<string, Array<{ title: string; url: string }>>
  isConnected: boolean
  userName?: string
  userAvatarUrl?: string
  accessToken: string
  scope: 'all' | 'space' | 'none'
  spaceId: string | null
  spaces: Space[]
  artifactsById: Record<string, NexusArtifact>
  sessionTitle?: string
  llmProvider?: string
  dataAccessEnabled: boolean
  webSearchEnabled: boolean
  deepResearchEnabled: boolean
  prefillText?: string | null
  onPrefillComplete?: () => void
  onLlmProviderChange: (provider?: string) => void
  onDataAccessToggle: (enabled: boolean) => void
  onWebSearchToggle: (enabled: boolean) => void
  onDeepResearchToggle: (enabled: boolean) => void
  onSend: (message: string) => void
  onScopeChange: (scope: 'all' | 'space' | 'none') => void
  onSpaceChange: (spaceId: string | null) => void
  onNewSession: () => void
  onOpenHistory: () => void
  /** Focus the canvas (e.g. after clicking “View” on an artifact teaser in the transcript). */
  onViewArtifact?: (artifactId: string) => void
  testId?: string
}

export const NexusChat = ({
  messages,
  isStreaming,
  streamingContent,
  thinkingStatus,
  thinkingSources,
  messageWebSources,
  isConnected,
  userName,
  userAvatarUrl,
  accessToken,
  scope,
  spaceId,
  spaces,
  artifactsById,
  sessionTitle,
  llmProvider,
  dataAccessEnabled,
  webSearchEnabled,
  deepResearchEnabled,
  prefillText,
  onPrefillComplete,
  onLlmProviderChange,
  onDataAccessToggle,
  onWebSearchToggle,
  onDeepResearchToggle,
  onSend,
  onScopeChange,
  onSpaceChange,
  onNewSession,
  onOpenHistory,
  onViewArtifact,
  testId = 'nexus-chat'
}: NexusChatProps) => {
  const { t } = useTranslation(translations)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)

  // Track whether the user has scrolled away from the bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUpRef.current = distanceFromBottom > 80
  }, [])

  // Auto-scroll only when user is near bottom (ChatGPT behaviour)
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingContent])

  // Always scroll to bottom when a new message is sent (messages array grows)
  const prevMessageCountRef = useRef(messages.length)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      userScrolledUpRef.current = false
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header — clean, minimal */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:border-b gba:border-border">
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:rounded-xl gba:hover:bg-muted"
          onClick={onOpenHistory}
          data-testid={`${testId}-history-btn`}
        >
          <History className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        </Button>

        <span className="gba:font-funnel-display gba:text-lg gba:font-semibold gba:text-primary gba:flex-1 gba:truncate">
          {sessionTitle || 'Nexus'}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:rounded-xl gba:hover:bg-muted"
          onClick={onNewSession}
          data-testid={`${testId}-new-session-btn`}
        >
          <Plus className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:py-4"
        data-testid={`${testId}-messages`}
      >
        {messages.length === 0 && !isStreaming && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:space-y-5">
            <div className="gba:relative">
              <div className="gba:h-14 gba:w-14 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                <MessageSquare className="gba:h-7 gba:w-7 gba:text-primary" />
              </div>
              <div className="gba:absolute gba:-bottom-1 gba:-right-1 gba:h-5 gba:w-5 gba:rounded-full gba:bg-primary gba:flex gba:items-center gba:justify-center">
                <Sparkles className="gba:h-2.5 gba:w-2.5 gba:text-primary-foreground" />
              </div>
            </div>
            <div className="gba:space-y-1.5">
              <p className="gba:text-base gba:font-bold gba:tracking-tight gba:text-foreground">
                {t('chat-empty-title')}
              </p>
              <p className="gba:text-xs gba:text-muted-foreground gba:max-w-[260px] gba:leading-relaxed">
                {t('chat-empty-description')}
              </p>
            </div>
          </div>
        )}

        {messages.map(message => (
          <NexusChatMessage
            key={message.id}
            message={message}
            userName={userName}
            userAvatarUrl={userAvatarUrl}
            accessToken={accessToken}
            artifactType={message.artifactId ? artifactsById[message.artifactId]?.type : undefined}
            onViewArtifact={onViewArtifact}
            thinkingSources={messageWebSources?.[message.id]}
          />
        ))}

        {/* Streaming assistant message */}
        {isStreaming && (
          <NexusChatMessage
            message={{
              id: 'streaming',
              sessionId: '',
              role: 'assistant',
              content: '',
              createdAt: new Date().toISOString()
            }}
            accessToken={accessToken}
            isStreaming
            streamingContent={streamingContent}
            thinkingStatus={thinkingStatus}
            thinkingSources={thinkingSources}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input with inline toolbar (ChatGPT style) */}
      <NexusChatInput
        onSend={onSend}
        disabled={isStreaming || !isConnected}
        prefillText={prefillText}
        onPrefillComplete={onPrefillComplete}
        toolbar={
          <>
            {/* LLM Provider pill — first */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-[11px] gba:font-semibold gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none ${
                    llmProvider === 'groq'
                      ? 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
                      : 'gba:bg-info-secondary gba:text-info-secondary-foreground gba:hover:opacity-90'
                  }`}
                  data-testid={`${testId}-llm-toggle`}
                  title={llmProvider === 'groq' ? t('chat-llm-fast-mode') : t('chat-llm-smart-mode')}
                >
                  {llmProvider === 'groq' ? (
                    <Zap className="gba:h-3.5 gba:w-3.5" />
                  ) : (
                    <Brain className="gba:h-3.5 gba:w-3.5" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => onLlmProviderChange('openai')}
                  data-testid={`${testId}-llm-option-openai`}
                >
                  <Brain className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-info" />
                  {llmProvider !== 'groq' ? t('chat-llm-smart-active') : t('chat-llm-smart-mode')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLlmProviderChange('groq')} data-testid={`${testId}-llm-option-groq`}>
                  <Zap className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-warning" />
                  {llmProvider === 'groq' ? t('chat-llm-fast-active') : t('chat-llm-fast-mode')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Content Scope pill */}
            <NexusScopeSelector
              scope={scope}
              spaceId={spaceId}
              spaces={spaces}
              onScopeChange={onScopeChange}
              onSpaceChange={onSpaceChange}
            />

            {/* Data Access pill — icon only when off, icon + label when on */}
            <button
              className={`gba:flex gba:items-center gba:justify-center gba:gap-1.5 gba:h-7 gba:rounded-full gba:text-[11px] gba:font-semibold gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none ${
                dataAccessEnabled
                  ? 'gba:px-2.5 gba:bg-success-secondary gba:text-success-secondary-foreground'
                  : 'gba:w-7 gba:bg-muted gba:text-muted-foreground gba:hover:bg-accent'
              }`}
              onClick={() => onDataAccessToggle(!dataAccessEnabled)}
              data-testid={`${testId}-data-access-toggle`}
              title={t('chat-data-access')}
            >
              <Database className="gba:h-3.5 gba:w-3.5 gba:flex-shrink-0" />
              {dataAccessEnabled && <span>{t('chat-data')}</span>}
            </button>

            {/* Web Search pill — icon only when off, icon + label when on */}
            <button
              className={`gba:flex gba:items-center gba:justify-center gba:gap-1.5 gba:h-7 gba:rounded-full gba:text-[11px] gba:font-semibold gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none ${
                webSearchEnabled
                  ? 'gba:px-2.5 gba:bg-info-secondary gba:text-info-secondary-foreground'
                  : 'gba:w-7 gba:bg-muted gba:text-muted-foreground gba:hover:bg-accent'
              }`}
              onClick={() => onWebSearchToggle(!webSearchEnabled)}
              data-testid={`${testId}-web-search-toggle`}
              title={t('chat-web-search')}
            >
              <Globe className="gba:h-3.5 gba:w-3.5 gba:flex-shrink-0" />
              {webSearchEnabled && <span>{t('chat-web')}</span>}
            </button>

            {/* Deep Research pill — icon only when off, icon + label when on */}
            <button
              className={`gba:flex gba:items-center gba:justify-center gba:gap-1.5 gba:h-7 gba:rounded-full gba:text-[11px] gba:font-semibold gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none ${
                deepResearchEnabled
                  ? 'gba:px-2.5 gba:bg-primary gba:text-primary-foreground'
                  : 'gba:w-7 gba:bg-muted gba:text-muted-foreground gba:hover:bg-accent'
              }`}
              onClick={() => onDeepResearchToggle(!deepResearchEnabled)}
              data-testid={`${testId}-deep-research-toggle`}
              title={t('chat-deep-research')}
            >
              <FlaskConical className="gba:h-3.5 gba:w-3.5 gba:flex-shrink-0" />
              {deepResearchEnabled && <span>{t('chat-deep-research')}</span>}
            </button>
          </>
        }
      />
    </div>
  )
}
