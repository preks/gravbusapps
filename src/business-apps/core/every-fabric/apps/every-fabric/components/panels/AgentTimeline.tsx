import { useMemo, useState } from 'react'
import { CaretDown, CaretRight, Check, ShareNetwork, SpinnerGap, Wrench, X } from '@phosphor-icons/react'
import type {
  AgentStreamEvent,
  AgentStepCompletedEvent,
  AgentStepStartedEvent,
  AgentSubagentCompletedEvent,
  AgentSubagentSpawnedEvent
} from '../../types/enterpriseAgent'
import { toolCategoryColor } from '../../utils/renderUtils'

interface AgentTimelineProps {
  events: AgentStreamEvent[]
  isConnected: boolean
}

type StepStatus = 'running' | 'done' | 'failed'

interface TimelineStep {
  stepId: string
  name: string
  isSubagent: boolean
  status: StepStatus
  input?: Record<string, unknown>
  output?: string
  durationMs?: number
  timestamp: string
  seq: number
}

function buildTimeline(events: AgentStreamEvent[]): TimelineStep[] {
  const startedMap = new Map<string, AgentStepStartedEvent | AgentSubagentSpawnedEvent>()
  const completedMap = new Map<string, AgentStepCompletedEvent | AgentSubagentCompletedEvent>()

  for (const event of events) {
    if (event.type === 'step_started' || event.type === 'subagent_spawned') {
      startedMap.set(event.step_id, event)
    }
    if (event.type === 'step_completed' || event.type === 'subagent_completed') {
      completedMap.set(event.step_id, event)
    }
  }

  const steps: TimelineStep[] = []
  for (const [stepId, started] of startedMap) {
    const completed = completedMap.get(stepId)
    const isSubagent = started.type === 'subagent_spawned'
    const taskSummary = isSubagent && 'task_summary' in started ? started.task_summary : undefined
    steps.push({
      stepId,
      name: started.name ?? taskSummary ?? stepId,
      isSubagent,
      status: completed ? (completed.status === 'failed' ? 'failed' : 'done') : 'running',
      input: !isSubagent && 'input' in started ? (started.input as Record<string, unknown> | undefined) : undefined,
      output: completed?.output,
      durationMs: completed?.duration_ms,
      timestamp: started.timestamp,
      seq: started.seq
    })
  }

  return steps.sort((a, b) => a.seq - b.seq)
}

const STATUS_ICON: Record<StepStatus, React.ReactNode> = {
  running: <SpinnerGap className="gba:h-4 gba:w-4 gba:animate-spin gba:text-primary gba:shrink-0" />,
  done: <Check className="gba:h-4 gba:w-4 gba:text-green-500 gba:shrink-0" />,
  failed: <X className="gba:h-4 gba:w-4 gba:text-destructive gba:shrink-0" />
}

const STATUS_LINE: Record<StepStatus, string> = {
  running: 'gba:bg-primary/40 gba:animate-pulse',
  done: 'gba:bg-green-500/40',
  failed: 'gba:bg-destructive/40'
}

function TimelineStepRow({ step, isLast }: { step: TimelineStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = !!(step.input || step.output)

  return (
    <div className="gba:flex gba:gap-3">
      {/* Connector line */}
      <div className="gba:flex gba:flex-col gba:items-center gba:shrink-0">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:border gba:border-border gba:bg-background gba:z-10">
          {step.isSubagent ? (
            <ShareNetwork className="gba:h-3.5 gba:w-3.5 gba:text-purple-500" />
          ) : (
            <Wrench className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
          )}
        </div>
        {!isLast && (
          <div className={`gba:w-0.5 gba:flex-1 gba:min-h-4 gba:mt-1 gba:rounded-full ${STATUS_LINE[step.status]}`} />
        )}
      </div>

      {/* Step content */}
      <div className="gba:flex-1 gba:pb-4 gba:min-w-0">
        <button
          className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:text-left gba:group"
          onClick={() => hasDetails && setExpanded(v => !v)}
          disabled={!hasDetails}
        >
          {STATUS_ICON[step.status]}

          {step.isSubagent ? (
            <span className="gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:text-xs gba:font-mono gba:font-semibold gba:bg-purple-100 gba:text-purple-700 dark:gba:bg-purple-900/30 dark:gba:text-purple-300">
              {step.name}
            </span>
          ) : (
            <span
              className={`gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:text-xs gba:font-mono gba:font-semibold ${toolCategoryColor(step.name)}`}
            >
              {step.name}
            </span>
          )}

          {step.durationMs !== undefined && (
            <span className="gba:text-xs gba:text-muted-foreground/60">{(step.durationMs / 1000).toFixed(2)}s</span>
          )}

          {step.status === 'running' && (
            <span className="gba:text-xs gba:text-primary gba:font-medium gba:animate-pulse">running…</span>
          )}

          {hasDetails && (
            <div className="gba:ml-auto gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity">
              {expanded ? (
                <CaretDown className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
              ) : (
                <CaretRight className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
              )}
            </div>
          )}
        </button>

        {expanded && (
          <div className="gba:mt-2 gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-3 gba:space-y-2">
            {step.input && (
              <div>
                <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
                  Input
                </p>
                <pre className="gba:text-xs gba:font-mono gba:bg-muted gba:rounded gba:p-2 gba:overflow-x-auto gba:whitespace-pre-wrap gba:max-h-32">
                  {JSON.stringify(step.input, null, 2)}
                </pre>
              </div>
            )}
            {step.output && (
              <div>
                <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
                  Output
                </p>
                <p className="gba:text-xs gba:text-foreground gba:whitespace-pre-wrap gba:max-h-32 gba:overflow-y-auto">
                  {step.output}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const AgentTimeline = ({ events, isConnected }: AgentTimelineProps) => {
  const steps = useMemo(() => buildTimeline(events), [events])
  const runningCount = steps.filter(s => s.status === 'running').length
  const doneCount = steps.filter(s => s.status === 'done').length

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="enterprise-agent-timeline">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:border-b gba:border-border gba:shrink-0">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
          Timeline
        </span>
        {steps.length > 0 && (
          <span className="gba:text-xs gba:text-muted-foreground">
            {doneCount}/{steps.length} steps
          </span>
        )}
        {isConnected && runningCount > 0 && (
          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-primary gba:ml-auto gba:font-medium">
            <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-pulse" />
            {runningCount} running
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
        {steps.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-2">
            <p className="gba:text-xs gba:text-muted-foreground">
              {isConnected ? 'Waiting for agent steps…' : 'No steps yet'}
            </p>
            {isConnected && <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-pulse" />}
          </div>
        ) : (
          <div>
            {steps.map((step, idx) => (
              <TimelineStepRow key={step.stepId} step={step} isLast={idx === steps.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
