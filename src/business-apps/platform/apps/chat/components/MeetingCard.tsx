import React, { useMemo } from 'react'
import { Card, CardContent, Badge, Button } from '@newwork/nw-design-system'
import { Calendar, Clock, Users, Video, ExternalLink, ListTodo } from 'lucide-react'
import { getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'
import type { ScheduledMeeting } from '../hooks/useEveryAIChat'
import { getAgendaFromMetadata } from '../calendar/utils/agendaUtils'

interface MeetingCardProps {
  meeting: ScheduledMeeting
  className?: string
}

/**
 * A card component that displays meeting details in the chat
 * Clicking the card switches to the calendar tab within the sidepanel
 */
export const MeetingCard: React.FC<MeetingCardProps> = React.memo(({ meeting, className = '' }) => {
  const startDate = new Date(meeting.startTime)
  const endDate = new Date(meeting.endTime)

  // Extract agenda from metadata
  const agendaItems = useMemo(() => getAgendaFromMetadata(meeting.metadata), [meeting.metadata])

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleClick = () => {
    // Switch to calendar view and open meeting details; mutate current URL so it works from menu or sidebar.
    const dateStr = startDate.toISOString().split('T')[0]
    const pathAndQuery = getCurrentUrlWithUpdatedSearchParams({ view: 'calendar', meetingId: meeting.id })
    window.history.pushState({}, '', `${window.location.origin}${pathAndQuery}`)

    window.dispatchEvent(
      new CustomEvent('switchToCalendar', {
        detail: {
          date: dateStr,
          meetingId: meeting.id
        }
      })
    )
  }

  const handleJoinMeeting = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click from firing
    if (meeting.meetingLink && meeting.meetingLink !== 'auto-generate') {
      window.open(meeting.meetingLink, '_blank', 'noopener,noreferrer')
    }
  }

  const canJoinMeeting = meeting.meetingLink && meeting.meetingLink !== 'auto-generate'

  return (
    <Card
      className={`gba:cursor-pointer gba:transition-all gba:hover:shadow-lg gba:hover:border-primary gba:hover:scale-[1.02] gba:max-w-md gba:bg-gradient-to-br gba:from-primary/5 gba:to-accent/5 ${className}`}
      onClick={handleClick}
      data-testid={`meeting-card-${meeting.id}`}
    >
      <CardContent className="gba:p-4">
        {/* Header with title and badge */}
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:mb-3">
          <div className="gba:flex gba:items-start gba:gap-2 gba:flex-1 gba:min-w-0">
            <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
              <Calendar className="gba:w-4 gba:h-4 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <h4 className="gba:font-semibold gba:text-foreground gba:text-sm gba:line-clamp-2">{meeting.title}</h4>
              {meeting.description && (
                <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1 gba:mt-0.5">
                  {meeting.description}
                </p>
              )}
            </div>
          </div>
          <Badge variant="success" className="gba:flex-shrink-0 gba:text-[10px]">
            Scheduled
          </Badge>
        </div>

        {/* Date and time */}
        <div className="gba:space-y-2.5 gba:text-xs">
          <div className="gba:flex gba:items-center gba:gap-2.5 gba:bg-background/50 gba:rounded-md gba:px-2.5 gba:py-1.5">
            <Clock className="gba:w-3.5 gba:h-3.5 gba:text-primary gba:flex-shrink-0" />
            <div className="gba:flex-1">
              <div className="gba:font-medium gba:text-foreground">{formatDate(startDate)}</div>
              <div className="gba:text-muted-foreground gba:mt-0.5">
                {formatTime(startDate)} - {formatTime(endDate)}
              </div>
            </div>
          </div>

          {/* Participants */}
          {meeting.participants.length > 0 && (
            <div className="gba:flex gba:items-center gba:gap-2.5 gba:bg-background/50 gba:rounded-md gba:px-2.5 gba:py-1.5">
              <Users className="gba:w-3.5 gba:h-3.5 gba:text-primary gba:flex-shrink-0" />
              <span className="gba:text-muted-foreground gba:truncate">
                {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Agenda preview */}
          {agendaItems.length > 0 && (
            <div className="gba:flex gba:items-center gba:gap-2.5 gba:bg-background/50 gba:rounded-md gba:px-2.5 gba:py-1.5">
              <ListTodo className="gba:w-3.5 gba:h-3.5 gba:text-primary gba:flex-shrink-0" />
              <span className="gba:text-muted-foreground gba:truncate">
                {agendaItems.length} agenda item{agendaItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Meeting link - clickable button if available, otherwise indicator */}
          {meeting.meetingLink && (
            <>
              {canJoinMeeting ? (
                <Button
                  onClick={handleJoinMeeting}
                  variant="default"
                  size="sm"
                  className="gba:w-full gba:justify-start gba:bg-success gba:hover:bg-success/90 gba:text-success-foreground"
                  data-testid={`meeting-card-join-${meeting.id}`}
                >
                  <Video className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
                  <span className="gba:font-medium">Join Meeting</span>
                  <ExternalLink className="gba:w-3 gba:h-3 gba:ml-auto" />
                </Button>
              ) : (
                <div className="gba:flex gba:items-center gba:gap-2.5 gba:bg-success/10 gba:rounded-md gba:px-2.5 gba:py-1.5">
                  <Video className="gba:w-3.5 gba:h-3.5 gba:text-success gba:flex-shrink-0" />
                  <span className="gba:text-success gba:font-medium">Video call included</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Click hint */}
        <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-border/30 gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-[11px] gba:text-muted-foreground">Click to view details</span>
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-primary gba:font-medium">
            <span>Open Calendar</span>
            <ExternalLink className="gba:w-3 gba:h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
