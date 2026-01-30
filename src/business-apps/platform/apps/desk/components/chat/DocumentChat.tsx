import React, { useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { X, MessageSquare, Loader2 } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ScopeSelector } from './ScopeSelector'
import { useDocumentChat } from '../../hooks/useDocumentChat'

interface Space {
  id: string
  name: string
}

interface DocumentChatProps {
  userId: string
  accessToken: string
  scope: 'all' | 'space'
  spaceId: string | null
  spaces: Space[]
  onScopeChange: (scope: 'all' | 'space') => void
  onSpaceChange: (spaceId: string | null) => void
  onClose: () => void
}

export const DocumentChat: React.FC<DocumentChatProps> = ({
  userId,
  accessToken,
  scope,
  spaceId,
  spaces,
  onScopeChange,
  onSpaceChange,
  onClose
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const { isConnected, currentSession, messages, isStreaming, streamingContent, error, createSession, sendMessage } =
    useDocumentChat({ userId, accessToken })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Initialize session on mount
  useEffect(() => {
    if (isConnected && !isInitialized && !currentSession) {
      createSession({
        scope,
        spaceId: spaceId || undefined
      })
        .then(() => setIsInitialized(true))
        .catch(err => console.error('Failed to initialize session:', err))
    }
  }, [isConnected, isInitialized, currentSession, scope, spaceId, createSession])

  // Handle scope/space changes - create new session
  const handleScopeChange = (newScope: 'all' | 'space') => {
    onScopeChange(newScope)
    if (newScope === 'all') {
      onSpaceChange(null)
      createNewSession('all', null)
    }
  }

  const handleSpaceChange = (newSpaceId: string | null) => {
    onSpaceChange(newSpaceId)
    if (newSpaceId) {
      createNewSession('space', newSpaceId)
    }
  }

  const createNewSession = (newScope: 'all' | 'space', newSpaceId: string | null) => {
    createSession({
      scope: newScope,
      spaceId: newSpaceId || undefined
    }).catch(err => console.error('Failed to create new session:', err))
  }

  const handleSendMessage = (message: string) => {
    sendMessage(message).catch(err => console.error('Failed to send message:', err))
  }

  return (
    <Card
      className="gba:fixed gba:right-6 gba:bottom-6 gba:w-[400px] gba:h-[600px] gba:shadow-lg gba:z-50"
      data-testid="document-chat-panel"
    >
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:border-b">
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <MessageSquare className="gba:h-5 gba:w-5" />
          Document Q&A
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose} data-testid="chat-close-button">
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </CardHeader>

      <CardContent className="gba:flex gba:flex-col gba:h-[calc(100%-4rem)] gba:p-0">
        {/* Scope Selector */}
        <div className="gba:p-4 gba:border-b">
          <ScopeSelector
            scope={scope}
            selectedSpaceId={spaceId}
            spaces={spaces}
            onScopeChange={handleScopeChange}
            onSpaceChange={handleSpaceChange}
            disabled={isStreaming}
          />
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <Alert variant="info" className="gba:m-4">
            <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
            <AlertDescription>Connecting to chat service...</AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="gba:m-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Messages */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:space-y-4" data-testid="chat-messages-container">
          {messages.length === 0 && !isStreaming && isConnected && (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">
              <MessageSquare className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
              <p className="gba:text-sm">Ask a question about your documents, notes, or spreadsheets</p>
            </div>
          )}

          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isStreaming && streamingContent && (
            <ChatMessage
              message={{
                id: 'streaming',
                sessionId: currentSession?.id || '',
                role: 'assistant',
                content: streamingContent,
                sources: [],
                createdAt: new Date().toISOString()
              }}
              isStreaming={true}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={!isConnected || isStreaming || !currentSession}
          placeholder={!isConnected ? 'Connecting...' : isStreaming ? 'Waiting for response...' : 'Ask a question...'}
        />
      </CardContent>
    </Card>
  )
}
