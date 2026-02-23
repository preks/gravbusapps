import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent, Alert, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import { Loader2, MessageSquare } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ScopeSelector } from './ScopeSelector'
import { useDocumentChat } from '../../hooks/useDocumentChat'
import { DocumentChatHeader } from './DocumentChatHeader'
import { useCurrentUserAvatar } from './useCurrentUserAvatar'
import { useChatSessions } from './useChatSessions'
import { env } from '@/common/env/EnvUtils'
import deskTranslations from '../../_i18n'

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
  const { t } = useTranslation(deskTranslations)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const providerStorageKey = useMemo(() => `desk-document-chat:llm-provider:${userId}`, [userId])
  const [llmProvider, setLlmProvider] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return env('NEXT_PUBLIC_DOCUMENT_CHAT_LLM_PROVIDER')
    const stored = window.localStorage.getItem(providerStorageKey)
    return stored || env('NEXT_PUBLIC_DOCUMENT_CHAT_LLM_PROVIDER')
  })

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (llmProvider) window.localStorage.setItem(providerStorageKey, llmProvider)
      else window.localStorage.removeItem(providerStorageKey)
    } catch {
      // ignore
    }
  }, [llmProvider, providerStorageKey])

  useEffect(() => {
    if (!currentSession?.llmProvider) return
    setLlmProvider(prev => (prev === currentSession.llmProvider ? prev : currentSession.llmProvider))
  }, [currentSession?.llmProvider])

  const userAvatarSrc = useCurrentUserAvatar(accessToken, userId)

  const {
    sessions,
    isLoadingSessions,
    handleSelectSession,
    handleNewSession,
    handleNewSessionWithProvider,
    handleDeleteCurrentSession
  } = useChatSessions({
    userId,
    isConnected,
    currentSession,
    scope,
    spaceId,
    llmProvider,
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
    sendMessage(message, { scope, spaceId, llmProvider }).catch(err => console.error('Failed to send message:', err))
  }

  if (!isOpen) {
    return null
  }

  const content = (
    <Card
      className={[
        // Render as a true floating panel (portal to body avoids "fixed inside transformed parents")
        'gba:fixed gba:z-50 gba:flex gba:flex-col gba:overflow-hidden',
        'gba:top-20 gba:bottom-4 gba:inset-x-4',
        'gba:sm:top-20 gba:sm:bottom-6 gba:sm:left-auto gba:sm:right-6 gba:sm:w-[480px]',
        'gba:bg-background/95 gba:backdrop-blur-xl gba:border gba:border-border/50 gba:rounded-2xl'
      ].join(' ')}
      data-testid="document-chat-panel"
    >
      <div className="gba:relative gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
        {/* Subtle gradient overlay for depth */}
        <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-muted/20 gba:via-transparent gba:to-muted/10 gba:pointer-events-none gba:rounded-2xl" />

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
            llmProvider={llmProvider}
            onLlmProviderChange={next => {
              setLlmProvider(next)
              handleNewSessionWithProvider(next)
            }}
            data-testid="document-chat-header"
          />

          <CardContent className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:p-0">
            {/* Scope Selector */}
            <div className="gba:px-4 gba:py-2.5 gba:border-b gba:border-border/40 gba:bg-muted/30">
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
              <Alert className="gba:m-4 gba:rounded-xl">
                <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                <AlertDescription>{t('chat-connecting')}</AlertDescription>
              </Alert>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive" className="gba:m-4 gba:rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Messages */}
            <div
              className="gba:flex-1 gba:min-h-0 gba:overflow-auto gba:px-4 gba:py-4 gba:space-y-4"
              data-testid="chat-messages-container"
            >
              {messages.length === 0 && !isStreaming && isConnected && (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:py-12">
                  <div className="gba:relative gba:mb-5">
                    <div className="gba:absolute gba:inset-0 gba:bg-primary/15 gba:rounded-full gba:blur-xl" />
                    <div className="gba:relative gba:h-16 gba:w-16 gba:rounded-full gba:bg-gradient-to-br gba:from-primary/20 gba:to-primary/5 gba:border gba:border-primary/20 gba:flex gba:items-center gba:justify-center">
                      <MessageSquare className="gba:h-7 gba:w-7 gba:text-primary/70" />
                    </div>
                  </div>
                  <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">{t('chat-ask-anything')}</h4>
                  <p className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed gba:max-w-[240px]">
                    {t('chat-placeholder-example')}
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
                !isConnected
                  ? t('chat-placeholder-connecting')
                  : isStreaming
                    ? t('chat-placeholder-waiting')
                    : t('chat-placeholder-ask')
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
