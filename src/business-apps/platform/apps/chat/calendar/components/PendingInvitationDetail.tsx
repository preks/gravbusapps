import React from 'react'
import { Badge, useLocale, useTranslation } from '@newwork/nw-design-system'
import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  QuestionIcon,
  RepeatIcon,
  UserIcon,
  UsersIcon,
  VideoCameraIcon,
  XIcon
} from '@phosphor-icons/react'
import translations from '../../_i18n'
import { InvitationStatus, Meeting, PendingInvitationGroup } from '../types'
import {
  formatClock,
  formatDayLabel,
  formatFullDate,
  formatPersonName,
  formatTimeRange,
  hasRecordingEnabled,
  participantDisplayName,
  PersonAvatar,
  RecordingNotice,
  recurrenceLabel,
  ResponseButtons
} from './pendingInvitationsShared'

type SeriesGroup = Extract<PendingInvitationGroup, { kind: 'series' }>

interface PendingInvitationDetailProps {
  meeting: Meeting
  onBack: () => void
  onRespond: (meetingId: string, status: InvitationStatus) => void
  seriesGroup?: SeriesGroup
  onRespondSeries?: (seriesRootId: string, status: InvitationStatus) => void
}

interface DetailRowProps {
  icon: React.ReactNode
  children: React.ReactNode
}

function DetailRow({ icon, children }: DetailRowProps) {
  return (
    <div className="gba:flex gba:items-start gba:gap-2 gba:text-sm">
      <span className="gba:mt-0.5 gba:shrink-0 gba:text-muted-foreground">{icon}</span>
      <div className="gba:min-w-0 gba:flex-1">{children}</div>
    </div>
  )
}

function ParticipantStatusIcon({ status }: { status: InvitationStatus }) {
  if (status === InvitationStatus.ACCEPTED) {
    return <CheckIcon className="gba:h-4 gba:w-4 gba:text-success" />
  }
  if (status === InvitationStatus.DECLINED) {
    return <XIcon className="gba:h-4 gba:w-4 gba:text-destructive" />
  }
  if (status === InvitationStatus.TENTATIVE) {
    return <QuestionIcon className="gba:h-4 gba:w-4 gba:text-warning" />
  }
  return <ClockIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
}

export const PendingInvitationDetail: React.FC<PendingInvitationDetailProps> = ({
  meeting,
  onBack,
  onRespond,
  seriesGroup,
  onRespondSeries
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()
  const organizerName = formatPersonName(meeting, t)
  const participants = meeting.participants ?? []
  const acceptedCount = participants.filter(participant => participant.status === InvitationStatus.ACCEPTED).length
  const recurrenceText = recurrenceLabel(seriesGroup?.recurrence ?? meeting.recurrence, t)
  const isSeries = Boolean(seriesGroup)
  const lastOccurrence = seriesGroup?.pendingMeetings[seriesGroup.pendingMeetings.length - 1]

  return (
    <div
      className="gba:space-y-3"
      data-testid={`pending-invitations-detail-${seriesGroup?.seriesRootId ?? meeting.id}`}
    >
      <button
        type="button"
        className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
        onClick={onBack}
        data-testid="pending-invitations-detail-back-button"
      >
        <CaretLeftIcon className="gba:h-3.5 gba:w-3.5" />
        {t('calendar-pending-back')}
      </button>

      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <h3 className="gba:text-base gba:font-semibold">{meeting.title}</h3>
        {isSeries && seriesGroup ? (
          <Badge variant="secondary" className="gba:shrink-0">
            {t('calendar-pending-series-count', { count: seriesGroup.pendingCount })}
          </Badge>
        ) : null}
      </div>

      <div className="gba:space-y-2">
        {isSeries && seriesGroup ? (
          <>
            {recurrenceText ? (
              <DetailRow icon={<RepeatIcon className="gba:h-4 gba:w-4" />}>
                <span>{recurrenceText}</span>
              </DetailRow>
            ) : null}
            <DetailRow icon={<ClockIcon className="gba:h-4 gba:w-4" />}>
              <span>
                {formatClock(meeting.startTime, locale)} - {formatClock(meeting.endTime, locale)}
              </span>
            </DetailRow>
            <DetailRow icon={<CalendarBlankIcon className="gba:h-4 gba:w-4" />}>
              <span>
                {formatDayLabel(seriesGroup.dateRange.start, locale, t)} -{' '}
                {formatDayLabel((lastOccurrence ?? meeting).startTime, locale, t)}
              </span>
            </DetailRow>
          </>
        ) : (
          <>
            <DetailRow icon={<CalendarBlankIcon className="gba:h-4 gba:w-4" />}>
              <span>{formatFullDate(meeting.startTime, locale)}</span>
            </DetailRow>
            <DetailRow icon={<ClockIcon className="gba:h-4 gba:w-4" />}>
              <span>
                {meeting.isAllDay
                  ? t('calendar-allDayEvent')
                  : formatTimeRange(meeting.startTime, meeting.endTime, locale, t)}
              </span>
            </DetailRow>
            {recurrenceText ? (
              <DetailRow icon={<RepeatIcon className="gba:h-4 gba:w-4" />}>
                <span>{recurrenceText}</span>
              </DetailRow>
            ) : null}
          </>
        )}

        <DetailRow icon={<UserIcon className="gba:h-4 gba:w-4" />}>
          <div className="gba:flex gba:items-center gba:gap-2">
            <PersonAvatar name={organizerName} avatarUrl={meeting.organizer?.avatarUrl} className="gba:h-6 gba:w-6" />
            <div className="gba:flex gba:flex-col">
              <span>{organizerName}</span>
              <span className="gba:text-xs gba:text-muted-foreground">{t('calendar-organizer')}</span>
            </div>
          </div>
        </DetailRow>

        {meeting.calendar?.name ? (
          <DetailRow icon={<CalendarBlankIcon className="gba:h-4 gba:w-4" />}>
            <div className="gba:flex gba:flex-col">
              <span>{meeting.calendar.name}</span>
              <span className="gba:text-xs gba:text-muted-foreground">{t('calendar-sourceCalendar')}</span>
            </div>
          </DetailRow>
        ) : null}

        {meeting.location ? (
          <DetailRow icon={<MapPinIcon className="gba:h-4 gba:w-4" />}>
            <span>{meeting.location}</span>
          </DetailRow>
        ) : null}

        {meeting.meetingLink ? (
          <DetailRow icon={<VideoCameraIcon className="gba:h-4 gba:w-4" />}>
            <div className="gba:flex gba:flex-col">
              <span className="gba:text-primary">{t('calendar-videoCallAvailable')}</span>
              <span className="gba:text-xs gba:text-muted-foreground">{t('calendar-joinLinkAvailable')}</span>
            </div>
          </DetailRow>
        ) : null}
      </div>

      {hasRecordingEnabled(meeting) ? (
        <RecordingNotice t={t} testId={`pending-invitations-detail-recording-${meeting.id}`} />
      ) : null}

      {meeting.description ? (
        <div className="gba:space-y-1">
          <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{t('calendar-description')}</span>
          <p className="gba:whitespace-pre-wrap gba:rounded-lg gba:bg-muted/30 gba:p-3 gba:text-sm gba:text-foreground">
            {meeting.description}
          </p>
        </div>
      ) : null}

      {isSeries && seriesGroup ? (
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <CalendarBlankIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:font-medium">
              {t('calendar-pending-series-count', { count: seriesGroup.pendingCount })}
            </span>
          </div>
          <div className="gba:max-h-40 gba:space-y-1 gba:overflow-y-auto gba:pr-1">
            {seriesGroup.pendingMeetings.map(occurrence => (
              <div
                key={occurrence.id}
                className="gba:flex gba:items-center gba:gap-1 gba:rounded-md gba:bg-muted/30 gba:px-2 gba:py-1 gba:text-xs gba:text-muted-foreground"
                data-testid={`pending-invitations-detail-occurrence-${occurrence.id}`}
              >
                <ClockIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
                <span>
                  {formatDayLabel(occurrence.startTime, locale, t)}, {formatClock(occurrence.startTime, locale)} -{' '}
                  {formatClock(occurrence.endTime, locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {participants.length > 0 ? (
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <UsersIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:font-medium">
              {t('calendar-participantsAttending', { accepted: acceptedCount, total: participants.length })}
            </span>
          </div>
          <div className="gba:max-h-48 gba:space-y-1.5 gba:overflow-y-auto gba:pr-1">
            {participants.map(participant => {
              const name = participantDisplayName(participant, t)
              return (
                <div
                  key={participant.id}
                  className="gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:bg-muted/30 gba:px-2 gba:py-1.5"
                  data-testid={`pending-invitations-detail-participant-${participant.id}`}
                >
                  <PersonAvatar name={name} avatarUrl={participant.user?.avatarUrl} className="gba:h-6 gba:w-6" />
                  <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm">{name}</span>
                  {participant.isOrganizer ? (
                    <Badge variant="outline" className="gba:px-1 gba:text-[10px]">
                      {t('calendar-host')}
                    </Badge>
                  ) : null}
                  <ParticipantStatusIcon status={participant.status} />
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {isSeries && seriesGroup && onRespondSeries ? (
        <ResponseButtons
          acceptLabel={t('calendar-accept-all')}
          maybeLabel={t('calendar-maybe-all')}
          declineLabel={t('calendar-decline-all')}
          onAccept={() => onRespondSeries(seriesGroup.seriesRootId, InvitationStatus.ACCEPTED)}
          onMaybe={() => onRespondSeries(seriesGroup.seriesRootId, InvitationStatus.TENTATIVE)}
          onDecline={() => onRespondSeries(seriesGroup.seriesRootId, InvitationStatus.DECLINED)}
          dataTestIdPrefix={`pending-invitations-detail-series-${seriesGroup.seriesRootId}`}
        />
      ) : (
        <ResponseButtons
          acceptLabel={t('calendar-accept')}
          maybeLabel={t('calendar-maybe')}
          declineLabel={t('calendar-decline')}
          onAccept={() => onRespond(meeting.id, InvitationStatus.ACCEPTED)}
          onMaybe={() => onRespond(meeting.id, InvitationStatus.TENTATIVE)}
          onDecline={() => onRespond(meeting.id, InvitationStatus.DECLINED)}
          dataTestIdPrefix={`pending-invitations-detail-${meeting.id}`}
        />
      )}
    </div>
  )
}
