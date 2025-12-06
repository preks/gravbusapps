import React from 'react'
import { Card, CardContent, Badge } from '@newwork/nw-design-system'
import { Calendar, Clock, Users, Video, ExternalLink } from 'lucide-react'
import type { ScheduledMeeting } from '../hooks/useEveryAIChat'

interface MeetingCardProps {
  meeting: ScheduledMeeting
  className?: string
}

/**
 * A card component that displays meeting details in the chat
 * Clicking the card switches to the calendar tab within the sidepanel
 */
export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, className = '' }) => {
  const startDate = new Date(meeting.startTime)
  const endDate = new Date(meeting.endTime)

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
    // Switch to calendar tab within the chat sidepanel by updating URL params
    // The ChatWithCalendar component listens to the 'view' param
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'calendar')
    url.searchParams.set('date', startDate.toISOString().split('T')[0])
    url.searchParams.set('meetingId', meeting.id)
    window.history.pushState({}, '', url.toString())

    // Dispatch a custom event to notify the calendar to switch tabs and focus the meeting
    window.dispatchEvent(
      new CustomEvent('switchToCalendar', {
        detail: {
          date: startDate.toISOString().split('T')[0],
          meetingId: meeting.id
        }
      })
    )
  }

  return (
    <Card
      className={`gba:cursor-pointer gba:transition-all gba:hover:shadow-md gba:hover:border-primary/50 gba:max-w-sm ${className}`}
      onClick={handleClick}
      data-testid={`meeting-card-${meeting.id}`}
    >
      <CardContent className="gba:p-4">
        {/* Header with title and badge */}
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-3">
          <h4 className="gba:font-semibold gba:text-foreground gba:text-sm gba:line-clamp-2">{meeting.title}</h4>
          <Badge variant="success" className="gba:flex-shrink-0 gba:text-[10px]">
            Scheduled
          </Badge>
        </div>

        {/* Date and time */}
        <div className="gba:space-y-2 gba:text-xs gba:text-muted-foreground">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:w-3.5 gba:h-3.5 gba:text-primary" />
            <span>{formatDate(startDate)}</span>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <Clock className="gba:w-3.5 gba:h-3.5 gba:text-primary" />
            <span>
              {formatTime(startDate)} - {formatTime(endDate)}
            </span>
          </div>

          {/* Participants */}
          {meeting.participants.length > 0 && (
            <div className="gba:flex gba:items-center gba:gap-2">
              <Users className="gba:w-3.5 gba:h-3.5 gba:text-primary" />
              <span className="gba:truncate">{meeting.participants.join(', ')}</span>
            </div>
          )}

          {/* Meeting link indicator */}
          {meeting.meetingLink && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-success">
              <Video className="gba:w-3.5 gba:h-3.5" />
              <span>Video call included</span>
            </div>
          )}
        </div>

        {/* Click hint */}
        <div className="gba:mt-3 gba:pt-2 gba:border-t gba:border-border/50 gba:flex gba:items-center gba:justify-end gba:gap-1 gba:text-[10px] gba:text-muted-foreground">
          <span>View in Calendar</span>
          <ExternalLink className="gba:w-3 gba:h-3" />
        </div>
      </CardContent>
    </Card>
  )
}
