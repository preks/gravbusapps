import { SpinnerGap, WarningCircle, Wrench } from '@phosphor-icons/react'
import type { RunningSessionSummary, WaitingSessionSummary } from '../../types/enterpriseAgent'

interface AgentStatusBarProps {
  runningSessions: RunningSessionSummary[]
  waitingForInputSessions: WaitingSessionSummary[]
  onClickRunning: (sessionId: string) => void
  onClickWaiting: (sessionId: string) => void
}

export const AgentStatusBar = ({
  runningSessions,
  waitingForInputSessions,
  onClickRunning,
  onClickWaiting
}: AgentStatusBarProps) => {
  const hasWaiting = waitingForInputSessions.length > 0
  const hasRunning = runningSessions.length > 0

  if (!hasWaiting && !hasRunning) return null

  return (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2 gba:shrink-0 gba:border-b gba:bg-muted gba:border-border gba:text-foreground gba:text-xs gba:font-medium"
      data-testid="enterprise-agent-status-bar"
    >
      {hasWaiting && (
        <>
          <WarningCircle className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-primary" />
          {waitingForInputSessions.map(s => (
            <button
              key={s.session_id}
              className="gba:underline gba:underline-offset-2 gba:hover:no-underline gba:truncate gba:max-w-sm"
              onClick={() => onClickWaiting(s.session_id)}
              data-testid={`enterprise-agent-status-waiting-${s.session_id}`}
            >
              Agent needs input on "{s.input.slice(0, 38)}..."
            </button>
          ))}
        </>
      )}

      {!hasWaiting && hasRunning && (
        <>
          <SpinnerGap className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:animate-spin gba:text-primary" />
          {runningSessions.length === 1 ? (
            <>
              <button
                className="gba:underline gba:underline-offset-2 gba:hover:no-underline gba:truncate gba:max-w-[240px]"
                onClick={() => onClickRunning(runningSessions[0].session_id)}
                data-testid="enterprise-agent-status-running"
              >
                {runningSessions[0].input.slice(0, 46)}
                {runningSessions[0].input.length > 46 ? '…' : ''}
              </button>

              {/* Step counter */}
              {runningSessions[0].step_count !== undefined && runningSessions[0].step_count > 0 && (
                <span className="gba:text-muted-foreground gba:shrink-0">· Step {runningSessions[0].step_count}</span>
              )}

              {/* Current tool name */}
              {runningSessions[0].current_step && (
                <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-muted-foreground gba:shrink-0">
                  <Wrench className="gba:h-3 gba:w-3" />
                  <span className="gba:font-mono gba:text-xs">{runningSessions[0].current_step}</span>
                </span>
              )}
            </>
          ) : (
            <span>{runningSessions.length} agents working in background</span>
          )}
        </>
      )}
    </div>
  )
}
