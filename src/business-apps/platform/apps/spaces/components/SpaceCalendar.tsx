/**
 * SpaceCalendar - Mini calendar showing upcoming meetings for space members
 *
 * Displays a compact view of upcoming team meetings with quick actions
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Spinner, ScrollArea } from '@newwork/nw-design-system'
import { Calendar, Clock, Video, ArrowRight, CalendarBlankIcon, Users } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { SpaceCalendarLink, SpaceMember } from '../types/space.types'

export interface SpaceMeeting {
  id: string
  title: string
  start: string // ISO date string
  end: string // ISO date string
  isVideoCall?: boolean
  participantCount?: number
  organizer?: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
    email: string
  }
  status?: string
  conversationId?: string
  meetingLink?: string
}

export interface SpaceCalendarProps {
  /** Space ID for filtering meetings */
  spaceId: string
  /** Linked calendar metadata for this space */
  spaceCalendar?: SpaceCalendarLink
  /** Space members to filter meetings by */
  members: SpaceMember[]
  /** Access token for API calls */
  accessToken?: string
  /** Maximum number of meetings to show */
  maxMeetings?: number
  /** Callback to schedule a new meeting */
  onScheduleMeeting?: () => void
  'data-testid'?: string
}

export const SpaceCalendar: React.FC<SpaceCalendarProps> = ({
  spaceId,
  spaceCalendar,
  members,
  accessToken,
  maxMeetings = 5,
  onScheduleMeeting,
  'data-testid': testId = 'space-calendar'
}) => {
  const chatClient = useChatClient(accessToken)
  const [meetings, setMeetings] = useState<SpaceMeeting[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    if (!accessToken || !spaceCalendar?.id) {
      setMeetings([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      const data = await chatClient.getCalendarEventsFiltered<{ events: SpaceMeeting[] }>(
        startDate.toISOString(),
        endDate.toISOString(),
        {
          calendarIds: [spaceCalendar.id],
          includePersonal: false
        }
      )
      const allMeetings: SpaceMeeting[] = data?.events || []

      const sortedMeetings = allMeetings
        .filter(m => new Date(m.start) > new Date())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, maxMeetings)

      setMeetings(sortedMeetings)
    } catch (err) {
      console.error('[SpaceCalendar] Error fetching meetings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load meetings')
      setMeetings([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, maxMeetings, chatClient, spaceCalendar?.id, members])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Navigate to full calendar
  const handleViewCalendar = useCallback(() => {
    const isProduction = process.env.NODE_ENV === 'production'
    const chatPath = isProduction ? '/platform/chat' : '/platform/apps/chat'
    const query = new URLSearchParams({
      view: 'calendar',
      calendarIds: spaceCalendar?.id || '',
      includePersonal: 'false'
    })
    navigateTo(buildPlatformUrl(`${chatPath}?${query.toString()}`))
  }, [spaceCalendar?.id])

  // Format meeting time
  const formatMeetingTime = (startStr: string, endStr: string) => {
    const start = new Date(startStr)
    const end = new Date(endStr)
    const now = new Date()

    const isToday = start.toDateString() === now.toDateString()
    const isTomorrow = start.toDateString() === new Date(now.getTime() + 86400000).toDateString()

    const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

    if (isToday) return `Today, ${timeStr}`
    if (isTomorrow) return `Tomorrow, ${timeStr}`
    return `${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${timeStr}`
  }

  // Check if meeting is live
  const isMeetingLive = (meeting: SpaceMeeting) => {
    const now = new Date()
    const start = new Date(meeting.start)
    const end = new Date(meeting.end)
    return now >= start && now <= end
  }

  const renderCardBody = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <Spinner size="sm" />
        </div>
      )
    }

    if (error) {
      return <div className="gba:text-center gba:py-6 gba:text-sm gba:text-muted-foreground">{error}</div>
    }

    if (spaceCalendar) {
      if (meetings.length === 0) {
        return (
          <div className="gba:text-center gba:py-8">
            <div className="gba:w-12 gba:h-12 gba:mx-auto gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mb-3">
              <CalendarBlankIcon className="gba:w-6 gba:h-6 gba:text-muted-foreground" />
            </div>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">No upcoming meetings</p>
            {onScheduleMeeting && (
              <Button variant="secondary" size="sm" onClick={onScheduleMeeting}>
                Schedule Meeting
              </Button>
            )}
          </div>
        )
      }

      return (
        <ScrollArea className="gba:max-h-64">
          <div className="gba:space-y-2">
            {meetings.map(meeting => (
              <div
                key={meeting.id}
                className="gba:p-3 gba:rounded-lg gba:bg-muted/50 gba:border gba:border-border/50 gba:transition-colors gba:hover:bg-muted"
                data-testid={`${testId}-meeting-${meeting.id}`}
              >
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{meeting.title}</h4>
                      {isMeetingLive(meeting) && (
                        <Badge variant="success" className="gba:text-xs gba:px-1.5 gba:py-0">
                          Live
                        </Badge>
                      )}
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-3 gba:mt-1 gba:text-xs gba:text-muted-foreground">
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <Clock className="gba:w-3 gba:h-3" />
                        {formatMeetingTime(meeting.start, meeting.end)}
                      </span>
                      {meeting.isVideoCall && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Video className="gba:w-3 gba:h-3" />
                          Video
                        </span>
                      )}
                      {meeting.participantCount && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Users className="gba:w-3 gba:h-3" />
                          {meeting.participantCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )
    }

    return (
      <div className="gba:text-center gba:py-8">
        <div className="gba:w-12 gba:h-12 gba:mx-auto gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mb-3">
          <CalendarBlankIcon className="gba:w-6 gba:h-6 gba:text-muted-foreground" />
        </div>
        <p className="gba:text-sm gba:text-muted-foreground">No linked space calendar yet</p>
      </div>
    )
  }

  return (
    <Card className="gba:border-border/50" data-testid={`${testId}-${spaceId}`}>
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-base gba:font-medium gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:w-4 gba:h-4" />
            {spaceCalendar?.name || 'Space Calendar'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewCalendar}
            disabled={!spaceCalendar?.id}
            data-testid={`${testId}-view-all`}
          >
            View All
            <ArrowRight className="gba:w-4 gba:h-4 gba:ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="gba:pt-0">{renderCardBody()}</CardContent>
    </Card>
  )
}

export default SpaceCalendar
