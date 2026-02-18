import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { SteeringChat } from './SteeringChat'
import { ResultCanvas } from './ResultCanvas'
import { AgentCommFeed, type CommEvent } from './AgentCommFeed'
import { LiveTracePanel } from './LiveTracePanel'
import { SessionSidebar } from './SessionSidebar'
import { useAgentMeshClient } from '../../hooks/useAgentMeshClient'
import { useSteeringSessions } from '../../hooks/useSteeringSessions'
import type { ExecutionTrace, SessionCommEvent } from '../../types/agentMesh'
import type { UserInfoProps } from '@/common/BusinessAppContext'

interface SteeringConsoleProps {
  accessToken: string
  userInfo?: UserInfoProps
}

export const SteeringConsole = ({ accessToken, userInfo }: SteeringConsoleProps) => {
  const meshClient = useAgentMeshClient(accessToken)
  const [result, setResult] = useState<string | null>(null)
  const [trace, setTrace] = useState<ExecutionTrace | null>(null)
  const [isTraceExpanded, setIsTraceExpanded] = useState(false)
  const [commEvents, setCommEvents] = useState<CommEvent[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [rightTab, setRightTab] = useState<string>('communication')

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenIdsRef = useRef<Map<string, boolean>>(new Map())
  const pollSinceRef = useRef<string>('')
  const callerNameRef = useRef<string>('Steering Agent')
  const commEventsRef = useRef<CommEvent[]>([])

  // Session management via hook
  const sessionResetCb = useCallback(() => {
    setResult(null)
    setTrace(null)
    setCommEvents([])
  }, [])

  const {
    sessions,
    activeSessionId,
    activeSession,
    handleNewSession,
    handleSelectSession: rawSelectSession,
    handleDeleteSession,
    handleSessionSave
  } = useSteeringSessions({ meshClient, userId: userInfo?.id, onReset: sessionResetCb })

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      const session = await rawSelectSession(sessionId)
      if (session) {
        setResult(session.result)
        setCommEvents(session.comm_events ?? [])
        setTrace(null)
      }
    },
    [rawSelectSession]
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
      const executions = await meshClient.getExecutions({
        limit: 20,
        ...(pollSinceRef.current ? { since: pollSinceRef.current } : {})
      })

      // Process executions sorted by created_at ascending (oldest first = decision before agents)
      const sorted = [...executions].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return ta - tb
      })

      for (const exec of sorted) {
        const wasSeenAsComplete = seenIdsRef.current.get(exec.execution_id)
        const isDecision = exec.status === 'decision'
        const isComplete = exec.status === 'success' || exec.status === 'error' || exec.status === 'timeout'

        // Skip if we already saw this event in its final state
        if (wasSeenAsComplete) continue

        // Mark decision events as complete immediately (they don't update)
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

      // Also update the trace live
      if (executions.length > 0) {
        const latest = executions[0]
        if (latest?.correlation_id) {
          try {
            const traceData = await meshClient.getExecutionTrace(latest.correlation_id)
            setTrace(traceData)
          } catch {
            /* best effort */
          }
        }
      }
    } catch {
      /* polling is best-effort */
    }
  }, [meshClient])

  const handleExecutionStart = useCallback(
    (agentName: string) => {
      setIsExecuting(true)
      setCommEvents([])
      setTrace(null)
      setRightTab('communication')
      setIsTraceExpanded(true)
      callerNameRef.current = agentName || 'Steering Agent'
      seenIdsRef.current = new Map()
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
      className="gba:flex gba:flex-col gba:h-full gba:w-full gba:overflow-hidden gba:bg-background"
      data-testid="steering-console"
    >
      <div className="gba:flex-1 gba:flex gba:min-h-0 gba:overflow-hidden">
        {/* Session sidebar */}
        <div className="gba:w-52 gba:flex-shrink-0 gba:overflow-hidden">
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
          />
        </div>

        <ResizablePanelGroup direction="horizontal" className="gba:flex-1 gba:min-h-0 gba:w-full">
          <ResizablePanel
            defaultSize={35}
            minSize={25}
            maxSize={50}
            className="gba:flex gba:flex-col gba:min-h-0 gba:border-r gba:border-border"
          >
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
            />
          </ResizablePanel>

          <ResizableHandle className="gba:w-1 gba:bg-border gba:hover:bg-primary/30" />

          <ResizablePanel defaultSize={65} minSize={40} className="gba:flex gba:flex-col gba:min-h-0">
            <Tabs value={rightTab} onValueChange={setRightTab} className="gba:flex gba:flex-col gba:h-full">
              <div className="gba:border-b gba:border-border gba:bg-card gba:px-4">
                <TabsList className="gba:h-9" data-testid="steering-console-right-tabs">
                  <TabsTrigger
                    value="communication"
                    className="gba:text-xs gba:gap-1.5"
                    data-testid="steering-console-tab-comm"
                  >
                    Agent Communication
                    {isExecuting && (
                      <span className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-pulse" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="result" className="gba:text-xs" data-testid="steering-console-tab-result">
                    Result
                    {result && <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success gba:ml-1" />}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="communication" className="gba:flex-1 gba:min-h-0 gba:m-0">
                <AgentCommFeed events={commEvents} isExecuting={isExecuting} />
              </TabsContent>

              <TabsContent value="result" className="gba:flex-1 gba:min-h-0 gba:m-0">
                <ResultCanvas result={result} />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <LiveTracePanel
        trace={trace}
        isExpanded={isTraceExpanded}
        onToggle={() => setIsTraceExpanded(prev => !prev)}
        liveEvents={[]}
        isExecuting={isExecuting}
      />
    </div>
  )
}
