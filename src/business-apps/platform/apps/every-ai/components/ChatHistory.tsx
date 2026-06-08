import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Button, Input, Spinner } from '@newwork/nw-design-system'
import { ChatsCircle, Trash, Plus, MagnifyingGlass } from '@phosphor-icons/react'
import { fetchChatListFromApi, deleteChatSession, type FlowBotSession } from '../hooks/useFlowBot'
import { useStreamStore } from '../streaming/streamStore'

const PAGE_SIZE = 15

interface ChatHistoryProps {
  accessToken: string
  onSessionSelect: (sessionId: string) => void
  onNewChat: () => void
  currentSessionId: string | null
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  accessToken,
  onSessionSelect,
  onNewChat,
  currentSessionId
}) => {
  const [sessions, setSessions] = useState<FlowBotSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const hasFetchedRef = useRef(false)
  // Map of sessionId -> active runId so we can render a "running"
  // indicator without coupling this component to the manager directly.
  // The store is the single source of truth that bootstrap + manager
  // keep in sync, so this works for both freshly-started runs and
  // background runs recovered after a hard refresh.
  const activeRunBySession = useStreamStore(s => s.activeRunBySession)

  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const sessionList = await fetchChatListFromApi(accessToken, PAGE_SIZE, 0)
      setSessions(sessionList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
      setHasMore(sessionList.length >= PAGE_SIZE)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const nextPage = await fetchChatListFromApi(accessToken, PAGE_SIZE, sessions.length)
      if (nextPage.length === 0) {
        setHasMore(false)
      } else {
        const existingIds = new Set(sessions.map(s => s.id))
        const newSessions = nextPage.filter(s => !existingIds.has(s.id))
        setSessions(prev =>
          [...prev, ...newSessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        )
        setHasMore(nextPage.length >= PAGE_SIZE)
      }
    } catch (error) {
      console.error('Failed to load more sessions:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [accessToken, sessions, isLoadingMore, hasMore])

  const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      session.title?.toLowerCase().includes(query) ||
      session.shortInfo?.toLowerCase().includes(query) ||
      session.id.toLowerCase().includes(query)
    )
  })

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      loadSessions()
      return
    }
    loadSessions()
  }, [currentSessionId, loadSessions])

  useEffect(() => {
    const handleRefresh = () => {
      loadSessions()
    }
    window.addEventListener('chat-history-refresh', handleRefresh)
    return () => {
      window.removeEventListener('chat-history-refresh', handleRefresh)
    }
  }, [loadSessions])

  const handleDeleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!confirm('Are you sure you want to delete this chat session?')) {
      return
    }
    try {
      await deleteChatSession(sessionId, accessToken)
      await loadSessions()
      if (sessionId === currentSessionId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid="chat-history">
      <div className="gba:flex gba:items-center gba:gap-2 gba:border-b gba:border-border/50 gba:bg-background/50 gba:backdrop-blur-sm gba:sticky gba:top-0 gba:z-10 gba:p-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <ChatsCircle className="gba:text-muted-foreground" size={20} weight="fill" />
          <h1 className="gba:text-lg gba:font-semibold gba:text-foreground">Chat History</h1>
        </div>
        <Button
          onClick={onNewChat}
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:flex-shrink-0"
          data-testid="new-chat-button"
          aria-label="Start a new chat"
        >
          <Plus className="gba:w-4 gba:h-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="gba:border-b gba:border-border/50 gba:p-3">
        <div className="gba:relative">
          <MagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="gba:h-8 gba:text-sm gba:!pl-10 gba:bg-background/50"
            data-testid="chat-history-search-input"
          />
        </div>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:min-h-0">
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:p-6">
            <Spinner size="sm" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="gba:p-6 gba:text-center">
            <p className="gba:text-sm gba:text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No chat sessions yet'}
            </p>
          </div>
        ) : (
          <div className="gba:py-1">
            {filteredSessions.map(session => {
              const sessionTitle = session.title || session.shortInfo || `Chat ${session.id.slice(0, 8)}`
              const isActiveSession = currentSessionId === session.id
              const isRunning = Boolean(activeRunBySession[session.id])
              return (
                <div
                  key={session.id}
                  className={`
                    gba:w-full gba:flex gba:items-center gba:transition-all gba:duration-150 gba:relative gba:group gba:mx-1 gba:rounded-lg
                    gba:gap-3 gba:px-3 gba:py-2.5
                    ${isActiveSession ? 'gba:bg-primary/10 gba:text-primary' : 'gba:hover:bg-muted/80'}
                  `}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <button
                    type="button"
                    onClick={() => onSessionSelect(session.id)}
                    className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0 gba:text-left gba:bg-transparent gba:border-0 gba:p-0 gba:cursor-pointer gba:focus:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-primary/60 gba:rounded-md"
                    data-testid={`chat-history-item-${session.id}`}
                    aria-label={`Open chat: ${sessionTitle}`}
                    aria-current={isActiveSession ? 'true' : undefined}
                  >
                    <div className="gba:relative gba:flex-shrink-0">
                      <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                        <ChatsCircle className="gba:w-5 gba:h-5 gba:text-primary" weight="fill" aria-hidden="true" />
                      </div>
                      {isActiveSession && (
                        <div
                          className="gba:absolute gba:bottom-0 gba:right-0 gba:w-3 gba:h-3 gba:rounded-full gba:bg-success gba:border-2 gba:border-background"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="gba:flex-1 gba:min-w-0 gba:flex gba:flex-col gba:gap-0.5">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:font-medium gba:text-sm gba:truncate gba:text-foreground">
                          {sessionTitle}
                        </span>
                        {isRunning && (
                          <span
                            className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-primary gba:uppercase"
                            title="Agent is still working on this chat in the background"
                            data-testid={`chat-history-running-${session.id}`}
                          >
                            <span className="gba:relative gba:flex gba:h-2 gba:w-2">
                              <span className="gba:animate-ping gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-primary gba:opacity-75" />
                              <span className="gba:relative gba:inline-flex gba:rounded-full gba:h-2 gba:w-2 gba:bg-primary" />
                            </span>
                            Running
                          </span>
                        )}
                        {isActiveSession && !isRunning && (
                          <span className="gba:text-[10px] gba:text-success gba:uppercase">Active</span>
                        )}
                      </div>
                      {session.shortInfo && (
                        <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[180px]">
                          {session.shortInfo}
                        </p>
                      )}
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:text-xs gba:text-muted-foreground">
                          {formatDate(session.updatedAt)} • {formatTime(session.updatedAt)}
                        </span>
                        {session.messageCount > 0 && (
                          <span className="gba:text-xs gba:text-muted-foreground">{session.messageCount} messages</span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="gba:flex gba:items-center">
                    <Button
                      onClick={e => handleDeleteSession(session.id, e)}
                      variant="ghost"
                      size="icon"
                      className="gba:h-7 gba:w-7 gba:opacity-50 hover:gba:opacity-100 gba:text-muted-foreground hover:gba:text-destructive"
                      data-testid={`chat-history-delete-${session.id}`}
                      aria-label={`Delete chat: ${sessionTitle}`}
                    >
                      <Trash className="gba:w-3.5 gba:h-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )
            })}

            {hasMore && !searchQuery && (
              <div className="gba:px-3 gba:py-3 gba:flex gba:justify-center">
                <Button
                  onClick={loadMore}
                  variant="ghost"
                  disabled={isLoadingMore}
                  className="gba:w-full gba:text-sm gba:text-muted-foreground hover:gba:text-foreground"
                  data-testid="chat-history-load-more"
                >
                  {isLoadingMore ? <Spinner size="sm" /> : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
