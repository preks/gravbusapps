import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useNexusSocket } from './hooks/useNexusSocket'
import { useNexusSessions } from './hooks/useNexusSessions'
import { useArtifact } from './hooks/useArtifact'
import { useSpaces } from '@/business-apps/platform/apps/spaces/hooks/useSpaces'
import { useUserAvatar } from './hooks/useUserAvatar'
import { NexusLayout } from './components/layout/NexusLayout'
import { NexusSidebar } from './components/layout/NexusSidebar'
import { NexusChat } from './components/chat/NexusChat'
import { ArtifactCanvas } from './components/canvas/ArtifactCanvas'
import translations from './_i18n'

export interface NexusAppProps extends BusinessAppContextProps {
  'data-testid'?: string
}

const TEST_ID = 'nexus'

export const NexusApp: React.FC<NexusAppProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation(translations)
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''
  const userName = userInfo?.givenName || userInfo?.userName || t('app-user-fallback')

  const [scope, setScope] = useState<'all' | 'space' | 'none'>('all')
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatVisible, setChatVisible] = useState(false)
  const [prefillText, setPrefillText] = useState<string | null>(null)
  const [dataAccessEnabled, setDataAccessEnabled] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false)
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
    artifactsById,
    artifactStreaming,
    artifactStreamContent,
    thinkingStatus,
    thinkingSources,
    messageWebSources,
    createSession,
    joinSession,
    sendMessage,
    toggleDataAccess,
    toggleWebSearch,
    toggleDeepResearch,
    setActiveArtifact
  } = useNexusSocket({
    userId: currentUserId,
    accessToken: accessToken || ''
  })

  const {
    sessions,
    fetchSessions,
    deleteSession: deleteSessionApi
  } = useNexusSessions({ accessToken: accessToken || '' })

  const { saveArtifact, updateArtifact, waitForDocumentReady, fetchArtifact } = useArtifact({
    accessToken: accessToken || ''
  })

  const { spaces: rawSpaces } = useSpaces(accessToken, {
    includeMembers: false,
    includeContent: false
  })
  const spaces = rawSpaces.map(s => ({ id: s.id, name: s.name }))

  // Fetch current user's avatar
  const userAvatarUrl = useUserAvatar(userInfo?.employeeDetails?.employeeId, accessToken || '')

  // Sync dataAccessEnabled and webSearchEnabled from session whenever currentSession changes
  useEffect(() => {
    if (currentSession?.contextConfig?.dataAccessEnabled != null) {
      setDataAccessEnabled(currentSession.contextConfig.dataAccessEnabled)
    }
    if (currentSession?.contextConfig?.webSearchEnabled != null) {
      setWebSearchEnabled(currentSession.contextConfig.webSearchEnabled)
    }
    if (currentSession?.contextConfig?.deepResearchEnabled != null) {
      setDeepResearchEnabled(currentSession.contextConfig.deepResearchEnabled)
    }
  }, [currentSession])

  // Ensure chat is visible whenever there are messages or an active session
  useEffect(() => {
    if (messages.length > 0 || isStreaming || currentSession) {
      setChatVisible(true)
    }
  }, [messages.length, isStreaming, currentSession])

  // Send pending message once currentSession becomes available
  useEffect(() => {
    if (currentSession && pendingMessageRef.current) {
      const message = pendingMessageRef.current
      pendingMessageRef.current = null
      sendMessage(message, {
        scope,
        spaceId: spaceId || undefined,
        llmProvider,
        dataAccessEnabled,
        webSearchEnabled,
        deepResearchEnabled
      })
    }
  }, [
    currentSession,
    sendMessage,
    scope,
    spaceId,
    llmProvider,
    dataAccessEnabled,
    webSearchEnabled,
    deepResearchEnabled
  ])

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
        dataAccessEnabled,
        webSearchEnabled,
        deepResearchEnabled
      })
    },
    [
      currentSession,
      createSession,
      sendMessage,
      scope,
      spaceId,
      llmProvider,
      dataAccessEnabled,
      webSearchEnabled,
      deepResearchEnabled
    ]
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
        setWebSearchEnabled(session.contextConfig?.webSearchEnabled ?? false)
        setDeepResearchEnabled(session.contextConfig?.deepResearchEnabled ?? false)
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

  const handleWebSearchToggle = useCallback(
    (enabled: boolean) => {
      setWebSearchEnabled(enabled)
      toggleWebSearch(enabled)
    },
    [toggleWebSearch]
  )

  const handleDeepResearchToggle = useCallback(
    (enabled: boolean) => {
      setDeepResearchEnabled(enabled)
      toggleDeepResearch(enabled)
    },
    [toggleDeepResearch]
  )

  // Open chat panel (no text)
  const handleOpenChat = useCallback(() => {
    setChatVisible(true)
  }, [])

  const handleViewArtifact = useCallback(
    async (artifactId: string) => {
      try {
        const resolvedArtifact =
          artifactsById[artifactId] ||
          (activeArtifact?.id === artifactId ? activeArtifact : null) ||
          (await fetchArtifact(artifactId))

        if (resolvedArtifact) {
          setActiveArtifact(resolvedArtifact)
        }

        const root = document.querySelector<HTMLElement>(`[data-testid="${TEST_ID}-layout"]`)
        const canvas = root?.querySelector<HTMLElement>(`[data-testid="${TEST_ID}-canvas-panel"]`)
        canvas?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' })
      } catch {
        /* ignore */
      }
    },
    [activeArtifact, artifactsById, fetchArtifact, setActiveArtifact]
  )

  // Open chat + type suggestion text into the input (don't send yet)
  const handleSuggestionClick = useCallback((prompt: string) => {
    setChatVisible(true)
    // Small delay so the panel transition starts before the typing animation
    setTimeout(() => setPrefillText(prompt), 100)
  }, [])

  const handlePrefillComplete = useCallback(() => {
    setPrefillText(null)
  }, [])

  const handleSaveArtifact = useCallback(
    async (artifactId: string) => {
      return saveArtifact(artifactId)
    },
    [saveArtifact]
  )

  if (!accessToken) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground"
        data-testid={`${TEST_ID}-no-auth`}
      >
        {t('app-auth-required')}
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:w-full" data-testid={TEST_ID}>
      <NexusLayout
        sidebarOpen={sidebarOpen}
        chatVisible={chatVisible}
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
            thinkingStatus={thinkingStatus}
            thinkingSources={thinkingSources}
            messageWebSources={messageWebSources}
            isConnected={isConnected}
            userName={userName}
            userAvatarUrl={userAvatarUrl}
            accessToken={accessToken}
            scope={scope}
            spaceId={spaceId}
            spaces={spaces}
            artifactsById={artifactsById}
            sessionTitle={currentSession?.title}
            llmProvider={llmProvider}
            dataAccessEnabled={dataAccessEnabled}
            webSearchEnabled={webSearchEnabled}
            deepResearchEnabled={deepResearchEnabled}
            prefillText={prefillText}
            onPrefillComplete={handlePrefillComplete}
            onLlmProviderChange={setLlmProvider}
            onDataAccessToggle={handleDataAccessToggle}
            onWebSearchToggle={handleWebSearchToggle}
            onDeepResearchToggle={handleDeepResearchToggle}
            onSend={handleSend}
            onScopeChange={setScope}
            onSpaceChange={setSpaceId}
            onNewSession={handleNewSession}
            onOpenHistory={() => {
              fetchSessions()
              setSidebarOpen(true)
              setChatVisible(true)
            }}
            onViewArtifact={handleViewArtifact}
          />
        }
        canvasPanel={
          <ArtifactCanvas
            artifact={activeArtifact}
            artifactStreaming={artifactStreaming}
            artifactStreamContent={artifactStreamContent}
            accessToken={accessToken}
            onOpenChat={handleOpenChat}
            onSuggestionClick={handleSuggestionClick}
            onSaveArtifact={handleSaveArtifact}
            onUpdateArtifact={updateArtifact}
            onWaitForDocumentReady={waitForDocumentReady}
            onSetActiveArtifact={setActiveArtifact}
          />
        }
      />
    </div>
  )
}
