import { useEffect, useRef } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { History, Plus, Sparkles, Zap, Brain, Database, MessageSquare } from 'lucide-react'
import { NexusChatMessage } from './NexusChatMessage'
import { NexusChatInput } from './NexusChatInput'
import { NexusScopeSelector } from './NexusScopeSelector'
import type { NexusMessage, NexusArtifact } from '../../types/nexus.types'

interface Space {
  id: string
  name: string
}

interface NexusChatProps {
  messages: NexusMessage[]
  isStreaming: boolean
  streamingContent: string
  isConnected: boolean
  userName?: string
  accessToken: string
  scope: 'all' | 'space'
  spaceId: string | null
  spaces: Space[]
  activeArtifact: NexusArtifact | null
  sessionTitle?: string
  llmProvider?: string
  dataAccessEnabled: boolean
  prefillText?: string | null
  onPrefillComplete?: () => void
  onLlmProviderChange: (provider?: string) => void
  onDataAccessToggle: (enabled: boolean) => void
  onSend: (message: string) => void
  onScopeChange: (scope: 'all' | 'space') => void
  onSpaceChange: (spaceId: string | null) => void
  onNewSession: () => void
  onOpenHistory: () => void
  testId?: string
}

export const NexusChat = ({
  messages,
  isStreaming,
  streamingContent,
  isConnected,
  userName,
  accessToken,
  scope,
  spaceId,
  spaces,
  activeArtifact,
  sessionTitle,
  llmProvider,
  dataAccessEnabled,
  prefillText,
  onPrefillComplete,
  onLlmProviderChange,
  onDataAccessToggle,
  onSend,
  onScopeChange,
  onSpaceChange,
  onNewSession,
  onOpenHistory,
  testId = 'nexus-chat'
}: NexusChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

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

      {/* Scope Selector */}
      <NexusScopeSelector
        scope={scope}
        spaceId={spaceId}
        spaces={spaces}
        onScopeChange={onScopeChange}
        onSpaceChange={onSpaceChange}
      />

      {/* Messages */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:py-4" data-testid={`${testId}-messages`}>
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
              <p className="gba:text-base gba:font-bold gba:tracking-tight gba:text-foreground">Welcome to Nexus</p>
              <p className="gba:text-xs gba:text-muted-foreground gba:max-w-[260px] gba:leading-relaxed">
                Ask me anything about your documents, or instruct me to create content.
              </p>
            </div>
          </div>
        )}

        {messages.map(message => (
          <NexusChatMessage
            key={message.id}
            message={message}
            userName={userName}
            accessToken={accessToken}
            artifactType={
              message.artifactId && activeArtifact?.id === message.artifactId ? activeArtifact.type : undefined
            }
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
            {/* LLM Provider pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`gba:flex gba:items-center gba:gap-1.5 gba:h-7 gba:px-2.5 gba:rounded-full gba:text-[11px] gba:font-semibold gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none ${
                    llmProvider === 'groq'
                      ? 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
                      : 'gba:bg-info-secondary gba:text-info-secondary-foreground'
                  }`}
                  data-testid={`${testId}-llm-toggle`}
                >
                  {llmProvider === 'groq' ? <Zap className="gba:h-3 gba:w-3" /> : <Brain className="gba:h-3 gba:w-3" />}
                  {llmProvider === 'groq' ? 'Fast' : 'Smart'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => onLlmProviderChange('openai')}
                  data-testid={`${testId}-llm-option-openai`}
                >
                  <Brain className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-info" />
                  Smart {llmProvider !== 'groq' ? '(active)' : ''}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLlmProviderChange('groq')} data-testid={`${testId}-llm-option-groq`}>
                  <Zap className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-warning" />
                  Fast {llmProvider === 'groq' ? '(active)' : ''}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Data Access pill */}
            <button
              className={`gba:flex gba:items-center gba:gap-1.5 gba:h-7 gba:px-2.5 gba:rounded-full gba:text-[11px] gba:font-semibold gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none ${
                dataAccessEnabled
                  ? 'gba:bg-success-secondary gba:text-success-secondary-foreground'
                  : 'gba:bg-muted gba:text-muted-foreground gba:hover:bg-accent'
              }`}
              onClick={() => onDataAccessToggle(!dataAccessEnabled)}
              data-testid={`${testId}-data-access-toggle`}
            >
              <Database className="gba:h-3 gba:w-3" />
              Data
            </button>
          </>
        }
      />
    </div>
  )
}
