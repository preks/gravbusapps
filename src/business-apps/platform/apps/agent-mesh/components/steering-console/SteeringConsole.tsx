import { useState, useCallback, useRef, useEffect } from 'react'
import { Tabs, TabsContent } from '@newwork/nw-design-system'
import { Activity, Sparkles, Network } from 'lucide-react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { SteeringChat } from './SteeringChat'
import { ResultCanvas } from './ResultCanvas'
import { AgentCommFeed, type CommEvent } from './AgentCommFeed'
import { LiveTracePanel } from './LiveTracePanel'
import { SessionSidebar } from './SessionSidebar'
import { useSteeringSessions } from '../../hooks/useSteeringSessions'
import type { ExecutionTrace, SessionCommEvent } from '../../types/agentMesh'
import type { UserInfoProps } from '@/common/BusinessAppContext'

interface SteeringConsoleProps {
  accessToken: string
  userInfo?: UserInfoProps
}

const MIN_PANEL_WIDTH = 340
const MAX_PANEL_RATIO = 0.45
const DEFAULT_PANEL_WIDTH = 400

export const SteeringConsole = ({ accessToken, userInfo }: SteeringConsoleProps) => {
  const promptManagerClient = usePromptManagerClient(accessToken)
  const [result, setResult] = useState<string | null>(null)
  const [trace, setTrace] = useState<ExecutionTrace | null>(null)
  const [isTraceExpanded, setIsTraceExpanded] = useState(false)
  const [commEvents, setCommEvents] = useState<CommEvent[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [rightTab, setRightTab] = useState<string>('communication')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [isDragging, setIsDragging] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenIdsRef = useRef<Map<string, boolean>>(new Map())
  const pollSinceRef = useRef<string>('')
  const callerNameRef = useRef<string>('Steering Agent')
  const commEventsRef = useRef<CommEvent[]>([])
  // Latched correlation_id for the current execution run — filters out unrelated executions
  const currentCorrelationIdRef = useRef<string | null>(null)

  const sessionResetCb = useCallback(() => {
    setResult(null)
    setTrace(null)
    setCommEvents([])
  }, [])

  const {
    sessions,
    activeSessionId,
    activeSession,
    handleNewSession: rawNewSession,
    handleSelectSession: rawSelectSession,
    handleDeleteSession,
    handleSessionSave
  } = useSteeringSessions({ meshClient: promptManagerClient, userId: userInfo?.id, onReset: sessionResetCb })

  const handleNewSession = useCallback(() => {
    rawNewSession()
    setSidebarOpen(false)
  }, [rawNewSession])

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      const session = await rawSelectSession(sessionId)
      if (session) {
        setResult(session.result)
        setCommEvents(session.comm_events ?? [])
        setTrace(null)
      }
      setSidebarOpen(false)
    },
    [rawSelectSession]
  )

  const handleOpenHistory = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  // Resize handle logic (matching NexusLayout)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      const startX = e.clientX
      const startWidth = panelWidth

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
        const maxWidth = containerWidth * MAX_PANEL_RATIO
        const delta = moveEvent.clientX - startX
        setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(maxWidth, startWidth + delta)))
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [panelWidth]
  )

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => {
    commEventsRef.current = commEvents
  }, [commEvents])
  useEffect(() => () => stopPolling(), [stopPolling])

  const pollOnce = useCallback(async () => {
    try {
      const executions = await promptManagerClient.getMeshExecutions({
        limit: 20,
        ...(pollSinceRef.current ? { since: pollSinceRef.current } : {})
      })

      const sorted = [...executions].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return ta - tb
      })

      for (const exec of sorted) {
        // Latch onto the first correlation_id we see — all subsequent executions must match it.
        // This prevents executions from other users, previous queries, or unrelated runs
        // from bleeding into the current session's communication feed.
        if (!currentCorrelationIdRef.current && exec.correlation_id) {
          currentCorrelationIdRef.current = exec.correlation_id
        }
        if (currentCorrelationIdRef.current && exec.correlation_id !== currentCorrelationIdRef.current) {
          continue
        }

        const wasSeenAsComplete = seenIdsRef.current.get(exec.execution_id)
        const isDecision = exec.status === 'decision'
        const isComplete = exec.status === 'success' || exec.status === 'error' || exec.status === 'timeout'

        if (wasSeenAsComplete) continue
        seenIdsRef.current.set(exec.execution_id, isComplete || isDecision)

        if (isDecision) {
          const newEvent: CommEvent = {
            id: exec.execution_id,
            type: 'thinking',
            fromAgent: exec.prompt_name || callerNameRef.current,
            toAgent: '',
            query: exec.input_message || exec.input_preview || undefined,
            response: exec.output_message || exec.output_preview || undefined,
            status: 'success',
            durationMs: 0,
            timestamp: exec.created_at ? new Date(exec.created_at).getTime() : Date.now()
          }
          setCommEvents(prev => {
            if (prev.some(e => e.id === newEvent.id)) return prev
            return [...prev, newEvent]
          })
        } else {
          const newEvent: CommEvent = {
            id: exec.execution_id,
            type: 'response',
            fromAgent: exec.caller_name || callerNameRef.current,
            toAgent: exec.prompt_name,
            query: exec.input_message || exec.input_preview || undefined,
            response: isComplete ? exec.output_message || exec.output_preview || undefined : undefined,
            status: isComplete ? (exec.status === 'success' ? 'success' : 'error') : 'running',
            durationMs: exec.duration_ms,
            timestamp: exec.created_at ? new Date(exec.created_at).getTime() : Date.now()
          }

          setCommEvents(prev => {
            const idx = prev.findIndex(e => e.id === newEvent.id)
            if (idx >= 0) {
              const updated = [...prev]
              updated[idx] = newEvent
              return updated
            }
            return [...prev, newEvent]
          })
        }
      }

      if (currentCorrelationIdRef.current) {
        try {
          const traceData = await promptManagerClient.getMeshExecutionTrace(currentCorrelationIdRef.current)
          setTrace(traceData)
        } catch {
          /* best effort */
        }
      }
    } catch {
      /* polling is best-effort */
    }
  }, [promptManagerClient])

  const handleExecutionStart = useCallback(
    (agentName: string) => {
      setIsExecuting(true)
      setCommEvents([])
      setTrace(null)
      setRightTab('communication')
      setIsTraceExpanded(true)
      callerNameRef.current = agentName || 'Steering Agent'
      seenIdsRef.current = new Map()
      currentCorrelationIdRef.current = null
      pollSinceRef.current = new Date().toISOString()

      stopPolling()
      pollingRef.current = setInterval(pollOnce, 1200)
    },
    [stopPolling, pollOnce]
  )

  const handleExecutionEnd = useCallback(() => {
    pollOnce().then(() => {
      setIsExecuting(false)
      stopPolling()
    })
  }, [stopPolling, pollOnce])

  const handleResultUpdate = useCallback((newResult: string) => {
    setResult(newResult)
    setRightTab('result')
  }, [])

  const handleTraceUpdate = useCallback((newTrace: ExecutionTrace | null) => {
    setTrace(newTrace)
  }, [])

  const handleSessionSaveWithComm = useCallback(
    (
      messages: Array<{ id: string; role: string; content: string }>,
      agentId: string,
      agentName: string,
      currentResult: string | null
    ) => {
      const eventsForSession: SessionCommEvent[] = commEventsRef.current.map(e => ({
        id: e.id,
        type: e.type,
        fromAgent: e.fromAgent,
        toAgent: e.toAgent,
        query: e.query,
        response: e.response,
        status: e.status,
        durationMs: e.durationMs,
        timestamp: e.timestamp
      }))
      handleSessionSave(messages, agentId, agentName, currentResult, eventsForSession)
    },
    [handleSessionSave]
  )

  return (
    <div
      ref={containerRef}
      className="gba:flex gba:h-full gba:w-full gba:overflow-hidden gba:bg-background"
      data-testid="steering-console"
    >
      {/* Left panel: Chat or Session Sidebar */}
      <div
        className="gba:flex-shrink-0 gba:flex gba:flex-col gba:overflow-hidden gba:bg-background gba:border-r gba:border-border gba:transition-[width,opacity] gba:duration-500 gba:ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: panelWidth, opacity: 1 }}
        data-testid="steering-console-left-panel"
      >
        {sidebarOpen ? (
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onClose={handleCloseSidebar}
          />
        ) : (
          <SteeringChat
            accessToken={accessToken}
            sessionId={activeSessionId}
            initialMessages={activeSession?.messages}
            commEvents={commEvents}
            onResultUpdate={handleResultUpdate}
            onTraceUpdate={handleTraceUpdate}
            onExecutionStart={handleExecutionStart}
            onExecutionEnd={handleExecutionEnd}
            onSessionSave={handleSessionSaveWithComm}
            onOpenHistory={handleOpenHistory}
            onNewSession={handleNewSession}
          />
        )}
      </div>

      {/* Resize handle */}
      <div
        className={`gba:flex-shrink-0 gba:w-1 gba:-ml-px gba:cursor-col-resize gba:transition-colors gba:duration-200 gba:z-10 ${
          isDragging ? 'gba:bg-primary' : 'gba:bg-transparent gba:hover:bg-primary/30'
        }`}
        onMouseDown={handleMouseDown}
        data-testid="steering-console-resize-handle"
      />

      {/* Right panel: Tabs + LiveTrace */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:min-w-0">
        <Tabs value={rightTab} onValueChange={setRightTab} className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
          {/* Sleek underline tab header */}
          <div
            className="gba:flex gba:items-stretch gba:h-11 gba:border-b gba:border-border gba:bg-background gba:flex-shrink-0"
            data-testid="steering-console-right-tabs"
          >
            {/* Context icon */}
            <div className="gba:flex gba:items-center gba:px-3 gba:border-r gba:border-border/50 gba:text-muted-foreground">
              <Network className="gba:w-4 gba:h-4" />
            </div>

            {/* Communication tab */}
            <button
              className={`gba:h-full gba:px-4 gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium gba:border-b-2 gba:transition-all gba:duration-200 gba:outline-none gba:cursor-pointer ${
                rightTab === 'communication'
                  ? 'gba:border-primary gba:text-foreground'
                  : 'gba:border-transparent gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40'
              }`}
              onClick={() => setRightTab('communication')}
              data-testid="steering-console-tab-comm"
            >
              <Activity className="gba:w-3.5 gba:h-3.5 gba:flex-shrink-0" />
              <span>Agent Communication</span>
              {isExecuting && (
                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-pulse gba:flex-shrink-0" />
              )}
            </button>

            {/* Result tab */}
            <button
              className={`gba:h-full gba:px-4 gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium gba:border-b-2 gba:transition-all gba:duration-200 gba:outline-none gba:cursor-pointer ${
                rightTab === 'result'
                  ? 'gba:border-primary gba:text-foreground'
                  : 'gba:border-transparent gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40'
              }`}
              onClick={() => setRightTab('result')}
              data-testid="steering-console-tab-result"
            >
              <Sparkles className="gba:w-3.5 gba:h-3.5 gba:flex-shrink-0" />
              <span>Result</span>
              {result && !isExecuting && (
                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success gba:flex-shrink-0" />
              )}
            </button>
          </div>

          <TabsContent value="communication" className="gba:flex-1 gba:min-h-0 gba:m-0">
            <AgentCommFeed events={commEvents} isExecuting={isExecuting} />
          </TabsContent>

          <TabsContent value="result" className="gba:flex-1 gba:min-h-0 gba:m-0">
            <ResultCanvas result={result} />
          </TabsContent>
        </Tabs>

        <LiveTracePanel
          trace={trace}
          isExpanded={isTraceExpanded}
          onToggle={() => setIsTraceExpanded(prev => !prev)}
          liveEvents={[]}
          isExecuting={isExecuting}
        />
      </div>
    </div>
  )
}
