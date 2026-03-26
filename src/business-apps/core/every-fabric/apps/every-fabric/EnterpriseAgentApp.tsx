import { useState, useCallback, useMemo } from 'react'
import { Brain } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CreateHeroHeader } from '@/business-apps/core/create/components/CreateHeroHeader'
import { AgentSidebar } from './components/layout/AgentSidebar'
import { AgentStatusBar } from './components/layout/AgentStatusBar'
import { AgentChatView } from './components/chat/AgentChatView'
import { ActivityPanel } from './components/panels/ActivityPanel'
import { MemoryPanel } from './components/panels/MemoryPanel'
import { TracePanel } from './components/panels/TracePanel'
import { useAgentSessions } from './hooks/useAgentSessions'
import { useAgentSession } from './hooks/useAgentSession'
import type { ActivityEvent } from './types/enterpriseAgent'

type AgentView = 'chat' | 'activity' | 'memory' | 'trace'

const VIEW_LABELS: Record<AgentView, string> = {
  chat: 'Chat',
  activity: 'Activity',
  memory: 'Memory',
  trace: 'Trace'
}

export interface EnterpriseAgentAppProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const EnterpriseAgentApp: React.FC<EnterpriseAgentAppProps> = ({
  accessToken,
  prefixDataTestId: testId = 'enterprise-agent'
}) => {
  const [activeView, setActiveView] = useState<AgentView>('chat')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const { sessions, addSession, removeSession } = useAgentSessions(accessToken)
  const { session, messages, isStreaming, isWaitingForInput, startSession, reply } = useAgentSession(
    activeSessionId,
    accessToken
  )

  // Derive activity events from SSE events for the ActivityPanel
  const activityEvents: ActivityEvent[] = useMemo(() => {
    if (!session) return []
    return messages
      .filter(m => m.type === 'tool_call' || m.type === 'plan' || m.type === 'reflection' || m.type === 'expert_call')
      .map(m => {
        const base = {
          id: m.id,
          timestamp: m.timestamp,
          durationMs: undefined as number | undefined
        }
        if (m.type === 'tool_call') {
          const c = m.content as { toolName: string; durationMs?: number }
          return {
            ...base,
            type: 'tool_call' as const,
            toolName: c.toolName,
            summary: `Called ${c.toolName}`,
            durationMs: c.durationMs
          }
        }
        if (m.type === 'plan') return { ...base, type: 'plan_update' as const, summary: 'Plan created' }
        if (m.type === 'reflection') return { ...base, type: 'reflection' as const, summary: 'Reflection performed' }
        if (m.type === 'expert_call') {
          const c = m.content as { agentId: string; task: string }
          return { ...base, type: 'subagent_spawn' as const, agent: c.agentId, summary: c.task }
        }
        return { ...base, type: 'plan_update' as const, summary: String(m.type) }
      })
  }, [messages, session])

  const runningSessions = useMemo(
    () =>
      sessions
        .filter(s => s.status === 'running')
        .map(s => ({ session_id: s.session_id, input: s.input, started_at: s.created_at })),
    [sessions]
  )
  const waitingSessions = useMemo(
    () =>
      sessions
        .filter(s => s.status === 'waiting_for_human')
        .map(s => ({ session_id: s.session_id, input: s.input, question: s.human_question ?? '' })),
    [sessions]
  )

  const handleStartSession = useCallback(
    async (task: string, config: Parameters<typeof startSession>[1]) => {
      const sessionId = await startSession(task, config)
      setActiveSessionId(sessionId)
      // Optimistically add to session list
      addSession({
        session_id: sessionId,
        input: task,
        status: 'running',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        config
      })
      return sessionId
    },
    [startSession, addSession]
  )

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id)
    setActiveView('chat')
  }, [])

  const handleNewSession = useCallback(() => {
    setActiveSessionId(null)
    setActiveView('chat')
  }, [])

  const handleDeleteSession = useCallback(
    (id: string) => {
      removeSession(id)
      if (activeSessionId === id) setActiveSessionId(null)
    },
    [activeSessionId, removeSession]
  )

  const handleStopSession = useCallback(async () => {
    if (!activeSessionId) return
    await removeSession(activeSessionId)
  }, [activeSessionId, removeSession])

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:bg-background" data-testid={testId}>
      {/* Hero header */}
      <CreateHeroHeader
        icon={Brain}
        appLabel="Enterprise Agent"
        title="Enterprise Agent"
        description="Your AI that plans, researches and executes — in the background"
        data-testid={`${testId}-hero`}
      />

      {/* Status bar for background jobs */}
      <AgentStatusBar
        runningSessions={runningSessions}
        waitingForInputSessions={waitingSessions}
        onClickRunning={id => {
          setActiveSessionId(id)
          setActiveView('chat')
        }}
        onClickWaiting={id => {
          setActiveSessionId(id)
          setActiveView('chat')
        }}
      />

      {/* Main body */}
      <div className="gba:flex-1 gba:overflow-hidden gba:flex">
        {/* Sidebar */}
        <div className="gba:w-64 gba:shrink-0 gba:border-r gba:border-border gba:hidden gba:md:block">
          <AgentSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
          />
        </div>

        {/* Main column */}
        <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:min-w-0">
          {/* View tab bar */}
          <div className="gba:shrink-0 gba:border-b gba:border-border gba:bg-background">
            <nav
              className="gba:flex gba:items-center gba:gap-1 gba:px-5 gba:overflow-x-auto gba:scrollbar-none"
              data-testid={`${testId}-nav`}
            >
              {(['chat', 'activity', 'memory', 'trace'] as AgentView[]).map(view => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`gba:relative gba:px-3 gba:py-2.5 gba:text-xs gba:font-medium gba:whitespace-nowrap gba:transition-colors gba:rounded-none gba:border-b-2 ${
                    activeView === view
                      ? 'gba:text-foreground gba:border-primary'
                      : 'gba:text-muted-foreground gba:border-transparent gba:hover:text-foreground'
                  }`}
                  data-testid={`${testId}-nav-${view}`}
                >
                  {VIEW_LABELS[view]}
                </button>
              ))}
            </nav>
          </div>

          {/* View content */}
          <div className="gba:flex-1 gba:overflow-hidden">
            {activeView === 'chat' && (
              <AgentChatView
                session={session}
                messages={messages}
                isStreaming={isStreaming}
                isWaitingForInput={isWaitingForInput}
                onStartSession={handleStartSession}
                onReply={reply}
                onStopSession={handleStopSession}
                onOpenMemory={() => setActiveView('memory')}
              />
            )}
            {activeView === 'activity' && <ActivityPanel events={activityEvents} isConnected={isStreaming} />}
            {activeView === 'memory' && session && (
              <MemoryPanel accessToken={accessToken} sessionId={session.session_id} />
            )}
            {activeView === 'trace' && <TracePanel trace={session?.trace} sessionId={activeSessionId ?? 'none'} />}
          </div>
        </div>
      </div>
    </div>
  )
}
