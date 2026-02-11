import React from 'react'
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  useLocale,
  Button
} from '@newwork/nw-design-system'
import { Video, MapPin, Users, Clock, Check, X, HelpCircle, Phone, Globe } from 'lucide-react'
import type { CalendarEvent, InvitationStatus, MeetingStatus } from '../types'

interface CalendarEventItemProps {
  event: CalendarEvent
  compact?: boolean
  height?: number // Available height in pixels
  onClick?: () => void
  t: (key: string, params?: Record<string, any>) => string
  activeConversationCalls?: Map<string, any>
  onJoinCall?: (event: CalendarEvent) => void
}

const formatTime = (date: Date, locale?: string): string => {
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  const use24Hour = baseLocale === 'de' || baseLocale === 'ro'

  const hours = date.getHours()
  const minutes = date.getMinutes()
  const minuteStr = minutes.toString().padStart(2, '0')

  if (use24Hour) {
    // 24-hour format for German/Romanian (e.g., "17:00")
    return `${hours.toString().padStart(2, '0')}:${minuteStr}`
  } else {
    // 12-hour format with AM/PM for English
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${hour12}:${minuteStr} ${period}`
  }
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

export const CalendarEventItem: React.FC<CalendarEventItemProps> = ({
  event,
  compact = false,
  height,
  onClick,
  t,
  activeConversationCalls,
  onJoinCall
}) => {
  const { locale } = useLocale()
  const statusClass = getStatusColor(event.status)
  const organizerName =
    event.organizer.displayName ||
    `${event.organizer.firstName || ''} ${event.organizer.lastName || ''}`.trim() ||
    event.organizer.email

  // Check if there's an active call for this meeting
  // Use conversation ID if linked, otherwise use meeting ID
  const callId = event.conversationId || event.id
  const hasActiveCall = !!activeConversationCalls?.get(callId)
  const isLive = event.status === 'in_progress' || hasActiveCall

  // Determine opacity and styling based on participant status (for non-organizers)
  const getParticipantStatusStyle = () => {
    if (event.isOrganizer) return {}

    if (event.participantStatus === 'declined') {
      return {
        opacity: 0.3,
        textDecoration: 'line-through' as const
      }
    }

    if (event.participantStatus === 'pending') {
      return {
        opacity: 0.3
      }
    }

    return {}
  }

  const participantStyle = getParticipantStatusStyle()

  // Get additional classes for pending meetings
  const getPendingClasses = () => {
    if (event.isOrganizer) return ''
    if (event.participantStatus === 'pending') {
      return 'gba:border-dashed'
    }
    return ''
  }

  const pendingClasses = getPendingClasses()

  // Determine what to show based on available height
  // Height thresholds: <25px = just color bar, 25-40px = title only, 40-60px = title + time, >60px = full
  const showTitle = !height || height >= 20
  const showTime = !height || height >= 40
  const showLocation = !height || height >= 55
  const showParticipants = !height || height >= 75
  const isMinimal = height && height < 25

  // Minimal view - just a colored bar with tooltip
  if (isMinimal) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={`gba:w-full gba:h-full gba:rounded gba:transition-opacity gba:hover:opacity-80 ${pendingClasses}`}
              style={{ backgroundColor: event.color, minHeight: '4px', ...participantStyle }}
              data-testid={`calendar-event-${event.id}`}
            />
          </TooltipTrigger>
          <TooltipContent side="right" className="gba:max-w-xs gba:z-50">
            <div className="gba:space-y-1">
              <p className="gba:font-semibold">{event.title}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {formatTime(event.start, locale)} - {formatTime(event.end, locale)}
              </p>
              {event.location && (
                <p className="gba:text-xs gba:flex gba:items-center gba:gap-1">
                  <MapPin className="gba:h-3 gba:w-3" />
                  {event.location}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Compact view for small events in week/day views
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={`gba:w-full gba:h-full gba:text-left gba:px-1.5 gba:py-0.5 gba:rounded gba:text-[10px] gba:font-medium gba:overflow-hidden gba:transition-opacity gba:hover:opacity-80 ${statusClass} ${pendingClasses}`}
              style={{
                backgroundColor: event.status === 'scheduled' ? event.color : undefined,
                ...participantStyle
              }}
              data-testid={`calendar-event-${event.id}`}
            >
              <div className="gba:text-white gba:drop-shadow-sm gba:truncate gba:leading-tight">
                {showTitle && event.title}
              </div>
              {showTime && (
                <div className="gba:text-white/80 gba:text-[9px] gba:truncate gba:leading-tight">
                  {formatTime(event.start, locale)}
                </div>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="gba:max-w-xs gba:z-50">
            <div className="gba:space-y-1">
              <p className="gba:font-semibold">{event.title}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {formatTime(event.start, locale)} - {formatTime(event.end, locale)}
              </p>
              {event.location && (
                <p className="gba:text-xs gba:flex gba:items-center gba:gap-1">
                  <MapPin className="gba:h-3 gba:w-3" />
                  {event.location}
                </p>
              )}
              <p className="gba:text-xs gba:flex gba:items-center gba:gap-1">
                <Users className="gba:h-3 gba:w-3" />
                {t('calendar-participantsAttending', { accepted: event.acceptedCount, total: event.participantCount })}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full view for larger events
  return (
    <div
      className={`gba:w-full gba:h-full gba:rounded gba:border gba:border-border/50 gba:transition-all gba:hover:shadow-md gba:overflow-hidden gba:relative ${statusClass} ${pendingClasses}`}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: event.color,
        ...participantStyle
      }}
      data-testid={`calendar-event-${event.id}`}
    >
      {/* Main clickable area */}
      <button onClick={onClick} className="gba:w-full gba:h-full gba:text-left gba:p-2 gba:cursor-pointer gba:block">
        <div className="gba:flex gba:flex-col gba:h-full gba:min-w-0">
          {/* Title and status */}
          {showTitle && (
            <div className="gba:flex gba:items-center gba:gap-1 gba:mb-0.5">
              {event.source && event.source !== 'internal' && (
                <Globe className="gba:h-3 gba:w-3 gba:text-info gba:flex-shrink-0" />
              )}
              <h4 className="gba:font-semibold gba:text-xs gba:text-foreground gba:truncate gba:flex-1">
                {event.title}
              </h4>
              {isLive && (
                <Badge
                  variant="default"
                  className="gba:bg-success gba:text-success-foreground gba:text-[8px] gba:px-1 gba:py-0 gba:flex-shrink-0"
                >
                  Live
                </Badge>
              )}
              {event.source && event.source !== 'internal' && (
                <Badge variant="secondary" className="gba:text-[8px] gba:px-1 gba:py-0 gba:flex-shrink-0">
                  {event.source === 'microsoft' ? 'MS' : 'G'}
                </Badge>
              )}
              {!event.isOrganizer && event.participantStatus && (
                <span className="gba:flex-shrink-0">{getInvitationStatusIcon(event.participantStatus)}</span>
              )}
            </div>
          )}

          {/* Time */}
          {showTime && (
            <p className="gba:text-[10px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate">
              <Clock className="gba:h-2.5 gba:w-2.5 gba:flex-shrink-0" />
              {event.allDay
                ? t('calendar-allDay')
                : `${formatTime(event.start, locale)} - ${formatTime(event.end, locale)}`}
            </p>
          )}

          {/* Location or meeting link */}
          {showLocation && (event.location || event.meetingLink) && (
            <p className="gba:text-[10px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate gba:mt-0.5">
              {event.meetingLink ? (
                <>
                  <Video className="gba:h-2.5 gba:w-2.5 gba:text-primary gba:flex-shrink-0" />
                  <span className="gba:text-primary gba:truncate">Video call</span>
                </>
              ) : (
                <>
                  <MapPin className="gba:h-2.5 gba:w-2.5 gba:flex-shrink-0" />
                  <span className="gba:truncate">{event.location}</span>
                </>
              )}
            </p>
          )}

          {/* Organizer and participants - only if there's space */}
          {showParticipants && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:mt-auto gba:text-[10px] gba:text-muted-foreground">
              {!event.isOrganizer && <span className="gba:truncate">by {organizerName}</span>}
              <span className="gba:flex gba:items-center gba:gap-0.5 gba:flex-shrink-0">
                <Users className="gba:h-2.5 gba:w-2.5" />
                {event.acceptedCount}/{event.participantCount}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Join button overlay - only show if live */}
      {isLive && onJoinCall && (
        <div className="gba:absolute gba:bottom-1 gba:right-1">
          <Button
            size="sm"
            variant="default"
            className="gba:h-6 gba:px-2 gba:bg-success gba:hover:bg-success/90 gba:text-success-foreground gba:text-[9px]"
            onClick={e => {
              e.stopPropagation()
              onJoinCall(event)
            }}
          >
            <Phone className="gba:h-3 gba:w-3 gba:mr-0.5" />
            {t('calendar-joinMeeting')}
          </Button>
        </div>
      )}
    </div>
  )
}
