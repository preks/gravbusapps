import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Button } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import isToday from 'dayjs/plugin/isToday'
import isTomorrow from 'dayjs/plugin/isTomorrow'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import {
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  QuestionIcon,
  UsersIcon,
  VideoCameraIcon,
  XIcon
} from '@phosphor-icons/react'
import { Meeting, MeetingParticipant, MeetingRecurrence } from '../types'

dayjs.extend(localizedFormat)
dayjs.extend(isToday)
dayjs.extend(isTomorrow)

export type TranslateFn = (key: string, variables?: Record<string, string | number>) => string

const baseLocaleOf = (locale: string): string => locale?.split('-')[0]?.toLowerCase() || 'en'

export function formatDateTime(dateStr: string, locale: string, t: TranslateFn): string {
  const baseLocale = baseLocaleOf(locale)
  const date = dayjs(dateStr)

  if (date.isToday()) {
    return `${t('formatter-today')} ${date.locale(baseLocale).format('LT')}`
  }
  if (date.isTomorrow()) {
    return `${t('formatter-tomorrow')} ${date.locale(baseLocale).format('LT')}`
  }

  return date.locale(baseLocale).format('ddd, MMM D, LT')
}

export function formatTimeRange(startStr: string, endStr: string, locale: string, t: TranslateFn): string {
  const baseLocale = baseLocaleOf(locale)
  const start = dayjs(startStr)
  const end = dayjs(endStr)
  const sameDay = start.isSame(end, 'day')
  const endText = sameDay ? end.locale(baseLocale).format('LT') : formatDateTime(endStr, locale, t)

  return `${formatDateTime(startStr, locale, t)} - ${endText}`
}

export function formatFullDate(dateStr: string, locale: string): string {
  return dayjs(dateStr).locale(baseLocaleOf(locale)).format('dddd, LL')
}

export function formatClock(dateStr: string, locale: string): string {
  return dayjs(dateStr).locale(baseLocaleOf(locale)).format('LT')
}

export function formatDayLabel(dateStr: string, locale: string, t: TranslateFn): string {
  const date = dayjs(dateStr)
  if (date.isToday()) {
    return t('formatter-today')
  }
  if (date.isTomorrow()) {
    return t('formatter-tomorrow')
  }
  return date.locale(baseLocaleOf(locale)).format('ddd, MMM D')
}

export function recurrenceLabel(recurrence: MeetingRecurrence, t: TranslateFn): string | null {
  switch (recurrence) {
    case MeetingRecurrence.DAILY:
      return t('calendar-daily')
    case MeetingRecurrence.WEEKLY:
      return t('calendar-weekly')
    case MeetingRecurrence.BIWEEKLY:
      return t('calendar-every2Weeks')
    case MeetingRecurrence.MONTHLY:
      return t('calendar-monthly')
    default:
      return null
  }
}

export function formatPersonName(meeting: Meeting, t: TranslateFn): string {
  return (
    meeting.organizer?.displayName ||
    `${meeting.organizer?.firstName || ''} ${meeting.organizer?.lastName || ''}`.trim() ||
    meeting.organizer?.email ||
    t('chat-unknownUser')
  )
}

export function getInitials(name: string): string {
  if (!name) {
    return '?'
  }
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

interface PersonAvatarProps {
  name: string
  avatarUrl?: string
  className?: string
}

export function PersonAvatar({ name, avatarUrl, className = 'gba:h-5 gba:w-5' }: PersonAvatarProps) {
  return (
    <Avatar className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className="gba:text-[10px]">{getInitials(name)}</AvatarFallback>
    </Avatar>
  )
}

export function participantDisplayName(participant: MeetingParticipant, t: TranslateFn): string {
  return (
    participant.user?.displayName ||
    `${participant.user?.firstName || ''} ${participant.user?.lastName || ''}`.trim() ||
    participant.user?.email ||
    t('chat-unknownUser')
  )
}

interface ParticipantAvatarStackProps {
  participants: MeetingParticipant[]
  t: TranslateFn
  max?: number
}

export function ParticipantAvatarStack({ participants, t, max = 5 }: ParticipantAvatarStackProps) {
  if (!participants || participants.length === 0) {
    return null
  }

  const visible = participants.slice(0, max)
  const overflow = participants.length - visible.length

  return (
    <div className="gba:flex gba:items-center gba:gap-1.5" data-testid="pending-invitations-participants-stack">
      <UsersIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground" />
      <div className="gba:flex gba:-space-x-2">
        {visible.map(participant => (
          <div key={participant.id} className="gba:rounded-full gba:ring-2 gba:ring-background">
            <PersonAvatar
              name={participantDisplayName(participant, t)}
              avatarUrl={participant.user?.avatarUrl}
              className="gba:h-6 gba:w-6"
            />
          </div>
        ))}
        {overflow > 0 ? (
          <div
            className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:ring-2 gba:ring-background"
            data-testid="pending-invitations-participants-overflow"
          >
            +{overflow}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function hasRecordingEnabled(meeting: Meeting): boolean {
  return meeting.transcriptionEnabled === true || meeting.metadata?.aiTranscriptionEnabled === true
}

export function someRecordingEnabled(meetings: Meeting[]): boolean {
  return meetings.some(hasRecordingEnabled)
}

export function isPastMeeting(meeting: Meeting, now: dayjs.Dayjs = dayjs()): boolean {
  return dayjs(meeting.endTime).isBefore(now)
}

interface RecordingNoticeProps {
  t: TranslateFn
  testId: string
}

export function RecordingNotice({ t, testId }: RecordingNoticeProps) {
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground" data-testid={testId}>
      <span
        className="gba:inline-block gba:h-2 gba:w-2 gba:shrink-0 gba:rounded-full gba:bg-destructive gba:animate-pulse"
        aria-hidden
      />
      <span className="gba:italic">{t('chat-call-recordingTranscriptNotice')}</span>
    </div>
  )
}

interface MeetingDetailsProps {
  meeting: Meeting
  locale: string
  t: TranslateFn
  showTimeRange?: boolean
}

export function MeetingDetails({ meeting, locale, t, showTimeRange = true }: MeetingDetailsProps) {
  return (
    <div className="gba:mt-1 gba:space-y-1 gba:text-xs gba:text-muted-foreground">
      {showTimeRange ? (
        <div className="gba:flex gba:items-center gba:gap-1">
          <ClockIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
          <span>{formatTimeRange(meeting.startTime, meeting.endTime, locale, t)}</span>
        </div>
      ) : null}

      {meeting.location ? (
        <div className="gba:flex gba:items-center gba:gap-1">
          <MapPinIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
          <span className="gba:truncate">{meeting.location}</span>
        </div>
      ) : null}

      {meeting.meetingLink ? (
        <div className="gba:flex gba:items-center gba:gap-1">
          <VideoCameraIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
          <span>{t('calendar-videoCallAvailable')}</span>
        </div>
      ) : null}

      {hasRecordingEnabled(meeting) ? (
        <RecordingNotice t={t} testId={`pending-invitations-recording-notice-${meeting.id}`} />
      ) : null}
    </div>
  )
}

interface ResponseButtonsProps {
  acceptLabel: string
  maybeLabel: string
  declineLabel: string
  onAccept: () => void
  onMaybe: () => void
  onDecline: () => void
  dataTestIdPrefix: string
}

export function ResponseButtons({
  acceptLabel,
  maybeLabel,
  declineLabel,
  onAccept,
  onMaybe,
  onDecline,
  dataTestIdPrefix
}: ResponseButtonsProps) {
  return (
    <div className="gba:mt-3 gba:flex gba:gap-2" data-testid={`${dataTestIdPrefix}-actions`}>
      <Button
        size="sm"
        variant="outline"
        className="gba:h-7 gba:flex-1 gba:text-xs gba:text-success gba:border-success/30 gba:hover:bg-success/10"
        onClick={onAccept}
        data-testid={`${dataTestIdPrefix}-accept-button`}
      >
        <CheckIcon className="gba:mr-1 gba:h-3 gba:w-3" />
        {acceptLabel}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gba:h-7 gba:flex-1 gba:text-xs"
        onClick={onMaybe}
        data-testid={`${dataTestIdPrefix}-maybe-button`}
      >
        <QuestionIcon className="gba:mr-1 gba:h-3 gba:w-3" />
        {maybeLabel}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gba:h-7 gba:flex-1 gba:text-xs gba:text-destructive gba:border-destructive/30 gba:hover:bg-destructive/10"
        onClick={onDecline}
        data-testid={`${dataTestIdPrefix}-decline-button`}
      >
        <XIcon className="gba:mr-1 gba:h-3 gba:w-3" />
        {declineLabel}
      </Button>
    </div>
  )
}
