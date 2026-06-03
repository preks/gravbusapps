import React, { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Spinner,
  useLocale,
  useTranslation
} from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { CalendarBlankIcon, CaretDownIcon, CaretUpIcon, ClockIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'
import { InvitationStatus, Meeting, PendingInvitationGroup } from '../types'
import {
  formatClock,
  formatDayLabel,
  formatPersonName,
  isPastMeeting,
  MeetingDetails,
  ParticipantAvatarStack,
  PersonAvatar,
  RecordingNotice,
  recurrenceLabel,
  ResponseButtons,
  someRecordingEnabled,
  TranslateFn
} from './pendingInvitationsShared'
import { PendingInvitationDetail } from './PendingInvitationDetail'

type PendingInvitationsFilter = 'all' | 'upcoming' | 'past'

type SeriesGroup = Extract<PendingInvitationGroup, { kind: 'series' }>

type DetailTarget = { type: 'single'; meeting: Meeting } | { type: 'series'; group: SeriesGroup }

interface PendingInvitationsPanelProps {
  isOpen: boolean
  onClose: () => void
  groups: PendingInvitationGroup[]
  isLoading?: boolean
  onRespond: (meetingId: string, status: InvitationStatus) => Promise<void> | void
  onRespondSeries: (seriesRootId: string, status: InvitationStatus) => Promise<void> | void
}

function recomputeDateRange(meetings: Meeting[]): { start: string; end: string } {
  const startTimes = meetings.map(meeting => dayjs(meeting.startTime).valueOf())
  const endTimes = meetings.map(meeting => dayjs(meeting.endTime).valueOf())

  return {
    start: dayjs(Math.min(...startTimes)).toISOString(),
    end: dayjs(Math.max(...endTimes)).toISOString()
  }
}

function filterGroups(groups: PendingInvitationGroup[], filter: PendingInvitationsFilter): PendingInvitationGroup[] {
  if (filter === 'all') {
    return groups
  }

  const now = dayjs()
  const matches = (meeting: Meeting) => (filter === 'past' ? isPastMeeting(meeting, now) : !isPastMeeting(meeting, now))
  const result: PendingInvitationGroup[] = []

  for (const group of groups) {
    if (group.kind === 'single') {
      if (matches(group.meeting)) {
        result.push(group)
      }
      continue
    }

    const meetings = group.pendingMeetings.filter(matches)
    if (meetings.length > 0) {
      result.push({
        ...group,
        pendingMeetings: meetings,
        pendingCount: meetings.length,
        dateRange: recomputeDateRange(meetings)
      })
    }
  }

  return result
}

interface FilterTabsProps {
  value: PendingInvitationsFilter
  onChange: (value: PendingInvitationsFilter) => void
  t: TranslateFn
}

function FilterTabs({ value, onChange, t }: FilterTabsProps) {
  const options: { id: PendingInvitationsFilter; label: string }[] = [
    { id: 'all', label: t('calendar-pending-filter-all') },
    { id: 'upcoming', label: t('calendar-pending-filter-upcoming') },
    { id: 'past', label: t('calendar-pending-filter-past') }
  ]

  return (
    <div className="gba:flex gba:gap-1" data-testid="pending-invitations-filter">
      {options.map(option => (
        <Button
          key={option.id}
          size="sm"
          variant={value === option.id ? 'secondary' : 'ghost'}
          className="gba:h-7 gba:text-xs"
          onClick={() => onChange(option.id)}
          data-testid={`pending-invitations-filter-${option.id}`}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

export const PendingInvitationsPanel: React.FC<PendingInvitationsPanelProps> = ({
  isOpen,
  onClose,
  groups,
  isLoading,
  onRespond,
  onRespondSeries
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()
  const [filter, setFilter] = useState<PendingInvitationsFilter>('all')
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<string[]>([])
  const [detail, setDetail] = useState<DetailTarget | null>(null)

  const expandedSeriesIdSet = useMemo(() => new Set(expandedSeriesIds), [expandedSeriesIds])
  const filteredGroups = useMemo(() => filterGroups(groups, filter), [groups, filter])

  const toggleSeries = (seriesRootId: string) => {
    setExpandedSeriesIds(currentIds =>
      currentIds.includes(seriesRootId)
        ? currentIds.filter(currentId => currentId !== seriesRootId)
        : [...currentIds, seriesRootId]
    )
  }

  const handleRespondFromDetail = async (meetingId: string, status: InvitationStatus) => {
    await onRespond(meetingId, status)
    setDetail(null)
  }

  const handleRespondSeriesFromDetail = async (seriesRootId: string, status: InvitationStatus) => {
    await onRespondSeries(seriesRootId, status)
    setDetail(null)
  }

  const renderSingleGroup = (meeting: Meeting) => {
    const organizerName = formatPersonName(meeting, t)

    return (
      <div
        key={meeting.id}
        className="gba:rounded-lg gba:border gba:border-border/50 gba:bg-background gba:p-3"
        data-testid={`pending-invitations-group-single-${meeting.id}`}
      >
        <button
          type="button"
          className="gba:block gba:w-full gba:truncate gba:text-left gba:text-sm gba:font-semibold gba:hover:underline"
          onClick={() => setDetail({ type: 'single', meeting })}
          data-testid={`pending-invitations-single-${meeting.id}-open-button`}
        >
          {meeting.title}
        </button>

        <div className="gba:mt-1 gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
          <PersonAvatar name={organizerName} avatarUrl={meeting.organizer?.avatarUrl} className="gba:h-4 gba:w-4" />
          <span>{t('calendar-pending-invitations-from', { organizer: organizerName })}</span>
        </div>

        <MeetingDetails meeting={meeting} locale={locale} t={t} />

        {meeting.participants && meeting.participants.length > 0 ? (
          <div className="gba:mt-2">
            <ParticipantAvatarStack participants={meeting.participants} t={t} />
          </div>
        ) : null}

        <ResponseButtons
          acceptLabel={t('calendar-accept')}
          maybeLabel={t('calendar-maybe')}
          declineLabel={t('calendar-decline')}
          onAccept={() => onRespond(meeting.id, InvitationStatus.ACCEPTED)}
          onMaybe={() => onRespond(meeting.id, InvitationStatus.TENTATIVE)}
          onDecline={() => onRespond(meeting.id, InvitationStatus.DECLINED)}
          dataTestIdPrefix={`pending-invitations-single-${meeting.id}`}
        />
      </div>
    )
  }

  const renderSeriesGroup = (group: Extract<PendingInvitationGroup, { kind: 'series' }>) => {
    const firstMeeting = group.pendingMeetings[0]

    if (!firstMeeting) {
      return null
    }

    const lastMeeting = group.pendingMeetings[group.pendingMeetings.length - 1]
    const organizerName = formatPersonName(firstMeeting, t)
    const recurrenceText = recurrenceLabel(group.recurrence, t)
    const isExpanded = expandedSeriesIdSet.has(group.seriesRootId)

    return (
      <div
        key={group.seriesRootId}
        className="gba:rounded-lg gba:border gba:border-border/50 gba:bg-background gba:p-3"
        data-testid={`pending-invitations-group-series-${group.seriesRootId}`}
      >
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
          <div className="gba:min-w-0 gba:flex-1">
            <button
              type="button"
              className="gba:block gba:w-full gba:truncate gba:text-left gba:text-sm gba:font-semibold gba:hover:underline"
              onClick={() => setDetail({ type: 'series', group })}
              data-testid={`pending-invitations-series-${group.seriesRootId}-open-button`}
            >
              {group.title}
            </button>
            <div className="gba:mt-1 gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
              <PersonAvatar
                name={organizerName}
                avatarUrl={firstMeeting.organizer?.avatarUrl}
                className="gba:h-4 gba:w-4"
              />
              <span>{t('calendar-pending-invitations-from', { organizer: organizerName })}</span>
            </div>
            <div className="gba:mt-1 gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
              <ClockIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
              <span>
                {recurrenceText ? `${recurrenceText} · ` : ''}
                {formatClock(firstMeeting.startTime, locale)} - {formatClock(firstMeeting.endTime, locale)}
              </span>
            </div>
            <div className="gba:mt-1 gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
              <CalendarBlankIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
              <span>
                {formatDayLabel(group.dateRange.start, locale, t)} - {formatDayLabel(lastMeeting.startTime, locale, t)}
              </span>
            </div>
          </div>

          <Badge variant="secondary" className="gba:shrink-0">
            {t('calendar-pending-series-count', { count: group.pendingCount })}
          </Badge>
        </div>

        {someRecordingEnabled(group.pendingMeetings) ? (
          <div className="gba:mt-2" data-testid={`pending-invitations-series-recording-${group.seriesRootId}`}>
            <RecordingNotice t={t} testId={`pending-invitations-series-recording-notice-${group.seriesRootId}`} />
          </div>
        ) : null}

        {firstMeeting.participants && firstMeeting.participants.length > 0 ? (
          <div className="gba:mt-2">
            <ParticipantAvatarStack participants={firstMeeting.participants} t={t} />
          </div>
        ) : null}

        <ResponseButtons
          acceptLabel={t('calendar-accept-all')}
          maybeLabel={t('calendar-maybe-all')}
          declineLabel={t('calendar-decline-all')}
          onAccept={() => onRespondSeries(group.seriesRootId, InvitationStatus.ACCEPTED)}
          onMaybe={() => onRespondSeries(group.seriesRootId, InvitationStatus.TENTATIVE)}
          onDecline={() => onRespondSeries(group.seriesRootId, InvitationStatus.DECLINED)}
          dataTestIdPrefix={`pending-invitations-series-${group.seriesRootId}`}
        />

        <Button
          variant="ghost"
          size="sm"
          className="gba:mt-2 gba:h-7 gba:px-0 gba:text-xs"
          onClick={() => toggleSeries(group.seriesRootId)}
          data-testid={`pending-invitations-series-toggle-${group.seriesRootId}`}
        >
          {isExpanded ? (
            <CaretUpIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
          ) : (
            <CaretDownIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
          )}
          {isExpanded ? t('calendar-hide-occurrences') : t('calendar-view-occurrences')}
        </Button>

        {isExpanded ? (
          <div className="gba:mt-2 gba:space-y-2 gba:border-t gba:border-border/50 gba:pt-2">
            {group.pendingMeetings.map(meeting => (
              <div
                key={meeting.id}
                className="gba:rounded-md gba:border gba:border-border gba:p-2"
                data-testid={`pending-invitations-occurrence-${meeting.id}`}
              >
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                  <div className="gba:min-w-0 gba:flex-1">
                    <MeetingDetails meeting={meeting} locale={locale} t={t} />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-6 gba:shrink-0 gba:px-1.5 gba:text-xs"
                    onClick={() => setDetail({ type: 'single', meeting })}
                    data-testid={`pending-invitations-occurrence-${meeting.id}-open-button`}
                  >
                    {t('calendar-view-details')}
                  </Button>
                </div>

                <ResponseButtons
                  acceptLabel={t('calendar-accept')}
                  maybeLabel={t('calendar-maybe')}
                  declineLabel={t('calendar-decline')}
                  onAccept={() => onRespond(meeting.id, InvitationStatus.ACCEPTED)}
                  onMaybe={() => onRespond(meeting.id, InvitationStatus.TENTATIVE)}
                  onDecline={() => onRespond(meeting.id, InvitationStatus.DECLINED)}
                  dataTestIdPrefix={`pending-invitations-occurrence-${meeting.id}`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:max-w-lg" data-testid="pending-invitations-dialog">
        <DialogDescription className="gba:sr-only">{t('calendar-pending-invitations')}</DialogDescription>
        <DialogHeader className="gba:pb-2">
          <DialogTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
            <span>{t('calendar-pending-invitations')}</span>
            {groups.length > 0 ? (
              <Badge variant="outline" className="gba:border-warning/30 gba:bg-warning/10">
                {groups.length}
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {detail ? (
          <PendingInvitationDetail
            meeting={detail.type === 'series' ? detail.group.pendingMeetings[0] : detail.meeting}
            seriesGroup={detail.type === 'series' ? detail.group : undefined}
            onBack={() => setDetail(null)}
            onRespond={handleRespondFromDetail}
            onRespondSeries={handleRespondSeriesFromDetail}
          />
        ) : (
          <div className="gba:space-y-3">
            <FilterTabs value={filter} onChange={setFilter} t={t} />

            <div className="gba:max-h-[60vh] gba:space-y-3 gba:overflow-y-auto gba:pr-1">
              {isLoading ? (
                <div className="gba:py-6 gba:text-center" data-testid="pending-invitations-loading">
                  <Spinner className="gba:mx-auto gba:h-6 gba:w-6" />
                </div>
              ) : null}

              {!isLoading && filteredGroups.length === 0 ? (
                <div
                  className="gba:py-6 gba:text-center gba:text-sm gba:text-muted-foreground"
                  data-testid="pending-invitations-empty"
                >
                  {t('calendar-pending-invitations-empty')}
                </div>
              ) : null}

              {!isLoading
                ? filteredGroups.map(group =>
                    group.kind === 'single' ? renderSingleGroup(group.meeting) : renderSeriesGroup(group)
                  )
                : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
