import React from 'react'
import { Badge, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@newwork/nw-design-system'
import { Video, MapPin, Users, Clock, Check, X, HelpCircle } from 'lucide-react'
import type { CalendarEvent, InvitationStatus, MeetingStatus } from '../types'

interface CalendarEventItemProps {
  event: CalendarEvent
  compact?: boolean
  onClick?: () => void
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const getStatusColor = (status: MeetingStatus): string => {
  switch (status) {
    case 'in_progress':
      return 'gba:bg-success gba:text-success-foreground'
    case 'completed':
      return 'gba:bg-muted gba:text-muted-foreground'
    case 'cancelled':
      return 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:line-through'
    default:
      return ''
  }
}

const getInvitationStatusIcon = (status?: InvitationStatus) => {
  switch (status) {
    case 'accepted':
      return <Check className="gba:h-3 gba:w-3 gba:text-success" />
    case 'declined':
      return <X className="gba:h-3 gba:w-3 gba:text-destructive" />
    case 'tentative':
      return <HelpCircle className="gba:h-3 gba:w-3 gba:text-warning" />
    case 'pending':
      return <Clock className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
    default:
      return null
  }
}

export const CalendarEventItem: React.FC<CalendarEventItemProps> = ({ event, compact = false, onClick }) => {
  const statusClass = getStatusColor(event.status)
  const organizerName =
    event.organizer.displayName ||
    `${event.organizer.firstName || ''} ${event.organizer.lastName || ''}`.trim() ||
    event.organizer.email

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={`gba:w-full gba:text-left gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:font-medium gba:truncate gba:transition-opacity gba:hover:opacity-80 ${statusClass}`}
              style={{ backgroundColor: event.status === 'scheduled' ? event.color : undefined }}
              data-testid={`calendar-event-${event.id}`}
            >
              <span className="gba:text-white gba:drop-shadow-sm">{event.title}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="gba:max-w-xs">
            <div className="gba:space-y-1">
              <p className="gba:font-semibold">{event.title}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {formatTime(event.start)} - {formatTime(event.end)}
              </p>
              {event.location && (
                <p className="gba:text-xs gba:flex gba:items-center gba:gap-1">
                  <MapPin className="gba:h-3 gba:w-3" />
                  {event.location}
                </p>
              )}
              <p className="gba:text-xs gba:flex gba:items-center gba:gap-1">
                <Users className="gba:h-3 gba:w-3" />
                {event.acceptedCount}/{event.participantCount} attending
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`gba:w-full gba:text-left gba:p-3 gba:rounded-lg gba:border gba:border-border/50 gba:transition-all gba:hover:shadow-md gba:cursor-pointer ${statusClass}`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: event.color
      }}
      data-testid={`calendar-event-${event.id}`}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
        <div className="gba:flex-1 gba:min-w-0">
          {/* Title and status */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <h4 className="gba:font-semibold gba:text-sm gba:text-foreground gba:truncate">{event.title}</h4>
            {event.status === 'in_progress' && (
              <Badge
                variant="default"
                className="gba:bg-success gba:text-success-foreground gba:text-[10px] gba:px-1.5 gba:py-0"
              >
                Live
              </Badge>
            )}
            {!event.isOrganizer && event.participantStatus && (
              <span className="gba:flex-shrink-0">{getInvitationStatusIcon(event.participantStatus)}</span>
            )}
          </div>

          {/* Time */}
          <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:mb-1">
            <Clock className="gba:h-3 gba:w-3" />
            {event.allDay ? 'All day' : `${formatTime(event.start)} - ${formatTime(event.end)}`}
          </p>

          {/* Location or meeting link */}
          {(event.location || event.meetingLink) && (
            <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate">
              {event.meetingLink ? (
                <>
                  <Video className="gba:h-3 gba:w-3 gba:text-primary" />
                  <span className="gba:text-primary">Video call</span>
                </>
              ) : (
                <>
                  <MapPin className="gba:h-3 gba:w-3" />
                  {event.location}
                </>
              )}
            </p>
          )}

          {/* Organizer and participants */}
          <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2 gba:text-xs gba:text-muted-foreground">
            {!event.isOrganizer && <span>Organized by {organizerName}</span>}
            <span className="gba:flex gba:items-center gba:gap-1">
              <Users className="gba:h-3 gba:w-3" />
              {event.acceptedCount}/{event.participantCount}
            </span>
          </div>
        </div>

        {/* Event color indicator */}
        <div
          className="gba:w-2 gba:h-2 gba:rounded-full gba:flex-shrink-0 gba:mt-1"
          style={{ backgroundColor: event.color }}
        />
      </div>
    </button>
  )
}
