import { ArrowsClockwise, Brain, Database, ListChecks, ShareNetwork, Wrench } from '@phosphor-icons/react'
import type { ActivityEvent } from '../../types/enterpriseAgent'
import { formatRelativeTime } from '../../utils/renderUtils'
import { toolCategoryColor } from '../../utils/renderUtils'

interface ActivityPanelProps {
  events: ActivityEvent[]
  isConnected: boolean
}

const EVENT_ICON: Record<ActivityEvent['type'], React.ReactNode> = {
  tool_call: <Wrench className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  tool_result: <ArrowsClockwise className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  plan_update: <ListChecks className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  reflection: <Brain className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  subagent_spawn: <ShareNetwork className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  memory_access: <Database className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
}

export const ActivityPanel = ({ events, isConnected }: ActivityPanelProps) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="enterprise-agent-activity-panel">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:border-b gba:border-border gba:flex-shrink-0">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
          Activity
        </span>
        {isConnected && (
          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:ml-auto">
            <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Event feed */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:py-2">
        {events.length === 0 && (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
            <p className="gba:text-xs gba:text-muted-foreground">No activity yet</p>
          </div>
        )}

        {[...events].reverse().map(event => (
          <div
            key={event.id}
            className="gba:flex gba:items-start gba:gap-2.5 gba:px-4 gba:py-2 gba:hover:bg-muted/30 gba:transition-colors"
            data-testid={`enterprise-agent-activity-${event.id}`}
          >
            <div className="gba:flex-shrink-0 gba:mt-0.5">{EVENT_ICON[event.type]}</div>
            <div className="gba:flex-1 gba:min-w-0">
              {event.toolName && (
                <span
                  className={`gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:text-xs gba:font-mono gba:font-semibold gba:mb-0.5 ${toolCategoryColor(event.toolName)}`}
                >
                  {event.toolName}
                </span>
              )}
              <p className="gba:text-xs gba:text-foreground gba:leading-snug">{event.summary}</p>
              <div className="gba:flex gba:items-center gba:gap-2 gba:mt-0.5">
                <span className="gba:text-xs gba:text-muted-foreground/70">{formatRelativeTime(event.timestamp)}</span>
                {event.durationMs !== undefined && (
                  <span className="gba:text-xs gba:text-muted-foreground/60">
                    {(event.durationMs / 1000).toFixed(2)}s
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
