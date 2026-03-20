import React from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system'
import { Activity, CheckCircle2, GitBranch, MessageSquare, RefreshCw, UserCircle2 } from 'lucide-react'
import type { HistoryEvent, HistorySummary } from './types'
import { useResolvedActorNames } from './useResolvedActorNames'

interface FlowDetailAuditPanelProps {
  events: HistoryEvent[]
  summary: HistorySummary | null
  isLoading: boolean
  error: string | null
  activeFilters: Set<string>
  onToggleFilter: (filterType: string) => void
  onClearFilters: () => void
  accessToken?: string
}

const FILTER_OPTIONS = [
  { id: 'flowEvents', label: 'Flow' },
  { id: 'steps', label: 'Steps' },
  { id: 'assignmentEvents', label: 'Assignments' },
  { id: 'comments', label: 'Comments' }
] as const

export const FlowDetailAuditPanel: React.FC<FlowDetailAuditPanelProps> = ({
  events,
  summary,
  isLoading,
  error,
  activeFilters,
  onToggleFilter,
  onClearFilters,
  accessToken
}) => {
  const actorNames = useResolvedActorNames(
    accessToken,
    events.map(event => event.userId)
  )

  return (
    <Card className="gba:h-full">
      <CardHeader className="gba:space-y-4">
        <div className="gba:space-y-1">
          <CardTitle>Audit activity</CardTitle>
          <CardDescription>Review live workflow events, assignments, and comments.</CardDescription>
        </div>

        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <Badge variant="secondary">{events.length} events</Badge>
          {summary ? <Badge variant="outline">{summary.participants.length} actors</Badge> : null}
          {summary ? <Badge variant="outline">{summary.totalComments} comments</Badge> : null}
        </div>

        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          {FILTER_OPTIONS.map(filter => {
            const isActive = activeFilters.has(filter.id)
            return (
              <Button
                key={filter.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggleFilter(filter.id)}
                data-testid={`flow-detail-audit-filter-${filter.id}`}
              >
                {filter.label}
              </Button>
            )
          })}
          {activeFilters.size > 0 ? (
            <Button variant="ghost" size="sm" onClick={onClearFilters} data-testid="flow-detail-audit-clear-filters">
              Clear filters
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="gba:space-y-4">
        {error ? (
          <Alert variant="destructive">
            <div>
              <div className="gba:font-semibold">Unable to load audit activity</div>
              <div className="gba:text-sm">{error}</div>
            </div>
          </Alert>
        ) : null}

        {isLoading && events.length === 0 ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12 gba:text-sm gba:text-muted-foreground">
            <RefreshCw className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
            Loading audit activity...
          </div>
        ) : null}

        {!isLoading && events.length === 0 ? (
          <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/30 gba:px-4 gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
            No audit events available for this flow yet.
          </div>
        ) : null}

        {events.length > 0 ? (
          <div className="gba:space-y-3">
            {events.map(event => (
              <AuditEventRow
                key={`${event.timestamp}-${event.eventTitle}-${event.stepIndex}`}
                event={event}
                resolvedActorName={event.userId ? actorNames[event.userId] : undefined}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface AuditEventRowProps {
  event: HistoryEvent
  resolvedActorName?: string
}

const AuditEventRow: React.FC<AuditEventRowProps> = ({ event, resolvedActorName }) => {
  const icon = getEventIcon(event.type)
  const actorLabel = resolvedActorName || event.userName || event.userId || 'System'
  const description = getEventDescription(event, actorLabel)

  return (
    <div className="gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4">
      <div className="gba:mt-0.5 gba:flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
        {icon}
      </div>
      <div className="gba:min-w-0 gba:flex-1 gba:space-y-1">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <div className="gba:font-medium gba:text-foreground">{event.eventTitle}</div>
          <Badge variant="outline" className="gba:text-xs">
            {event.stepTitle}
          </Badge>
        </div>
        <div className="gba:text-sm gba:text-muted-foreground">{description}</div>
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
          <span>{formatEventTime(event.timestamp)}</span>
          <span>{actorLabel}</span>
          {event.action ? <span>{event.action}</span> : null}
        </div>
      </div>
    </div>
  )
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

const getEventIcon = (type: HistoryEvent['type']): React.ReactNode => {
  if (type === 'assignment') return <UserCircle2 className="gba:h-4 gba:w-4 gba:text-info" />
  if (type === 'comment') return <MessageSquare className="gba:h-4 gba:w-4 gba:text-warning" />
  if (type === 'flow') return <Activity className="gba:h-4 gba:w-4 gba:text-primary" />
  if (type === 'status') return <GitBranch className="gba:h-4 gba:w-4 gba:text-offline" />
  return <CheckCircle2 className="gba:h-4 gba:w-4 gba:text-success" />
}

const formatEventTime = (timestamp: string): string =>
  new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
