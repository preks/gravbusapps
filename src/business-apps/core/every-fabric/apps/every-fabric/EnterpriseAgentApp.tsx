import { useState, useCallback, useEffect, useMemo } from 'react'
import { BrainIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CreateHeroHeader } from '@/business-apps/core/create/components/CreateHeroHeader'
import { AgentSidebar } from './components/layout/AgentSidebar'
import { AgentStatusBar } from './components/layout/AgentStatusBar'
import { AgentChatView } from './components/chat/AgentChatView'
import { ActivityPanel } from './components/panels/ActivityPanel'
import { MemoryPanel } from './components/panels/MemoryPanel'
import { TracePanel } from './components/panels/TracePanel'
import { AgentTimeline } from './components/panels/AgentTimeline'
import { useAgentSessions } from './hooks/useAgentSessions'
import { useAgentSession } from './hooks/useAgentSession'
import { deriveActivityFromEvents } from './utils/messageUtils'

type AgentView = 'chat' | 'activity' | 'timeline' | 'memory' | 'trace'

const VIEW_LABELS: Record<AgentView, string> = {
  chat: 'Chat',
  activity: 'Activity',
  timeline: 'Timeline',
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

  const { sessions, addSession, updateSession, removeSession } = useAgentSessions(accessToken)
  const { session, messages, events, isConnected, isStreaming, isWaitingForInput, startSession, reply } =
    useAgentSession(activeSessionId, accessToken)

  useEffect(() => {
    if (!session) return
    updateSession(session)
  }, [session, updateSession])

  // Derive activity events directly from SSE events (step_started, subagent_spawned, etc.)
  const activityEvents = useMemo(() => deriveActivityFromEvents(events), [events])

  // Derive step metadata for the status bar
  const stepInfo = useMemo(() => {
    const stepStarted = events.filter(e => e.type === 'step_started' || e.type === 'subagent_spawned')
    const stepCompleted = new Set(
      events
        .filter(e => e.type === 'step_completed' || e.type === 'subagent_completed')
        .map(e => ('step_id' in e ? e.step_id : ''))
    )
    const runningSteps = stepStarted.filter(e => 'step_id' in e && !stepCompleted.has(e.step_id))
    const currentStep = runningSteps[runningSteps.length - 1]
    return {
      stepCount: stepStarted.length,
      currentStepName: currentStep && 'name' in currentStep ? (currentStep.name ?? undefined) : undefined
    }
  }, [events])

  const runningSessions = useMemo(
    () =>
      sessions
        .filter(s => s.status === 'running')
        .map(s => ({
          session_id: s.session_id,
          input: s.input,
          started_at: s.created_at,
          // Inject live step info for the active session
          ...(s.session_id === activeSessionId
            ? {
                step_count: stepInfo.stepCount || undefined,
                current_step: stepInfo.currentStepName
              }
            : {})
        })),
    [sessions, activeSessionId, stepInfo]
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
        icon={BrainIcon}
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
              {(['chat', 'activity', 'timeline', 'memory', 'trace'] as AgentView[]).map(view => {
                const showBadge = view === 'activity' && activityEvents.length > 0 && activeView !== 'activity'
                return (
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
                    {showBadge && (
                      <span className="gba:absolute gba:top-1.5 gba:right-1 gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary" />
                    )}
                  </button>
                )
              })}
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
            {activeView === 'activity' && <ActivityPanel events={activityEvents} isConnected={isConnected} />}
            {activeView === 'timeline' && <AgentTimeline events={events} isConnected={isConnected} />}
            {activeView === 'memory' && session && (
              <MemoryPanel accessToken={accessToken} sessionId={session.session_id} />
            )}
            {activeView === 'trace' && (
              <TracePanel
                trace={session?.trace}
                events={events.length > 0 ? events : undefined}
                sessionId={activeSessionId ?? 'none'}
                isConnected={isConnected}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
