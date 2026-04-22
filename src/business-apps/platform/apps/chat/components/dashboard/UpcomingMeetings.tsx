import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  useTranslation
} from '@newwork/nw-design-system'
import { Calendar, Video, Users, ExternalLink, ListTodo } from 'lucide-react'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { CalendarEvent } from '../../calendar/types'
import { getAgendaFromMetadata } from '../../calendar/utils/agendaUtils'
import { canJoinMeeting, handleMeetingJoin, hasExternalMeetingLink } from '../../calendar/utils/meetingJoin'
import { useEmployeeAvatarsCache, EmployeeAvatarInfo } from '../../hooks/useEmployeeAvatarsCache'
import translations from '../../_i18n'

interface UpcomingMeetingsProps {
  accessToken: string
  isActive?: boolean
  isLoading?: boolean
  onJoinMeeting?: (meeting: CalendarEvent) => void
  'data-testid'?: string
}

/**
 * Get initials from display name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format time using the active app locale.
 */
function formatTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit'
  })
}

/**
 * Format relative time using translated dashboard labels.
 */
function formatRelativeTime(
  date: Date,
  locale: string,
  t: (key: string, args?: Record<string, unknown>) => string
): { label: string; isLive: boolean; isSoon: boolean } {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  // Check if meeting is currently happening
  if (diffMins < 0 && diffMins > -120) {
    return { label: t('dashboard-upcomingMeetings-now'), isLive: true, isSoon: false }
  }

  if (diffMins < 0) {
    return { label: t('dashboard-upcomingMeetings-started'), isLive: true, isSoon: false }
  }

  if (diffMins < 5) {
    return { label: t('dashboard-upcomingMeetings-startingNow'), isLive: false, isSoon: true }
  }

  if (diffMins < 60) {
    return {
      label: t('dashboard-upcomingMeetings-inMinutes', { minutes: diffMins }),
      isLive: false,
      isSoon: diffMins <= 15
    }
  }

  if (diffHours < 24) {
    return { label: t('dashboard-upcomingMeetings-inHours', { hours: diffHours }), isLive: false, isSoon: false }
  }

  // Check if tomorrow
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) {
    return { label: t('dashboard-upcomingMeetings-tomorrow'), isLive: false, isSoon: false }
  }

  // Show day name if within a week
  const daysAway = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (daysAway <= 7) {
    return { label: date.toLocaleDateString(locale, { weekday: 'short' }), isLive: false, isSoon: false }
  }

  return { label: date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }), isLive: false, isSoon: false }
}

interface MeetingCardProps {
  meeting: CalendarEvent
  avatarMap: Map<string, EmployeeAvatarInfo>
  onJoin?: () => void
  'data-testid'?: string
}

/**
 * MeetingCard - Individual meeting item
 */
const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, avatarMap, onJoin, 'data-testid': testId }) => {
  const { t, locale } = useTranslation(translations)
  const timeInfo = formatRelativeTime(meeting.start, locale, t)
  const joinable = canJoinMeeting(meeting)
  const hasExternalLink = hasExternalMeetingLink(meeting)
  const agendaItems = getAgendaFromMetadata(meeting.metadata)
  const hasAgenda = agendaItems.length > 0
  const hasTranscription = meeting.transcriptionEnabled === true || meeting.metadata?.aiTranscriptionEnabled === true

  // Get resolved avatar URL for a participant
  const getParticipantAvatar = (participant: { id: string; avatarUrl?: string }): string | undefined => {
    // First try the participant's own avatarUrl
    if (participant.avatarUrl) return participant.avatarUrl
    // Then try the cached avatar (id is the participantUserId from our extraction)
    const cached = avatarMap.get(participant.id)
    return cached?.avatarUrl
  }

  return (
    <div
      className="gba:group gba:flex gba:items-center gba:gap-4 gba:p-3 gba:rounded-lg gba:transition-colors gba:hover:bg-muted/50 gba:cursor-pointer"
      data-testid={testId}
    >
      {/* Time indicator */}
      <div className="gba:flex gba:flex-col gba:items-center gba:min-w-[56px]">
        <span
          className={`gba:text-xs gba:font-medium ${
            timeInfo.isLive ? 'gba:text-success' : timeInfo.isSoon ? 'gba:text-warning' : 'gba:text-muted-foreground'
          }`}
        >
          {timeInfo.label}
        </span>
        <span className="gba:text-xs gba:text-muted-foreground">{formatTime(meeting.start, locale)}</span>
      </div>

      {/* Meeting info */}
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <h4 className="gba:font-medium gba:text-foreground gba:truncate">{meeting.title}</h4>
          {hasTranscription && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive gba:animate-pulse gba:flex-shrink-0"
                    aria-label={t('chat-call-recordingTranscriptNotice')}
                    data-testid={testId ? `${testId}-recording-dot` : undefined}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="gba:max-w-xs gba:z-50">
                  {t('chat-call-recordingTranscriptNotice')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
          {meeting.organizer && (
            <span className="gba:truncate">
              {meeting.isOrganizer
                ? t('dashboard-common-you')
                : meeting.organizer.displayName || meeting.organizer.email}
            </span>
          )}
          {meeting.participantCount > 1 && (
            <>
              <span>·</span>
              <span className="gba:flex gba:items-center gba:gap-1">
                <Users className="gba:w-3 gba:h-3" />
                {meeting.participantCount}
              </span>
            </>
          )}
          {hasAgenda && (
            <>
              <span>·</span>
              <span
                className="gba:flex gba:items-center gba:gap-1"
                title={t('dashboard-upcomingMeetings-agendaItems', { count: agendaItems.length })}
              >
                <ListTodo className="gba:w-3 gba:h-3" />
                {agendaItems.length}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Participant avatars (show up to 3) */}
      {meeting.participants && meeting.participants.length > 0 && (
        <div className="gba:flex gba:-space-x-2">
          {meeting.participants.slice(0, 3).map((participant, idx) => {
            const avatarUrl = getParticipantAvatar(participant)
            return (
              <Avatar key={participant.id || idx} className="gba:w-7 gba:h-7 gba:border-2 gba:border-background">
                <AvatarImage src={avatarUrl} alt={participant.displayName || participant.email} />
                <AvatarFallback className="gba:text-xs">
                  {getInitials(participant.displayName || participant.email || '?')}
                </AvatarFallback>
              </Avatar>
            )
          })}
          {meeting.participants.length > 3 && (
            <div className="gba:w-7 gba:h-7 gba:rounded-full gba:bg-muted gba:border-2 gba:border-background gba:flex gba:items-center gba:justify-center">
              <span className="gba:text-xs gba:text-muted-foreground">+{meeting.participants.length - 3}</span>
            </div>
          )}
        </div>
      )}

      {/* Join button */}
      {joinable && onJoin && (
        <Button
          variant={timeInfo.isLive || timeInfo.isSoon ? 'default' : 'outline'}
          size="sm"
          onClick={e => {
            e.stopPropagation()
            onJoin()
          }}
          className="gba:gap-1.5"
          data-testid={testId ? `${testId}-join` : undefined}
        >
          {hasExternalLink ? (
            <>
              <ExternalLink className="gba:w-3.5 gba:h-3.5" />
              {t('dashboard-upcomingMeetings-open')}
            </>
          ) : (
            <>
              <Video className="gba:w-3.5 gba:h-3.5" />
              {t('dashboard-upcomingMeetings-join')}
            </>
          )}
        </Button>
      )}
    </div>
  )
}

/**
 * UpcomingMeetings - Dashboard section showing upcoming calendar meetings
 */
const INITIAL_DISPLAY_COUNT = 5
const MAX_DISPLAY_COUNT = 15

export const UpcomingMeetings: React.FC<UpcomingMeetingsProps> = ({
  accessToken,
  isActive = true,
  isLoading: externalLoading,
  onJoinMeeting,
  'data-testid': testId = 'upcoming-meetings'
}) => {
  const { t, locale } = useTranslation(translations)
  const [meetings, setMeetings] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const [isExpanded, setIsExpanded] = useState(false)

  // Use avatar cache for resolving participant avatars
  const avatarCache = useEmployeeAvatarsCache(accessToken)

  const apiClient = useChatClient(accessToken)

  // Collect all participant user IDs from meetings
  const allParticipantUserIds = useMemo(() => {
    const userIds = new Set<string>()
    meetings.forEach(meeting => {
      // Add organizer
      if (meeting.organizer?.id) {
        userIds.add(meeting.organizer.id)
      }
      // Add participants
      meeting.participants?.forEach(p => {
        if (p.id) userIds.add(p.id)
      })
    })
    return Array.from(userIds)
  }, [meetings])

  // Request avatars for all participants (non-blocking)
  const avatarMap = useMemo(() => {
    if (allParticipantUserIds.length === 0) return new Map<string, EmployeeAvatarInfo>()
    return avatarCache.requestAvatars(allParticipantUserIds)
  }, [allParticipantUserIds, avatarCache.cacheVersion])

  // Prefetch avatars when meetings change
  useEffect(() => {
    if (allParticipantUserIds.length > 0) {
      avatarCache.prefetchAvatars(allParticipantUserIds)
    }
  }, [allParticipantUserIds, avatarCache])

  // Fetch meetings function
  const fetchMeetings = useCallback(async () => {
    if (!apiClient) return

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 7) // Get meetings for next 7 days

      const response = await apiClient.getCalendarEvents<{ events: CalendarEvent[] }>(
        now.toISOString(),
        endDate.toISOString()
      )
      const events = (response.events || []).map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end)
      }))

      const upcomingMeetings = events
        .filter(e => e.status === 'scheduled' || e.status === 'in_progress')
        .sort((a, b) => a.start.getTime() - b.start.getTime())

      setMeetings(upcomingMeetings)
      setLastFetchTime(Date.now())
    } catch (err) {
      console.error('Failed to fetch upcoming meetings:', err)
      setError('dashboard-upcomingMeetings-error')
    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (!apiClient) return

    fetchMeetings()

    // Refresh every 5 minutes
    const interval = setInterval(fetchMeetings, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [apiClient, fetchMeetings])

  // Refetch when dashboard becomes active (if data is stale - older than 30 seconds)
  useEffect(() => {
    if (isActive && apiClient && lastFetchTime > 0) {
      const timeSinceLastFetch = Date.now() - lastFetchTime
      if (timeSinceLastFetch > 30000) {
        fetchMeetings()
      }
    }
  }, [isActive, apiClient, lastFetchTime, fetchMeetings])

  // Handle join meeting
  const handleJoinMeeting = useCallback(
    (meeting: CalendarEvent) => {
      handleMeetingJoin(meeting, onJoinMeeting)
    },
    [onJoinMeeting]
  )

  const showSkeleton = externalLoading || isLoading

  // Skeleton state
  if (showSkeleton) {
    return (
      <section data-testid={testId}>
        <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
          {t('dashboard-upcomingMeetings-title')}
        </h3>
        <div className="gba:rounded-xl gba:bg-card gba:p-4">
          <div className="gba:space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="gba:flex gba:items-center gba:gap-3 gba:p-2">
                <Skeleton className="gba:h-9 gba:w-12 gba:rounded" />
                <div className="gba:flex-1 gba:space-y-1.5">
                  <Skeleton className="gba:h-3.5 gba:w-3/4" />
                  <Skeleton className="gba:h-2.5 gba:w-1/2" />
                </div>
                <Skeleton className="gba:h-7 gba:w-14 gba:rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Error state
  if (error) {
    return (
      <section data-testid={testId}>
        <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
          {t('dashboard-upcomingMeetings-title')}
        </h3>
        <div className="gba:rounded-xl gba:bg-card gba:p-6 gba:text-center">
          <Calendar className="gba:w-8 gba:h-8 gba:text-muted-foreground/50 gba:mx-auto gba:mb-2" />
          <p className="gba:text-sm gba:text-muted-foreground">
            {error ? t(error) : t('dashboard-upcomingMeetings-error')}
          </p>
        </div>
      </section>
    )
  }

  // Empty state
  if (meetings.length === 0) {
    return (
      <section data-testid={testId}>
        <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
          {t('dashboard-upcomingMeetings-title')}
        </h3>
        <div className="gba:rounded-xl gba:bg-card gba:p-6 gba:text-center">
          <Calendar className="gba:w-8 gba:h-8 gba:text-muted-foreground/50 gba:mx-auto gba:mb-2" />
          <p className="gba:text-sm gba:text-muted-foreground">{t('dashboard-upcomingMeetings-emptyTitle')}</p>
          <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">
            {t('dashboard-upcomingMeetings-emptyDescription')}
          </p>
        </div>
      </section>
    )
  }

  // Determine how many meetings to show
  const displayCount = isExpanded ? Math.min(meetings.length, MAX_DISPLAY_COUNT) : INITIAL_DISPLAY_COUNT
  const displayedMeetings = meetings.slice(0, displayCount)
  const hiddenCount = meetings.length - displayCount
  const canExpand = meetings.length > INITIAL_DISPLAY_COUNT && !isExpanded
  const canCollapse = isExpanded && meetings.length > INITIAL_DISPLAY_COUNT

  return (
    <section data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
          {t('dashboard-upcomingMeetings-title')}
          {meetings.length > INITIAL_DISPLAY_COUNT && (
            <span className="gba:ml-2 gba:text-xs gba:font-normal">({meetings.length})</span>
          )}
        </h3>
        <span className="gba:text-xs gba:text-muted-foreground/70">{t('dashboard-upcomingMeetings-next7Days')}</span>
      </div>

      <div className="gba:rounded-xl gba:bg-card gba:p-2">
        <div className={`gba:space-y-0.5 ${isExpanded ? 'gba:max-h-[400px] gba:overflow-y-auto' : ''}`}>
          {displayedMeetings.map((meeting, index) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              avatarMap={avatarMap}
              onJoin={() => handleJoinMeeting(meeting)}
              data-testid={`${testId}-item-${index}`}
            />
          ))}
        </div>

        {/* Show more / Show less button */}
        {(canExpand || canCollapse) && (
          <div className="gba:pt-2 gba:border-t gba:border-border/50 gba:mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gba:w-full gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
              data-testid={`${testId}-toggle`}
            >
              {canExpand
                ? hiddenCount > MAX_DISPLAY_COUNT - INITIAL_DISPLAY_COUNT
                  ? t('dashboard-upcomingMeetings-showMoreWithTotal', {
                      count: Math.min(hiddenCount + displayCount, MAX_DISPLAY_COUNT) - INITIAL_DISPLAY_COUNT,
                      total: meetings.length.toLocaleString(locale)
                    })
                  : t('dashboard-upcomingMeetings-showMore', {
                      count: Math.min(hiddenCount + displayCount, MAX_DISPLAY_COUNT) - INITIAL_DISPLAY_COUNT
                    })
                : t('dashboard-upcomingMeetings-showLess')}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

export default UpcomingMeetings
