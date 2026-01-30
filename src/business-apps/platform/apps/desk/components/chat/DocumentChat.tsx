import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Card,
  CardContent,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { Loader2, MessageSquare } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ScopeSelector } from './ScopeSelector'
import { useDocumentChat } from '../../hooks/useDocumentChat'
import { DocumentChatHeader } from './DocumentChatHeader'
import { useCurrentUserAvatar } from './useCurrentUserAvatar'
import { useChatSessions } from './useChatSessions'

interface Space {
  id: string
  name: string
}

interface DocumentChatProps {
  userId: string
  userName?: string
  isOpen: boolean
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
  userName,
  isOpen,
  accessToken,
  scope,
  spaceId,
  spaces,
  onScopeChange,
  onSpaceChange,
  onClose
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const portalRoot = useMemo(() => {
    if (typeof document === 'undefined') return null
    const existing = document.getElementById('document-chat-portal')
    if (existing) return existing
    const el = document.createElement('div')
    el.id = 'document-chat-portal'
    document.body.appendChild(el)
    return el
  }, [])

  const {
    isConnected,
    currentSession,
    messages,
    isStreaming,
    streamingContent,
    error,
    createSession,
    joinSession,
    getUserSessions,
    deleteSession,
    sendMessage,
    lastSessionTitleUpdate
  } = useDocumentChat({ userId, accessToken })

  const userAvatarSrc = useCurrentUserAvatar(accessToken, userId)

  const { sessions, isLoadingSessions, handleSelectSession, handleNewSession, handleDeleteCurrentSession } = useChatSessions({
    userId,
    isConnected,
    currentSession,
    scope,
    spaceId,
    onScopeChange,
    onSpaceChange,
    createSession,
    joinSession,
    getUserSessions,
    deleteSession
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const [isTitleJustUpdated, setIsTitleJustUpdated] = useState(false)

  useEffect(() => {
    if (!lastSessionTitleUpdate) return
    if (lastSessionTitleUpdate.sessionId !== currentSession?.id) return
    setIsTitleJustUpdated(true)
    const t = setTimeout(() => setIsTitleJustUpdated(false), 900)
    return () => clearTimeout(t)
  }, [lastSessionTitleUpdate, currentSession?.id])

  // Handle scope/space changes - create new session
  const handleScopeChange = (newScope: 'all' | 'space') => {
    onScopeChange(newScope)
    if (newScope === 'all') {
      onSpaceChange(null)
    }
  }

  const handleSpaceChange = (newSpaceId: string | null) => {
    onSpaceChange(newSpaceId)
    onScopeChange(newSpaceId ? 'space' : 'all')
  }

  const handleSendMessage = (message: string) => {
    sendMessage(message, { scope, spaceId }).catch(err => console.error('Failed to send message:', err))
  }

  if (!isOpen) {
    return null
  }

  const content = (
    <Card
      className={[
        // Render as a true floating panel (portal to body avoids "fixed inside transformed parents")
        'gba:fixed gba:z-50 gba:flex gba:flex-col gba:overflow-hidden',
        'gba:top-24 gba:bottom-4 gba:inset-x-4',
        'gba:sm:top-24 gba:sm:bottom-6 gba:sm:left-auto gba:sm:right-6 gba:sm:w-96',
        'gba:bg-transparent gba:border gba:border-border gba:rounded-2xl'
      ].join(' ')}
      data-testid="document-chat-panel"
    >
      <div className="gba:relative gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
        {/* Glass background layers */}
        <div className="gba:absolute gba:inset-0 gba:bg-background gba:opacity-70 gba:backdrop-blur-xl" />
        <div className="gba:absolute gba:inset-0 gba:bg-muted gba:opacity-35" />

        <div className="gba:relative gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
          <DocumentChatHeader
            title={currentSession?.title}
            animateTitle={isTitleJustUpdated}
            sessions={sessions}
            isSessionsDisabled={!isConnected || isLoadingSessions || isStreaming || sessions.length === 0}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteCurrentSession}
            onClose={onClose}
            isStreaming={isStreaming}
            showDelete={Boolean(currentSession)}
            data-testid="document-chat-header"
          />

          <CardContent className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:p-0 gba:bg-transparent">
            {/* Scope Selector */}
            <div className="gba:px-4 gba:py-2 gba:border-b gba:border-border gba:bg-transparent">
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
            <div
              className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:p-4 gba:space-y-3"
              data-testid="chat-messages-container"
            >
              {messages.length === 0 && !isStreaming && isConnected && (
                <div className="gba:text-center gba:text-muted-foreground gba:py-10">
                  <div className="gba:mx-auto gba:mb-4 gba:h-12 gba:w-12 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                    <MessageSquare className="gba:h-6 gba:w-6" />
                  </div>
                  <p className="gba:text-sm gba:leading-relaxed">
                    Ask questions like “What did we decide about X?” or “Summarize my notes about Y”.
                  </p>
                </div>
              )}

              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  userName={userName}
                  userAvatarSrc={userAvatarSrc}
                  accessToken={accessToken}
                />
              ))}

              {isStreaming && (
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
                  userName={userName}
                  userAvatarSrc={userAvatarSrc}
                  accessToken={accessToken}
                />
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput
              onSend={handleSendMessage}
              disabled={!isConnected || isStreaming || !currentSession}
              placeholder={
                !isConnected ? 'Connecting...' : isStreaming ? 'Waiting for response...' : 'Ask a question...'
              }
            />
          </CardContent>
        </div>
      </div>
    </Card>
  )

  if (!portalRoot) return content
  return createPortal(content, portalRoot)
}
