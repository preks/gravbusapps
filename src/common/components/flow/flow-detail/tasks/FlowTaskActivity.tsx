import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { Activity, CheckCircle2, GitBranch, MessageSquare, UserCircle2 } from 'lucide-react'
import type { HistoryEvent } from '../types'

interface FlowTaskActivityProps {
  events: HistoryEvent[]
  actorNames: Record<string, string>
}

const getEventIcon = (type: HistoryEvent['type']): React.ReactNode => {
  if (type === 'assignment') return <UserCircle2 className="gba:h-4 gba:w-4 gba:text-info" />
  if (type === 'comment') return <MessageSquare className="gba:h-4 gba:w-4 gba:text-warning" />
  if (type === 'flow') return <Activity className="gba:h-4 gba:w-4 gba:text-primary" />
  if (type === 'status') return <GitBranch className="gba:h-4 gba:w-4 gba:text-offline" />
  return <CheckCircle2 className="gba:h-4 gba:w-4 gba:text-success" />
}

const getEventDescription = (event: HistoryEvent, actorLabel: string): string => {
  if (event.type === 'comment') {
    return event.comment ? `${actorLabel} added: "${event.comment}"` : `${actorLabel} added a comment`
  }
  if (event.action === 'CLAIM') {
    return `${actorLabel} claimed the task "${event.stepTitle}"`
  }
  if (event.action === 'UNCLAIM') {
    return `${actorLabel} released the task "${event.stepTitle}" back to the pool`
  }
  if (event.action === 'COMPLETE') {
    return `${actorLabel} completed the step "${event.stepTitle}"`
  }
  if (event.type === 'flow') {
    return event.description
  }
  if (event.action) {
    return `${actorLabel} performed ${event.action}`
  }
  return event.description
}

const formatEventTime = (timestamp: string): string =>
  new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

export function filterEventsForStep(
  events: HistoryEvent[],
  args: { stepIndex: number; stepTitle: string; taskIds: string[] }
): HistoryEvent[] {
  const normalizedTitle = args.stepTitle.trim().toLowerCase()
  const taskIdSet = new Set(args.taskIds.filter(Boolean))

  return events
    .filter(event => {
      if (taskIdSet.size > 0 && event.taskId && taskIdSet.has(event.taskId)) {
        return true
      }
      if (event.stepIndex === args.stepIndex) {
        return true
      }
      return event.stepTitle.trim().toLowerCase() === normalizedTitle
    })
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
}

export const FlowTaskActivity: React.FC<FlowTaskActivityProps> = ({ events, actorNames }) => {
  if (events.length === 0) {
    return (
      <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:px-3 gba:py-6 gba:text-center gba:text-sm gba:text-muted-foreground">
        No activity recorded for this step yet.
      </div>
    )
  }

  return (
    <div className="gba:space-y-3" data-testid="flow-task-activity">
      <div className="gba:flex gba:items-center gba:gap-2">
        <Activity className="gba:h-4 gba:w-4" />
        <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">Activity</h4>
        <Badge variant="outline" className="gba:text-xs">
          {events.length}
        </Badge>
      </div>
      <div className="gba:space-y-2">
        {events.map(event => {
          const actorLabel = event.userId
            ? actorNames[event.userId] || event.userName || event.userId
            : event.userName || 'System'
          const description = getEventDescription(event, actorLabel)

          return (
            <div
              key={`${event.timestamp}-${event.eventTitle}-${event.action || 'event'}`}
              className="gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-3"
            >
              <div className="gba:mt-0.5 gba:flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
                {getEventIcon(event.type)}
              </div>
              <div className="gba:min-w-0 gba:flex-1 gba:space-y-1">
                <div className="gba:font-medium gba:text-sm gba:text-foreground">{event.eventTitle}</div>
                <div className="gba:text-sm gba:text-muted-foreground">{description}</div>
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                  <span>{formatEventTime(event.timestamp)}</span>
                  <span>{actorLabel}</span>
                  {event.action ? <span>{event.action}</span> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
