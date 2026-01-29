import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardHeader, CardContent, CardTitle, Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { X, MessageSquare, Loader2 } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ScopeSelector } from './ScopeSelector'
import { useDocumentChat } from '../../hooks/useDocumentChat'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'

interface Space {
  id: string
  name: string
}

interface DocumentChatProps {
  userId: string
  userName?: string
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
  const [userAvatarSrc, setUserAvatarSrc] = useState<string | undefined>(undefined)

  const portalRoot = useMemo(() => {
    if (typeof document === 'undefined') return null
    const existing = document.getElementById('document-chat-portal')
    if (existing) return existing
    const el = document.createElement('div')
    el.id = 'document-chat-portal'
    document.body.appendChild(el)
    return el
  }, [])

  const { isConnected, currentSession, messages, isStreaming, streamingContent, error, createSession, sendMessage } =
    useDocumentChat({ userId, accessToken })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Load current user avatar (best-effort)
  useEffect(() => {
    if (!accessToken || !userId) return

    const normalizeImageSrc = (raw?: string): string | undefined => {
      if (!raw) return undefined
      const value = raw.trim()
      if (!value) return undefined
      if (
        value.startsWith('data:') ||
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('/')
      ) {
        return value
      }
      if (value.startsWith('iVBOR')) return `data:image/png;base64,${value}`
      if (value.startsWith('/9j/')) return `data:image/jpeg;base64,${value}`
      return `data:image/png;base64,${value}`
    }

    const query = `
      query GetEmployeeAvatar($userId: String!) {
        Employee(where: { userId: { _eq: $userId }, isDeleted: { _eq: false } }) {
          userId
          pictureThumbnail
        }
      }
    `

    let cancelled = false
    ;(async () => {
      try {
        graphQLClient.setAccessToken(accessToken)
        const res = await graphQLClient.request<{
          Employee: Array<{ userId?: string; pictureThumbnail?: string }>
        }>(query, { userId })

        const thumb = res?.Employee?.[0]?.pictureThumbnail
        const normalized = normalizeImageSrc(thumb)
        if (!cancelled) setUserAvatarSrc(normalized)
      } catch {
        // ignore (avatar is best-effort)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, userId])

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
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:border-b gba:border-border gba:bg-transparent">
            <div className="gba:flex gba:flex-col gba:gap-0.5">
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <MessageSquare className="gba:h-5 gba:w-5" />
                Ask your content
              </CardTitle>
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-xs gba:text-muted-foreground">
                  {userName ? `Hi, ${userName}` : 'Documents · Notes · Sheets'}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="chat-close-button">
              <X className="gba:h-4 gba:w-4" />
            </Button>
          </CardHeader>

          <CardContent className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:p-0 gba:bg-transparent">
            {/* Scope Selector */}
            <div className="gba:p-4 gba:border-b gba:border-border gba:bg-transparent">
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
                <ChatMessage key={msg.id} message={msg} userName={userName} userAvatarSrc={userAvatarSrc} />
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
