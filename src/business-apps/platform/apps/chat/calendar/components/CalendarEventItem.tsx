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
import { Video, MapPin, Users, User, Clock, Check, X, HelpCircle, Phone, Globe } from 'lucide-react'
import type { CalendarEvent, InvitationStatus } from '../types'

interface CalendarEventItemProps {
  event: CalendarEvent
  compact?: boolean
  /** When true (calendar list rows), secondary line shows organizer instead of location / generic video label */
  listLayout?: boolean
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
  listLayout = false,
  height,
  onClick,
  t,
  activeConversationCalls,
  onJoinCall
}) => {
  const { locale } = useLocale()
  const organizerName =
    event.organizer.displayName ||
    `${event.organizer.firstName || ''} ${event.organizer.lastName || ''}`.trim() ||
    event.organizer.email
  const organizerNameTrimmed = organizerName.trim()
  const displayTitle = event.isBusyBlock ? t('calendar-sidebar-busy') : event.title

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
              <p className="gba:font-semibold">{displayTitle}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {formatTime(event.start, locale)} - {formatTime(event.end, locale)}
              </p>
              {!event.isBusyBlock && event.description && <p className="gba:text-xs">{event.description}</p>}
              {!event.isBusyBlock && event.location && (
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

  // Compact view for week/day grid: calendar-color left bar + card body (not full-bleed fill)
  if (compact) {
    const compactShowOrganizer =
      showLocation && !event.isBusyBlock && (event.isOrganizer || organizerNameTrimmed.length > 0)

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={`gba:w-full gba:h-full gba:text-left gba:rounded-md gba:overflow-hidden gba:flex gba:flex-row gba:items-stretch gba:border gba:border-border/50 gba:transition-opacity hover:gba:opacity-95 ${pendingClasses}`}
              style={participantStyle}
              data-testid={`calendar-event-${event.id}`}
            >
              <span
                className="gba:block gba:w-2 gba:flex-shrink-0 sm:gba:w-2.5"
                style={{ backgroundColor: event.color }}
                aria-hidden
              />
              <div className="gba:flex-1 gba:min-w-0 gba:py-1 gba:px-1.5 sm:gba:px-2 gba:flex gba:flex-col gba:justify-center gba:bg-card">
                {showTitle && (
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-1 gba:mb-0.5">
                    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-0.5 gba:flex-1">
                      {event.source && event.source !== 'internal' && (
                        <Globe className="gba:h-2.5 gba:w-2.5 gba:text-info gba:flex-shrink-0" />
                      )}
                      <span
                        className={`gba:font-semibold gba:text-foreground gba:text-[10px] sm:gba:text-xs gba:truncate gba:leading-tight ${
                          event.status === 'cancelled' ? 'gba:line-through gba:text-muted-foreground' : ''
                        }`}
                      >
                        {displayTitle}
                      </span>
                    </div>
                    <div className="gba:flex gba:flex-shrink-0 gba:items-center gba:gap-0.5">
                      {isLive && (
                        <Badge
                          variant="default"
                          className="gba:bg-success gba:text-success-foreground gba:text-[8px] gba:px-1 gba:py-0"
                        >
                          Live
                        </Badge>
                      )}
                      {event.source && event.source !== 'internal' && (
                        <Badge variant="secondary" className="gba:text-[8px] gba:px-1 gba:py-0">
                          {event.source === 'microsoft' ? 'MS' : 'G'}
                        </Badge>
                      )}
                      {!event.isOrganizer && event.participantStatus && (
                        <span>{getInvitationStatusIcon(event.participantStatus)}</span>
                      )}
                    </div>
                  </div>
                )}
                {showTime && (
                  <p className="gba:text-[9px] sm:gba:text-[10px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate gba:leading-tight">
                    <Clock className="gba:h-2.5 gba:w-2.5 gba:flex-shrink-0" />
                    {event.allDay
                      ? t('calendar-allDay')
                      : `${formatTime(event.start, locale)} - ${formatTime(event.end, locale)}`}
                  </p>
                )}
                {compactShowOrganizer && (
                  <p className="gba:text-[9px] sm:gba:text-[10px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate gba:mt-0.5">
                    <User className="gba:h-2.5 gba:w-2.5 gba:flex-shrink-0" />
                    <span className="gba:truncate">
                      {event.isOrganizer ? t('calendar-youOrganizer') : organizerName}
                    </span>
                  </p>
                )}
                {showParticipants && !event.isBusyBlock && (
                  <p className="gba:text-[9px] sm:gba:text-[10px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:mt-0.5">
                    <Users className="gba:h-2.5 gba:w-2.5 gba:flex-shrink-0" />
                    <span className="gba:truncate">
                      {event.acceptedCount}/{event.participantCount}
                    </span>
                  </p>
                )}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="gba:max-w-xs gba:z-50">
            <div className="gba:space-y-1">
              <p className="gba:font-semibold">{displayTitle}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {formatTime(event.start, locale)} - {formatTime(event.end, locale)}
              </p>
              {!event.isBusyBlock && event.description && <p className="gba:text-xs">{event.description}</p>}
              {!event.isBusyBlock && event.location && (
                <p className="gba:text-xs gba:flex gba:items-center gba:gap-1">
                  <MapPin className="gba:h-3 gba:w-3" />
                  {event.location}
                </p>
              )}
              {!event.isBusyBlock && (
                <p className="gba:text-xs gba:flex gba:items-center gba:gap-1">
                  <Users className="gba:h-3 gba:w-3" />
                  {t('calendar-participantsAttending', {
                    accepted: event.acceptedCount,
                    total: event.participantCount
                  })}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const fullViewGridOrganizer =
    !listLayout && showLocation && !event.isBusyBlock && (event.isOrganizer || organizerNameTrimmed.length > 0)

  // Full view: list rows + tall day-view blocks — calendar color as left strip, neutral card body
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`gba:w-full gba:h-full gba:rounded-md gba:border gba:border-border/50 gba:transition-all gba:hover:shadow-md gba:overflow-hidden gba:relative gba:flex gba:flex-row gba:items-stretch ${pendingClasses}`}
            style={participantStyle}
            data-testid={`calendar-event-${event.id}`}
          >
            <span
              className="gba:block gba:w-2 gba:flex-shrink-0 sm:gba:w-2.5"
              style={{ backgroundColor: event.color }}
              aria-hidden
            />
            <div className="gba:flex-1 gba:min-w-0 gba:relative gba:bg-card">
              {/* Main clickable area */}
              <button
                onClick={onClick}
                className="gba:w-full gba:h-full gba:text-left gba:p-2 gba:cursor-pointer gba:block"
              >
                <div className="gba:flex gba:flex-col gba:h-full gba:min-w-0">
                  {/* Title and status */}
                  {showTitle && (
                    <div className="gba:flex gba:items-center gba:gap-1 gba:mb-0.5">
                      {event.source && event.source !== 'internal' && (
                        <Globe className="gba:h-3 gba:w-3 gba:text-info gba:flex-shrink-0" />
                      )}
                      <h4
                        className={`gba:font-semibold gba:text-xs gba:text-foreground gba:truncate gba:flex-1 ${
                          event.status === 'cancelled' ? 'gba:line-through gba:text-muted-foreground' : ''
                        }`}
                      >
                        {displayTitle}
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

                  {/* Organizer (list + grid full) or location fallback */}
                  {showLocation &&
                    !event.isBusyBlock &&
                    listLayout &&
                    (event.isOrganizer || organizerNameTrimmed.length > 0) && (
                      <p className="gba:text-[10px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate gba:mt-0.5">
                        <User className="gba:h-2.5 gba:w-2.5 gba:flex-shrink-0" />
                        <span className="gba:truncate">
                          {event.isOrganizer ? t('calendar-youOrganizer') : organizerName}
                        </span>
                      </p>
                    )}
                  {showLocation &&
                    !event.isBusyBlock &&
                    listLayout &&
                    !event.isOrganizer &&
                    organizerNameTrimmed.length === 0 &&
                    (event.location || event.meetingLink) && (
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
                  {fullViewGridOrganizer && (
                    <p className="gba:text-[10px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate gba:mt-0.5">
                      <User className="gba:h-2.5 gba:w-2.5 gba:flex-shrink-0" />
                      <span className="gba:truncate">
                        {event.isOrganizer ? t('calendar-youOrganizer') : organizerName}
                      </span>
                    </p>
                  )}
                  {showLocation &&
                    !event.isBusyBlock &&
                    !listLayout &&
                    !fullViewGridOrganizer &&
                    (event.location || event.meetingLink) && (
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

                  {/* Participants count — grid full view uses organizer line above instead of "by …" */}
                  {showParticipants && !event.isBusyBlock && (
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-auto gba:text-[10px] gba:text-muted-foreground">
                      {!event.isOrganizer && !listLayout && !fullViewGridOrganizer && (
                        <span className="gba:truncate">by {organizerName}</span>
                      )}
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
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="gba:max-w-xs gba:z-50">
          <div className="gba:space-y-1">
            <p className="gba:font-semibold">{displayTitle}</p>
            <p className="gba:text-xs gba:text-muted-foreground">
              {event.allDay
                ? t('calendar-allDay')
                : `${formatTime(event.start, locale)} - ${formatTime(event.end, locale)}`}
            </p>
            {!event.isBusyBlock && event.description && <p className="gba:text-xs">{event.description}</p>}
            {!event.isBusyBlock && event.location && (
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
