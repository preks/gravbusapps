import { useState, useCallback, useEffect, useRef } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useNexusSocket } from './hooks/useNexusSocket'
import { useNexusSessions } from './hooks/useNexusSessions'
import { useArtifact } from './hooks/useArtifact'
import { useSpaces } from '@/business-apps/platform/apps/spaces/hooks/useSpaces'
import { NexusLayout } from './components/layout/NexusLayout'
import { NexusSidebar } from './components/layout/NexusSidebar'
import { NexusChat } from './components/chat/NexusChat'
import { ArtifactCanvas } from './components/canvas/ArtifactCanvas'

export interface NexusAppProps extends BusinessAppContextProps {
  'data-testid'?: string
}

const TEST_ID = 'nexus'

export const NexusApp: React.FC<NexusAppProps> = ({ accessToken, userInfo }) => {
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''
  const userName = userInfo?.givenName || userInfo?.userName || 'User'

  const [scope, setScope] = useState<'all' | 'space'>('all')
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dataAccessEnabled, setDataAccessEnabled] = useState(false)
  const [llmProvider, setLlmProvider] = useState<string | undefined>(() => {
    try {
      return window.localStorage.getItem('nexus-llm-provider') || undefined
    } catch {
      return undefined
    }
  })

  // Persist provider choice
  useEffect(() => {
    try {
      if (llmProvider) window.localStorage.setItem('nexus-llm-provider', llmProvider)
    } catch {
      /* ignore */
    }
  }, [llmProvider])

  // Pending message to send once a session is available
  const pendingMessageRef = useRef<string | null>(null)

  // Hooks
  const {
    isConnected,
    currentSession,
    messages,
    isStreaming,
    streamingContent,
    activeArtifact,
    artifactStreaming,
    artifactStreamContent,
    createSession,
    joinSession,
    sendMessage,
    toggleDataAccess
  } = useNexusSocket({
    userId: currentUserId,
    accessToken: accessToken || ''
  })

  const {
    sessions,
    fetchSessions,
    deleteSession: deleteSessionApi
  } = useNexusSessions({ accessToken: accessToken || '' })

  const { saveArtifact } = useArtifact({ accessToken: accessToken || '' })

  const { spaces: rawSpaces } = useSpaces(accessToken, {
    includeMembers: false,
    includeContent: false
  })
  const spaces = rawSpaces.map(s => ({ id: s.id, name: s.name }))

  // Sync dataAccessEnabled from session whenever currentSession changes
  useEffect(() => {
    if (currentSession?.contextConfig?.dataAccessEnabled != null) {
      setDataAccessEnabled(currentSession.contextConfig.dataAccessEnabled)
    }
  }, [currentSession])

  // Send pending message once currentSession becomes available
  useEffect(() => {
    if (currentSession && pendingMessageRef.current) {
      const message = pendingMessageRef.current
      pendingMessageRef.current = null
      sendMessage(message, {
        scope,
        spaceId: spaceId || undefined,
        llmProvider,
        dataAccessEnabled
      })
    }
  }, [currentSession, sendMessage, scope, spaceId, llmProvider, dataAccessEnabled])

  // Create session on first message if none exists
  const handleSend = useCallback(
    (message: string) => {
      if (!currentSession) {
        pendingMessageRef.current = message
        createSession({ scope, spaceId: spaceId || undefined, llmProvider })
        return
      }
      sendMessage(message, {
        scope,
        spaceId: spaceId || undefined,
        llmProvider,
        dataAccessEnabled
      })
    },
    [currentSession, createSession, sendMessage, scope, spaceId, llmProvider, dataAccessEnabled]
  )

  const handleNewSession = useCallback(() => {
    createSession({ scope, spaceId: spaceId || undefined, llmProvider })
    setSidebarOpen(false)
  }, [createSession, scope, spaceId, llmProvider])

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      joinSession(sessionId)
      setSidebarOpen(false)
      const session = sessions.find(s => s.id === sessionId)
      if (session) {
        setScope(session.scope)
        setSpaceId(session.spaceId || null)
        setDataAccessEnabled(session.contextConfig?.dataAccessEnabled ?? false)
      }
    },
    [joinSession, sessions]
  )

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSessionApi(sessionId)
      fetchSessions()
    },
    [deleteSessionApi, fetchSessions]
  )

  const handleDataAccessToggle = useCallback(
    (enabled: boolean) => {
      setDataAccessEnabled(enabled)
      toggleDataAccess(enabled)
    },
    [toggleDataAccess]
  )

  const handleSuggestionClick = useCallback(
    (prompt: string) => {
      handleSend(prompt)
    },
    [handleSend]
  )

  const handleSaveArtifact = useCallback(
    async (artifactId: string, targetType: 'document' | 'slides') => {
      return saveArtifact(artifactId, targetType)
    },
    [saveArtifact]
  )

  if (!accessToken) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground"
        data-testid={`${TEST_ID}-no-auth`}
      >
        Authentication required
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:w-full" data-testid={TEST_ID}>
      <NexusLayout
        sidebarOpen={sidebarOpen}
        onSidebarClose={() => setSidebarOpen(false)}
        sidebar={
          <NexusSidebar
            sessions={sessions}
            currentSessionId={currentSession?.id}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onClose={() => setSidebarOpen(false)}
          />
        }
        chatPanel={
          <NexusChat
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            isConnected={isConnected}
            userName={userName}
            accessToken={accessToken}
            scope={scope}
            spaceId={spaceId}
            spaces={spaces}
            activeArtifact={activeArtifact}
            sessionTitle={currentSession?.title}
            llmProvider={llmProvider}
            dataAccessEnabled={dataAccessEnabled}
            onLlmProviderChange={setLlmProvider}
            onDataAccessToggle={handleDataAccessToggle}
            onSend={handleSend}
            onScopeChange={setScope}
            onSpaceChange={setSpaceId}
            onNewSession={handleNewSession}
            onOpenHistory={() => {
              fetchSessions()
              setSidebarOpen(true)
            }}
          />
        }
        canvasPanel={
          <ArtifactCanvas
            artifact={activeArtifact}
            artifactStreaming={artifactStreaming}
            artifactStreamContent={artifactStreamContent}
            accessToken={accessToken}
            onSuggestionClick={handleSuggestionClick}
            onSaveArtifact={handleSaveArtifact}
          />
        }
      />
    </div>
  )
}
