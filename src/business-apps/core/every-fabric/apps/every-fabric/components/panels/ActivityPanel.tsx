import {
  ArrowsClockwiseIcon,
  BrainIcon,
  DatabaseIcon,
  ListChecksIcon,
  ShareNetworkIcon,
  WifiHighIcon,
  WifiXIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import type { ActivityEvent } from '../../types/enterpriseAgent'
import { formatRelativeTime } from '../../utils/renderUtils'
import { toolCategoryColor } from '../../utils/renderUtils'

interface ActivityPanelProps {
  events: ActivityEvent[]
  isConnected: boolean
}

const EVENT_ICON: Record<ActivityEvent['type'], React.ReactNode> = {
  tool_call: <WrenchIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  tool_result: <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  plan_update: <ListChecksIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  reflection: <BrainIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  subagent_spawn: <ShareNetworkIcon className="gba:h-3.5 gba:w-3.5 gba:text-purple-500" />,
  memory_access: <DatabaseIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const isSubagent = event.type === 'subagent_spawn'

  return (
    <div
      className={`gba:flex gba:items-start gba:gap-2.5 gba:px-4 gba:py-2 gba:hover:bg-muted/30 gba:transition-colors ${
        isSubagent ? 'gba:border-l-2 gba:border-purple-400/60 gba:pl-5' : ''
      }`}
      data-testid={`enterprise-agent-activity-${event.id}`}
    >
      <div className="gba:shrink-0 gba:mt-0.5">{EVENT_ICON[event.type]}</div>
      <div className="gba:flex-1 gba:min-w-0">
        {event.toolName && (
          <span
            className={`gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:text-xs gba:font-mono gba:font-semibold gba:mb-0.5 ${toolCategoryColor(event.toolName)}`}
          >
            {event.toolName}
          </span>
        )}
        {isSubagent && event.agent && (
          <span className="gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:text-xs gba:font-mono gba:font-semibold gba:mb-0.5 gba:bg-purple-100 gba:text-purple-700 dark:gba:bg-purple-900/30 dark:gba:text-purple-300">
            {event.agent}
          </span>
        )}
        <p className="gba:text-xs gba:text-foreground gba:leading-snug">{event.summary}</p>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-0.5">
          <span className="gba:text-xs gba:text-muted-foreground/70">{formatRelativeTime(event.timestamp)}</span>
          {event.durationMs !== undefined && (
            <span className="gba:text-xs gba:text-muted-foreground/60">{(event.durationMs / 1000).toFixed(2)}s</span>
          )}
        </div>
      </div>
    </div>
  )
}

export const ActivityPanel = ({ events, isConnected }: ActivityPanelProps) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="enterprise-agent-activity-panel">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:border-b gba:border-border gba:shrink-0">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
          Activity
        </span>
        <span className="gba:text-xs gba:text-muted-foreground">({events.length})</span>
        <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:ml-auto">
          {isConnected ? (
            <>
              <WifiHighIcon className="gba:h-3 gba:w-3 gba:text-green-500" />
              <span className="gba:text-green-600 gba:font-medium">Live</span>
            </>
          ) : (
            <>
              <WifiXIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground/40" />
              <span className="gba:text-muted-foreground/60">Offline</span>
            </>
          )}
        </span>
      </div>

      {/* Event feed */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:py-2">
        {events.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-2">
            <p className="gba:text-xs gba:text-muted-foreground">No activity yet</p>
            {!isConnected && (
              <p className="gba:text-xs gba:text-muted-foreground/50">Start a session to see live events</p>
            )}
          </div>
        )}

        {[...events].reverse().map(event => (
          <ActivityRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}
