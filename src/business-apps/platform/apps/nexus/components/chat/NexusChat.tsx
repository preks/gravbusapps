import { useEffect, useRef } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { History, Plus, Sparkles, Zap, Brain, Database } from 'lucide-react'
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
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:border-b gba:border-border">
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8"
          onClick={onOpenHistory}
          data-testid={`${testId}-history-btn`}
        >
          <History className="gba:h-4 gba:w-4" />
        </Button>

        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
          <Sparkles className="gba:h-4 gba:w-4 gba:text-primary gba:flex-shrink-0" />
          <span className="gba:text-sm gba:font-medium gba:truncate">{sessionTitle || 'Nexus'}</span>
        </div>

        {/* LLM Provider Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-8 gba:gap-1.5 gba:text-xs gba:px-2"
              data-testid={`${testId}-llm-toggle`}
            >
              {llmProvider === 'groq' ? (
                <Zap className="gba:h-3.5 gba:w-3.5 gba:text-warning" />
              ) : (
                <Brain className="gba:h-3.5 gba:w-3.5 gba:text-primary" />
              )}
              {llmProvider === 'groq' ? 'Fast' : 'Smart'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onLlmProviderChange('openai')} data-testid={`${testId}-llm-option-openai`}>
              <Brain className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-primary" />
              Smart {llmProvider !== 'groq' ? '(active)' : ''}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLlmProviderChange('groq')} data-testid={`${testId}-llm-option-groq`}>
              <Zap className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-warning" />
              Fast {llmProvider === 'groq' ? '(active)' : ''}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={dataAccessEnabled ? 'secondary' : 'ghost'}
          size="sm"
          className="gba:h-8 gba:gap-1.5 gba:text-xs gba:px-2"
          onClick={() => onDataAccessToggle(!dataAccessEnabled)}
          data-testid={`${testId}-data-access-toggle`}
        >
          <Database
            className={`gba:h-3.5 gba:w-3.5 ${dataAccessEnabled ? 'gba:text-success' : 'gba:text-muted-foreground'}`}
          />
          Data
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8"
          onClick={onNewSession}
          data-testid={`${testId}-new-session-btn`}
        >
          <Plus className="gba:h-4 gba:w-4" />
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
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:space-y-3">
            <Sparkles className="gba:h-8 gba:w-8 gba:text-muted-foreground" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">Welcome to Nexus</p>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                Ask questions about your documents, or instruct me to create content.
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

      {/* Input */}
      <NexusChatInput onSend={onSend} disabled={isStreaming || !isConnected} />
    </div>
  )
}
